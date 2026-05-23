import mongoose from "mongoose";

/*
 * A tenant is one company workspace. Created automatically when its owner
 * registers. The super admin manages all tenants from the SaaS platform; each
 * company only ever sees its own data (resolved from the JWT tenantId).
 */
const tenantSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, unique: true, index: true },
    name: { type: String, default: "" },
    ownerEmail: { type: String, default: "", lowercase: true, trim: true },
    plan: { type: String, enum: ["free", "pro", "enterprise"], default: "free" },
    status: { type: String, enum: ["active", "suspended"], default: "active" },
  },
  { timestamps: true }
);

export const Tenant = mongoose.model("Tenant", tenantSchema);
