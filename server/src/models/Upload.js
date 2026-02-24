import mongoose from "mongoose";

const UploadSchema = new mongoose.Schema(
  {
    uploadId: { type: String, required: true, unique: true },
    originalName: { type: String, required: true },
    serverPath: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    analysis: { type: Object }
  },
  { timestamps: true }
);

export const UploadModel = mongoose.model("Upload", UploadSchema);
