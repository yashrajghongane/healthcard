import mongoose from "mongoose";

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
    fullName: { type: String, required: true },
    healthCardId: {
      type: String,
      unique: true,
      default: () => generateHealthCardId()
    },
    qrCodeId: {
      type: String,
      unique: true,
      sparse: true
    },
    bloodGroup: String,
    dob: Date,
    phoneNumber: String,
    relativePhoneNumber: String,
    allergies: [String]
  },
  { timestamps: true }
);

patientSchema.pre("validate", function () {
  if (!this.healthCardId) {
    this.healthCardId = generateHealthCardId();
  }

  if (!this.qrCodeId) {
    this.qrCodeId = this.healthCardId;
  }
});




export default mongoose.model("Patient", patientSchema);