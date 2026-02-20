import mongoose from "mongoose";
import { randomUUID } from "crypto";

const patientSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    fullName: { type: String, required: true },
    healthCardId: {
      type: String,
      unique: true,
      default: () => randomUUID()
    },
    bloodGroup: String,
    dob: Date,
    phoneNumber: String,
    allergies: [String]
  },
  { timestamps: true }
);

export default mongoose.model("Patient", patientSchema);