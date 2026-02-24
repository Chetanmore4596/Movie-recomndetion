import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const storagePath = path.resolve(__dirname, "../../storage/uploads.json");

const readStore = () => {
  try {
    return JSON.parse(fs.readFileSync(storagePath, "utf-8"));
  } catch {
    return { uploads: [] };
  }
};

const writeStore = (data) => {
  fs.writeFileSync(storagePath, JSON.stringify(data, null, 2));
};

export const saveUpload = (record) => {
  const db = readStore();
  db.uploads.unshift(record);
  db.uploads = db.uploads.slice(0, 25);
  writeStore(db);
};

export const listUploads = () => readStore().uploads;

export const findUploadById = (uploadId) =>
  readStore().uploads.find((item) => item.uploadId === uploadId);

export const deleteUploadById = (uploadId) => {
  const db = readStore();
  const index = db.uploads.findIndex((item) => item.uploadId === uploadId);
  if (index === -1) return null;
  const [removed] = db.uploads.splice(index, 1);
  writeStore(db);
  return removed;
};
