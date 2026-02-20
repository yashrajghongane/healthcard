import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import Patient from "../models/Patient.js";
import Doctor from "../models/Doctor.js";
import MedicalRecord from "../models/MedicalRecord.js";

const router = express.Router();

router.post("/visit", protect, authorize("doctor"), async (req, res) => {
  const { healthCardId, diagnosis, notes, treatments } = req.body;

  const patient = await Patient.findOne({ healthCardId });
  if (!patient) return res.status(404).json({ message: "Patient not found" });

  const doctor = await Doctor.findOne({ user: req.user._id });

  const record = await MedicalRecord.create({
    patient: patient._id,
    doctor: doctor._id,
    diagnosis,
    notes,
    treatments
  });

  res.status(201).json(record);
});

router.get("/patient/:healthCardId", protect, authorize("doctor"), async (req, res) => {
  const patient = await Patient.findOne({ healthCardId: req.params.healthCardId });
  if (!patient) return res.status(404).json({ message: "Patient not found" });

  const history = await MedicalRecord.find({ patient: patient._id })
    .populate("doctor")
    .sort({ visitDate: -1 });

  res.json({ patient, history });
});

export default router;