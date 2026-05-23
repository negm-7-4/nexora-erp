/* Reusable presentational UI primitives. */
import { useState, createContext, useContext, useCallback } from "react";

/* ── Toast ── */
const ToastCtx = createContext(null);
let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const remove = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const add = useCallback((msg, type = "success", dur = 3000) => {
    const id = ++toastId;
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => remove(id), dur);
    return id;
  }, [remove]);
  const toast = {
    success: (m) => add(m, "success"),
    error: (m) => add(m, "error", 4000),
    warning: (m) => add(m, "warning", 3500),
    info: (m) => add(m, "info"),
  };
  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <span>{t.type === "success" ? "✅" : t.type === "error" ? "❌" : t.type === "warning" ? "⚠️" : "ℹ️"}</span>
            <span>{t.msg}</span>
            <button className="toast-close" onClick={() => remove(t.id)}>✕</button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

/* ── Confirm dialog ── */
function ConfirmDialog({ open, title, msg, confirmLabel = "Delete", confirmClass = "btn-d", icon = "🗑️", onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="confirm-ov" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="confirm-box">
        <div className="confirm-icon">{icon}</div>
        <div className="confirm-title">{title || "Confirm"}</div>
        <div className="confirm-msg">{msg || "Are you sure? This action cannot be undone."}</div>
        <div className="confirm-btns">
          <button className={`btn ${confirmClass}`} onClick={onConfirm}>{confirmLabel}</button>
          <button className="btn btn-g" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export function useConfirm() {
  const [state, setState] = useState({ open: false });
  const confirm = (title, msg, opts = {}) =>
    new Promise((resolve) => setState({ open: true, title, msg, ...opts, resolve }));
  const handle = (ok) => { state.resolve?.(ok); setState({ open: false }); };
  const dialog = (
    <ConfirmDialog
      open={state.open} title={state.title} msg={state.msg}
      icon={state.icon} confirmLabel={state.confirmLabel} confirmClass={state.confirmClass}
      onConfirm={() => handle(true)} onCancel={() => handle(false)}
    />
  );
  return { confirm, dialog };
}

/* ── Stat card ── */
export function StatCard({ c = "blue", icon, label, value, sub }) {
  return (
    <div className={"stat-card sc-" + c}>
      <div className="sc-glow" />
      <div className="sc-icon">{icon}</div>
      <div className="sc-label">{label}</div>
      <div className="sc-value">{value}</div>
      {sub && <div className="sc-sub">{sub}</div>}
    </div>
  );
}

/* ── Modal ── */
export function Modal({ open, onClose, title, children, footer, wide }) {
  if (!open) return null;
  return (
    <div className="modal-ov" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={wide ? { maxWidth: 760 } : {}}>
        <div className="modal-hdr">
          <div className="modal-title">{title}</div>
          <button className="btn btn-g btn-icon btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

export function SumBox({ children }) {
  return <div className="sumrow mt3">{children}</div>;
}

export function FormField({ label, error, children, full }) {
  return (
    <div className={"fg" + (full ? " full" : "")}>
      {label && <label className="fl">{label}</label>}
      {children}
      {error && <div className="field-err">⚠ {error}</div>}
    </div>
  );
}

export function Toggle({ on, onChange, label }) {
  return (
    <div className="toggle-wrap" onClick={() => onChange(!on)}>
      <div className={"toggle-track" + (on ? " on" : "")}>
        <div className="toggle-thumb" />
      </div>
      {label && <span className="toggle-label">{label}</span>}
    </div>
  );
}

export function ReadOnlyBanner({ text = "You have view-only access — you can browse data but not modify it." }) {
  return (
    <div className="alert-bar warn" style={{ marginBottom: 18 }}>
      <span style={{ fontSize: 20 }}>👁</span>
      <div>
        <div className="fw7" style={{ color: "var(--gold-l)" }}>View only</div>
        <div className="txs tmt">{text}</div>
      </div>
    </div>
  );
}

export function EmptyState({ icon = "📭", text = "No data yet" }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <div className="empty-txt">{text}</div>
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = "Search...", width = 160 }) {
  return (
    <div className="search-box">
      <span className="search-icon">🔍</span>
      <input className="fi" placeholder={placeholder} value={value}
        onChange={(e) => onChange(e.target.value)} style={{ width }} />
    </div>
  );
}

export function ProgressBar({ value, color = "var(--bright)" }) {
  return (
    <div className="prog-bar">
      <div className="prog-fill" style={{ width: `${Math.min(100, value)}%`, background: color }} />
    </div>
  );
}

export function BarChart({ data, color = "var(--bright)" }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div>
      {data.map((d, i) => (
        <div className="bar-row" key={i}>
          <div className="bar-label" title={d.label}>{d.label}</div>
          <div className="bar-track">
            <div className="bar-fill" style={{
              width: `${Math.max(6, (d.value / max) * 100)}%`,
              background: d.color || color,
            }}>{d.display ?? d.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
