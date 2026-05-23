import mongoose from "mongoose";

/*
 * A payment record. With the manual flow, a customer transfers via Vodafone
 * Cash / InstaPay and submits the transaction reference here; the super admin
 * verifies it and the tenant's plan is upgraded. A real gateway (Paymob /
 * Kashier) can later populate `gatewayRef` and flip status to "paid"
 * automatically via webhook.
 */
const paymentSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true },
    email: { type: String, default: "", lowercase: true, trim: true },
    plan: { type: String, required: true },
    amountEGP: { type: Number, required: true },
    method: { type: String, enum: ["vodafone_cash", "instapay", "gateway"], required: true },
    reference: { type: String, default: "" }, // customer-supplied transfer/transaction ref
    gatewayRef: { type: String, default: "" }, // populated when a real gateway is used
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Payment = mongoose.model("Payment", paymentSchema);
