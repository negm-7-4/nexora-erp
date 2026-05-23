/*
 * Bilingual i18n (English / Arabic) with RTL handling + light/dark theme.
 *
 * Two translation surfaces:
 *  - t('key')     → keyed strings used across App.jsx (camelCase keys).
 *  - <DynText>…</> → translates English UI phrases to Arabic by content.
 *
 * Unknown keys fall back to a humanized label so the UI never shows raw keys.
 */
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { DICTIONARY_AR_EN, DICTIONARY_EN_AR } from "../lib/dictionary.js";

/* Keyed UI strings (English + Arabic). */
const KEYS = {
  // currency + units
  currency: { en: "EGP", ar: "ج.م" },
  // nav / modules
  dashboard: { en: "Dashboard", ar: "لوحة التحكم" },
  incoming: { en: "Purchases", ar: "الوارد" },
  sales: { en: "Sales", ar: "المبيعات" },
  clients: { en: "Clients", ar: "العملاء" },
  client: { en: "Client", ar: "العميل" },
  workers: { en: "Workers", ar: "العمال" },
  suppliers: { en: "Suppliers", ar: "الموردون" },
  supplier: { en: "Supplier", ar: "المورد" },
  inventory: { en: "Inventory", ar: "المخزون" },
  expenses: { en: "Expenses", ar: "المصروفات" },
  logistics: { en: "Logistics", ar: "اللوجستيات" },
  treasury: { en: "Treasury", ar: "الخزينة" },
  hr: { en: "HR", ar: "الموارد البشرية" },
  crm: { en: "CRM", ar: "إدارة العملاء" },
  manufacturing: { en: "Manufacturing", ar: "التصنيع" },
  statistics: { en: "Statistics", ar: "الإحصائيات" },
  reports: { en: "Reports", ar: "التقارير" },
  settings: { en: "Settings", ar: "الإعدادات" },
  profile: { en: "Profile", ar: "الملف الشخصي" },
  integrations: { en: "Integrations", ar: "التكاملات" },
  saas: { en: "SaaS Platform", ar: "منصة SaaS" },
  sysAdmin: { en: "System Admin", ar: "مدير النظام" },
  users: { en: "Users", ar: "المستخدمون" },
  logout: { en: "Logout", ar: "تسجيل الخروج" },
  notifications: { en: "Notifications", ar: "التنبيهات" },
  search: { en: "Search", ar: "بحث" },
  // common labels
  total: { en: "Total", ar: "الإجمالي" },
  totalSales: { en: "Total Sales", ar: "إجمالي المبيعات" },
  totalExpenses: { en: "Total Expenses", ar: "إجمالي المصروفات" },
  date: { en: "Date", ar: "التاريخ" },
  category: { en: "Category", ar: "الصنف" },
  product: { en: "Product", ar: "المنتج" },
  production: { en: "Production", ar: "الإنتاج" },
  weight: { en: "Weight", ar: "الوزن" },
  waste: { en: "Waste", ar: "الهالك" },
  unitPrice: { en: "Unit Price", ar: "سعر الوحدة" },
  status: { en: "Status", ar: "الحالة" },
  paid: { en: "Paid", ar: "مدفوع" },
  partial: { en: "Partial", ar: "جزئي" },
  noData: { en: "No data", ar: "لا توجد بيانات" },
  readonly: { en: "View only", ar: "عرض فقط" },
  add: { en: "Add", ar: "إضافة" },
  more: { en: "More", ar: "المزيد" },
  // dashboard
  dashboard_welcomeTitle: { en: "Welcome", ar: "مرحباً" },
  dashboard_welcomeSub: { en: "Here's your business at a glance", ar: "إليك ملخص أعمالك" },
  quickActions: { en: "Quick Actions", ar: "إجراءات سريعة" },
  newSaleBtn: { en: "+ New Sale", ar: "+ بيع جديد" },
  newIncomingBtn: { en: "+ New Purchase", ar: "+ وارد جديد" },
  newExpenseBtn: { en: "+ New Expense", ar: "+ مصروف جديد" },
  newTaskPlaceholder: { en: "Add a task…", ar: "أضف مهمة…" },
  managerTasks: { en: "Tasks", ar: "المهام" },
  latestIncoming: { en: "Latest Purchases", ar: "آخر الواردات" },
  latestSales: { en: "Latest Sales", ar: "آخر المبيعات" },
  expensesAnalysis: { en: "Expense Analysis", ar: "تحليل المصروفات" },
  expensesSub: { en: "Total spending", ar: "إجمالي الإنفاق" },
  incomingExpenses: { en: "Purchase Costs", ar: "مصروفات الوارد" },
  debtsForUs: { en: "Owed to us", ar: "مستحق لنا" },
  debtsOnUs: { en: "Owed by us", ar: "مستحق علينا" },
  currentLiquidity: { en: "Current Liquidity", ar: "السيولة الحالية" },
  availableBalance: { en: "Available balance", ar: "الرصيد المتاح" },
  liquidityDeficit: { en: "Liquidity deficit", ar: "عجز في السيولة" },
  smartKPIs: { en: "Smart KPIs", ar: "مؤشرات ذكية" },
  excellentPerformance: { en: "Excellent performance", ar: "أداء ممتاز" },
  salesGrowthMonthly: { en: "Monthly sales growth", ar: "نمو المبيعات الشهري" },
  salesDecline: { en: "Sales decline", ar: "انخفاض المبيعات" },
  supplierPaymentsDeferred: { en: "Deferred supplier payments", ar: "مدفوعات موردين مؤجلة" },
  exportExcel: { en: "Export Excel", ar: "تصدير Excel" },
  // expense categories
  workshopExp: { en: "Workshop Expenses", ar: "مصروفات ورشة" },
  utilityExp: { en: "Utility Bills", ar: "فواتير كهرباء ومياه" },
  rentExp: { en: "Rent", ar: "إيجارات" },
  pettyExp: { en: "Petty Cash", ar: "نثرية" },
  wagesAndLabor: { en: "Wages & Labor", ar: "رواتب وأجور" },
  transportAndMaintenance: { en: "Transport & Maintenance", ar: "نقل وصيانة" },
  // alerts (templated with {0},{1},{2})
  alert_lowStockTitle: { en: "Low stock", ar: "نقص في المخزون" },
  alert_lowStockDesc: { en: "Only {0} {1} left (threshold {2})", ar: "المتبقي {0} {1} فقط (الحد {2})" },
  alert_debtTitle: { en: "Outstanding debt", ar: "ديون مستحقة" },
  alert_debtDesc: { en: "{0} owes {1}", ar: "{0} عليه {1}" },
};

/* English-phrase → Arabic, used by <DynText>. */
const PHRASES = {
  "Personal Account Settings": "إعدادات الحساب الشخصي",
  "Change Picture": "تغيير الصورة",
  "Not specified": "غير محدد",
  "Warehouse Worker (Inventory Add)": "عامل مخزن (إضافة مخزون)",
  "Production Worker": "عامل إنتاج",
  "Sales Rep": "مندوب مبيعات",
  "Accountant": "محاسب",
  "Save Changes": "حفظ التعديلات",
  "⏳ Saving...": "⏳ جاري الحفظ...",
  "✅ Save Changes": "✅ حفظ التعديلات",
  "Previous": "السابق", "Next": "التالي", "Page": "صفحة", "of": "من",
  "Confirm Delete": "تأكيد الحذف", "Cancel": "إلغاء",
  "Are you sure? This action cannot be undone.": "هل أنت متأكد؟ لا يمكن التراجع.",
  "An unexpected error occurred": "حدث خطأ غير متوقع", "Refresh Page": "تحديث الصفحة",
  "Select...": "اختر...", "No results": "لا نتائج", "View-Only Mode": "وضع العرض فقط",
  "You're signed in as a user — view-only access": "أنت مسجّل كمستخدم — صلاحية عرض فقط",
  "Inventory Items": "أصناف المخزون", "items": "صنف",
  "Treasury Activity (Last 7 Days)": "حركة الخزينة (آخر ٧ أيام)",
  "Sales & Expenses (Last 7 Days)": "المبيعات والمصروفات (آخر ٧ أيام)",
  "Top Selling Products": "أكثر المنتجات مبيعاً", "Share Today's Summary": "مشاركة ملخص اليوم",
  "Purchase Log": "سجل المشتريات", "Add Purchase": "إضافة وارد",
  "Date": "التاريخ", "Category": "الصنف", "kg": "كجم", "Present": "حاضر", "Absent": "غائب",
  "✅ Present": "✅ حاضر", "Company Logo": "شعار الشركة",
};

const LangCtx = createContext(null);
export const useLanguage = () => useContext(LangCtx);

function humanize(key) {
  return String(key)
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^\w/, (c) => c.toUpperCase());
}

/* ──────────────────────────────────────────────────────────
   Online auto-translation engine.
   Translates any text to the active language on demand via a
   free Google translate endpoint, caches results in localStorage,
   and falls back to the original text if the network fails.
   This is what makes the whole app translate "everything",
   including dynamic data, not just hand-mapped strings.
─────────────────────────────────────────────────────────── */
const TR_CACHE_KEY = "atlas_tr_cache_v1";
let trCache = {};
try { trCache = JSON.parse(localStorage.getItem(TR_CACHE_KEY) || "{}"); } catch { trCache = {}; }

/* High-quality manual overrides — take priority over the online dictionary
   (which mis-transliterates things like "ج.م" → "JM"). */
const OVERRIDES_AR_EN = {
  "ج.م": "EGP", "ج": "EGP", "جنيه": "EGP", "ريال": "SAR", "درهم": "AED",
  "دينار": "KWD", "دولار": "USD", "يورو": "EUR", "كجم": "kg", "طن": "ton",
  "جم": "g", "لتر": "L", "متر": "m", "عدد": "pcs", "قطعة": "pcs",
  "صندوق": "box", "كرتونة": "carton", "باكت": "pack", "شيكارة": "sack",
};
const OVERRIDES_EN_AR = Object.fromEntries(
  Object.entries(OVERRIDES_AR_EN).map(([ar, en]) => [en, ar])
);

const hasArabic = (s) => /[؀-ۿ]/.test(s);
const hasLatinLetters = (s) => /[A-Za-z]/.test(s);
// Skip code-like / non-language tokens to avoid pointless requests.
const isTranslatable = (s) =>
  typeof s === "string" && s.trim().length > 1 &&
  !/^[\s\d.,:%#$€£/\\|()*+\-—•✓✕→←↑↓]+$/.test(s) &&
  !/[{}<>]|=>|\$\{|https?:|@/.test(s);

let _saveTimer = null;
function persistCache() {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    try { localStorage.setItem(TR_CACHE_KEY, JSON.stringify(trCache)); } catch { /* quota */ }
  }, 800);
}

const _notifiers = new Set();
let _notifyTimer = null;
// Coalesce many streaming translations into a single re-render (perf).
function notifyTranslated() {
  if (_notifyTimer) return;
  _notifyTimer = setTimeout(() => { _notifyTimer = null; _notifiers.forEach((fn) => fn()); }, 500);
}

const _pending = new Set();
const _queue = [];
let _active = 0;
const MAX_CONCURRENT = 4;
function pumpQueue() {
  while (_active < MAX_CONCURRENT && _queue.length) {
    const job = _queue.shift();
    _active++;
    job().finally(() => { _active--; pumpQueue(); });
  }
}
function fetchTranslation(text, sl, tl) {
  const key = `${sl}:${tl}:${text}`;
  if (_pending.has(key)) return;
  _pending.add(key);
  _queue.push(() => doFetch(text, sl, tl, key));
  pumpQueue();
}
async function doFetch(text, sl, tl, key) {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    const data = await res.json();
    const out = (data?.[0] || []).map((seg) => seg?.[0] || "").join("");
    if (out && out !== text) { trCache[key] = out; persistCache(); notifyTranslated(); }
    else { trCache[key] = text; }
  } catch {
    /* offline / blocked — keep original */
  } finally {
    _pending.delete(key);
  }
}

/** Synchronous: returns cached translation or original, queuing a fetch. */
function autoTranslate(text, sl, tl) {
  const trimmed = text.trim();
  // Manual overrides + offline dictionary win over the online translator.
  const ov = sl === "ar"
    ? (OVERRIDES_AR_EN[trimmed] || DICTIONARY_AR_EN[trimmed])
    : (OVERRIDES_EN_AR[trimmed] || DICTIONARY_EN_AR[trimmed]);
  if (ov) return text.replace(trimmed, ov);
  if (sl === tl || !isTranslatable(text)) return text;
  const key = `${sl}:${tl}:${text}`;
  if (key in trCache) return trCache[key];
  fetchTranslation(text, sl, tl);
  return text;
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem("atlas_lang") || "en");
  const [theme, setThemeState] = useState(() => localStorage.getItem("atlas_theme") || "dark");
  const [, bump] = useState(0);
  const dir = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
    document.body.classList.toggle("light-mode", theme === "light");
    // Keep the global locale flag in sync so dates/numbers follow the language.
    if (typeof window !== "undefined") window.__nexoraLang = lang;
  }, [dir, lang, theme]);

  // Re-render consumers when new online translations arrive.
  useEffect(() => {
    const fn = () => bump((x) => x + 1);
    _notifiers.add(fn);
    return () => _notifiers.delete(fn);
  }, []);

  const t = useCallback((key) => {
    if (key == null) return "";
    const entry = KEYS[key];
    if (entry) return entry[lang] ?? entry.en;
    if (lang === "ar" && PHRASES[key]) return PHRASES[key];
    return /\s/.test(key) || /[؀-ۿ]/.test(key) ? key : humanize(key);
  }, [lang]);

  // Translate any UI text to the active language (dictionary first, then online).
  const tr = useCallback((text) => {
    if (typeof text !== "string") return text;
    if (lang === "ar") {
      if (PHRASES[text]) return PHRASES[text];
      return hasLatinLetters(text) ? autoTranslate(text, "en", "ar") : text;
    }
    // English mode: auto-translate any Arabic content.
    return hasArabic(text) ? autoTranslate(text, "ar", "en") : text;
  }, [lang]);

  const setLang = useCallback((l) => { setLangState(l); localStorage.setItem("atlas_lang", l); }, []);
  const toggleLang = useCallback(() => setLang(lang === "ar" ? "en" : "ar"), [lang, setLang]);
  const setTheme = useCallback((th) => { setThemeState(th); localStorage.setItem("atlas_theme", th); }, []);
  const toggleTheme = useCallback(() => setTheme(theme === "dark" ? "light" : "dark"), [theme, setTheme]);

  return (
    <LangCtx.Provider value={{ lang, dir, theme, t, tr, setLang, toggleLang, setTheme, toggleTheme }}>
      {children}
    </LangCtx.Provider>
  );
}

/* Translate plain UI text to the active language (auto, online + cached). */
export function DynText({ children }) {
  const ctx = useLanguage();
  if (typeof children !== "string") return children;
  return ctx ? ctx.tr(children) : children;
}
