import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    name: { type: String, default: "" },
    passwordHash: { type: String, required: true },
    tenantId: { type: String, required: true, index: true },
    isOwner: { type: Boolean, default: true },
    isSuperAdmin: { type: Boolean, default: false },
    status: { type: String, enum: ["active", "disabled"], default: "active" },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
