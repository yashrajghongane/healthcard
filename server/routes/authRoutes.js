import express from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/User.js";
import Patient from "../models/Patient.js";
import Doctor from "../models/Doctor.js";

const router = express.Router();

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

const normalizeName = (value, fallback = "") => String(value || fallback).trim();
const RESET_CODE_LENGTH = 6;
const RESET_CODE_EXPIRY_MINUTES = 10;

const createResetCode = () => {
  const min = 10 ** (RESET_CODE_LENGTH - 1);
  const max = (10 ** RESET_CODE_LENGTH) - 1;
  return String(crypto.randomInt(min, max + 1));
};

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

const hasMakeConfig = () => Boolean(process.env.MAKE_WEBHOOK_URL);

const sendPasswordResetEmail = async ({ email, code }) => {
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
      channel: "password-reset",
      appName: "HealthCard",
      toEmail: email,
      resetCode: code,
      expiresInMinutes: RESET_CODE_EXPIRY_MINUTES,
      subject: "HealthCard password reset code",
      messageText: `Your HealthCard password reset code is ${code}. It expires in ${RESET_CODE_EXPIRY_MINUTES} minutes.`
    })
  });

  return response.ok;
};

const buildAuthResponse = async (user) => {
  const baseUser = {
    id: user._id,
    email: user.email,
    role: user.role
  };

  if (user.role === "patient") {
    const patient = await Patient.findOne({ user: user._id });
    return {
      ...baseUser,
      fullname: patient?.fullName || "Patient",
      cardId: patient?.healthCardId || null,
      qrCodeId: patient?.qrCodeId || patient?.healthCardId || null
    };
  }

  if (user.role === "doctor") {
    const doctor = await Doctor.findOne({ user: user._id });
    return {
      ...baseUser,
      fullname: doctor?.fullName || "Doctor"
    };
  }

  return baseUser;
};

router.post("/register", async (req, res) => {
  try {
    const { email, password, role, fullName, fullname } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const displayName = normalizeName(fullName, fullname);

    if (!normalizedEmail || !password || !role || !displayName) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const user = await User.create({ email: normalizedEmail, password, role });

    if (role === "patient") {
      await Patient.create({ user: user._id, fullName: displayName });
    }

    if (role === "doctor") {
      await Doctor.create({ user: user._id, fullName: displayName });
    }

    const authUser = await buildAuthResponse(user);
    res.status(201).json({ token: generateToken(user._id), role: user.role, user: authUser });
  } catch (error) {
    res.status(500).json({ message: error.message || "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const authUser = await buildAuthResponse(user);
    res.json({ token: generateToken(user._id), role: user.role, user: authUser });
  } catch (error) {
    res.status(500).json({ message: error.message || "Login failed" });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ message: "Valid email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ success: true, message: "If account exists, reset code has been sent." });
    }

    if (!hasMakeConfig()) {
      return res.status(503).json({ success: false, message: "Make.com email service is not configured. Please try again later." });
    }

    const code = createResetCode();
    const expiresAt = new Date(Date.now() + RESET_CODE_EXPIRY_MINUTES * 60 * 1000);

    user.passwordResetCode = code;
    user.passwordResetExpires = expiresAt;
    user.passwordResetVerified = false;
    await user.save();

    const sentByEmail = await sendPasswordResetEmail({ email, code });
    if (!sentByEmail) {
      user.passwordResetCode = null;
      user.passwordResetExpires = null;
      user.passwordResetVerified = false;
      await user.save();
      return res.status(503).json({ success: false, message: "Unable to send reset code email. Please try again later." });
    }

    return res.json({
      success: true,
      message: "If account exists, reset code has been sent."
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to process request" });
  }
});

router.post("/forgot-password/verify", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const code = String(req.body?.code || "").trim();

    if (!email || !code) {
      return res.status(400).json({ success: false, message: "Email and code are required" });
    }

    const user = await User.findOne({ email });
    if (!user || !user.passwordResetCode || !user.passwordResetExpires) {
      return res.status(400).json({ success: false, message: "Invalid or expired code" });
    }

    const isExpired = user.passwordResetExpires.getTime() < Date.now();
    const isCodeMismatch = user.passwordResetCode !== code;

    if (isExpired || isCodeMismatch) {
      return res.status(400).json({ success: false, message: "Invalid or expired code" });
    }

    user.passwordResetVerified = true;
    await user.save();

    return res.json({ success: true, message: "Code verified successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Code verification failed" });
  }
});

router.post("/forgot-password/reset", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const newPassword = String(req.body?.newPassword || "").trim();

    if (!email || !newPassword) {
      return res.status(400).json({ success: false, message: "Email and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }

    const user = await User.findOne({ email });
    if (!user || !user.passwordResetVerified || !user.passwordResetExpires) {
      return res.status(400).json({ success: false, message: "Reset flow not verified" });
    }

    if (user.passwordResetExpires.getTime() < Date.now()) {
      return res.status(400).json({ success: false, message: "Reset code expired. Please request again." });
    }

    user.password = newPassword;
    user.passwordResetCode = null;
    user.passwordResetExpires = null;
    user.passwordResetVerified = false;
    await user.save();

    return res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Password reset failed" });
  }
});

export default router;