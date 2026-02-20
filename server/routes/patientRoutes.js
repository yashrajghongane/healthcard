import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import Patient from "../models/Patient.js";
import MedicalRecord from "../models/MedicalRecord.js";

const router = express.Router();

router.get("/me", protect, authorize("patient"), async (req, res) => {
  try {
    const patient = await Patient.findOne({ user: req.user._id });
    if (!patient) return res.status(404).json({ message: "Profile not found" });

    const history = await MedicalRecord.find({ patient: patient._id })
      .populate("doctor")
      .sort({ visitDate: -1 });

    res.json({
      healthCardId: patient.healthCardId,
      cardId: patient.healthCardId,
      fullName: patient.fullName,
      name: patient.fullName,
      bloodGroup: patient.bloodGroup,
      dob: patient.dob,
      phone: patient.phoneNumber,
      allergies: patient.allergies,
      history
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to fetch profile" });
  }
});

export default router;