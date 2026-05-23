import mongoose from "mongoose";

/*
 * Singleton platform configuration, editable only by the super admin.
 * Holds the payment destinations (Vodafone Cash number / InstaPay handle) that
 * customers transfer to. Stored in the DB (not just env) so the super admin can
 * change them at any time — and so the receiving numbers are never ambiguous.
 */
const platformSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "global", unique: true, index: true },
    vodafoneCashNumber: { type: String, default: "" },
    vodafoneCashName: { type: String, default: "" }, // wallet holder name, shown for confirmation
    instapayHandle: { type: String, default: "" },
    instapayName: { type: String, default: "" },
    payInstructions: { type: String, default: "" },
    // Super-admin override of which modules each plan unlocks: { [planId]: [keys] }
    planModules: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export const PlatformSettings = mongoose.model("PlatformSettings", platformSettingsSchema);

// Always returns the single settings doc, seeding from env on first read.
export async function getPlatformSettings() {
  let doc = await PlatformSettings.findOne({ key: "global" });
  if (!doc) {
    doc = await PlatformSettings.create({
      key: "global",
      vodafoneCashNumber: process.env.VODAFONE_CASH_NUMBER || "",
      instapayHandle: process.env.INSTAPAY_HANDLE || "",
    });
  }
  return doc;
}
