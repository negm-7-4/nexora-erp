/*
 * Finance & Reports Center — a fully self-contained module mounted in its OWN
 * React root (see main.jsx). It reads the workspace data straight from
 * localStorage ("nile_data_cache") and derives professional reports WITHOUT
 * touching the main <App/> tree, so it can never break the app.
 *
 * Delivers: Chart-of-Accounts / Trial Balance (#2), P&L · Balance Sheet ·
 * Cash Flow (#3), Aging report (#4), PDF/print export (#15), payment
 * reminders + WhatsApp (#18), and a sample-data loader / onboarding (#20).
 */
import { useState, useEffect, useMemo, useCallback } from "react";

/* ── data access ── */
function loadData() {
  try { return JSON.parse(localStorage.getItem("nile_data_cache") || "{}"); }
  catch { return {}; }
}
const arr = (x) => (Array.isArray(x) ? x : x ? Object.values(x) : []);
const sum = (a, f) => arr(a).reduce((s, x) => s + (f ? f(x) : x || 0), 0);
const fmt = (n) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
const todayStr = () => new Date().toISOString().split("T")[0];
const daysBetween = (d) => { try { return Math.floor((Date.now() - new Date(d).getTime()) / 86400000); } catch { return 0; } };

/* ── derived finance model ── */
function buildModel(data) {
  const cur = data?.appLabels?.currency || "EGP";
  const sales = arr(data.sales);
  const purchases = arr(data.incoming);
  const expenses = arr(data.expenses);
  const clients = arr(data.clients);
  const suppliers = arr(data.suppliers);
  const workers = arr(data.workers);
  const treasury = arr(data.treasuryMoves);
  const items = arr(data.inventory?.items);

  const revenue = sum(sales, (s) => s.totalAmount || 0);
  const collected = sum(sales, (s) => s.paid || 0);
  const cogs = sum(purchases, (p) => p.totalExpenses ?? p.totalPrice ?? 0);
  const grossProfit = revenue - cogs;
  const opex = sum(expenses, (e) => e.amount || 0);
  const payroll = sum(workers, (w) => w.totalEarned || 0);
  const netProfit = grossProfit - opex;

  const receivables = sum(clients, (c) => c.remaining || 0);
  const payables = sum(suppliers, (s) => s.remaining || 0);
  const workerDues = sum(workers, (w) => w.remaining || 0);
  const inventoryValue = sum(items, (it) => (it.quantity || 0) * (it.cost ?? it.price ?? 0));
  const cashIn = sum(treasury, (m) => (m.type === "deposit" ? m.amount || 0 : 0));
  const cashOut = sum(treasury, (m) => (m.type !== "deposit" ? m.amount || 0 : 0));
  const treasuryBalance = cashIn - cashOut;
  // fallback cash estimate when no treasury moves recorded
  const cash = treasury.length ? treasuryBalance : collected - cogs - opex;

  const assets = cash + receivables + inventoryValue;
  const liabilities = payables + workerDues;
  const equity = assets - liabilities;

  return {
    cur, revenue, collected, cogs, grossProfit, opex, payroll, netProfit,
    receivables, payables, workerDues, inventoryValue, cash, cashIn, cashOut,
    assets, liabilities, equity, sales, purchases, expenses, clients, suppliers, treasury,
  };
}

/* monthly trend for cash flow */
function monthly(data, n = 6) {
  const out = [];
  const now = new Date();
  const sales = arr(data.sales), purch = arr(data.incoming), exp = arr(data.expenses);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const inc = sum(sales.filter((s) => (s.date || "").startsWith(k)), (s) => s.paid || 0);
    const outc = sum(purch.filter((p) => (p.date || "").startsWith(k)), (p) => p.totalExpenses || 0)
      + sum(exp.filter((e) => (e.date || "").startsWith(k)), (e) => e.amount || 0);
    out.push({ label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }), inflow: inc, outflow: outc, net: inc - outc });
  }
  return out;
}

/* aging buckets for receivables/payables */
function aging(entities, dateField, sales, key = "client") {
  // bucket each entity's outstanding by oldest unpaid sale age
  return entities.filter((e) => (e.remaining || 0) > 0).map((e) => {
    const rel = arr(sales).filter((s) => s[key] === e.name && (s.remaining || 0) > 0);
    const oldest = rel.length ? Math.max(...rel.map((s) => daysBetween(s.date))) : 30;
    const b = { name: e.name, phone: e.phone, total: e.remaining || 0, b0: 0, b30: 0, b60: 0, b90: 0 };
    if (oldest <= 30) b.b0 = e.remaining; else if (oldest <= 60) b.b30 = e.remaining;
    else if (oldest <= 90) b.b60 = e.remaining; else b.b90 = e.remaining;
    b.oldest = oldest;
    return b;
  }).sort((a, b) => b.total - a.total);
}

/* ── sample data (onboarding) ── */
function sampleData() {
  const t = todayStr();
  const m = (off) => { const d = new Date(); d.setDate(d.getDate() - off); return d.toISOString().split("T")[0]; };
  return {
    appLabels: { currency: "EGP", incoming: "Purchases", sales: "Sales", clients: "Clients", workers: "Workers", suppliers: "Suppliers", inventory: "Inventory", expenses: "Expenses", logistics: "Logistics", treasury: "Treasury", hr: "HR", crm: "CRM", manufacturing: "Manufacturing", pellets: "Product", mainUnit: "pcs", productionUnit: "kg" },
    companyInfo: { name: "Demo Trading Co.", logo: "", footer: "Thank you for your business", address: "123 Market St, Cairo", phone: "+20 100 000 0000", taxNumber: "EG-100200300" },
    expenseTypes: ["Workshop Expenses", "Utility Bills", "Rent", "Wages & Labor", "Transport & Maintenance", "Petty Cash"],
    clients: [
      { id: 1, name: "Ahmed Hassan", phone: "201001234567", city: "Cairo", totalBought: 42000, totalPaid: 30000, remaining: 12000, transactions: [] },
      { id: 2, name: "Sara Mostafa", phone: "201112223344", city: "Giza", totalBought: 28000, totalPaid: 28000, remaining: 0, transactions: [] },
      { id: 3, name: "Omar Trading", phone: "201223334455", city: "Alex", totalBought: 65000, totalPaid: 40000, remaining: 25000, transactions: [] },
    ],
    suppliers: [
      { id: 1, name: "Nile Materials", phone: "201501112233", city: "Cairo", totalSupplied: 50000, totalPaid: 35000, remaining: 15000, payments: [], records: [] },
      { id: 2, name: "Delta Supplies", phone: "201509998877", city: "Tanta", totalSupplied: 22000, totalPaid: 22000, remaining: 0, payments: [], records: [] },
    ],
    workers: [
      { id: 1, name: "Mahmoud Ali", role: "Operator", totalEarned: 9000, received: 6000, advance: 1000, remaining: 2000 },
      { id: 2, name: "Khaled Samy", role: "Driver", totalEarned: 7000, received: 7000, advance: 0, remaining: 0 },
    ],
    sales: [
      { id: 1, date: m(5), product: "Product A", client: "Ahmed Hassan", quantity: 10, unit: "pcs", unitPrice: 1200, transportPrice: 0, totalPrice: 12000, totalAmount: 12000, paid: 6000, remaining: 6000, vat: 0, discount: 0 },
      { id: 2, date: m(40), product: "Product B", client: "Omar Trading", quantity: 25, unit: "pcs", unitPrice: 1000, transportPrice: 0, totalPrice: 25000, totalAmount: 25000, paid: 0, remaining: 25000, vat: 0, discount: 0 },
      { id: 3, date: m(2), product: "Product A", client: "Sara Mostafa", quantity: 8, unit: "pcs", unitPrice: 1500, transportPrice: 0, totalPrice: 12000, totalAmount: 12000, paid: 12000, remaining: 0, vat: 0, discount: 0 },
    ],
    incoming: [
      { id: 1, date: m(10), category: "Raw Material", supplier: "Nile Materials", weight: 500, unit: "kg", unitPrice: 60, transportPrice: 500, totalPrice: 30000, totalExpenses: 30500, production: 480 },
      { id: 2, date: m(20), category: "Packaging", supplier: "Delta Supplies", weight: 200, unit: "pcs", unitPrice: 100, transportPrice: 0, totalPrice: 20000, totalExpenses: 20000, production: 200 },
    ],
    expenses: [
      { id: 1, date: m(3), type: "Rent", amount: 8000, description: "Monthly rent" },
      { id: 2, date: m(7), type: "Utility Bills", amount: 2300, description: "Electricity" },
      { id: 3, date: m(15), type: "Wages & Labor", amount: 5000, description: "Casual labor" },
    ],
    treasuryMoves: [
      { id: 1, date: m(5), type: "deposit", amount: 18000, note: "Sales collection" },
      { id: 2, date: m(8), type: "withdrawal", amount: 8000, note: "Rent" },
      { id: 3, date: m(12), type: "deposit", amount: 12000, note: "Sales collection" },
    ],
    inventory: { items: [
      { id: "p1", name: "Product A", quantity: 120, unit: "pcs", cost: 800, price: 1200, threshold: 20 },
      { id: "p2", name: "Product B", quantity: 60, unit: "pcs", cost: 700, price: 1000, threshold: 15 },
      { id: "p3", name: "Raw Material", quantity: 480, unit: "kg", cost: 60, price: 0, threshold: 100 },
    ], log: [] },
    bom: [], manufacturingOrders: [], todos: [], attendance: {}, auditLog: [],
    vehicles: [], vehicleLog: [], employees: [], crmLeads: [], systemUsers: [], bannedEmails: [],
    lastModified: Date.now(),
  };
}

const C = { panel: { background: "linear-gradient(160deg,#0d1b34,#10243e)", border: "1px solid rgba(120,160,220,.25)", color: "#f0f6ff" } };

/* ── WhatsApp helpers ── */
function wa(phone, msg) {
  const clean = String(phone || "").replace(/[^\d]/g, "");
  window.open(`https://wa.me/${clean}?text=${encodeURIComponent(msg)}`, "_blank");
}
function lineDivider() { return "————————————————"; }

function invoiceText(data, rec, kind) {
  const cur = data?.appLabels?.currency || "EGP";
  const co = data?.companyInfo || {};
  const who = kind === "sale" ? rec.client : rec.supplier;
  const qty = kind === "sale" ? rec.quantity : rec.weight;
  const item = kind === "sale" ? rec.product : rec.category;
  const price = rec.unitPrice || 0;
  const total = kind === "sale" ? rec.totalAmount : rec.totalExpenses;
  const paid = rec.paid || 0;
  const due = kind === "sale" ? (rec.remaining || 0) : 0;
  return [
    `*${co.name || "Invoice"}*`,
    kind === "sale" ? "🧾 Sales Invoice" : "📥 Purchase Invoice",
    lineDivider(),
    `Date: ${rec.date}`,
    `${kind === "sale" ? "Customer" : "Supplier"}: ${who}`,
    lineDivider(),
    `${item} — ${qty} ${rec.unit || ""} × ${cur} ${fmt(price)}`,
    rec.transportPrice ? `Shipping: ${cur} ${fmt(rec.transportPrice)}` : "",
    rec.discount ? `Discount: ${cur} ${fmt(rec.discount)}` : "",
    rec.vat ? `VAT ${rec.vat}%` : "",
    lineDivider(),
    `*Total: ${cur} ${fmt(total)}*`,
    `Paid: ${cur} ${fmt(paid)}`,
    due ? `Due: ${cur} ${fmt(due)}` : "",
    co.phone ? `\n📞 ${co.phone}` : "",
    co.footer || "",
  ].filter(Boolean).join("\n");
}

function statementText(data, entity, kind) {
  const cur = data?.appLabels?.currency || "EGP";
  const co = data?.companyInfo || {};
  const rows = kind === "client"
    ? arr(data.sales).filter((s) => s.client === entity.name)
    : arr(data.incoming).filter((p) => p.supplier === entity.name);
  const lines = rows.slice(0, 20).map((r) => kind === "client"
    ? `• ${r.date}  ${r.product}  ${cur}${fmt(r.totalAmount)} (paid ${fmt(r.paid)})`
    : `• ${r.date}  ${r.category}  ${cur}${fmt(r.totalExpenses)}`);
  const totalField = kind === "client" ? "totalBought" : "totalSupplied";
  return [
    `*${co.name || ""}* — Account Statement`,
    `${kind === "client" ? "Customer" : "Supplier"}: ${entity.name}`,
    lineDivider(),
    ...lines,
    lineDivider(),
    `Total ${kind === "client" ? "purchases" : "supplied"}: ${cur} ${fmt(entity[totalField] || 0)}`,
    `Paid: ${cur} ${fmt(entity.totalPaid || 0)}`,
    `*Balance: ${cur} ${fmt(entity.remaining || 0)}*`,
    co.phone ? `\n📞 ${co.phone}` : "",
  ].filter(Boolean).join("\n");
}

function dailyText(data) {
  const cur = data?.appLabels?.currency || "EGP";
  const co = data?.companyInfo || {};
  const t = todayStr();
  const sToday = arr(data.sales).filter((s) => s.date === t);
  const pToday = arr(data.incoming).filter((p) => p.date === t);
  const eToday = arr(data.expenses).filter((e) => e.date === t);
  const salesT = sum(sToday, (s) => s.totalAmount || 0);
  const collected = sum(sToday, (s) => s.paid || 0);
  const purchT = sum(pToday, (p) => p.totalExpenses || 0);
  const expT = sum(eToday, (e) => e.amount || 0);
  return [
    `📊 *${co.name || "Daily Summary"}* — ${t}`,
    lineDivider(),
    `🟢 Sales today: ${cur} ${fmt(salesT)} (${sToday.length} invoices)`,
    `💰 Collected: ${cur} ${fmt(collected)}`,
    `📥 Purchases: ${cur} ${fmt(purchT)}`,
    `💼 Expenses: ${cur} ${fmt(expT)}`,
    lineDivider(),
    `📈 Net today: ${cur} ${fmt(salesT - purchT - expT)}`,
  ].join("\n");
}

/* ── Professional printable invoice (white "paper") ── */
function InvoicePaper({ data, rec, kind }) {
  const cur = data?.appLabels?.currency || "EGP";
  const co = data?.companyInfo || {};
  const who = kind === "sale" ? rec.client : rec.supplier;
  const qty = (kind === "sale" ? rec.quantity : rec.weight) || 0;
  const item = (kind === "sale" ? rec.product : rec.category) || "Item";
  const price = rec.unitPrice || 0;
  const lineAmt = qty * price;
  const shipping = rec.transportPrice || 0;
  const discount = rec.discount || 0;
  const vatPct = rec.vat || 0;
  const sub = lineAmt + shipping - discount;            // taxable base
  const vatAmt = sub * (vatPct / 100);                  // VAT amount
  const total = sub + vatAmt;                           // VAT-inclusive grand total (internally consistent)
  const paid = rec.paid || 0;
  const due = kind === "sale" ? total - paid : 0;
  const number = `${kind === "sale" ? "INV" : "PO"}-${String(rec.id || "").toString().slice(-6).padStart(4, "0")}`;
  return (
    <div style={paper}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "3px solid #111", paddingBottom: 16, marginBottom: 22 }}>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          {co.logo ? <img src={co.logo} alt="" style={{ width: 64, height: 64, objectFit: "contain" }} /> : <div style={{ width: 56, height: 56, borderRadius: 12, background: "#111", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 24 }}>{(co.name || "C")[0]}</div>}
          <div>
            <div style={{ fontSize: 24, fontWeight: 900, color: "#111" }}>{co.name || "Company"}</div>
            {co.activity && <div style={{ color: "#666", fontSize: 13 }}>{co.activity}</div>}
            {co.address && <div style={{ color: "#666", fontSize: 12 }}>{co.address}</div>}
            {co.phone && <div style={{ color: "#666", fontSize: 12 }}>📞 {co.phone}</div>}
            {co.taxNumber && <div style={{ color: "#666", fontSize: 12 }}>VAT #: {co.taxNumber}</div>}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 26, fontWeight: 900, color: "#111", letterSpacing: -1 }}>{kind === "sale" ? "INVOICE" : "PURCHASE"}</div>
          <div style={{ color: "#666", fontSize: 13 }}>{number}</div>
          <div style={{ color: "#666", fontSize: 13 }}>Date: {rec.date}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 22 }}>
        <div>
          <div style={{ fontSize: 11, color: "#888", fontWeight: 700, textTransform: "uppercase" }}>{kind === "sale" ? "Bill To" : "Supplier"}</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#111" }}>{who || "—"}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: "#888", fontWeight: 700, textTransform: "uppercase" }}>Status</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: due > 0 ? "#d97706" : "#059669" }}>{due > 0 ? "PARTIALLY PAID" : "PAID"}</div>
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 18 }}>
        <thead><tr>
          <th style={{ ...ith, width: 40 }}>#</th><th style={ith}>Description</th><th style={ithR}>Qty</th><th style={ithR}>Unit Price</th><th style={ithR}>Amount</th>
        </tr></thead>
        <tbody>
          <tr><td style={itd}>1</td><td style={itd}>{item}</td><td style={itdR}>{fmt(qty)} {rec.unit || ""}</td><td style={itdR}>{cur} {fmt(price)}</td><td style={itdR}>{cur} {fmt(lineAmt)}</td></tr>
          {shipping > 0 && <tr><td style={itd}>2</td><td style={itd}>Shipping / Transport</td><td style={itdR}></td><td style={itdR}></td><td style={itdR}>{cur} {fmt(shipping)}</td></tr>}
        </tbody>
        <tfoot><tr><td style={{ ...itd, fontWeight: 800 }} colSpan={2}>Total items: {shipping > 0 ? 2 : 1}</td><td style={itdR}></td><td style={itdR}></td><td style={{ ...itdR, fontWeight: 800 }}>{cur} {fmt(lineAmt + shipping)}</td></tr></tfoot>
      </table>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div style={{ width: 300 }}>
          <div style={isum}><span>Subtotal</span><span>{cur} {fmt(lineAmt + shipping)}</span></div>
          {discount > 0 && <div style={isum}><span>Discount</span><span>− {cur} {fmt(discount)}</span></div>}
          {vatPct > 0 && <div style={isum}><span>VAT ({vatPct}%)</span><span>{cur} {fmt(vatAmt)}</span></div>}
          <div style={{ ...isum, borderTop: "2px solid #111", borderBottom: "2px solid #111", fontSize: 20, fontWeight: 900, color: "#111", padding: "10px 0", margin: "6px 0" }}><span>TOTAL</span><span>{cur} {fmt(total)}</span></div>
          <div style={isum}><span>Paid</span><span>{cur} {fmt(paid)}</span></div>
          {due > 0 && <div style={{ ...isum, color: "#dc2626", fontWeight: 800 }}><span>Balance Due</span><span>{cur} {fmt(due)}</span></div>}
        </div>
      </div>

      <div style={{ marginTop: 30, borderTop: "1px solid #ddd", paddingTop: 16, textAlign: "center", color: "#777", fontSize: 12 }}>
        <div>{co.footer || `Thank you for your business with ${co.name || "us"}`}</div>
        {(co.facebook || co.instagram) && <div style={{ marginTop: 4 }}>{[co.facebook && `📘 ${co.facebook}`, co.instagram && `📷 ${co.instagram}`].filter(Boolean).join("   ")}</div>}
      </div>
    </div>
  );
}

/* ── Professional account statement (white "paper") ── */
function StatementPaper({ data, entity, kind }) {
  const cur = data?.appLabels?.currency || "EGP";
  const co = data?.companyInfo || {};
  const rows = kind === "client"
    ? arr(data.sales).filter((s) => s.client === entity.name)
    : arr(data.incoming).filter((p) => p.supplier === entity.name);
  let running = 0;
  return (
    <div style={paper}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "3px solid #111", paddingBottom: 16, marginBottom: 22 }}>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          {co.logo ? <img src={co.logo} alt="" style={{ width: 64, height: 64, objectFit: "contain" }} /> : <div style={{ width: 56, height: 56, borderRadius: 12, background: "#111", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 24 }}>{(co.name || "C")[0]}</div>}
          <div><div style={{ fontSize: 24, fontWeight: 900, color: "#111" }}>{co.name || "Company"}</div><div style={{ color: "#666", fontSize: 12 }}>{co.address} {co.phone ? "· " + co.phone : ""}</div></div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#111" }}>STATEMENT</div>
          <div style={{ color: "#666", fontSize: 13 }}>{todayStr()}</div>
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: "#888", fontWeight: 700, textTransform: "uppercase" }}>{kind === "client" ? "Customer" : "Supplier"}</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#111" }}>{entity.name}</div>
        <div style={{ color: "#666", fontSize: 13 }}>{[entity.phone, entity.city].filter(Boolean).join(" · ")}</div>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 18 }}>
        <thead><tr><th style={ith}>Date</th><th style={ith}>Item</th><th style={ithR}>Amount</th><th style={ithR}>Paid</th><th style={ithR}>Balance</th></tr></thead>
        <tbody>
          {rows.length === 0 ? <tr><td style={itd} colSpan={5}>No transactions.</td></tr> : rows.map((r, i) => {
            const amt = kind === "client" ? (r.totalAmount || 0) : (r.totalExpenses || 0);
            const pd = kind === "client" ? (r.paid || 0) : 0;
            running += amt - pd;
            return <tr key={i}><td style={itd}>{r.date}</td><td style={itd}>{kind === "client" ? r.product : r.category}</td><td style={itdR}>{cur} {fmt(amt)}</td><td style={itdR}>{cur} {fmt(pd)}</td><td style={itdR}>{cur} {fmt(running)}</td></tr>;
          })}
        </tbody>
      </table>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div style={{ width: 300 }}>
          <div style={isum}><span>Total {kind === "client" ? "Purchases" : "Supplied"}</span><span>{cur} {fmt(entity[kind === "client" ? "totalBought" : "totalSupplied"] || 0)}</span></div>
          <div style={isum}><span>Total Paid</span><span>{cur} {fmt(entity.totalPaid || 0)}</span></div>
          <div style={{ ...isum, borderTop: "2px solid #111", fontSize: 18, fontWeight: 900, color: "#111", paddingTop: 8 }}><span>Balance</span><span>{cur} {fmt(entity.remaining || 0)}</span></div>
        </div>
      </div>
      <div style={{ marginTop: 26, borderTop: "1px solid #ddd", paddingTop: 14, textAlign: "center", color: "#777", fontSize: 12 }}>{co.footer || "Thank you"}</div>
    </div>
  );
}

const paper = { background: "#fff", color: "#111", padding: 36, borderRadius: 8, maxWidth: 760, margin: "0 auto", fontFamily: "Inter, Cairo, sans-serif", boxShadow: "0 10px 40px rgba(0,0,0,.25)" };
const ith = { background: "#f1f4f9", color: "#333", textAlign: "left", padding: "10px 12px", border: "1px solid #ddd", fontSize: 12 };
const ithR = { ...ith, textAlign: "right" };
const itd = { padding: "10px 12px", border: "1px solid #e5e7eb", color: "#222", fontSize: 13 };
const itdR = { ...itd, textAlign: "right", fontVariantNumeric: "tabular-nums" };
const isum = { display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 14, color: "#333" };

/* ── General Ledger (double-entry) — isolated storage so it never collides
   with the app's own data autosave. ── */
const DEFAULT_COA = [
  { code: "1000", name: "Cash", type: "Asset" },
  { code: "1100", name: "Accounts Receivable", type: "Asset" },
  { code: "1200", name: "Inventory", type: "Asset" },
  { code: "1500", name: "Fixed Assets", type: "Asset" },
  { code: "2000", name: "Accounts Payable", type: "Liability" },
  { code: "2100", name: "Loans Payable", type: "Liability" },
  { code: "2200", name: "Tax Payable", type: "Liability" },
  { code: "3000", name: "Owner's Equity", type: "Equity" },
  { code: "3100", name: "Retained Earnings", type: "Equity" },
  { code: "4000", name: "Sales Revenue", type: "Revenue" },
  { code: "4100", name: "Other Income", type: "Revenue" },
  { code: "5000", name: "Cost of Goods Sold", type: "Expense" },
  { code: "6000", name: "Salaries & Wages", type: "Expense" },
  { code: "6100", name: "Rent", type: "Expense" },
  { code: "6200", name: "Utilities", type: "Expense" },
  { code: "6300", name: "Transport & Maintenance", type: "Expense" },
  { code: "6900", name: "Other Expenses", type: "Expense" },
];
const NORMAL_DEBIT = { Asset: true, Expense: true };
function loadCOA() { try { const c = JSON.parse(localStorage.getItem("nx_coa") || "null"); return Array.isArray(c) && c.length ? c : DEFAULT_COA; } catch { return DEFAULT_COA; } }
function loadJournal() { try { const j = JSON.parse(localStorage.getItem("nx_journal") || "[]"); return Array.isArray(j) ? j : []; } catch { return []; } }
function saveJournal(j) { try { localStorage.setItem("nx_journal", JSON.stringify(j)); } catch { /* */ } }

/* Fixed Assets (straight-line depreciation) — isolated storage. */
function loadAssets() { try { const a = JSON.parse(localStorage.getItem("nx_assets") || "[]"); return Array.isArray(a) ? a : []; } catch { return []; } }
function saveAssets(a) { try { localStorage.setItem("nx_assets", JSON.stringify(a)); } catch { /* */ } }
function depreciation(a) {
  const cost = num(a.cost), salvage = num(a.salvage), life = Math.max(1, num(a.usefulLife) || 1);
  const annual = (cost - salvage) / life;
  const ageYears = Math.max(0, (Date.now() - new Date(a.date || todayStr()).getTime()) / (365.25 * 86400000));
  const accumulated = Math.min(Math.max(0, cost - salvage), annual * ageYears);
  return { annual, accumulated, book: cost - accumulated, ageYears };
}

/* Budgets per category — isolated storage. */
function loadBudgets() { try { return JSON.parse(localStorage.getItem("nx_budgets") || "{}") || {}; } catch { return {}; } }
function saveBudgets(b) { try { localStorage.setItem("nx_budgets", JSON.stringify(b)); } catch { /* */ } }

export default function FinanceCenter() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("pnl");
  const [doc, setDoc] = useState(null); // { kind:'sale'|'purchase'|'client'|'supplier', rec }
  const [data, setData] = useState({});
  const coa = loadCOA();
  const [journal, setJournal] = useState(loadJournal);
  const [jeOpen, setJeOpen] = useState(false);
  const blankJE = { date: todayStr(), memo: "", lines: [{ account: "", debit: "", credit: "" }, { account: "", debit: "", credit: "" }] };
  const [je, setJe] = useState(blankJE);
  const [assets, setAssets] = useState(loadAssets);
  const [assetOpen, setAssetOpen] = useState(false);
  const blankAsset = { name: "", category: "Equipment", cost: "", salvage: "", usefulLife: 5, date: todayStr() };
  const [asset, setAsset] = useState(blankAsset);
  const [budgets, setBudgets] = useState(loadBudgets);
  const cur = data?.appLabels?.currency || "EGP";
  const M = useMemo(() => buildModel(data), [data]);
  const refresh = useCallback(() => setData(loadData()), []);

  useEffect(() => {
    const openHandler = () => { refresh(); setOpen(true); };
    // Open a specific document (invoice / statement) directly from any page.
    const docHandler = (ev) => {
      refresh();
      if (ev?.detail?.kind && ev?.detail?.rec) setDoc(ev.detail);
      setOpen(true);
    };
    window.addEventListener("nx-open-finance", openHandler);
    window.addEventListener("nx-print-doc", docHandler);
    return () => {
      window.removeEventListener("nx-open-finance", openHandler);
      window.removeEventListener("nx-print-doc", docHandler);
    };
  }, [refresh]);
  useEffect(() => { if (open) refresh(); }, [open, refresh]);

  const loadSample = () => {
    if (!confirm("Load demo sample data? This replaces current data so you can explore the reports.")) return;
    localStorage.setItem("nile_data_cache", JSON.stringify(sampleData()));
    location.reload();
  };

  const printReport = () => {
    document.body.classList.add("nx-printing-finance");
    setTimeout(() => { window.print(); document.body.classList.remove("nx-printing-finance"); }, 60);
  };

  const waReminder = (name, phone, amount) => {
    const msg = `Hello ${name},\nThis is a friendly reminder from ${data?.companyInfo?.name || "us"}.\nYour outstanding balance is ${cur} ${fmt(amount)}.\nThank you.`;
    const clean = String(phone || "").replace(/[^\d]/g, "");
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const recAging = useMemo(() => aging(M.clients, "date", M.sales, "client"), [M]);
  const payAging = useMemo(() => aging(M.suppliers, "date", M.purchases, "supplier"), [M]);
  const cf = useMemo(() => monthly(data, 6), [data]);

  const TABS = [
    ["pnl", "📈 P&L"], ["balance", "⚖️ Balance Sheet"], ["cash", "💵 Cash Flow"],
    ["aging", "⏳ Aging"], ["ledger", "📒 Trial Balance"], ["gl", "📓 General Ledger"],
    ["assets", "🏢 Fixed Assets"], ["budget", "🎯 Budgets"], ["reminders", "🔔 Reminders"],
    ["docs", "🧾 Invoices & Statements"],
  ];

  // Fixed assets
  const saveAsset = () => {
    if (!asset.name.trim() || num(asset.cost) <= 0) { alert("Enter asset name and cost."); return; }
    const next = [{ id: "as_" + Date.now().toString(36), ...asset, cost: num(asset.cost), salvage: num(asset.salvage), usefulLife: num(asset.usefulLife) }, ...assets];
    setAssets(next); saveAssets(next); setAssetOpen(false); setAsset(blankAsset);
  };
  const delAsset = (id) => { const n = assets.filter((a) => a.id !== id); setAssets(n); saveAssets(n); };

  // Budgets: compare monthly budget vs current-month actual expenses by category.
  const budgetCats = [...new Set([...(data.expenseTypes || []), ...arr(data.expenses).map((e) => e.type)])].filter(Boolean);
  const monthExpense = (cat) => arr(data.expenses).filter((e) => e.type === cat && (e.date || "").startsWith(todayStr().slice(0, 7))).reduce((s, e) => s + (e.amount || 0), 0);
  const setBudget = (cat, val) => { const next = { ...budgets, [cat]: num(val) }; setBudgets(next); saveBudgets(next); };

  // Journal entry helpers (double-entry).
  const jeTotals = (lines) => lines.reduce((t, l) => ({ d: t.d + num(l.debit), c: t.c + num(l.credit) }), { d: 0, c: 0 });
  const setJeLine = (i, patch) => setJe((v) => ({ ...v, lines: v.lines.map((l, idx) => idx === i ? { ...l, ...patch } : l) }));
  const addJeLine = () => setJe((v) => ({ ...v, lines: [...v.lines, { account: "", debit: "", credit: "" }] }));
  const postJE = () => {
    const lines = je.lines.filter((l) => l.account && (num(l.debit) || num(l.credit)));
    const t = jeTotals(lines);
    if (lines.length < 2) { alert("A journal entry needs at least two lines."); return; }
    if (Math.abs(t.d - t.c) > 0.01) { alert(`Entry is not balanced. Debit ${fmt(t.d)} ≠ Credit ${fmt(t.c)}.`); return; }
    const entry = { id: "je_" + Date.now().toString(36), date: je.date, memo: je.memo, lines: lines.map((l) => ({ account: l.account, debit: num(l.debit), credit: num(l.credit) })) };
    const next = [entry, ...journal];
    setJournal(next); saveJournal(next);
    setJeOpen(false); setJe(blankJE);
  };
  const delJE = (id) => { const next = journal.filter((e) => e.id !== id); setJournal(next); saveJournal(next); };
  // Posted balances per account.
  const accountBalances = () => {
    const m = {};
    journal.forEach((e) => e.lines.forEach((l) => { m[l.account] = m[l.account] || { d: 0, c: 0 }; m[l.account].d += l.debit; m[l.account].c += l.credit; }));
    return coa.map((a) => {
      const b = m[a.code] || { d: 0, c: 0 };
      const bal = NORMAL_DEBIT[a.type] ? b.d - b.c : b.c - b.d;
      return { ...a, debit: b.d, credit: b.c, balance: bal };
    }).filter((a) => a.debit || a.credit);
  };

  // Share / phone resolution for the open document.
  const docPhone = () => {
    if (!doc) return "";
    if (doc.kind === "sale") return (arr(data.clients).find((c) => c.name === doc.rec.client) || {}).phone || "";
    if (doc.kind === "purchase") return (arr(data.suppliers).find((s) => s.name === doc.rec.supplier) || {}).phone || "";
    return doc.rec.phone || "";
  };
  const shareDoc = () => {
    if (!doc) return;
    const msg = (doc.kind === "sale" || doc.kind === "purchase")
      ? invoiceText(data, doc.rec, doc.kind)
      : statementText(data, doc.rec, doc.kind);
    wa(docPhone(), msg);
  };
  const shareDaily = () => wa("", dailyText(data));

  const Row = ({ label, value, bold, color, indent }) => (
    <div className="finance-row" style={{ display: "flex", justifyContent: "space-between", padding: "9px 4px", borderBottom: "1px solid rgba(120,160,220,.12)", fontWeight: bold ? 800 : 500, paddingInlineStart: indent ? 22 : 4 }}>
      <span style={{ color: bold ? "#f0f6ff" : "#94b4d8" }}>{label}</span>
      <span style={{ color: color || (bold ? "#f0f6ff" : "#cfe0f5"), fontVariantNumeric: "tabular-nums" }}>{cur} {fmt(value)}</span>
    </div>
  );

  return (
    <>
      {/* No floating launcher — open via ⌘/Ctrl + K → "Finance & Reports". */}
      {open && (
        <div className="nx-finance-overlay" onClick={(e) => e.target === e.currentTarget && setOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 800, background: "rgba(0,0,0,.6)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div className="nx-finance-panel" style={{ ...C.panel, width: 920, maxWidth: "100%", maxHeight: "92vh", borderRadius: 18, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 30px 90px rgba(0,0,0,.7)", animation: "nx-pop .25s ease both" }}>
            <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderBottom: "1px solid rgba(120,160,220,.18)" }}>
              <div style={{ fontWeight: 800, fontSize: 16, flex: 1 }}>📊 Finance & Reports Center</div>
              <button onClick={shareDaily} style={{ ...miniBtn, background: "linear-gradient(135deg,#059669,#10b981)", color: "#fff", border: "none" }}>📅 Daily → WhatsApp</button>
              <button onClick={loadSample} style={miniBtn}>📦 Sample Data</button>
              <button onClick={printReport} style={{ ...miniBtn, background: "linear-gradient(135deg,#2563eb,#1e4d9e)", color: "#fff", border: "none" }}>🖨 Export PDF</button>
              <button onClick={() => setOpen(false)} style={{ ...miniBtn, width: 34, padding: 0 }}>✕</button>
            </div>

            {!doc && (
              <div className="no-print" style={{ display: "flex", gap: 4, padding: "10px 16px", flexWrap: "wrap", borderBottom: "1px solid rgba(120,160,220,.12)" }}>
                {TABS.map(([id, label]) => (
                  <button key={id} onClick={() => setTab(id)} style={{ ...tabBtn, ...(tab === id ? tabActive : {}) }}>{label}</button>
                ))}
              </div>
            )}
            {doc && (
              <div className="no-print" style={{ display: "flex", gap: 8, padding: "10px 16px", borderBottom: "1px solid rgba(120,160,220,.12)" }}>
                <button onClick={() => setDoc(null)} style={miniBtn}>← Back</button>
                <button onClick={shareDoc} style={{ ...miniBtn, background: "linear-gradient(135deg,#059669,#10b981)", color: "#fff", border: "none" }}>📱 Share on WhatsApp</button>
                <button onClick={printReport} style={{ ...miniBtn, background: "linear-gradient(135deg,#2563eb,#1e4d9e)", color: "#fff", border: "none" }}>🖨 Print / PDF</button>
              </div>
            )}

            <div id="nx-finance-print" style={{ padding: 20, overflowY: "auto" }}>
              <div className="finance-print-head" style={{ display: "none" }}>
                <h2 style={{ margin: 0 }}>{data?.companyInfo?.name || "Company"}</h2>
                <div style={{ color: "#666" }}>{TABS.find((t) => t[0] === tab)?.[1]} — {todayStr()}</div>
              </div>

              {/* Professional document view (invoice / statement) */}
              {doc && (doc.kind === "sale" || doc.kind === "purchase") && <InvoicePaper data={data} rec={doc.rec} kind={doc.kind} />}
              {doc && (doc.kind === "client" || doc.kind === "supplier") && <StatementPaper data={data} entity={doc.rec} kind={doc.kind} />}

              {/* Invoices & Statements picker */}
              {!doc && tab === "docs" && (
                <div>
                  <h3 style={hd}>🧾 Sales Invoices</h3>
                  <DocList rows={M.sales} cur={cur} cols={["date", "product", "client"]} amount={(r) => r.totalAmount} onPick={(r) => setDoc({ kind: "sale", rec: r })} empty="No sales" />
                  <h3 style={{ ...hd, marginTop: 20 }}>📥 Purchase Invoices</h3>
                  <DocList rows={M.purchases} cur={cur} cols={["date", "category", "supplier"]} amount={(r) => r.totalExpenses} onPick={(r) => setDoc({ kind: "purchase", rec: r })} empty="No purchases" />
                  <h3 style={{ ...hd, marginTop: 20 }}>👥 Client Statements</h3>
                  <EntityList rows={M.clients} cur={cur} balKey="remaining" onPick={(r) => setDoc({ kind: "client", rec: r })} />
                  <h3 style={{ ...hd, marginTop: 20 }}>🏪 Supplier Statements</h3>
                  <EntityList rows={M.suppliers} cur={cur} balKey="remaining" onPick={(r) => setDoc({ kind: "supplier", rec: r })} />
                </div>
              )}

              {!doc && tab === "pnl" && (
                <div>
                  <h3 style={hd}>Profit & Loss Statement</h3>
                  <Row label="Revenue (Sales)" value={M.revenue} />
                  <Row label="Cost of Goods Sold (Purchases)" value={-M.cogs} color="#fb7185" />
                  <Row label="Gross Profit" value={M.grossProfit} bold color={M.grossProfit >= 0 ? "#34d399" : "#fb7185"} />
                  <Row label="Operating Expenses" value={-M.opex} color="#fb7185" indent />
                  <Row label="Net Profit" value={M.netProfit} bold color={M.netProfit >= 0 ? "#34d399" : "#fb7185"} />
                  <div style={{ marginTop: 14, fontSize: 12, color: "#5b7ca6" }}>Gross margin: {M.revenue ? Math.round((M.grossProfit / M.revenue) * 100) : 0}% · Net margin: {M.revenue ? Math.round((M.netProfit / M.revenue) * 100) : 0}%</div>
                </div>
              )}

              {!doc && tab === "balance" && (
                <div>
                  <h3 style={hd}>Balance Sheet</h3>
                  <div style={sect}>ASSETS</div>
                  <Row label="Cash & Treasury" value={M.cash} indent />
                  <Row label="Accounts Receivable (Clients)" value={M.receivables} indent />
                  <Row label="Inventory Value" value={M.inventoryValue} indent />
                  <Row label="Total Assets" value={M.assets} bold color="#34d399" />
                  <div style={sect}>LIABILITIES</div>
                  <Row label="Accounts Payable (Suppliers)" value={M.payables} indent />
                  <Row label="Worker Dues" value={M.workerDues} indent />
                  <Row label="Total Liabilities" value={M.liabilities} bold color="#fb7185" />
                  <div style={sect}>EQUITY</div>
                  <Row label="Owner's Equity (Assets − Liabilities)" value={M.equity} bold color="#fbbf24" />
                </div>
              )}

              {!doc && tab === "cash" && (
                <div>
                  <h3 style={hd}>Cash Flow (last 6 months)</h3>
                  <table style={tbl}><thead><tr><th style={th}>Month</th><th style={thR}>Inflow</th><th style={thR}>Outflow</th><th style={thR}>Net</th></tr></thead>
                    <tbody>{cf.map((r, i) => (
                      <tr key={i}><td style={td}>{r.label}</td><td style={{ ...tdR, color: "#34d399" }}>{cur} {fmt(r.inflow)}</td><td style={{ ...tdR, color: "#fb7185" }}>{cur} {fmt(r.outflow)}</td><td style={{ ...tdR, fontWeight: 800, color: r.net >= 0 ? "#34d399" : "#fb7185" }}>{cur} {fmt(r.net)}</td></tr>
                    ))}</tbody>
                    <tfoot><tr><td style={{ ...td, fontWeight: 800 }}>Total</td><td style={{ ...tdR, fontWeight: 800, color: "#34d399" }}>{cur} {fmt(sum(cf, (r) => r.inflow))}</td><td style={{ ...tdR, fontWeight: 800, color: "#fb7185" }}>{cur} {fmt(sum(cf, (r) => r.outflow))}</td><td style={{ ...tdR, fontWeight: 800 }}>{cur} {fmt(sum(cf, (r) => r.net))}</td></tr></tfoot>
                  </table>
                </div>
              )}

              {!doc && tab === "aging" && (
                <div>
                  <h3 style={hd}>Receivables Aging (clients owe you)</h3>
                  <AgingTable rows={recAging} cur={cur} />
                  <h3 style={{ ...hd, marginTop: 22 }}>Payables Aging (you owe suppliers)</h3>
                  <AgingTable rows={payAging} cur={cur} />
                </div>
              )}

              {!doc && tab === "ledger" && (
                <div>
                  <h3 style={hd}>Trial Balance / Account Summary</h3>
                  <table style={tbl}><thead><tr><th style={th}>Account</th><th style={thR}>Debit</th><th style={thR}>Credit</th></tr></thead>
                    <tbody>
                      {[
                        ["Cash & Treasury", M.cash > 0 ? M.cash : 0, M.cash < 0 ? -M.cash : 0],
                        ["Accounts Receivable", M.receivables, 0],
                        ["Inventory", M.inventoryValue, 0],
                        ["Accounts Payable", 0, M.payables],
                        ["Worker Dues Payable", 0, M.workerDues],
                        ["Sales Revenue", 0, M.revenue],
                        ["Cost of Goods Sold", M.cogs, 0],
                        ["Operating Expenses", M.opex, 0],
                      ].map(([acc, dr, crd], i) => (
                        <tr key={i}><td style={td}>{acc}</td><td style={tdR}>{dr ? cur + " " + fmt(dr) : "—"}</td><td style={tdR}>{crd ? cur + " " + fmt(crd) : "—"}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {!doc && tab === "gl" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <h3 style={{ ...hd, margin: 0 }}>📓 General Ledger — Double-Entry Journal</h3>
                    <button onClick={() => { setJe(blankJE); setJeOpen(true); }} style={{ ...miniBtn, background: "linear-gradient(135deg,#2563eb,#1e4d9e)", color: "#fff", border: "none" }}>+ Journal Entry</button>
                  </div>

                  <div style={sect}>POSTED ACCOUNT BALANCES</div>
                  {accountBalances().length === 0
                    ? <div style={{ padding: 14, color: "#5b7ca6", fontSize: 13 }}>No journal entries yet. Post your first entry to build the ledger.</div>
                    : <table style={tbl}><thead><tr><th style={th}>Code</th><th style={th}>Account</th><th style={th}>Type</th><th style={thR}>Debit</th><th style={thR}>Credit</th><th style={thR}>Balance</th></tr></thead>
                        <tbody>{accountBalances().map((a, i) => (
                          <tr key={i}><td style={td}>{a.code}</td><td style={td}>{a.name}</td><td style={td}>{a.type}</td><td style={tdR}>{a.debit ? fmt(a.debit) : "—"}</td><td style={tdR}>{a.credit ? fmt(a.credit) : "—"}</td><td style={{ ...tdR, fontWeight: 700, color: a.balance >= 0 ? "#34d399" : "#fb7185" }}>{cur} {fmt(a.balance)}</td></tr>
                        ))}</tbody>
                        <tfoot><tr><td style={{ ...td, fontWeight: 800 }} colSpan={3}>Total</td><td style={{ ...tdR, fontWeight: 800 }}>{fmt(accountBalances().reduce((s, a) => s + a.debit, 0))}</td><td style={{ ...tdR, fontWeight: 800 }}>{fmt(accountBalances().reduce((s, a) => s + a.credit, 0))}</td><td style={tdR}></td></tr></tfoot>
                      </table>}

                  <div style={{ ...sect, marginTop: 20 }}>JOURNAL ENTRIES ({journal.length})</div>
                  {journal.length === 0 ? <div style={{ padding: 14, color: "#5b7ca6", fontSize: 13 }}>—</div> : journal.slice(0, 50).map((e) => {
                    const t = jeTotals(e.lines);
                    return (
                      <div key={e.id} style={{ border: "1px solid rgba(120,160,220,.18)", borderRadius: 10, padding: 12, marginBottom: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontWeight: 700 }}>{e.date} — {e.memo || "Journal Entry"}</span>
                          <span className="no-print" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <span style={{ color: "#5b7ca6", fontSize: 12 }}>{cur} {fmt(t.d)}</span>
                            <button onClick={() => delJE(e.id)} style={{ ...miniBtn, padding: "3px 8px", color: "#fb7185" }}>🗑</button>
                          </span>
                        </div>
                        {e.lines.map((l, i) => { const ac = coa.find((a) => a.code === l.account); return (
                          <div key={i} style={{ display: "flex", fontSize: 12.5, color: "#cfe0f5", padding: "2px 0", paddingInlineStart: l.credit ? 24 : 0 }}>
                            <span style={{ flex: 1 }}>{l.account} · {ac?.name || ""}</span>
                            <span style={{ width: 110, textAlign: "right", color: "#34d399" }}>{l.debit ? cur + " " + fmt(l.debit) : ""}</span>
                            <span style={{ width: 110, textAlign: "right", color: "#fbbf24" }}>{l.credit ? cur + " " + fmt(l.credit) : ""}</span>
                          </div>
                        ); })}
                      </div>
                    );
                  })}
                </div>
              )}

              {!doc && tab === "assets" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <h3 style={{ ...hd, margin: 0 }}>🏢 Fixed Assets & Depreciation (straight-line)</h3>
                    <button onClick={() => { setAsset(blankAsset); setAssetOpen(true); }} style={{ ...miniBtn, background: "linear-gradient(135deg,#2563eb,#1e4d9e)", color: "#fff", border: "none" }}>+ Asset</button>
                  </div>
                  {assets.length === 0 ? <div style={{ padding: 14, color: "#5b7ca6", fontSize: 13 }}>No assets registered yet.</div> :
                    <table style={tbl}><thead><tr><th style={th}>Asset</th><th style={th}>Acquired</th><th style={thR}>Cost</th><th style={thR}>Life (yrs)</th><th style={thR}>Annual Dep.</th><th style={thR}>Accum. Dep.</th><th style={thR}>Book Value</th><th className="no-print"></th></tr></thead>
                      <tbody>{assets.map((a) => { const d = depreciation(a); return (
                        <tr key={a.id}><td style={td}>{a.name}<div style={{ fontSize: 11, color: "#5b7ca6" }}>{a.category}</div></td><td style={td}>{a.date}</td><td style={tdR}>{cur} {fmt(a.cost)}</td><td style={tdR}>{a.usefulLife}</td><td style={tdR}>{cur} {fmt(d.annual)}</td><td style={{ ...tdR, color: "#fb7185" }}>{cur} {fmt(d.accumulated)}</td><td style={{ ...tdR, fontWeight: 700, color: "#34d399" }}>{cur} {fmt(d.book)}</td><td className="no-print" style={td}><button onClick={() => delAsset(a.id)} style={{ ...miniBtn, padding: "3px 8px", color: "#fb7185" }}>🗑</button></td></tr>
                      ); })}</tbody>
                      <tfoot><tr><td style={{ ...td, fontWeight: 800 }} colSpan={2}>Totals</td><td style={{ ...tdR, fontWeight: 800 }}>{cur} {fmt(assets.reduce((s, a) => s + num(a.cost), 0))}</td><td style={tdR}></td><td style={{ ...tdR, fontWeight: 800 }}>{cur} {fmt(assets.reduce((s, a) => s + depreciation(a).annual, 0))}</td><td style={{ ...tdR, fontWeight: 800, color: "#fb7185" }}>{cur} {fmt(assets.reduce((s, a) => s + depreciation(a).accumulated, 0))}</td><td style={{ ...tdR, fontWeight: 800, color: "#34d399" }}>{cur} {fmt(assets.reduce((s, a) => s + depreciation(a).book, 0))}</td><td className="no-print"></td></tr></tfoot>
                    </table>}
                </div>
              )}

              {!doc && tab === "budget" && (
                <div>
                  <h3 style={hd}>🎯 Budget vs Actual — this month ({todayStr().slice(0, 7)})</h3>
                  {budgetCats.length === 0 ? <div style={{ padding: 14, color: "#5b7ca6", fontSize: 13 }}>No expense categories yet.</div> :
                    <table style={tbl}><thead><tr><th style={th}>Category</th><th style={thR}>Budget (monthly)</th><th style={thR}>Actual</th><th style={thR}>Variance</th><th style={{ ...th, width: 160 }}>Usage</th></tr></thead>
                      <tbody>{budgetCats.map((cat) => {
                        const b = num(budgets[cat]); const act = monthExpense(cat); const variance = b - act; const pct = b > 0 ? Math.min(100, (act / b) * 100) : (act > 0 ? 100 : 0);
                        return (
                          <tr key={cat}><td style={td}>{cat}</td>
                            <td style={tdR}><input type="number" value={budgets[cat] ?? ""} onChange={(e) => setBudget(cat, e.target.value)} placeholder="0" style={{ ...jeInput, width: 110, textAlign: "right", padding: "5px 8px" }} /></td>
                            <td style={tdR}>{cur} {fmt(act)}</td>
                            <td style={{ ...tdR, fontWeight: 700, color: variance >= 0 ? "#34d399" : "#fb7185" }}>{cur} {fmt(variance)}</td>
                            <td style={td}><div style={{ height: 8, borderRadius: 4, background: "rgba(96,160,220,.12)", overflow: "hidden" }}><div style={{ height: "100%", width: pct + "%", background: pct >= 100 ? "#f43f5e" : pct >= 80 ? "#f59e0b" : "#10b981" }} /></div></td>
                          </tr>
                        );
                      })}</tbody>
                    </table>}
                  <div className="txs tmt" style={{ marginTop: 10, color: "#5b7ca6" }}>Set a monthly budget per category; actuals are pulled from this month's expenses. 🟢 under 80% · 🟡 80–100% · 🔴 over budget.</div>
                </div>
              )}

              {!doc && tab === "reminders" && (
                <div>
                  <h3 style={hd}>Payment Reminders — overdue / outstanding clients</h3>
                  {recAging.length === 0 ? <div style={{ padding: 30, textAlign: "center", color: "#5b7ca6" }}>🎉 No outstanding balances.</div> : (
                    <table style={tbl}><thead><tr><th style={th}>Client</th><th style={thR}>Outstanding</th><th style={thR}>Age (days)</th><th className="no-print" style={th}></th></tr></thead>
                      <tbody>{recAging.map((r, i) => (
                        <tr key={i}><td style={td}>{r.name}</td><td style={{ ...tdR, color: "#fb7185", fontWeight: 700 }}>{cur} {fmt(r.total)}</td><td style={tdR}>{r.oldest}</td>
                          <td className="no-print" style={td}>{r.phone ? <button onClick={() => waReminder(r.name, r.phone, r.total)} style={{ ...miniBtn, background: "linear-gradient(135deg,#059669,#10b981)", color: "#fff", border: "none" }}>📱 Remind</button> : <span style={{ color: "#5b7ca6", fontSize: 11 }}>no phone</span>}</td></tr>
                      ))}</tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Journal Entry modal (double-entry) */}
      {jeOpen && (() => {
        const t = jeTotals(je.lines);
        const balanced = Math.abs(t.d - t.c) < 0.01 && t.d > 0;
        return (
          <div onClick={(e) => e.target === e.currentTarget && setJeOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 820, background: "rgba(0,0,0,.65)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div style={{ ...C.panel, width: 640, maxWidth: "100%", maxHeight: "92vh", overflowY: "auto", borderRadius: 16, padding: 20, boxShadow: "0 30px 80px rgba(0,0,0,.7)" }}>
              <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 12 }}>📓 New Journal Entry</div>
              <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                <input type="date" value={je.date} onChange={(e) => setJe((v) => ({ ...v, date: e.target.value }))} style={jeInput} />
                <input placeholder="Memo / description" value={je.memo} onChange={(e) => setJe((v) => ({ ...v, memo: e.target.value }))} style={{ ...jeInput, flex: 1 }} />
              </div>
              <div style={{ display: "flex", fontSize: 11, color: "#5b7ca6", fontWeight: 700, padding: "0 4px 6px" }}>
                <span style={{ flex: 1 }}>ACCOUNT</span><span style={{ width: 120, textAlign: "right" }}>DEBIT</span><span style={{ width: 120, textAlign: "right" }}>CREDIT</span>
              </div>
              {je.lines.map((l, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <select value={l.account} onChange={(e) => setJeLine(i, { account: e.target.value })} style={{ ...jeInput, flex: 1 }}>
                    <option value="">Select account…</option>
                    {coa.map((a) => <option key={a.code} value={a.code}>{a.code} · {a.name}</option>)}
                  </select>
                  <input type="number" placeholder="0" value={l.debit} onChange={(e) => setJeLine(i, { debit: e.target.value, credit: "" })} style={{ ...jeInput, width: 120, textAlign: "right" }} />
                  <input type="number" placeholder="0" value={l.credit} onChange={(e) => setJeLine(i, { credit: e.target.value, debit: "" })} style={{ ...jeInput, width: 120, textAlign: "right" }} />
                </div>
              ))}
              <button onClick={addJeLine} style={{ ...miniBtn, marginTop: 4 }}>+ Add line</button>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 16, margin: "12px 0", fontWeight: 700, color: balanced ? "#34d399" : "#fb7185" }}>
                <span>Debit: {cur} {fmt(t.d)}</span><span>Credit: {cur} {fmt(t.c)}</span><span>{balanced ? "✓ Balanced" : "✕ Unbalanced"}</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={postJE} disabled={!balanced} style={{ ...miniBtn, flex: 1, opacity: balanced ? 1 : .5, background: "linear-gradient(135deg,#059669,#10b981)", color: "#fff", border: "none" }}>Post Entry</button>
                <button onClick={() => setJeOpen(false)} style={{ ...miniBtn, padding: "9px 16px" }}>Cancel</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Fixed Asset modal */}
      {assetOpen && (
        <div onClick={(e) => e.target === e.currentTarget && setAssetOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 820, background: "rgba(0,0,0,.65)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ ...C.panel, width: 520, maxWidth: "100%", borderRadius: 16, padding: 20, boxShadow: "0 30px 80px rgba(0,0,0,.7)" }}>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 12 }}>🏢 New Fixed Asset</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <input placeholder="Asset name" value={asset.name} onChange={(e) => setAsset((v) => ({ ...v, name: e.target.value }))} style={{ ...jeInput, gridColumn: "1 / -1" }} />
              <select value={asset.category} onChange={(e) => setAsset((v) => ({ ...v, category: e.target.value }))} style={jeInput}>
                {["Equipment", "Vehicle", "Building", "Furniture", "Machinery", "Computer", "Other"].map((c) => <option key={c}>{c}</option>)}
              </select>
              <input type="date" value={asset.date} onChange={(e) => setAsset((v) => ({ ...v, date: e.target.value }))} style={jeInput} />
              <input type="number" placeholder={`Cost (${cur})`} value={asset.cost} onChange={(e) => setAsset((v) => ({ ...v, cost: e.target.value }))} style={jeInput} />
              <input type="number" placeholder={`Salvage value (${cur})`} value={asset.salvage} onChange={(e) => setAsset((v) => ({ ...v, salvage: e.target.value }))} style={jeInput} />
              <input type="number" placeholder="Useful life (years)" value={asset.usefulLife} onChange={(e) => setAsset((v) => ({ ...v, usefulLife: e.target.value }))} style={{ ...jeInput, gridColumn: "1 / -1" }} />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button onClick={saveAsset} style={{ ...miniBtn, flex: 1, background: "linear-gradient(135deg,#059669,#10b981)", color: "#fff", border: "none" }}>Save Asset</button>
              <button onClick={() => setAssetOpen(false)} style={{ ...miniBtn, padding: "9px 16px" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const jeInput = { background: "rgba(8,15,30,.8)", border: "1px solid rgba(120,160,220,.25)", borderRadius: 9, color: "#dbeafe", fontSize: 13, padding: "9px 11px", outline: "none", fontFamily: "inherit" };

function AgingTable({ rows, cur }) {
  if (!rows.length) return <div style={{ padding: 20, textAlign: "center", color: "#5b7ca6" }}>No outstanding balances.</div>;
  const tot = (k) => rows.reduce((s, r) => s + (r[k] || 0), 0);
  return (
    <table style={tbl}><thead><tr><th style={th}>Name</th><th style={thR}>0-30</th><th style={thR}>31-60</th><th style={thR}>61-90</th><th style={thR}>90+</th><th style={thR}>Total</th></tr></thead>
      <tbody>{rows.map((r, i) => (
        <tr key={i}><td style={td}>{r.name}</td><td style={tdR}>{r.b0 ? fmt(r.b0) : "—"}</td><td style={tdR}>{r.b30 ? fmt(r.b30) : "—"}</td><td style={{ ...tdR, color: r.b60 ? "#fbbf24" : undefined }}>{r.b60 ? fmt(r.b60) : "—"}</td><td style={{ ...tdR, color: r.b90 ? "#fb7185" : undefined }}>{r.b90 ? fmt(r.b90) : "—"}</td><td style={{ ...tdR, fontWeight: 800 }}>{cur} {fmt(r.total)}</td></tr>
      ))}</tbody>
      <tfoot><tr><td style={{ ...td, fontWeight: 800 }}>Total</td><td style={{ ...tdR, fontWeight: 700 }}>{fmt(tot("b0"))}</td><td style={{ ...tdR, fontWeight: 700 }}>{fmt(tot("b30"))}</td><td style={{ ...tdR, fontWeight: 700 }}>{fmt(tot("b60"))}</td><td style={{ ...tdR, fontWeight: 700 }}>{fmt(tot("b90"))}</td><td style={{ ...tdR, fontWeight: 800 }}>{cur} {fmt(tot("total"))}</td></tr></tfoot>
    </table>
  );
}

function DocList({ rows, cur, cols, amount, onPick, empty }) {
  if (!rows.length) return <div style={{ padding: 14, color: "#5b7ca6", fontSize: 13 }}>{empty}</div>;
  return (
    <table style={tbl}><tbody>
      {rows.slice(0, 50).map((r, i) => (
        <tr key={i} onClick={() => onPick(r)} style={{ cursor: "pointer" }}>
          {cols.map((c) => <td key={c} style={td}>{r[c] || "—"}</td>)}
          <td style={{ ...tdR, color: "#fbbf24", fontWeight: 700 }}>{cur} {fmt(amount(r))}</td>
          <td style={{ ...tdR, color: "#60a5fa" }}>Open ›</td>
        </tr>
      ))}
    </tbody></table>
  );
}
function EntityList({ rows, cur, balKey, onPick }) {
  if (!rows.length) return <div style={{ padding: 14, color: "#5b7ca6", fontSize: 13 }}>None</div>;
  return (
    <table style={tbl}><tbody>
      {rows.map((r, i) => (
        <tr key={i} onClick={() => onPick(r)} style={{ cursor: "pointer" }}>
          <td style={td}>{r.name}</td>
          <td style={tdR}>{r.phone || "—"}</td>
          <td style={{ ...tdR, color: (r[balKey] || 0) > 0 ? "#fb7185" : "#34d399", fontWeight: 700 }}>{cur} {fmt(r[balKey] || 0)}</td>
          <td style={{ ...tdR, color: "#60a5fa" }}>Statement ›</td>
        </tr>
      ))}
    </tbody></table>
  );
}

const hd = { margin: "0 0 12px", fontSize: 16, color: "#f0f6ff" };
const sect = { fontSize: 11, fontWeight: 800, letterSpacing: 1, color: "#5b7ca6", textTransform: "uppercase", margin: "16px 0 4px" };
const tbl = { width: "100%", borderCollapse: "collapse", fontSize: 13 };
const th = { textAlign: "left", padding: "9px 8px", color: "#5b7ca6", fontSize: 11, textTransform: "uppercase", borderBottom: "1px solid rgba(120,160,220,.2)" };
const thR = { ...th, textAlign: "right" };
const td = { padding: "9px 8px", borderBottom: "1px solid rgba(120,160,220,.1)", color: "#cfe0f5" };
const tdR = { ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" };
const miniBtn = { padding: "7px 12px", borderRadius: 9, border: "1px solid rgba(255,255,255,.15)", background: "rgba(255,255,255,.06)", color: "#cfe0f5", cursor: "pointer", fontWeight: 700, fontSize: 12 };
const tabBtn = { padding: "7px 12px", borderRadius: 8, border: "none", background: "transparent", color: "#94b4d8", cursor: "pointer", fontWeight: 700, fontSize: 12 };
const tabActive = { background: "linear-gradient(135deg,#2563eb,#1e4d9e)", color: "#fff" };
