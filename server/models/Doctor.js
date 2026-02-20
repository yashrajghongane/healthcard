import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    fullName: { type: String, required: true },
    specialization: String,
    hospitalName: String
  },
  { timestamps: true }
);

export default mongoose.model("Doctor", doctorSchema);