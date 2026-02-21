import mongoose from "mongoose";
import { normalizeAllergies, sanitizeText } from "../utils/validation.js";

const medicalRecordSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
    diagnosis: { type: String, required: true, trim: true, minlength: 2, maxlength: 500 },
    notes: { type: String, trim: true, maxlength: 2000 },
    treatments: {
      type: [String],
      default: [],
      set: (value) => normalizeAllergies(value).slice(0, 20),
      validate: {
        validator: (value) => Array.isArray(value) && value.every((item) => String(item).length <= 80),
        message: "Treatments must be valid and <= 80 characters each"
      }
    },
    visitDate: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

medicalRecordSchema.index({ patient: 1 });

medicalRecordSchema.pre("validate", function () {
  this.diagnosis = sanitizeText(this.diagnosis, 500);
  this.notes = sanitizeText(this.notes, 2000);
});

export default mongoose.model("MedicalRecord", medicalRecordSchema);