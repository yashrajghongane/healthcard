import express from "express";
import Patient from "../models/Patient.js";
import MedicalRecord from "../models/MedicalRecord.js";
import { isValidHealthCardId, normalizeHealthCardId } from "../utils/validation.js";

const router = express.Router();

router.get("/emergency/scan/:qrCodeId", async (req, res) => {
  try {
    const qrCodeId = normalizeHealthCardId(req.params.qrCodeId);
    if (!qrCodeId) {
      return res.status(400).json({ message: "QR code is required" });
    }

    if (!isValidHealthCardId(qrCodeId)) {
      return res.status(400).json({ message: "QR/Card ID must be in HC-1234-5678 format" });
    }

    const patient = await Patient.findOne({
      $or: [{ qrCodeId }, { healthCardId: qrCodeId }]
    });

    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    const history = await MedicalRecord.find({ patient: patient._id })
      .populate("doctor")
      .sort({ visitDate: -1 });

    res.json({
      emergency: {
        cardId: patient.healthCardId,
        qrCodeId: patient.qrCodeId || patient.healthCardId,
        fullName: patient.fullName,
        bloodGroup: patient.bloodGroup || "",
        dob: patient.dob,
        phoneNumber: patient.phoneNumber || "",
        relativePhoneNumber: patient.relativePhoneNumber || "",
        allergies: patient.allergies || [],
        history
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to fetch emergency profile" });
  }
});

export default router;