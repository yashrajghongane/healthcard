import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import connectDB, { getLastMongoConnectionError, isMongoUriConfigured } from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import doctorRoutes from "./routes/doctorRoutes.js";
import patientRoutes from "./routes/patientRoutes.js";
import emergencyRoutes from "./routes/emergencyRoutes.js";
import mongoose from "mongoose";

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientPublicPath = path.resolve(__dirname, "../public");


app.set("trust proxy", 1);
app.use(express.json());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.static(clientPublicPath));



app.get("/api/health", (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  res.json({
    message: "HealthCard API Running",
    database: dbConnected ? "connected" : "disconnected",
    mongoUriConfigured: isMongoUriConfigured(),
    mongoLastError: getLastMongoConnectionError()
  });
});

app.use("/api/", emergencyRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/doctor", doctorRoutes);
app.use("/api/patient", patientRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);

const connectDatabaseWithRetry = async () => {
  try {
    await connectDB();
  } catch (error) {
    console.error("Retrying MongoDB connection in 10 seconds...");
    setTimeout(connectDatabaseWithRetry, 10000);
  }
};

connectDatabaseWithRetry();