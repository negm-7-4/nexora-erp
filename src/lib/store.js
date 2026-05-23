/*
 * App data store contract for App.jsx.
 *
 * App.jsx manages its own state via useReducer + db.subscribe/db.save, so
 * `useAppStore` is only a lightweight optional helper here. The important
 * export is `EMPTY_DATA` — the canonical empty shape every reducer/merge path
 * relies on. Keep all keys present so `mergeWithDefaults` never hits undefined.
 */

export const EMPTY_DATA = {
  // Core ledgers
  incoming: [],
  sales: [],
  clients: [],
  workers: [],
  suppliers: [],
  expenses: [],

  // Inventory (item-based)
  inventory: {
    items: [],      // [{ id, name, quantity, threshold, waste, unit, ... }]
    log: [],        // stock movement history
    pellets: 0,     // legacy single-product fields (kept for migration)
    threshold: 0,
    waste: 0,
  },

  // Manufacturing
  bom: [],                 // bills of materials
  manufacturingOrders: [], // production orders

  // Productivity / ops
  todos: [],
  attendance: {},          // { 'YYYY-MM-DD': { [workerId]: 'present' | 'absent' } }
  auditLog: [],

  // Logistics
  vehicles: [],
  vehicleLog: [],

  // Treasury / finance
  treasuryMoves: [],

  // HR / CRM
  employees: [],
  crmLeads: [],

  // System / multi-user
  systemUsers: [],
  bannedEmails: [],

  // Expense categories (editable)
  expenseTypes: [
    "Workshop Expenses",
    "Utility Bills",
    "Rent",
    "Wages & Labor",
    "Transport & Maintenance",
    "Petty Cash",
  ],

  // Editable module labels (white-label)
  appLabels: {
    incoming: "Purchases",
    sales: "Sales",
    clients: "Clients",
    workers: "Workers",
    suppliers: "Suppliers",
    inventory: "Inventory",
    expenses: "Expenses",
    logistics: "Logistics",
    treasury: "Treasury",
    hr: "HR",
    crm: "CRM",
    manufacturing: "Manufacturing & Production",
    currency: "EGP",
    pellets: "Product",
    mainUnit: "pcs",
    productionUnit: "kg",
  },

  // Company profile (printed on invoices)
  companyInfo: {
    name: "Nexora",
    logo: "",
    footer: "",
    address: "",
    phone: "",
    taxNumber: "",
    facebook: "",
    instagram: "",
  },

  lastModified: 0,
};

/*
 * Minimal subscribe-able store. App.jsx imports `useAppStore` but drives state
 * through its own reducer; this provides a working hook so the import resolves
 * and any future direct use keeps a single source of truth.
 */
let _state = { ...EMPTY_DATA };
const _listeners = new Set();

export const appStore = {
  get: () => _state,
  set: (updater) => {
    _state = typeof updater === "function" ? updater(_state) : updater;
    _listeners.forEach((l) => l(_state));
  },
  subscribe: (l) => { _listeners.add(l); return () => _listeners.delete(l); },
};

export function useAppStore(selector = (s) => s) {
  return selector(appStore.get());
}
