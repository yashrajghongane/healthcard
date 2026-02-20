import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import Patient from "../models/Patient.js";
import Doctor from "../models/Doctor.js";
import MedicalRecord from "../models/MedicalRecord.js";

const router = express.Router();

router.post("/visit", protect, authorize("doctor"), async (req, res) => {
  try {
    const { healthCardId, diagnosis, notes, treatments } = req.body;

    const patient = await Patient.findOne({ healthCardId });
    if (!patient) return res.status(404).json({ message: "Patient not found" });

    const doctor = await Doctor.findOne({ user: req.user._id });
    if (!doctor) return res.status(404).json({ message: "Doctor profile not found" });

    const record = await MedicalRecord.create({
      patient: patient._id,
      doctor: doctor._id,
      diagnosis,
      notes,
      treatments
    });

    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to add medical record" });
  }
});

router.patch("/patient/:healthCardId", protect, authorize("doctor"), async (req, res) => {
  try {
    const { healthCardId } = req.params;
    const { dob, bloodGroup, allergies, phone, phoneNumber, relativePhone, relativePhoneNumber } = req.body;

    const patient = await Patient.findOne({ healthCardId });
    if (!patient) return res.status(404).json({ message: "Patient not found" });

    if (typeof dob !== "undefined") {
      patient.dob = dob || null;
    }

    if (typeof bloodGroup !== "undefined") {
      patient.bloodGroup = String(bloodGroup || "").trim();
    }

    if (typeof allergies !== "undefined") {
      if (Array.isArray(allergies)) {
        patient.allergies = allergies.map((item) => String(item).trim()).filter(Boolean);
      } else if (typeof allergies === "string") {
        patient.allergies = allergies
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
      } else {
        patient.allergies = [];
      }
    }

    if (typeof phone !== "undefined" || typeof phoneNumber !== "undefined") {
      const phoneValue = typeof phoneNumber !== "undefined" ? phoneNumber : phone;
      patient.phoneNumber = String(phoneValue || "").trim();
    }

    if (typeof relativePhone !== "undefined" || typeof relativePhoneNumber !== "undefined") {
      const relativePhoneValue = typeof relativePhoneNumber !== "undefined" ? relativePhoneNumber : relativePhone;
      patient.relativePhoneNumber = String(relativePhoneValue || "").trim();
    }

    await patient.save();

    res.json({
      patient: {
        cardId: patient.healthCardId,
        healthCardId: patient.healthCardId,
        qrCodeId: patient.qrCodeId || patient.healthCardId,
        name: patient.fullName,
        fullName: patient.fullName,
        dob: patient.dob,
        bloodGroup: patient.bloodGroup || "",
        allergies: patient.allergies || [],
        phone: patient.phoneNumber || "",
        relativePhone: patient.relativePhoneNumber || ""
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to update patient profile" });
  }
});

router.get("/patient/:healthCardId", protect, authorize("doctor"), async (req, res) => {
  try {
    const patient = await Patient.findOne({ healthCardId: req.params.healthCardId });
    if (!patient) return res.status(404).json({ message: "Patient not found" });

    const history = await MedicalRecord.find({ patient: patient._id })
      .populate("doctor")
      .sort({ visitDate: -1 });

    res.json({ patient, history });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to fetch patient" });
  }
});

export default router;