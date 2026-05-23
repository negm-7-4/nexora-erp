/*
 * Subscription plans (prices in EGP). The free tier is the default on signup;
 * paid tiers are activated after a Vodafone Cash / InstaPay payment is verified.
 *
 * `modules` lists the premium feature/module keys a plan unlocks. Core modules
 * (dashboard, sales, purchases, clients, suppliers, workers, inventory,
 * expenses, profile, users, settings) are always available on every plan.
 * The super admin can override the module set per plan at runtime.
 */

// Premium modules that can be gated behind a plan. Keys match the frontend
// nav item ids (plus a few capability flags).
export const GATEABLE_MODULES = [
  { key: "logistics", label: "Logistics & Vehicles" },
  { key: "treasury", label: "Treasury" },
  { key: "hr", label: "HR" },
  { key: "crm", label: "CRM" },
  { key: "manufacturing", label: "Manufacturing & Production" },
  { key: "statistics", label: "Statistics" },
  { key: "reports", label: "Finance Reports (P&L, Balance, Aging)" },
  { key: "ai", label: "AI Copilot" },
  { key: "integrations", label: "Integrations" },
  { key: "whitelabel", label: "White-label branding" },
  { key: "multibranch", label: "Multi-branch support" },
];

export const PLANS = [
  {
    id: "free",
    name: "Free",
    priceEGP: 0,
    period: "forever",
    maxUsers: 2,
    modules: [],
    features: [
      "Up to 2 users",
      "Sales, Purchases & Expenses",
      "Clients, Suppliers & Workers",
      "Basic inventory",
      "Local + cloud sync",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceEGP: 499,
    period: "month",
    maxUsers: 15,
    modules: ["logistics", "treasury", "hr", "crm", "manufacturing", "statistics", "reports", "ai"],
    features: [
      "Up to 15 users",
      "Everything in Free",
      "Manufacturing & BOM",
      "HR, CRM, Logistics & Treasury",
      "Finance center (P&L, Balance, Aging)",
      "AI Copilot",
      "Priority support",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    priceEGP: 1499,
    period: "month",
    maxUsers: 0, // 0 = unlimited
    modules: [
      "logistics", "treasury", "hr", "crm", "manufacturing",
      "statistics", "reports", "ai", "integrations", "whitelabel", "multibranch",
    ],
    features: [
      "Unlimited users",
      "Everything in Pro",
      "Multi-branch support",
      "Custom white-label branding",
      "Integrations",
      "Dedicated account manager",
    ],
  },
];

export function getPlan(id) {
  return PLANS.find((p) => p.id === id) || PLANS[0];
}

// Effective modules for a plan, applying any super-admin override.
// `overrides` is an optional { [planId]: string[] } map from PlatformSettings.
export function modulesForPlan(planId, overrides) {
  if (overrides && Array.isArray(overrides[planId])) return overrides[planId];
  return getPlan(planId).modules || [];
}
