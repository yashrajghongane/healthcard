import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import doctorRoutes from "./routes/doctorRoutes.js";
import patientRoutes from "./routes/patientRoutes.js";
import emergencyRoutes from "./routes/emergencyRoutes.js";

dotenv.config();
connectDB();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientPublicPath = path.resolve(__dirname, "../client/public");


app.set("trust proxy", 1);
app.use(express.json());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.static(clientPublicPath));



app.get("/api/health", (req, res) => {
  res.json({ message: "HealthCard API Running" });
});

app.use("/api/", emergencyRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/doctor", doctorRoutes);
app.use("/api/patient", patientRoutes);

app.listen(process.env.PORT, () =>
  console.log(`Server running on port ${process.env.PORT}`)
);