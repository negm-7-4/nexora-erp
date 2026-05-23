import { Router } from "express";
import { PLANS, getPlan, modulesForPlan } from "../config/plans.js";
import { Payment } from "../models/Payment.js";
import { Tenant } from "../models/Tenant.js";
import { getPlatformSettings } from "../models/PlatformSettings.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// GET /billing/plans — list of plans plus the super-admin-configured payment
// destinations (Vodafone Cash / InstaPay) that customers transfer to.
router.get("/billing/plans", async (req, res) => {
  try {
    const s = await getPlatformSettings();
    res.json({
      success: true,
      plans: PLANS.map((p) => ({ ...p, modules: modulesForPlan(p.id, s.planModules) })),
      payment: {
        vodafoneCash: s.vodafoneCashNumber || "",
        vodafoneCashName: s.vodafoneCashName || "",
        instapay: s.instapayHandle || "",
        instapayName: s.instapayName || "",
        instructions: s.payInstructions || "",
        // When a real gateway is configured, the frontend can offer card checkout.
        gatewayEnabled: Boolean(process.env.PAYMOB_API_KEY || process.env.KASHIER_API_KEY),
      },
    });
  } catch (err) {
    console.error("billing plans error:", err);
    res.status(500).json({ success: false, error: "Failed to load plans" });
  }
});

// GET /billing/me — the signed-in tenant's current plan + payment history.
router.get("/billing/me", requireAuth, async (req, res) => {
  try {
    const tenant = await Tenant.findOne({ tenantId: req.user.tenantId }).lean();
    const payments = await Payment.find({ tenantId: req.user.tenantId }).sort({ createdAt: -1 }).limit(20).lean();
    const s = await getPlatformSettings();
    const plan = tenant?.plan || "free";
    const modules = req.user.isSuperAdmin ? ["*"] : modulesForPlan(plan, s.planModules);
    res.json({ success: true, plan, status: tenant?.status || "active", modules, payments });
  } catch (err) {
    console.error("billing me error:", err);
    res.status(500).json({ success: false, error: "Failed to load billing info" });
  }
});

// POST /billing/submit — customer reports a Vodafone Cash / InstaPay transfer.
// Creates a pending payment for the super admin to verify.
router.post("/billing/submit", requireAuth, async (req, res) => {
  try {
    const { plan, method, reference } = req.body || {};
    const planDef = getPlan(plan);
    if (!planDef || planDef.id === "free") {
      return res.status(400).json({ success: false, error: "Choose a paid plan" });
    }
    if (!["vodafone_cash", "instapay"].includes(method)) {
      return res.status(400).json({ success: false, error: "Unsupported payment method" });
    }
    if (!reference || String(reference).trim().length < 4) {
      return res.status(400).json({ success: false, error: "Enter the transaction reference from your transfer" });
    }
    const payment = await Payment.create({
      tenantId: req.user.tenantId,
      email: req.user.email,
      plan: planDef.id,
      amountEGP: planDef.priceEGP,
      method,
      reference: String(reference).trim(),
      status: "pending",
    });
    res.json({
      success: true,
      payment,
      message: "Payment submitted. It will be activated once verified (usually within a few hours).",
    });
  } catch (err) {
    console.error("billing submit error:", err);
    res.status(500).json({ success: false, error: "Failed to submit payment" });
  }
});

export default router;
