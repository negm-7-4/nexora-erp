/*
 * Manufacturing page — prop-driven, compatible with the main App data model.
 * Uses data.bom, data.manufacturingOrders and data.inventory.items.
 * Rendered as <ManufacturingPage {...pageProps} />.
 */
import { useState } from "react";
import { useConfirm, StatCard, Modal, FormField, EmptyState } from "../components/ui.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { Donut, Bars } from "../components/charts.jsx";
import { fmt, num, today, fmtDate, uid } from "../lib/format.js";

export default function ManufacturingPage({ data, setData, isAdmin, perms }) {
  const mp = perms?.manufacturing || {};
  const canAdd = isAdmin || mp.add;
  const canEdit = isAdmin || mp.edit;
  const viewCosts = isAdmin || mp.viewCosts;
  const cur = data.appLabels?.currency || "EGP";
  const { lang } = useLanguage() || { lang: "en" };
  const T = (ar, en) => (lang === "ar" ? ar : en);
  const { confirm, dialog } = useConfirm();

  const items = data.inventory?.items || [];
  const boms = Array.isArray(data.bom) ? data.bom : [];
  const orders = Array.isArray(data.manufacturingOrders) ? data.manufacturingOrders : [];
  const itemName = (id) => items.find((x) => x.id === id)?.name || "—";
  const itemCost = (id) => items.find((x) => x.id === id)?.cost || 0;
  const stockOf = (id) => items.find((x) => x.id === id)?.quantity || 0;

  const [tab, setTab] = useState("orders");

  /* BOM modal */
  const [bomShow, setBomShow] = useState(false);
  const blankComp = () => ({ key: uid(), itemId: "", qty: 1 });
  const blankBom = { outputItemId: "", outputQty: 1, laborCost: 0, overheadCost: 0, components: [blankComp()] };
  const [bom, setBom] = useState(blankBom);
  const setComp = (key, patch) => setBom((v) => ({ ...v, components: v.components.map((c) => c.key === key ? { ...c, ...patch } : c) }));
  const bomMaterial = (b) => (b.components || []).reduce((s, c) => s + num(c.qty) * itemCost(c.itemId), 0);
  const bomUnitCost = (b) => (bomMaterial(b) + num(b.laborCost) + num(b.overheadCost)) / Math.max(1, num(b.outputQty));

  const saveBom = () => {
    if (!bom.outputItemId) return;
    const comps = bom.components.filter((c) => c.itemId).map((c) => ({ itemId: c.itemId, qty: num(c.qty) }));
    if (!comps.length) return;
    const rec = { id: uid(), outputItemId: bom.outputItemId, outputQty: num(bom.outputQty), laborCost: num(bom.laborCost), overheadCost: num(bom.overheadCost), components: comps };
    setData((d) => ({ ...d, bom: [...(d.bom || []), rec] }));
    setBomShow(false); setBom(blankBom);
  };
  const delBom = async (b) => {
    if (!(await confirm(T("حذف", "Delete"), T("حذف قائمة المكونات؟", "Delete this BOM?")))) return;
    setData((d) => ({ ...d, bom: (d.bom || []).filter((x) => x.id !== b.id) }));
  };

  /* Production order */
  const [ordShow, setOrdShow] = useState(false);
  const [ord, setOrd] = useState({ bomId: "", batches: 1, date: today() });
  const orderCost = (o) => { const b = boms.find((x) => x.id === o.bomId); return b ? (bomMaterial(b) + num(b.laborCost) + num(b.overheadCost)) * num(o.batches) : 0; };
  const createOrder = () => {
    const b = boms.find((x) => x.id === ord.bomId); if (!b) return;
    const rec = { id: uid(), bomId: ord.bomId, batches: num(ord.batches), date: ord.date, status: "planned", cost: orderCost(ord) };
    setData((d) => ({ ...d, manufacturingOrders: [rec, ...(d.manufacturingOrders || [])] }));
    setOrdShow(false); setOrd({ bomId: "", batches: 1, date: today() });
  };
  const setOrderStatus = (o, status) => setData((d) => ({ ...d, manufacturingOrders: (d.manufacturingOrders || []).map((x) => x.id === o.id ? { ...x, status } : x) }));
  const completeOrder = async (o) => {
    const b = boms.find((x) => x.id === o.bomId); if (!b) return;
    const short = (b.components || []).some((c) => stockOf(c.itemId) < c.qty * o.batches);
    if (short && !(await confirm(T("نقص مواد", "Short materials"), T("المواد غير كافية. إكمال؟", "Materials short. Complete anyway?"), { confirmLabel: T("إكمال", "Complete"), confirmClass: "btn-gold", icon: "⚠️" }))) return;
    setData((d) => {
      const newItems = (d.inventory?.items || []).map((it) => {
        let q = it.quantity || 0;
        (b.components || []).forEach((c) => { if (c.itemId === it.id) q = Math.max(0, q - c.qty * o.batches); });
        if (b.outputItemId === it.id) q += b.outputQty * o.batches;
        return { ...it, quantity: q };
      });
      return { ...d, inventory: { ...d.inventory, items: newItems }, manufacturingOrders: (d.manufacturingOrders || []).map((x) => x.id === o.id ? { ...x, status: "done" } : x) };
    });
  };

  return (
    <div className="page">
      {dialog}
      <div className="stats-grid">
        <StatCard c="vio" icon="🏭" label={T("أوامر الإنتاج", "Production Orders")} value={orders.length} />
        <StatCard c="em" icon="✅" label={T("منتهية", "Done")} value={orders.filter((o) => o.status === "done").length} />
        <StatCard c="gold" icon="📋" label={T("قوائم المكونات", "BOMs")} value={boms.length} />
        <StatCard c="cyan" icon="📦" label={T("الأصناف", "Items")} value={items.length} />
      </div>

      {orders.length > 0 && (
        <div className="dgrid">
          <div className="card"><div className="card-hdr"><div className="card-title">📊 {T("الأوامر حسب الحالة", "Orders by Status")}</div></div><div className="card-body">
            <Donut data={["planned", "in_progress", "done"].map((st) => ({ label: st, value: orders.filter((o) => o.status === st).length })).filter((d) => d.value)} />
          </div></div>
          <div className="card"><div className="card-hdr"><div className="card-title">🏭 {T("تكلفة آخر الأوامر", "Recent Order Costs")}</div></div><div className="card-body">
            <Bars data={orders.slice(0, 8).map((o) => ({ label: fmtDate(o.date).slice(0, 6), value: o.cost || 0 }))} keys={[{ key: "value", color: "#7c3aed", name: T("التكلفة", "Cost") }]} />
          </div></div>
        </div>
      )}

      <div className="tabs" style={{ marginBottom: 16, maxWidth: 360 }}>
        {[["orders", T("🏭 الأوامر", "🏭 Orders")], ["boms", T("📋 المكونات", "📋 BOM")]].map(([id, label]) => (
          <button key={id} className={"tab-btn " + (tab === id ? "active" : "")} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {tab === "orders" && (
        <div className="card">
          <div className="card-hdr">
            <div className="card-title">🏭 {T("أوامر الإنتاج", "Production Orders")}</div>
            {canAdd && <button className="btn btn-p" onClick={() => setOrdShow(true)} disabled={!boms.length}>+ {T("جديد", "New")}</button>}
          </div>
          <div className="table-scroll"><table>
            <thead><tr><th>{T("التاريخ", "Date")}</th><th>{T("المخرجات", "Output")}</th><th>{T("الدفعات", "Batches")}</th>{viewCosts && <th>{T("التكلفة", "Cost")}</th>}<th>{T("الحالة", "Status")}</th><th></th></tr></thead>
            <tbody className="stagger">
              {orders.length === 0 ? <tr><td colSpan={6}><EmptyState icon="🏭" text={T("لا توجد أوامر", "No orders")} /></td></tr> :
                orders.map((o) => { const b = boms.find((x) => x.id === o.bomId); return (
                  <tr key={o.id}>
                    <td className="tmt">{fmtDate(o.date)}</td>
                    <td className="fw7">{b ? `${fmt(b.outputQty * o.batches)} × ${itemName(b.outputItemId)}` : "—"}</td>
                    <td>{o.batches}</td>
                    {viewCosts && <td className="t-gold">{fmt(o.cost)} {cur}</td>}
                    <td><span className={"badge " + (o.status === "done" ? "b-ok" : o.status === "in_progress" ? "b-warn" : "b-info")}>{o.status}</span></td>
                    <td><div style={{ display: "flex", gap: 4 }}>
                      {canEdit && o.status === "planned" && <button className="btn btn-g btn-sm" onClick={() => setOrderStatus(o, "in_progress")}>▶</button>}
                      {canEdit && o.status !== "done" && <button className="btn btn-s btn-sm" onClick={() => completeOrder(o)}>✅</button>}
                    </div></td>
                  </tr>
                ); })}
            </tbody>
          </table></div>
        </div>
      )}

      {tab === "boms" && (
        <div className="card">
          <div className="card-hdr">
            <div className="card-title">📋 {T("قوائم المكونات", "Bills of Materials")}</div>
            {canAdd && <button className="btn btn-p" onClick={() => { setBom(blankBom); setBomShow(true); }} disabled={!items.length}>+ {T("جديد", "New")}</button>}
          </div>
          {!items.length && <div className="card-body"><div className="alert-bar info"><span>ℹ️</span><div className="ts">{T("أضف أصناف مخزون أولاً", "Add inventory items first")}</div></div></div>}
          <div className="table-scroll"><table>
            <thead><tr><th>{T("المنتج", "Output")}</th><th>{T("الكمية", "Qty")}</th><th>{T("المكونات", "Components")}</th>{viewCosts && <th>{T("تكلفة الوحدة", "Unit cost")}</th>}<th></th></tr></thead>
            <tbody className="stagger">
              {boms.length === 0 ? <tr><td colSpan={5}><EmptyState icon="📋" text={T("لا توجد قوائم", "No BOMs")} /></td></tr> :
                boms.map((b) => (
                  <tr key={b.id}>
                    <td className="fw7">{itemName(b.outputItemId)}</td>
                    <td>{b.outputQty}</td>
                    <td className="tmt">{(b.components || []).length}</td>
                    {viewCosts && <td className="t-gold fw7">{fmt(bomUnitCost(b))} {cur}</td>}
                    <td>{canEdit && <button className="btn btn-d btn-sm" onClick={() => delBom(b)}>🗑</button>}</td>
                  </tr>
                ))}
            </tbody>
          </table></div>
        </div>
      )}

      <Modal open={bomShow} onClose={() => setBomShow(false)} wide title={T("قائمة مكونات جديدة", "New BOM")}
        footer={<><button className="btn btn-p" onClick={saveBom}>{T("حفظ", "Save")}</button><button className="btn btn-g" onClick={() => setBomShow(false)}>{T("إلغاء", "Cancel")}</button></>}>
        <div className="form-grid">
          <FormField label={T("المنتج الناتج", "Output product")}>
            <select className="fi" value={bom.outputItemId} onChange={(e) => setBom((v) => ({ ...v, outputItemId: e.target.value }))}>
              <option value="">{T("اختر...", "Select...")}</option>
              {items.map((it) => <option key={it.id} value={it.id}>{it.name}</option>)}
            </select>
          </FormField>
          <FormField label={T("الكمية الناتجة", "Output qty")}><input type="number" className="fi" value={bom.outputQty} onChange={(e) => setBom((v) => ({ ...v, outputQty: e.target.value }))} /></FormField>
          <FormField label={`${T("عمالة", "Labor")} (${cur})`}><input type="number" className="fi" value={bom.laborCost} onChange={(e) => setBom((v) => ({ ...v, laborCost: e.target.value }))} /></FormField>
          <FormField label={`${T("تكاليف إضافية", "Overhead")} (${cur})`}><input type="number" className="fi" value={bom.overheadCost} onChange={(e) => setBom((v) => ({ ...v, overheadCost: e.target.value }))} /></FormField>
        </div>
        <div className="card-title mt4">{T("المكونات (مواد خام)", "Components")}</div>
        {bom.components.map((c) => (
          <div className="fr mt2" key={c.key}>
            <select className="fi" style={{ flex: 3 }} value={c.itemId} onChange={(e) => setComp(c.key, { itemId: e.target.value })}>
              <option value="">{T("اختر مادة...", "Select material...")}</option>
              {items.map((it) => <option key={it.id} value={it.id}>{it.name} ({T("المتاح", "stock")} {stockOf(it.id)})</option>)}
            </select>
            <input type="number" className="fi" style={{ width: 90 }} value={c.qty} onChange={(e) => setComp(c.key, { qty: e.target.value })} />
            <button className="btn btn-d btn-sm" onClick={() => setBom((v) => ({ ...v, components: v.components.filter((x) => x.key !== c.key) }))}>✕</button>
          </div>
        ))}
        <button className="btn btn-g btn-sm mt3" onClick={() => setBom((v) => ({ ...v, components: [...v.components, blankComp()] }))}>+ {T("مكوّن", "Component")}</button>
        {viewCosts && <div className="sumrow mt3 fb"><span className="tmt">{T("تكلفة الوحدة", "Unit cost")}</span><span className="t-gold fw8">{fmt(bomUnitCost(bom))} {cur}</span></div>}
      </Modal>

      <Modal open={ordShow} onClose={() => setOrdShow(false)} title={T("أمر إنتاج جديد", "New Production Order")}
        footer={<><button className="btn btn-p" onClick={createOrder}>{T("حفظ", "Save")}</button><button className="btn btn-g" onClick={() => setOrdShow(false)}>{T("إلغاء", "Cancel")}</button></>}>
        <div className="form-grid">
          <FormField label="BOM" full>
            <select className="fi" value={ord.bomId} onChange={(e) => setOrd((v) => ({ ...v, bomId: e.target.value }))}>
              <option value="">{T("اختر...", "Select...")}</option>
              {boms.map((b) => <option key={b.id} value={b.id}>{itemName(b.outputItemId)} (×{b.outputQty})</option>)}
            </select>
          </FormField>
          <FormField label={T("الدفعات", "Batches")}><input type="number" className="fi" value={ord.batches} onChange={(e) => setOrd((v) => ({ ...v, batches: e.target.value }))} /></FormField>
          <FormField label={T("التاريخ", "Date")}><input type="date" className="fi" value={ord.date} onChange={(e) => setOrd((v) => ({ ...v, date: e.target.value }))} /></FormField>
        </div>
        {viewCosts && ord.bomId && <div className="sumrow mt3 fb"><span className="tmt">{T("التكلفة المقدرة", "Estimated cost")}</span><span className="t-gold fw8">{fmt(orderCost(ord))} {cur}</span></div>}
      </Modal>
    </div>
  );
}
