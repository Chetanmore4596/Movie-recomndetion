import express from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { v4 as uuidv4 } from "uuid";
import { analyzeDataset, getCleanedPreview, getRecommendations } from "../services/pythonRunner.js";
import { deleteUploadById, findUploadById, listUploads, saveUpload } from "../services/uploadStore.js";
import { UploadModel } from "../models/Upload.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "../../");

const router = express.Router();

const allowedExt = new Set([".csv", ".tsv", ".txt", ".xls", ".xlsx", ".json", ".jsonl"]);

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, path.resolve(ROOT_DIR, "uploads")),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${uuidv4()}${ext}`);
    }
  }),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExt.has(ext)) {
      cb(new Error("Unsupported file format. Use CSV, Excel, or JSON datasets."));
      return;
    }
    cb(null, true);
  }
});

router.get("/health", (_req, res) => {
  res.json({ ok: true, service: "movie-recommender-api" });
});

router.get("/uploads", (_req, res) => {
  res.json({ uploads: listUploads() });
});

router.post("/upload", upload.single("dataset"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Dataset file is required." });
  }

  try {
    const analysis = await analyzeDataset(req.file.path);
    const uploadId = uuidv4();
    const cleanedCsvPath = analysis?.cleaning?.cleaned_csv_path;
    const hasCleanedCsv = Boolean(cleanedCsvPath && fs.existsSync(cleanedCsvPath));
    const record = {
      uploadId,
      originalName: req.file.originalname,
      serverPath: req.file.path,
      cleanedServerPath: hasCleanedCsv ? cleanedCsvPath : null,
      cleanedOriginalName: `${path.parse(req.file.originalname).name}_cleaned.csv`,
      mimeType: req.file.mimetype,
      size: req.file.size,
      createdAt: new Date().toISOString(),
      analysisSummary: {
        rows: analysis?.dataset?.rows ?? 0,
        columns: analysis?.dataset?.columns ?? 0,
        cleanedRows: analysis?.cleaning?.rows_after ?? 0
      }
    };

    saveUpload(record);

    if (process.env.MONGO_URI) {
      UploadModel.create({
        uploadId,
        originalName: req.file.originalname,
        serverPath: req.file.path,
        mimeType: req.file.mimetype,
        size: req.file.size,
        analysis
      }).catch(() => null);
    }

    return res.json({ upload: record, analysis });
  } catch (error) {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({ message: error.message || "Failed to analyze dataset." });
  }
});

router.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ message: "File too large. Maximum supported size is 100 MB." });
  }
  if (error?.message) {
    return res.status(400).json({ message: error.message });
  }
  return res.status(500).json({ message: "Unexpected upload error." });
});

router.get("/uploads/:uploadId/cleaned-csv", (req, res) => {
  const file = findUploadById(req.params.uploadId);
  if (!file?.cleanedServerPath || !fs.existsSync(file.cleanedServerPath)) {
    return res.status(404).json({ message: "Cleaned CSV not found for this upload." });
  }

  return res.download(file.cleanedServerPath, file.cleanedOriginalName || "cleaned_dataset.csv");
});

router.get("/uploads/:uploadId/cleaned-preview", async (req, res) => {
  const file = findUploadById(req.params.uploadId);
  if (!file) {
    return res.status(404).json({ message: "Uploaded dataset not found." });
  }

  const page = Number(req.query.page || 1);
  const pageSize = Number(req.query.pageSize || 10);

  try {
    const preview = await getCleanedPreview({ filePath: file.serverPath, page, pageSize });
    return res.json(preview);
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to load cleaned dataset preview." });
  }
});

router.delete("/uploads/:uploadId", (req, res) => {
  const removed = deleteUploadById(req.params.uploadId);
  if (!removed) {
    return res.status(404).json({ message: "Uploaded dataset not found." });
  }

  if (removed.serverPath && fs.existsSync(removed.serverPath)) {
    fs.unlinkSync(removed.serverPath);
  }
  if (removed.cleanedServerPath && fs.existsSync(removed.cleanedServerPath)) {
    fs.unlinkSync(removed.cleanedServerPath);
  }

  return res.json({ message: "Uploaded dataset removed successfully." });
});

router.post("/recommend", async (req, res) => {
  const { uploadId, topN = 12, language = "all", genre = "all" } = req.body ?? {};

  if (!uploadId) {
    return res.status(400).json({ message: "Please upload a dataset first, then select it for recommendations." });
  }

  const file = findUploadById(uploadId);
  if (!file) {
    return res.status(404).json({ message: "Uploaded dataset not found." });
  }
  const filePath = file.serverPath;

  try {
    const response = await getRecommendations({ filePath, topN, language, genre });
    return res.json(response);
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to generate recommendations." });
  }
});

export default router;
