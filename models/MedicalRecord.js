import mongoose from "mongoose";

const medicalRecordSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
    diagnosis: { type: String, required: true },
    notes: String,
    treatments: [String],
    visitDate: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

medicalRecordSchema.index({ patient: 1 });

export default mongoose.model("MedicalRecord", medicalRecordSchema);