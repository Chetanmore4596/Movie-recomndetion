import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PYTHON_EXEC = process.env.PYTHON_BIN || "python";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCRIPT_ROOT = path.resolve(__dirname, "../../../python-service");

const parseJsonPayload = (text) => {
  const trimmed = (text || "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("Invalid JSON response from Python service.");
  }
};

const runPython = (scriptName, args = []) =>
  new Promise((resolve, reject) => {
    const scriptPath = path.join(SCRIPT_ROOT, scriptName);
    const proc = spawn(PYTHON_EXEC, [scriptPath, ...args], {
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `Python script failed: ${scriptName}`));
        return;
      }

      try {
        resolve(parseJsonPayload(stdout));
      } catch {
        reject(new Error("Invalid JSON response from Python service."));
      }
    });
  });

export const analyzeDataset = (filePath) =>
  runPython("analyze_dataset.py", ["--file", filePath]);

export const getRecommendations = ({ filePath, topN = 10, language = "all", genre = "all" }) =>
  runPython("recommend.py", [
    "--file",
    filePath,
    "--top_n",
    String(topN),
    "--language",
    language,
    "--genre",
    genre
  ]);

export const getCleanedPreview = ({ filePath, page = 1, pageSize = 10 }) =>
  runPython("cleaned_preview.py", [
    "--file",
    filePath,
    "--page",
    String(page),
    "--page_size",
    String(pageSize)
  ]);
