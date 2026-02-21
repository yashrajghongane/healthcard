import express from "express";
import crypto from "crypto";
import { protect, authorize } from "../middleware/authMiddleware.js";
import Patient from "../models/Patient.js";
import Doctor from "../models/Doctor.js";
import MedicalRecord from "../models/MedicalRecord.js";
import User from "../models/User.js";
import {
  getValidationErrorMessage,
  isValidBloodGroup,
  isValidDob,
  isValidFullName,
  isValidHealthCardId,
  isValidOtp,
  isValidPhone,
  normalizeAllergies,
  normalizeBloodGroup,
  normalizeFullName,
  normalizeHealthCardId,
  normalizePhone,
  sanitizeText
} from "../utils/validation.js";

const router = express.Router();
const VISIT_OTP_LENGTH = 6;
const VISIT_OTP_EXPIRY_MINUTES = 10;

const createVisitOtpCode = () => {
  const min = 10 ** (VISIT_OTP_LENGTH - 1);
  const max = (10 ** VISIT_OTP_LENGTH) - 1;
  return String(crypto.randomInt(min, max + 1));
};

const hasMakeConfig = () => Boolean(process.env.MAKE_WEBHOOK_URL);

router.get("/me", protect, authorize("doctor"), async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ user: req.user._id });
    if (!doctor) {
      return res.status(404).json({ message: "Doctor profile not found" });
    }

    return res.json({
      fullName: doctor.fullName,
      specialization: doctor.specialization || "",
      hospitalName: doctor.hospitalName || ""
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to fetch doctor profile" });
  }
});

router.patch("/me", protect, authorize("doctor"), async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ user: req.user._id });
    if (!doctor) {
      return res.status(404).json({ message: "Doctor profile not found" });
    }

    const { fullName, specialization, hospitalName } = req.body || {};

    if (typeof fullName !== "undefined") {
      const normalizedName = normalizeFullName(fullName);
      if (!normalizedName || !isValidFullName(normalizedName)) {
        return res.status(400).json({ message: "Enter a valid full name" });
      }
      doctor.fullName = normalizedName;
    }

    if (typeof specialization !== "undefined") {
      doctor.specialization = sanitizeText(specialization, 120);
    }

    if (typeof hospitalName !== "undefined") {
      doctor.hospitalName = sanitizeText(hospitalName, 160);
    }

    await doctor.save();

    return res.json({
      profile: {
        fullName: doctor.fullName,
        specialization: doctor.specialization || "",
        hospitalName: doctor.hospitalName || ""
      }
    });
  } catch (error) {
    const message = getValidationErrorMessage(error, "Failed to update doctor profile");
    const statusCode = error?.name === "ValidationError" ? 400 : 500;
    return res.status(statusCode).json({ message });
  }
});

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
    const healthCardId = normalizeHealthCardId(req.body?.healthCardId);
    if (!healthCardId || !isValidHealthCardId(healthCardId)) {
      return res.status(400).json({ success: false, message: "healthCardId must be in HC-1234-5678 format" });
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
    const healthCardId = normalizeHealthCardId(req.body?.healthCardId);
    const otp = String(req.body?.otp || "").trim();

    if (!healthCardId || !otp) {
      return res.status(400).json({ success: false, message: "healthCardId and otp are required" });
    }

    if (!isValidHealthCardId(healthCardId) || !isValidOtp(otp)) {
      return res.status(400).json({ success: false, message: "Invalid healthCardId or otp format" });
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
    const normalizedCardId = normalizeHealthCardId(healthCardId);
    const normalizedDiagnosis = sanitizeText(diagnosis, 500);
    const normalizedNotes = sanitizeText(notes, 2000);
    const normalizedTreatments = normalizeAllergies(treatments).slice(0, 20);

    if (!isValidHealthCardId(normalizedCardId)) {
      return res.status(400).json({ message: "healthCardId must be in HC-1234-5678 format" });
    }

    if (!normalizedDiagnosis || normalizedDiagnosis.length < 2) {
      return res.status(400).json({ message: "Diagnosis is required and must be at least 2 characters" });
    }

    const patient = await Patient.findOne({ healthCardId: normalizedCardId });
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
      diagnosis: normalizedDiagnosis,
      notes: normalizedNotes,
      treatments: normalizedTreatments
    });

    patient.doctorUpdateOtpCode = null;
    patient.doctorUpdateOtpExpires = null;
    patient.doctorUpdateOtpVerified = false;
    patient.doctorUpdateOtpRequestedBy = null;
    await patient.save();

    res.status(201).json(record);
  } catch (error) {
    const message = getValidationErrorMessage(error, "Failed to add medical record");
    const statusCode = error?.name === "ValidationError" ? 400 : 500;
    res.status(statusCode).json({ message });
  }
});

router.patch("/patient/:healthCardId", protect, authorize("doctor"), async (req, res) => {
  try {
    const healthCardId = normalizeHealthCardId(req.params.healthCardId);
    const { dob, bloodGroup, allergies, phone, phoneNumber, relativePhone, relativePhoneNumber, address } = req.body;

    if (!isValidHealthCardId(healthCardId)) {
      return res.status(400).json({ message: "healthCardId must be in HC-1234-5678 format" });
    }

    const patient = await Patient.findOne({ healthCardId });
    if (!patient) return res.status(404).json({ message: "Patient not found" });

    if (typeof dob !== "undefined") {
      if (!isValidDob(dob)) {
        return res.status(400).json({ message: "Date of birth must be a valid past date" });
      }
      patient.dob = dob || null;
    }

    if (typeof bloodGroup !== "undefined") {
      if (!isValidBloodGroup(bloodGroup)) {
        return res.status(400).json({ message: "Blood group must be one of A+, A-, B+, B-, AB+, AB-, O+, O-" });
      }
      patient.bloodGroup = normalizeBloodGroup(bloodGroup);
    }

    if (typeof allergies !== "undefined") {
      patient.allergies = normalizeAllergies(allergies).slice(0, 30);
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

    if (typeof address !== "undefined") {
      patient.address = sanitizeText(address, 250);
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
        relativePhone: patient.relativePhoneNumber || "",
        address: patient.address || ""
      }
    });
  } catch (error) {
    const message = getValidationErrorMessage(error, "Failed to update patient profile");
    const statusCode = error?.name === "ValidationError" ? 400 : 500;
    res.status(statusCode).json({ message });
  }
});

router.get("/patient/:healthCardId", protect, authorize("doctor"), async (req, res) => {
  try {
    const healthCardId = normalizeHealthCardId(req.params.healthCardId);
    if (!isValidHealthCardId(healthCardId)) {
      return res.status(400).json({ message: "healthCardId must be in HC-1234-5678 format" });
    }

    const patient = await Patient.findOne({ healthCardId });
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