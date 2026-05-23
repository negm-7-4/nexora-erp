/*
 * Sales page — prop-driven, compatible with the main App data model.
 * Receives { data, setData, isAdmin, perms, user } as props (no app context),
 * so it plugs straight into App.jsx's <SalesPage {...pageProps} />.
 */
import { useState } from "react";
import { useConfirm, StatCard, Modal, FormField, SumBox, SearchInput, EmptyState } from "../components/ui.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { AreaTrend } from "../components/charts.jsx";
import { fmt, num, today, fmtDate } from "../lib/format.js";

export default function SalesPage({ data, setData, isAdmin, perms }) {
  const sp = perms?.sales || {};
  const canAdd = isAdmin || sp.add;
  const canDel = isAdmin || sp.del;
  const canPay = isAdmin || sp.pay;
  const canEdit = isAdmin || sp.edit;
  const cur = data.appLabels?.currency || "EGP";
  const { lang } = useLanguage() || { lang: "en" };
  const T = (ar, en) => (lang === "ar" ? ar : en);
  const { confirm, dialog } = useConfirm();

  const [show, setShow] = useState(false);
  const [editId, setEditId] = useState(null);
  const [payId, setPayId] = useState(null);
  const [payForm, setPayForm] = useState({ date: today(), amount: "" });
  const [search, setSearch] = useState("");
  const [errs, setErrs] = useState({});
  const defVat = num(data.companyInfo?.defaultVat ?? data.appLabels?.defaultVat ?? 0);
  const blank = { date: today(), product: "", quantity: "", unit: "pcs", unitPrice: "", transportPrice: "0", discount: "", vat: defVat || "", client: "", paid: "" };
  const [form, setForm] = useState(blank);
  const sf = (f) => setForm((p) => ({ ...p, ...f }));

  const sales = Array.isArray(data.sales) ? data.sales : [];
  const clients = Array.isArray(data.clients) ? data.clients : [];
  const items = data.inventory?.items || [];
  const list = sales.filter((r) => (r.product || "").includes(search) || (r.client || "").includes(search));

  const sub = num(form.quantity) * num(form.unitPrice) + num(form.transportPrice); // subtotal before discount
  const taxable = sub - num(form.discount);
  const vatAmt = taxable * num(form.vat) / 100;
  const total = taxable + vatAmt;
  const due = total - num(form.paid);

  // last 7 days trend
  const trend = (() => {
    const out = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      const v = sales.filter((s) => s.date === key).reduce((a, s) => a + (s.totalAmount || 0), 0);
      out.push({ label: key.slice(5), value: v });
    }
    return out;
  })();

  const openAdd = () => { setForm(blank); setErrs({}); setEditId(null); setShow(true); };
  const openEdit = (rec) => {
    setForm({ date: rec.date || today(), product: rec.product || "", quantity: rec.quantity ?? "", unit: rec.unit || "عدد", unitPrice: rec.unitPrice ?? "", transportPrice: rec.transportPrice ?? "0", discount: rec.discount ?? "", vat: rec.vat ?? "", client: rec.client || "", paid: rec.paid ?? "" });
    setErrs({}); setEditId(rec.id); setShow(true);
  };

  // Apply +/- of a sale's effect to a client by name.
  // remaining/quantity may go negative (credit balance / oversold stock).
  const adjustClient = (cl, name, dTotal, dPaid, dRem) => cl.map((c) => c.name === name
    ? { ...c, totalBought: Math.max(0, (c.totalBought || 0) + dTotal), totalPaid: Math.max(0, (c.totalPaid || 0) + dPaid), remaining: (c.remaining || 0) + dRem }
    : c);
  const adjustStock = (its, productName, dQty) => its.map((it) => it.name === productName ? { ...it, quantity: (it.quantity || 0) + dQty } : it);

  const save = () => {
    const e = {};
    if (!form.product.trim()) e.product = T("مطلوب", "Required");
    if (!form.client) e.client = T("مطلوب", "Required");
    if (num(form.quantity) <= 0) e.quantity = T("أكبر من صفر", "> 0");
    if (num(form.unitPrice) <= 0) e.unitPrice = T("أكبر من صفر", "> 0");
    if (Object.keys(e).length) { setErrs(e); return; }
    const qty = num(form.quantity), up = num(form.unitPrice), tp = num(form.transportPrice), pd = num(form.paid), vat = num(form.vat), discount = num(form.discount);
    const taxableAmt = qty * up + tp - discount;
    const totalAmount = taxableAmt + taxableAmt * vat / 100; // after discount, VAT-inclusive
    const remaining = totalAmount - pd; // can be negative (overpaid = credit)

    if (editId) {
      // Edit: reverse the old record's effect, then apply the new values.
      const old = sales.find((s) => s.id === editId);
      setData((d) => {
        let cl = d.clients || [];
        let its = d.inventory?.items || [];
        if (old) {
          cl = adjustClient(cl, old.client, -(old.totalAmount || 0), -(old.paid || 0), -(old.remaining || 0));
          its = adjustStock(its, old.product, old.quantity || 0); // return old qty to stock
        }
        cl = adjustClient(cl, form.client, totalAmount, pd, remaining);
        its = adjustStock(its, form.product, -qty);
        return {
          ...d,
          sales: (d.sales || []).map((s) => s.id === editId ? { ...s, ...form, quantity: qty, unitPrice: up, transportPrice: tp, vat, discount, totalPrice: qty * up, totalAmount, paid: pd, remaining } : s),
          clients: cl,
          inventory: { ...d.inventory, items: its },
        };
      });
    } else {
      const rec = { id: Date.now(), ...form, quantity: qty, unitPrice: up, transportPrice: tp, vat, discount, totalPrice: qty * up, totalAmount, paid: pd, remaining };
      setData((d) => ({
        ...d,
        sales: [...(d.sales || []), rec],
        clients: adjustClient(d.clients || [], form.client, totalAmount, pd, remaining).map((c) => c.name === form.client ? { ...c, transactions: [...(c.transactions || []), { date: form.date, product: form.product, quantity: qty, unit: form.unit, price: up, total: totalAmount, paid: pd, remaining }] } : c),
        inventory: { ...d.inventory, items: adjustStock(d.inventory?.items || [], form.product, -qty) },
      }));
    }
    setShow(false); setForm(blank); setEditId(null);
  };

  const remove = async (rec) => {
    const ok = await confirm(T("حذف البيع", "Delete sale"), T("هل أنت متأكد؟", "Are you sure?"));
    if (!ok) return;
    setData((d) => ({
      ...d,
      sales: (d.sales || []).filter((x) => x.id !== rec.id),
      clients: (d.clients || []).map((c) => c.name === rec.client
        ? { ...c, totalBought: Math.max(0, c.totalBought - rec.totalAmount), totalPaid: Math.max(0, c.totalPaid - rec.paid), remaining: Math.max(0, c.remaining - rec.remaining) }
        : c),
    }));
  };

  const recordPayment = () => {
    const sale = sales.find((s) => s.id === payId);
    const amt = num(payForm.amount);
    if (amt <= 0) return; // overpayment is allowed (creates a credit / negative balance)
    setData((d) => ({
      ...d,
      sales: (d.sales || []).map((s) => s.id === payId ? { ...s, paid: s.paid + amt, remaining: s.remaining - amt } : s),
      clients: (d.clients || []).map((c) => c.name === sale.client ? { ...c, totalPaid: c.totalPaid + amt, remaining: c.remaining - amt } : c),
    }));
    setPayId(null); setPayForm({ date: today(), amount: "" });
  };

  return (
    <div className="page">
      {dialog}
      <div className="stats-grid">
        <StatCard c="em" icon="💰" label={T("إجمالي المبيعات", "Total Sales")} value={`${fmt(list.reduce((s, r) => s + r.totalAmount, 0))} ${cur}`} />
        <StatCard c="gold" icon="✅" label={T("المحصّل", "Collected")} value={`${fmt(list.reduce((s, r) => s + r.paid, 0))} ${cur}`} />
        <StatCard c="rose" icon="⏳" label={T("المتبقي", "Outstanding")} value={`${fmt(list.reduce((s, r) => s + r.remaining, 0))} ${cur}`} />
      </div>

      <div className="card">
        <div className="card-hdr"><div className="card-title">📈 {T("اتجاه المبيعات (٧ أيام)", "Sales Trend (7 days)")}</div></div>
        <div className="card-body"><AreaTrend data={trend} keys={[{ key: "value", color: "#10b981", name: T("مبيعات", "Sales") }]} /></div>
      </div>

      <div className="card">
        <div className="card-hdr">
          <div className="card-title">💳 {T("المبيعات", "Sales")}</div>
          <div className="card-actions">
            <SearchInput value={search} onChange={setSearch} placeholder={T("بحث...", "Search...")} />
            {canAdd && <button className="btn btn-p" onClick={openAdd} disabled={!clients.length}>+ {T("بيع جديد", "New Sale")}</button>}
          </div>
        </div>
        {!clients.length && <div className="card-body"><div className="alert-bar info"><span>ℹ️</span><div className="ts">{T("أضف عميلاً أولاً", "Add a client first")}</div></div></div>}
        <div className="table-scroll"><table>
          <thead><tr><th>{T("التاريخ", "Date")}</th><th>{T("المنتج", "Product")}</th><th>{T("العميل", "Client")}</th><th>{T("الكمية", "Qty")}</th><th>{T("الإجمالي", "Total")}</th><th>{T("مدفوع", "Paid")}</th><th>{T("متبقي", "Due")}</th><th></th></tr></thead>
          <tbody className="stagger">
            {list.length === 0 ? <tr><td colSpan={8}><EmptyState text={T("لا توجد مبيعات", "No sales yet")} /></td></tr> :
              list.map((r) => (
                <tr key={r.id}>
                  <td className="tmt">{fmtDate(r.date)}</td>
                  <td><span className="badge b-info">{r.product}</span></td>
                  <td className="t-info fw7">{r.client}</td>
                  <td><span className="pill p-blue">{fmt(r.quantity)} {r.unit}</span></td>
                  <td className="t-gold fw7">{fmt(r.totalAmount)} {cur}</td>
                  <td className="t-ok">{fmt(r.paid)} {cur}</td>
                  <td className={r.remaining > 0 ? "t-err" : "t-ok"}>{fmt(r.remaining)} {cur}</td>
                  <td><div style={{ display: "flex", gap: 4 }}>
                    <button className="btn btn-g btn-sm" title={T("طباعة فاتورة", "Print invoice")} onClick={() => window.dispatchEvent(new CustomEvent("nx-print-doc", { detail: { kind: "sale", rec: r } }))}>🧾</button>
                    {canEdit && <button className="btn btn-g btn-sm" title={T("تعديل", "Edit")} onClick={() => openEdit(r)}>✏️</button>}
                    {canPay && r.remaining > 0 && <button className="btn btn-gold btn-sm" onClick={() => { setPayId(r.id); setPayForm({ date: today(), amount: "" }); }}>💰</button>}
                    {canDel && <button className="btn btn-d btn-sm" onClick={() => remove(r)}>🗑</button>}
                  </div></td>
                </tr>
              ))}
          </tbody>
        </table></div>
      </div>

      {(canAdd || canEdit) && <Modal open={show} onClose={() => setShow(false)} title={editId ? T("✏️ تعديل البيع", "✏️ Edit Sale") : T("➕ بيع جديد", "➕ New Sale")}
        footer={<><button className="btn btn-s" onClick={save}>{editId ? T("حفظ التعديلات", "Save changes") : T("تسجيل", "Save")}</button><button className="btn btn-g" onClick={() => setShow(false)}>{T("إلغاء", "Cancel")}</button></>}>
        <div className="form-grid">
          <FormField label={T("التاريخ", "Date")}><input type="date" className="fi" value={form.date} onChange={(e) => sf({ date: e.target.value })} /></FormField>
          <FormField label={T("المنتج", "Product")} error={errs.product}>
            <input className={`fi${errs.product ? " fi-err" : ""}`} list="prod-list" value={form.product} onChange={(e) => { sf({ product: e.target.value }); setErrs((v) => ({ ...v, product: "" })); }} />
            <datalist id="prod-list">{items.map((it) => <option key={it.id} value={it.name} />)}</datalist>
          </FormField>
          <FormField label={T("العميل", "Client")} error={errs.client}>
            <select className={`fi${errs.client ? " fi-err" : ""}`} value={form.client} onChange={(e) => { sf({ client: e.target.value }); setErrs((v) => ({ ...v, client: "" })); }}>
              <option value="">{T("اختر العميل", "Select client")}</option>
              {clients.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </FormField>
          <FormField label={T("الكمية", "Qty")} error={errs.quantity}><input type="number" className={`fi${errs.quantity ? " fi-err" : ""}`} value={form.quantity} onChange={(e) => { sf({ quantity: e.target.value }); setErrs((v) => ({ ...v, quantity: "" })); }} /></FormField>
          <FormField label={T("الوحدة", "Unit")}><select className="fi" value={form.unit} onChange={(e) => sf({ unit: e.target.value })}><option value="pcs">{T("عدد", "pcs")}</option><option value="kg">{T("كجم", "kg")}</option><option value="ton">{T("طن", "ton")}</option></select></FormField>
          <FormField label={`${T("سعر الوحدة", "Unit price")} (${cur})`} error={errs.unitPrice}><input type="number" className={`fi${errs.unitPrice ? " fi-err" : ""}`} value={form.unitPrice} onChange={(e) => { sf({ unitPrice: e.target.value }); setErrs((v) => ({ ...v, unitPrice: "" })); }} /></FormField>
          <FormField label={`${T("النقل", "Shipping")} (${cur})`}><input type="number" className="fi" value={form.transportPrice} onChange={(e) => sf({ transportPrice: e.target.value })} /></FormField>
          <FormField label={`${T("خصم", "Discount")} (${cur})`}><input type="number" min="0" className="fi" placeholder="0" value={form.discount} onChange={(e) => sf({ discount: e.target.value })} /></FormField>
          <FormField label={`${T("ضريبة القيمة المضافة", "VAT")} %`}><input type="number" min="0" className="fi" placeholder="0" value={form.vat} onChange={(e) => sf({ vat: e.target.value })} /></FormField>
          <FormField label={`${T("المدفوع", "Paid")} (${cur})`}><input type="number" className="fi" value={form.paid} onChange={(e) => sf({ paid: e.target.value })} /></FormField>
        </div>
        {form.quantity && form.unitPrice && <SumBox>
          <div className="fb ts"><span className="tmt">{T("المجموع الفرعي", "Subtotal")}</span><span className="fw7">{fmt(sub)} {cur}</span></div>
          {num(form.discount) > 0 && <div className="fb ts mt2"><span className="tmt">{T("خصم", "Discount")}</span><span className="t-err fw7">− {fmt(num(form.discount))} {cur}</span></div>}
          {num(form.vat) > 0 && <div className="fb ts mt2"><span className="tmt">{T("ضريبة", "VAT")} ({num(form.vat)}%)</span><span className="t-info fw7">{fmt(vatAmt)} {cur}</span></div>}
          <div className="fb ts mt2"><span className="tmt">{T("الإجمالي", "Total")}</span><span className="t-gold fw7">{fmt(total)} {cur}</span></div>
          <div className="fb ts mt2"><span className="tmt">{T("المتبقي", "Due")}</span><span className="t-err fw7">{fmt(due)} {cur}</span></div>
        </SumBox>}
      </Modal>}

      <Modal open={!!payId} onClose={() => setPayId(null)} title={T("💰 تسجيل دفعة", "💰 Record Payment")}
        footer={<><button className="btn btn-s" onClick={recordPayment}>{T("تسجيل", "Save")}</button><button className="btn btn-g" onClick={() => setPayId(null)}>{T("إلغاء", "Cancel")}</button></>}>
        {payId && (() => { const s = sales.find((x) => x.id === payId); return s ? (
          <div>
            <div className="tmt ts">{T("المتبقي", "Due")}: <span className="t-err fw7">{fmt(s.remaining)} {cur}</span></div>
            <div className="form-grid mt3">
              <FormField label={T("التاريخ", "Date")}><input type="date" className="fi" value={payForm.date} onChange={(e) => setPayForm((v) => ({ ...v, date: e.target.value }))} /></FormField>
              <FormField label={`${T("المبلغ", "Amount")} (${cur})`}><input type="number" className="fi" max={s.remaining} value={payForm.amount} onChange={(e) => setPayForm((v) => ({ ...v, amount: e.target.value }))} /></FormField>
            </div>
          </div>
        ) : null; })()}
      </Modal>
    </div>
  );
}
