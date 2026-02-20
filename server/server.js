import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import connectDB from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import doctorRoutes from "./routes/doctorRoutes.js";
import patientRoutes from "./routes/patientRoutes.js";

dotenv.config();
connectDB();

const app = express();


app.set("trust proxy", 1);
app.use(express.json());
app.use(helmet());
app.use(cors());



app.get("/", (req, res) => {
  res.json({ message: "HealthCard API Running" });
});


app.use("/api/auth", authRoutes);
app.use("/api/doctor", doctorRoutes);
app.use("/api/patient", patientRoutes);

app.listen(process.env.PORT, () =>
  console.log(`Server running on port ${process.env.PORT}`)
);