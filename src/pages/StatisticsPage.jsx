/*
 * Statistics page — prop-driven, reads the main App data model.
 * Rendered as <StatisticsPage data={data} perms={perms} />.
 */
import { useState } from "react";
import { StatCard } from "../components/ui.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { AreaTrend, Bars, Donut, PieChart, Lines } from "../components/charts.jsx";
import { fmt } from "../lib/format.js";

export default function StatisticsPage({ data }) {
  const cur = data.appLabels?.currency || "EGP";
  const { lang } = useLanguage() || { lang: "en" };
  const T = (ar, en) => (lang === "ar" ? ar : en);
  const [range, setRange] = useState(6);

  const sales = data.sales || [];
  const incoming = data.incoming || [];
  const expenses = data.expenses || [];
  const clients = data.clients || [];
  const suppliers = data.suppliers || [];

  const totalSales = sales.reduce((s, r) => s + (r.totalAmount || 0), 0);
  const totalPaid = sales.reduce((s, r) => s + (r.paid || 0), 0);
  const totalDue = sales.reduce((s, r) => s + (r.remaining || 0), 0);
  const totalExp = expenses.reduce((s, e) => s + (e.amount || 0), 0)
    + incoming.reduce((s, r) => s + (r.totalExpenses || 0), 0);
  const profit = totalSales - totalExp;

  // monthly trend
  const trend = (() => {
    const out = [];
    const now = new Date();
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const s = sales.filter((x) => (x.date || "").startsWith(key)).reduce((a, x) => a + (x.totalAmount || 0), 0);
      const e = expenses.filter((x) => (x.date || "").startsWith(key)).reduce((a, x) => a + (x.amount || 0), 0);
      out.push({ label: d.toLocaleDateString("en-US", { month: "short" }), sales: s, expenses: e, profit: s - e });
    }
    return out;
  })();

  const byProduct = (() => {
    const m = {};
    sales.forEach((s) => { m[s.product || "—"] = (m[s.product || "—"] || 0) + (s.totalAmount || 0); });
    return Object.entries(m).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  })();

  const byExpense = (() => {
    const m = {};
    expenses.forEach((e) => { m[e.type || "—"] = (m[e.type || "—"] || 0) + (e.amount || 0); });
    return Object.entries(m).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  })();

  const topClients = [...clients].sort((a, b) => (b.totalBought || 0) - (a.totalBought || 0)).slice(0, 7)
    .map((c) => ({ label: c.name, value: c.totalBought || 0 }));

  const receivables = [
    { label: T("المحصّل", "Collected"), value: totalPaid, color: "#10b981" },
    { label: T("المتبقي", "Outstanding"), value: totalDue, color: "#f43f5e" },
  ];

  return (
    <div className="page">
      <div className="card-hdr" style={{ borderRadius: 12, border: "1px solid var(--border)", marginBottom: 18 }}>
        <div className="card-title">📈 {T("الإحصائيات", "Statistics")}</div>
        <div className="tabs">{[3, 6, 12].map((m) => <button key={m} className={"tab-btn " + (range === m ? "active" : "")} onClick={() => setRange(m)}>{m}M</button>)}</div>
      </div>

      <div className="stats-grid">
        <StatCard c="em" icon="💰" label={T("الإيرادات", "Revenue")} value={`${fmt(totalSales)} ${cur}`} />
        <StatCard c="gold" icon="📈" label={T("الربح", "Profit")} value={`${fmt(profit)} ${cur}`} />
        <StatCard c="rose" icon="💼" label={T("المصروفات", "Expenses")} value={`${fmt(totalExp)} ${cur}`} />
        <StatCard c="cyan" icon="⏳" label={T("المتبقي", "Outstanding")} value={`${fmt(totalDue)} ${cur}`} />
        <StatCard c="vio" icon="👥" label={T("العملاء", "Clients")} value={clients.length} />
      </div>

      <div className="card">
        <div className="card-hdr"><div className="card-title">📊 {T("المبيعات · المصروفات · الربح", "Sales · Expenses · Profit")}</div></div>
        <div className="card-body">
          <Lines data={trend} height={300} keys={[
            { key: "sales", color: "#10b981", name: T("مبيعات", "Sales") },
            { key: "expenses", color: "#f59e0b", name: T("مصروفات", "Expenses") },
            { key: "profit", color: "#3b82f6", name: T("ربح", "Profit") },
          ]} />
        </div>
      </div>

      <div className="dgrid">
        <div className="card"><div className="card-hdr"><div className="card-title">🏆 {T("أفضل المنتجات", "Top Products")}</div></div><div className="card-body"><Bars data={byProduct} keys={[{ key: "value", color: "#7c3aed", name: T("مبيعات", "Sales") }]} /></div></div>
        <div className="card"><div className="card-hdr"><div className="card-title">💼 {T("المصروفات", "Expenses")}</div></div><div className="card-body"><Donut data={byExpense} /></div></div>
      </div>

      <div className="dgrid">
        <div className="card"><div className="card-hdr"><div className="card-title">👥 {T("أكبر العملاء", "Top Clients")}</div></div><div className="card-body"><Bars data={topClients} keys={[{ key: "value", color: "#06b6d4", name: T("الإجمالي", "Total") }]} /></div></div>
        <div className="card"><div className="card-hdr"><div className="card-title">💵 {T("التحصيل", "Receivables")}</div></div><div className="card-body"><PieChart data={receivables} /></div></div>
      </div>

      <div className="card">
        <div className="card-hdr"><div className="card-title">📈 {T("الإيراد الشهري", "Monthly Revenue")}</div></div>
        <div className="card-body"><AreaTrend data={trend} height={280} keys={[{ key: "sales", color: "#10b981", name: T("الإيراد", "Revenue") }]} /></div>
      </div>
    </div>
  );
}
