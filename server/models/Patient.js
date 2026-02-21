import mongoose from "mongoose";
import {
  isValidBloodGroup,
  isValidDob,
  isValidFullName,
  isValidHealthCardId,
  isValidPhone,
  normalizeAllergies,
  normalizeBloodGroup,
  normalizeHealthCardId,
  normalizePhone,
  sanitizeText
} from "../utils/validation.js";

const  generateHealthCardId = () =>{
  const now = new Date();

  const year = now.getFullYear().toString().slice(-2); // 26
  const month = String(now.getMonth() + 1).padStart(2, "0"); // 02

  const random = Math.floor(1000 + Math.random() * 9000); // 4 digits

  return `HC-${year}${month}-${random}`;
}


const patientSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
      validate: {
        validator: (value) => isValidFullName(value),
        message: "Enter a valid full name"
      }
    },
    healthCardId: {
      type: String,
      unique: true,
      default: () => generateHealthCardId(),
      set: (value) => normalizeHealthCardId(value),
      validate: {
        validator: (value) => isValidHealthCardId(value),
        message: "healthCardId must be in HC-1234-5678 format"
      }
    },
    qrCodeId: {
      type: String,
      unique: true,
      sparse: true,
      set: (value) => normalizeHealthCardId(value),
      validate: {
        validator: (value) => !value || isValidHealthCardId(value),
        message: "qrCodeId must be in HC-1234-5678 format"
      }
    },
    bloodGroup: {
      type: String,
      set: (value) => normalizeBloodGroup(value),
      validate: {
        validator: (value) => isValidBloodGroup(value),
        message: "Invalid blood group"
      }
    },
    dob: {
      type: Date,
      validate: {
        validator: (value) => isValidDob(value),
        message: "Date of birth must be a valid past date"
      }
    },
    phoneNumber: {
      type: String,
      set: (value) => normalizePhone(value),
      validate: {
        validator: (value) => isValidPhone(value),
        message: "Invalid phone number format"
      }
    },
    relativePhoneNumber: {
      type: String,
      set: (value) => normalizePhone(value),
      validate: {
        validator: (value) => isValidPhone(value),
        message: "Invalid relative phone number format"
      }
    },
    address: {
      type: String,
      trim: true,
      maxlength: 250,
      set: (value) => sanitizeText(value, 250)
    },
    allergies: {
      type: [String],
      default: [],
      set: (value) => normalizeAllergies(value),
      validate: {
        validator: (value) => Array.isArray(value) && value.every((item) => String(item).length <= 80),
        message: "Allergy values must be valid and <= 80 characters"
      }
    },
    doctorUpdateOtpCode: { type: String, default: null },
    doctorUpdateOtpExpires: { type: Date, default: null },
    doctorUpdateOtpVerified: { type: Boolean, default: false },
    doctorUpdateOtpRequestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true }
);

patientSchema.pre("validate", function () {
  this.fullName = sanitizeText(this.fullName, 80);

  if (!this.healthCardId) {
    this.healthCardId = generateHealthCardId();
  }

  if (!this.qrCodeId) {
    this.qrCodeId = this.healthCardId;
  }
});




export default mongoose.model("Patient", patientSchema);