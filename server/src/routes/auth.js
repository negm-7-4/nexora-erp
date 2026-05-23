import { Router } from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { Tenant } from "../models/Tenant.js";
import { getPlatformSettings } from "../models/PlatformSettings.js";
import { modulesForPlan } from "../config/plans.js";
import { signToken } from "../middleware/auth.js";

const router = Router();

function tenantIdFor(email) {
  return "tenant_" + String(email).toLowerCase().replace(/[^a-z0-9]/gi, "");
}

// Effective premium modules a tenant can use, given its plan + super-admin overrides.
async function planAndModules(tenantId, isSuperAdmin) {
  const tenant = await Tenant.findOne({ tenantId });
  const plan = tenant?.plan || "free";
  const settings = await getPlatformSettings();
  // Super admins are never feature-gated.
  const modules = isSuperAdmin ? ["*"] : modulesForPlan(plan, settings.planModules);
  return { plan, modules };
}

// POST /register — create a new account (and its own tenant workspace).
router.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email and password are required" });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ success: false, error: "Password must be at least 6 characters" });
    }
    const normEmail = String(email).toLowerCase().trim();
    const existing = await User.findOne({ email: normEmail });
    if (existing) {
      return res.status(409).json({ success: false, error: "An account with this email already exists" });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const isSuperAdmin =
      !!process.env.SUPER_ADMIN_EMAIL &&
      normEmail === String(process.env.SUPER_ADMIN_EMAIL).toLowerCase().trim();

    const tenantId = tenantIdFor(normEmail);
    const user = await User.create({
      email: normEmail,
      name: name || "",
      passwordHash,
      tenantId,
      isOwner: true,
      isSuperAdmin,
    });

    // Provision the company workspace for this new owner.
    await Tenant.findOneAndUpdate(
      { tenantId },
      { tenantId, name: name || normEmail, ownerEmail: normEmail, plan: "free", status: "active" },
      { upsert: true, setDefaultsOnInsert: true }
    );

    const token = signToken(user);
    const { plan, modules } = await planAndModules(user.tenantId, user.isSuperAdmin);
    res.json({
      success: true,
      token,
      tenantId: user.tenantId,
      name: user.name,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
      plan,
      modules,
    });
  } catch (err) {
    console.error("register error:", err);
    res.status(500).json({ success: false, error: "Registration failed" });
  }
});

// POST /login — authenticate and return a JWT + tenant id.
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email and password are required" });
    }
    const normEmail = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: normEmail });
    if (!user) {
      return res.status(401).json({ success: false, error: "Email or password is incorrect" });
    }
    if (user.status === "disabled") {
      return res.status(403).json({ success: false, error: "This account is disabled" });
    }
    // A suspended company blocks all of its users (super admins are exempt).
    if (!user.isSuperAdmin) {
      const tenant = await Tenant.findOne({ tenantId: user.tenantId });
      if (tenant && tenant.status === "suspended") {
        return res.status(403).json({ success: false, error: "This company account is suspended — contact support" });
      }
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ success: false, error: "Email or password is incorrect" });
    }
    user.lastLoginAt = new Date();
    await user.save();

    const token = signToken(user);
    const { plan, modules } = await planAndModules(user.tenantId, user.isSuperAdmin);
    res.json({
      success: true,
      token,
      tenantId: user.tenantId,
      name: user.name,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
      plan,
      modules,
    });
  } catch (err) {
    console.error("login error:", err);
    res.status(500).json({ success: false, error: "Login failed" });
  }
});

export default router;
