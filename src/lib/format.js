/* Formatting + small numeric helpers (locale-aware, generalized). */

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const num = (v) => parseFloat(v) || 0;

export const fmt = (n) =>
  Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });

export const fmtInt = (n) =>
  Math.round(Number(n || 0)).toLocaleString("en-US");

/** Format an amount with a currency symbol. */
export const money = (n, symbol = "$") => `${symbol}${fmt(n)}`;

export const fmtDate = (d) =>
  d ? new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  }) : "—";

export const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString("en-US", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  }) : "—";

export const today = () => new Date().toISOString().split("T")[0];

export const monthKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

export const inMonth = (dateStr, key = monthKey()) =>
  Boolean(dateStr) && dateStr.startsWith(key);

export const pct = (part, whole) =>
  whole > 0 ? Math.round((part / whole) * 100) : 0;

export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const sum = (arr, fn) => arr.reduce((s, x) => s + (fn ? fn(x) : x), 0);

export const relativeTime = (date) => {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const sec = Math.round(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  return d.toLocaleDateString("en-US");
};
