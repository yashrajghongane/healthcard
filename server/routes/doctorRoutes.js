import express from "express";
import crypto from "crypto";
import { protect, authorize } from "../middleware/authMiddleware.js";
import Patient from "../models/Patient.js";
import Doctor from "../models/Doctor.js";
import MedicalRecord from "../models/MedicalRecord.js";
import User from "../models/User.js";

const router = express.Router();
const VISIT_OTP_LENGTH = 6;
const VISIT_OTP_EXPIRY_MINUTES = 10;

const createVisitOtpCode = () => {
  const min = 10 ** (VISIT_OTP_LENGTH - 1);
  const max = (10 ** VISIT_OTP_LENGTH) - 1;
  return String(crypto.randomInt(min, max + 1));
};

const hasMakeConfig = () => Boolean(process.env.MAKE_WEBHOOK_URL);

const sendVisitOtpEmail = async ({ email, code, healthCardId }) => {
  if (!hasMakeConfig()) {
    return false;
  }

  const headers = {
    "Content-Type": "application/json"
  };

  const makeApiKey = process.env.MAKE_WEBHOOK_API_KEY || process.env.MAKE_WEBHOOK_TOKEN;
  if (makeApiKey) {
    headers["x-make-apikey"] = makeApiKey;
  }

  const response = await fetch(String(process.env.MAKE_WEBHOOK_URL).trim(), {
    method: "POST",
    headers,
    body: JSON.stringify({
      channel: "doctor-medical-record-otp",
      appName: "HealthCard",
      toEmail: email,
      resetCode: code,
      expiresInMinutes: VISIT_OTP_EXPIRY_MINUTES,
      subject: "HealthCard medical record verification code",
      messageText: `Your verification code for medical record update (Card ID: ${healthCardId}) is ${code}. It expires in ${VISIT_OTP_EXPIRY_MINUTES} minutes.`
    })
  });

  return response.ok;
};

router.post("/visit/request-otp", protect, authorize("doctor"), async (req, res) => {
  try {
    const healthCardId = String(req.body?.healthCardId || "").trim();
    if (!healthCardId) {
      return res.status(400).json({ success: false, message: "healthCardId is required" });
    }

    const patient = await Patient.findOne({ healthCardId });
    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }

    const patientUser = await User.findById(patient.user);
    if (!patientUser || !patientUser.email) {
      return res.status(400).json({ success: false, message: "Patient email is not available" });
    }

    if (!hasMakeConfig()) {
      return res.status(503).json({ success: false, message: "Make.com email service is not configured" });
    }

    const code = createVisitOtpCode();
    const expiresAt = new Date(Date.now() + VISIT_OTP_EXPIRY_MINUTES * 60 * 1000);

    patient.doctorUpdateOtpCode = code;
    patient.doctorUpdateOtpExpires = expiresAt;
    patient.doctorUpdateOtpVerified = false;
    patient.doctorUpdateOtpRequestedBy = req.user._id;
    await patient.save();

    const sent = await sendVisitOtpEmail({
      email: patientUser.email,
      code,
      healthCardId
    });

    if (!sent) {
      patient.doctorUpdateOtpCode = null;
      patient.doctorUpdateOtpExpires = null;
      patient.doctorUpdateOtpVerified = false;
      patient.doctorUpdateOtpRequestedBy = null;
      await patient.save();
      return res.status(503).json({ success: false, message: "Unable to send OTP email" });
    }

    return res.json({ success: true, message: "OTP sent to patient email" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to send OTP" });
  }
});

router.post("/visit/verify-otp", protect, authorize("doctor"), async (req, res) => {
  try {
    const healthCardId = String(req.body?.healthCardId || "").trim();
    const otp = String(req.body?.otp || "").trim();

    if (!healthCardId || !otp) {
      return res.status(400).json({ success: false, message: "healthCardId and otp are required" });
    }

    const patient = await Patient.findOne({ healthCardId });
    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }

    if (
      !patient.doctorUpdateOtpCode ||
      !patient.doctorUpdateOtpExpires ||
      !patient.doctorUpdateOtpRequestedBy ||
      String(patient.doctorUpdateOtpRequestedBy) !== String(req.user._id)
    ) {
      return res.status(400).json({ success: false, message: "OTP request not found for this doctor" });
    }

    const isExpired = patient.doctorUpdateOtpExpires.getTime() < Date.now();
    if (isExpired || patient.doctorUpdateOtpCode !== otp) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }

    patient.doctorUpdateOtpVerified = true;
    await patient.save();

    return res.json({ success: true, message: "OTP verified" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to verify OTP" });
  }
});

router.post("/visit", protect, authorize("doctor"), async (req, res) => {
  try {
    const { healthCardId, diagnosis, notes, treatments } = req.body;

    const patient = await Patient.findOne({ healthCardId });
    if (!patient) return res.status(404).json({ message: "Patient not found" });

    if (
      !patient.doctorUpdateOtpVerified ||
      !patient.doctorUpdateOtpExpires ||
      !patient.doctorUpdateOtpRequestedBy ||
      String(patient.doctorUpdateOtpRequestedBy) !== String(req.user._id) ||
      patient.doctorUpdateOtpExpires.getTime() < Date.now()
    ) {
      return res.status(403).json({ message: "OTP verification required before adding medical record" });
    }

    const doctor = await Doctor.findOne({ user: req.user._id });
    if (!doctor) return res.status(404).json({ message: "Doctor profile not found" });

    const record = await MedicalRecord.create({
      patient: patient._id,
      doctor: doctor._id,
      diagnosis,
      notes,
      treatments
    });

    patient.doctorUpdateOtpCode = null;
    patient.doctorUpdateOtpExpires = null;
    patient.doctorUpdateOtpVerified = false;
    patient.doctorUpdateOtpRequestedBy = null;
    await patient.save();

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