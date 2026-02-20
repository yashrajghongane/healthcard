import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Patient from "../models/Patient.js";
import Doctor from "../models/Doctor.js";

const router = express.Router();

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

router.post("/register", async (req, res) => {
  const { email, password, role, fullName } = req.body;

  const user = await User.create({ email, password, role });

  if (role === "patient") {
    await Patient.create({ user: user._id, fullName });
  }

  if (role === "doctor") {
    await Doctor.create({ user: user._id, fullName });
  }

  res.json({ token: generateToken(user._id), role });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  res.json({ token: generateToken(user._id), role: user.role });
});

export default router;