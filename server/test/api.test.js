/*
 * End-to-end API test against an in-memory MongoDB. No external services.
 * Run with:  node test/api.test.js
 *
 * Verifies the whole SaaS flow: registration, login, tenant isolation,
 * super-admin payment-settings, the billing/payment cycle, and that an
 * approved payment upgrades the tenant's plan.
 */
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import http from "node:http";

let passed = 0;
let failed = 0;
function check(name, cond) {
  if (cond) { passed++; console.log("  ✓ " + name); }
  else { failed++; console.error("  ✗ " + name); }
}

async function req(server, method, path, body, token) {
  const { port } = server.address();
  const data = body ? JSON.stringify(body) : null;
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = "Bearer " + token;
  return new Promise((resolve, reject) => {
    const r = http.request({ host: "127.0.0.1", port, method, path, headers }, (res) => {
      let buf = "";
      res.on("data", (c) => (buf += c));
      res.on("end", () => {
        let json = {};
        try { json = JSON.parse(buf); } catch { /* non-json */ }
        resolve({ status: res.statusCode, body: json });
      });
    });
    r.on("error", reject);
    if (data) r.write(data);
    r.end();
  });
}

async function main() {
  const mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  process.env.JWT_SECRET = "test-secret";
  process.env.SUPER_ADMIN_EMAIL = "boss@nexora.com";
  process.env.VODAFONE_CASH_NUMBER = "01000000000";
  process.env.INSTAPAY_HANDLE = "nexora@instapay";

  await mongoose.connect(process.env.MONGODB_URI);

  // Build the express app the same way index.js does.
  const express = (await import("express")).default;
  const cors = (await import("cors")).default;
  const authRoutes = (await import("../src/routes/auth.js")).default;
  const dataRoutes = (await import("../src/routes/data.js")).default;
  const adminRoutes = (await import("../src/routes/admin.js")).default;
  const billingRoutes = (await import("../src/routes/billing.js")).default;

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "25mb" }));
  app.use("/api", authRoutes);
  app.use("/api", dataRoutes);
  app.use("/api", billingRoutes);
  app.use("/api", adminRoutes);
  const server = app.listen(0);

  try {
    console.log("Auth & tenants:");
    const boss = await req(server, "POST", "/api/register", { email: "boss@nexora.com", password: "secret1", name: "Boss" });
    check("super admin registers", boss.body.success && boss.body.isSuperAdmin === true);
    const bossToken = boss.body.token;

    const acme = await req(server, "POST", "/api/register", { email: "owner@acme.com", password: "secret1", name: "Acme" });
    check("company A registers (not super)", acme.body.success && acme.body.isSuperAdmin === false);
    const acmeToken = acme.body.token;
    const acmeTenant = acme.body.tenantId;

    const globex = await req(server, "POST", "/api/register", { email: "owner@globex.com", password: "secret1", name: "Globex" });
    const globexToken = globex.body.token;

    const dup = await req(server, "POST", "/api/register", { email: "owner@acme.com", password: "secret1" });
    check("duplicate email rejected", dup.status === 409);

    const login = await req(server, "POST", "/api/login", { email: "owner@acme.com", password: "secret1" });
    check("login works", login.body.success && login.body.tenantId === acmeTenant);

    const badLogin = await req(server, "POST", "/api/login", { email: "owner@acme.com", password: "wrong" });
    check("wrong password rejected", badLogin.status === 401);

    console.log("Tenant data isolation:");
    await req(server, "PUT", "/api/data", { data: { sales: [{ id: 1 }], lastModified: 1000 } }, acmeToken);
    const acmeData = await req(server, "GET", "/api/data", null, acmeToken);
    check("company A reads its own data", acmeData.body.data && acmeData.body.data.sales.length === 1);
    const globexData = await req(server, "GET", "/api/data", null, globexToken);
    check("company B cannot see company A's data", !globexData.body.data || !globexData.body.data.sales);
    const noAuth = await req(server, "GET", "/api/data", null, null);
    check("data requires auth", noAuth.status === 401);

    console.log("Super-admin only:");
    const acmeTenants = await req(server, "GET", "/api/admin/tenants", null, acmeToken);
    check("company admin BLOCKED from tenants list", acmeTenants.status === 403);
    const allTenants = await req(server, "GET", "/api/admin/tenants", null, bossToken);
    check("super admin sees all tenants", allTenants.body.success && allTenants.body.tenants.length === 3);

    console.log("Payment routing (super admin sets receiving accounts):");
    await req(server, "PUT", "/api/admin/payment-settings",
      { vodafoneCashNumber: "01055555555", vodafoneCashName: "Nexora", instapayHandle: "nexora@ipa" }, bossToken);
    const acmeSetSettings = await req(server, "PUT", "/api/admin/payment-settings", { vodafoneCashNumber: "01099999999" }, acmeToken);
    check("company admin CANNOT change receiving accounts", acmeSetSettings.status === 403);
    const plans = await req(server, "GET", "/api/billing/plans", null, acmeToken);
    check("plans expose super-admin's Vodafone number", plans.body.payment.vodafoneCash === "01055555555");
    check("3 plans with EGP prices", plans.body.plans.length === 3 && plans.body.plans[1].priceEGP === 499);

    console.log("Billing lifecycle:");
    const submit = await req(server, "POST", "/api/billing/submit",
      { plan: "pro", method: "vodafone_cash", reference: "VF123456" }, acmeToken);
    check("customer submits payment", submit.body.success && submit.body.payment.status === "pending");
    const paymentId = submit.body.payment._id;

    const pending = await req(server, "GET", "/api/admin/payments?status=pending", null, bossToken);
    check("super admin sees pending payment", pending.body.payments.length === 1);

    await req(server, "POST", `/api/admin/payments/${paymentId}/decision`, { decision: "approved" }, bossToken);
    const billingMe = await req(server, "GET", "/api/billing/me", null, acmeToken);
    check("approved payment upgrades tenant to Pro", billingMe.body.plan === "pro");

    console.log("Plan-based feature gating:");
    check("free plan has no premium modules", Array.isArray(globex.body.modules) && globex.body.modules.length === 0);
    check("super admin bypasses gating (modules=['*'])", boss.body.modules.includes("*"));
    check("Pro tenant unlocks HR & manufacturing", billingMe.body.modules.includes("hr") && billingMe.body.modules.includes("manufacturing"));
    const acmeFeatures = await req(server, "PUT", "/api/admin/plan-features", { planId: "pro", modules: ["hr"] }, acmeToken);
    check("company admin CANNOT edit plan features", acmeFeatures.status === 403);
    await req(server, "PUT", "/api/admin/plan-features", { planId: "pro", modules: ["hr", "crm"] }, bossToken);
    const billingMe2 = await req(server, "GET", "/api/billing/me", null, acmeToken);
    check("super admin override limits Pro to HR+CRM", billingMe2.body.modules.length === 2 && billingMe2.body.modules.includes("crm") && !billingMe2.body.modules.includes("manufacturing"));

    console.log("Suspension:");
    await req(server, "PATCH", `/api/admin/tenants/${acmeTenant}`, { status: "suspended" }, bossToken);
    const suspendedLogin = await req(server, "POST", "/api/login", { email: "owner@acme.com", password: "secret1" });
    check("suspended company blocked from login", suspendedLogin.status === 403);
    const bossStillIn = await req(server, "POST", "/api/login", { email: "boss@nexora.com", password: "secret1" });
    check("super admin still logs in", bossStillIn.body.success === true);
  } finally {
    server.close();
    await mongoose.disconnect();
    await mongo.stop();
  }

  console.log(`\nResult: ${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
