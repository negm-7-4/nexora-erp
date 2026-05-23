import mongoose from "mongoose";

/*
 * One document per tenant holds the entire ERP dataset (the same shape the
 * frontend keeps in EMPTY_DATA). The frontend treats its data as a single blob
 * synced by `lastModified`, so we mirror that here with a flexible `data` field.
 */
const tenantDataSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, unique: true, index: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    lastModified: { type: Number, default: 0 },
  },
  { timestamps: true, minimize: false }
);

export const TenantData = mongoose.model("TenantData", tenantDataSchema);
