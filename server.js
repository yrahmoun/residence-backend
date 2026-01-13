import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import residentsRoutes from "./routes/residents.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/residents", residentsRoutes);

const PORT = process.env.PORT || 3000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, '0.0.0.0', () =>
      console.log(`Server running on port ${PORT}`)
    );
  })
  .catch(err => {
    console.error("MongoDB connection error:", err);
  });
