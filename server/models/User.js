import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { isValidEmail } from "../utils/validation.js";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: (value) => isValidEmail(value),
        message: "Enter a valid email address"
      }
    },
    password: { type: String, required: true, minlength: 6, maxlength: 72 },
    role: { type: String, enum: ["doctor", "patient"], required: true },
    passwordResetCode: { type: String, default: null },
    passwordResetExpires: { type: Date, default: null },
    passwordResetVerified: { type: Boolean, default: false }
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model("User", userSchema);