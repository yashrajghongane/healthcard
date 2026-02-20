import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import Patient from "../models/Patient.js";
import MedicalRecord from "../models/MedicalRecord.js";

const router = express.Router();

router.get("/me", protect, authorize("patient"), async (req, res) => {
  const patient = await Patient.findOne({ user: req.user._id });
  if (!patient) return res.status(404).json({ message: "Profile not found" });

  const history = await MedicalRecord.find({ patient: patient._id })
    .populate("doctor")
    .sort({ visitDate: -1 });

  res.json({
    healthCardId: patient.healthCardId,
    fullName: patient.fullName,
    bloodGroup: patient.bloodGroup,
    allergies: patient.allergies,
    history
  });
});

export default router;