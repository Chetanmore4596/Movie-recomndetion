import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import apiRoutes from "./routes/api.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use("/api", apiRoutes);

const start = async () => {
  if (process.env.MONGO_URI) {
    try {
      await mongoose.connect(process.env.MONGO_URI);
      console.log("MongoDB connected.");
    } catch (error) {
      console.warn("MongoDB connection failed. Running without persistent DB.");
    }
  }

  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
};

start();
