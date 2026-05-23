import { Router } from "express";
import { TenantData } from "../models/TenantData.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Super admins may read/write any tenant via ?tenantId=...; everyone else is
// pinned to their own tenant from the token.
function resolveTenant(req) {
  if (req.user.isSuperAdmin && req.query.tenantId) return String(req.query.tenantId);
  return req.user.tenantId;
}

// GET /data — load the whole dataset for the active tenant.
router.get("/data", requireAuth, async (req, res) => {
  try {
    const tenantId = resolveTenant(req);
    const doc = await TenantData.findOne({ tenantId });
    if (!doc) return res.json({ success: true, data: null, lastModified: 0 });
    res.json({ success: true, data: doc.data, lastModified: doc.lastModified });
  } catch (err) {
    console.error("get data error:", err);
    res.status(500).json({ success: false, error: "Failed to load data" });
  }
});

// PUT /data — replace the dataset. Last-write-wins by client `lastModified`,
// so a stale client can't clobber a newer save.
router.put("/data", requireAuth, async (req, res) => {
  try {
    const tenantId = resolveTenant(req);
    const incoming = req.body || {};
    const data = incoming.data !== undefined ? incoming.data : incoming;
    const lastModified = Number(data?.lastModified || incoming.lastModified || Date.now());

    const existing = await TenantData.findOne({ tenantId });
    if (existing && existing.lastModified > lastModified) {
      // Server copy is newer — return it so the client can reconcile.
      return res.json({
        success: true,
        stale: true,
        data: existing.data,
        lastModified: existing.lastModified,
      });
    }

    const doc = await TenantData.findOneAndUpdate(
      { tenantId },
      { tenantId, data, lastModified },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, lastModified: doc.lastModified });
  } catch (err) {
    console.error("put data error:", err);
    res.status(500).json({ success: false, error: "Failed to save data" });
  }
});

export default router;
