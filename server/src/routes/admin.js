import { Router } from "express";
import { Tenant } from "../models/Tenant.js";
import { User } from "../models/User.js";
import { TenantData } from "../models/TenantData.js";
import { Payment } from "../models/Payment.js";
import { PlatformSettings, getPlatformSettings } from "../models/PlatformSettings.js";
import { PLANS, GATEABLE_MODULES, modulesForPlan } from "../config/plans.js";
import { requireSuperAdmin } from "../middleware/auth.js";

const router = Router();

// Every route here is super-admin only — this is the SaaS control plane.
router.use(requireSuperAdmin);

// GET /admin/plan-features — the module catalog + effective modules per plan.
router.get("/admin/plan-features", async (req, res) => {
  try {
    const s = await getPlatformSettings();
    const plans = PLANS.map((p) => ({
      id: p.id,
      name: p.name,
      priceEGP: p.priceEGP,
      modules: modulesForPlan(p.id, s.planModules),
    }));
    res.json({ success: true, catalog: GATEABLE_MODULES, plans });
  } catch (err) {
    console.error("get plan-features error:", err);
    res.status(500).json({ success: false, error: "Failed to load plan features" });
  }
});

// PUT /admin/plan-features — override which modules a plan unlocks.
// Body: { planId: "pro", modules: ["hr","crm",...] }
router.put("/admin/plan-features", async (req, res) => {
  try {
    const { planId, modules } = req.body || {};
    if (!PLANS.some((p) => p.id === planId)) {
      return res.status(400).json({ success: false, error: "Unknown plan" });
    }
    if (!Array.isArray(modules)) {
      return res.status(400).json({ success: false, error: "modules must be an array" });
    }
    const valid = new Set(GATEABLE_MODULES.map((m) => m.key));
    const cleaned = modules.filter((m) => valid.has(m));
    const s = await getPlatformSettings();
    const next = { ...(s.planModules || {}), [planId]: cleaned };
    s.planModules = next;
    s.markModified("planModules");
    await s.save();
    res.json({ success: true, planId, modules: cleaned });
  } catch (err) {
    console.error("put plan-features error:", err);
    res.status(500).json({ success: false, error: "Failed to update plan features" });
  }
});

// GET /admin/payment-settings — the receiving Vodafone Cash / InstaPay accounts.
router.get("/admin/payment-settings", async (req, res) => {
  try {
    const s = await getPlatformSettings();
    res.json({
      success: true,
      settings: {
        vodafoneCashNumber: s.vodafoneCashNumber,
        vodafoneCashName: s.vodafoneCashName,
        instapayHandle: s.instapayHandle,
        instapayName: s.instapayName,
        payInstructions: s.payInstructions,
      },
    });
  } catch (err) {
    console.error("get payment-settings error:", err);
    res.status(500).json({ success: false, error: "Failed to load payment settings" });
  }
});

// PUT /admin/payment-settings — update the receiving accounts. Only the super
// admin can do this, so payments always land in the right wallet.
router.put("/admin/payment-settings", async (req, res) => {
  try {
    const allowed = ["vodafoneCashNumber", "vodafoneCashName", "instapayHandle", "instapayName", "payInstructions"];
    const patch = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) patch[k] = String(req.body[k]).trim();
    }
    const s = await PlatformSettings.findOneAndUpdate(
      { key: "global" },
      { key: "global", ...patch },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, settings: s });
  } catch (err) {
    console.error("put payment-settings error:", err);
    res.status(500).json({ success: false, error: "Failed to save payment settings" });
  }
});

// GET /admin/tenants — list every company workspace with its user count.
router.get("/admin/tenants", async (req, res) => {
  try {
    const tenants = await Tenant.find().sort({ createdAt: -1 }).lean();
    const counts = await User.aggregate([{ $group: { _id: "$tenantId", n: { $sum: 1 } } }]);
    const countMap = Object.fromEntries(counts.map((c) => [c._id, c.n]));
    res.json({
      success: true,
      tenants: tenants.map((t) => ({
        id: t.tenantId,
        name: t.name,
        email: t.ownerEmail,
        plan: t.plan,
        status: t.status,
        users: countMap[t.tenantId] || 0,
        createdAt: t.createdAt,
      })),
    });
  } catch (err) {
    console.error("admin tenants error:", err);
    res.status(500).json({ success: false, error: "Failed to load tenants" });
  }
});

// PATCH /admin/tenants/:tenantId — update plan and/or status.
router.patch("/admin/tenants/:tenantId", async (req, res) => {
  try {
    const patch = {};
    if (req.body.status) patch.status = req.body.status;
    if (req.body.plan) patch.plan = req.body.plan;
    if (req.body.name) patch.name = req.body.name;
    const tenant = await Tenant.findOneAndUpdate({ tenantId: req.params.tenantId }, patch, { new: true });
    if (!tenant) return res.status(404).json({ success: false, error: "Tenant not found" });
    res.json({ success: true, tenant });
  } catch (err) {
    console.error("admin patch tenant error:", err);
    res.status(500).json({ success: false, error: "Failed to update tenant" });
  }
});

// DELETE /admin/tenants/:tenantId — remove a company and all of its data.
router.delete("/admin/tenants/:tenantId", async (req, res) => {
  try {
    const { tenantId } = req.params;
    await Promise.all([
      Tenant.deleteOne({ tenantId }),
      User.deleteMany({ tenantId }),
      TenantData.deleteOne({ tenantId }),
      Payment.deleteMany({ tenantId }),
    ]);
    res.json({ success: true });
  } catch (err) {
    console.error("admin delete tenant error:", err);
    res.status(500).json({ success: false, error: "Failed to delete tenant" });
  }
});

// GET /admin/payments — list payment submissions (newest first).
router.get("/admin/payments", async (req, res) => {
  try {
    const filter = req.query.status ? { status: req.query.status } : {};
    const payments = await Payment.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    res.json({ success: true, payments });
  } catch (err) {
    console.error("admin payments error:", err);
    res.status(500).json({ success: false, error: "Failed to load payments" });
  }
});

// POST /admin/payments/:id/decision — approve or reject a payment.
router.post("/admin/payments/:id/decision", async (req, res) => {
  try {
    const { decision, note } = req.body || {};
    if (!["approved", "rejected"].includes(decision)) {
      return res.status(400).json({ success: false, error: "decision must be 'approved' or 'rejected'" });
    }
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ success: false, error: "Payment not found" });
    payment.status = decision;
    if (note) payment.note = note;
    await payment.save();

    // Approving a payment upgrades the tenant to the purchased plan.
    if (decision === "approved") {
      await Tenant.findOneAndUpdate(
        { tenantId: payment.tenantId },
        { plan: payment.plan, status: "active" }
      );
    }
    res.json({ success: true, payment });
  } catch (err) {
    console.error("admin payment decision error:", err);
    res.status(500).json({ success: false, error: "Failed to update payment" });
  }
});

export default router;
