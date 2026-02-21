import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import Patient from "../models/Patient.js";
import MedicalRecord from "../models/MedicalRecord.js";
import {
  getValidationErrorMessage,
  isValidBloodGroup,
  isValidDob,
  isValidPhone,
  normalizeAllergies,
  normalizeBloodGroup,
  normalizePhone,
  sanitizeText
} from "../utils/validation.js";

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
      qrCodeId: patient.qrCodeId || patient.healthCardId,
      fullName: patient.fullName,
      name: patient.fullName,
      bloodGroup: patient.bloodGroup,
      dob: patient.dob,
      phone: patient.phoneNumber,
      relativePhone: patient.relativePhoneNumber,
      address: patient.address,
      allergies: patient.allergies,
      history
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to fetch profile" });
  }
});

router.patch("/me", protect, authorize("patient"), async (req, res) => {
  try {
    const patient = await Patient.findOne({ user: req.user._id });
    if (!patient) return res.status(404).json({ message: "Profile not found" });

    const { address, phone, phoneNumber, relativePhone, relativePhoneNumber, bloodGroup, dob, allergies } = req.body || {};

    if (typeof address !== "undefined") {
      patient.address = sanitizeText(address, 250);
    }

    if (typeof phone !== "undefined" || typeof phoneNumber !== "undefined") {
      const phoneValue = typeof phoneNumber !== "undefined" ? phoneNumber : phone;
      if (!isValidPhone(phoneValue)) {
        return res.status(400).json({ message: "Phone must contain a valid international format" });
      }
      patient.phoneNumber = normalizePhone(phoneValue);
    }

    if (typeof relativePhone !== "undefined" || typeof relativePhoneNumber !== "undefined") {
      const relativePhoneValue = typeof relativePhoneNumber !== "undefined" ? relativePhoneNumber : relativePhone;
      if (!isValidPhone(relativePhoneValue)) {
        return res.status(400).json({ message: "Relative phone must contain a valid international format" });
      }
      patient.relativePhoneNumber = normalizePhone(relativePhoneValue);
    }

    if (typeof bloodGroup !== "undefined") {
      if (!isValidBloodGroup(bloodGroup)) {
        return res.status(400).json({ message: "Blood group must be one of A+, A-, B+, B-, AB+, AB-, O+, O-" });
      }
      patient.bloodGroup = normalizeBloodGroup(bloodGroup);
    }

    if (typeof dob !== "undefined") {
      if (!isValidDob(dob)) {
        return res.status(400).json({ message: "Date of birth must be a valid past date" });
      }
      patient.dob = dob || null;
    }

    if (typeof allergies !== "undefined") {
      patient.allergies = normalizeAllergies(allergies).slice(0, 30);
    }

    await patient.save();

    return res.json({
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
        relativePhone: patient.relativePhoneNumber || "",
        address: patient.address || ""
      }
    });
  } catch (error) {
    const message = getValidationErrorMessage(error, "Failed to update profile");
    const statusCode = error?.name === "ValidationError" ? 400 : 500;
    return res.status(statusCode).json({ message });
  }
});

export default router;