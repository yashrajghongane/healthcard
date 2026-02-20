import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Patient from "../models/Patient.js";
import Doctor from "../models/Doctor.js";

const router = express.Router();

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

const normalizeName = (value, fallback = "") => String(value || fallback).trim();

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

export default router;