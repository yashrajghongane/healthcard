import mongoose from "mongoose";
import { isValidFullName, sanitizeText } from "../utils/validation.js";

const doctorSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
      set: (value) => sanitizeText(value, 80),
      validate: {
        validator: (value) => isValidFullName(value),
        message: "Enter a valid full name"
      }
    },
    specialization: {
      type: String,
      trim: true,
      maxlength: 120,
      set: (value) => sanitizeText(value, 120)
    },
    hospitalName: {
      type: String,
      trim: true,
      maxlength: 160,
      set: (value) => sanitizeText(value, 160)
    }
  },
  { timestamps: true }
);

export default mongoose.model("Doctor", doctorSchema);