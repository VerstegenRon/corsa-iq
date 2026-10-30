// The four plans and what each one includes, for the pricing page. The keys match `garages.plan`
// in the database ("hobby" is shown as Driver). Payment runs through Stripe (lib/billing.ts); the
// limits only apply once plan_limits_active is on, until then everything is free (the launch phase).

import type { Locale } from "@/lib/i18n/locales";

export const PLAN_KEYS = ["free", "hobby", "pro", "team"] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];

/** The plan the page puts forward. */
export const FEATURED_PLAN: PlanKey = "pro";

/** Price per month in cents; a year costs ten months. */
export const MONTHLY_CENTS: Record<PlanKey, number> = { free: 0, hobby: 499, pro: 799, team: 1799 };
export const MONTHS_PAID_PER_YEAR = 10;

/** Extras on top of a plan: price per month in cents for each plan that can add them. */
export const ADDONS = {
  driver: { pro: 599, team: 399 },
  kart: { pro: 499 },
} as const satisfies Record<string, Partial<Record<PlanKey, number>>>;
export type AddonKey = keyof typeof ADDONS;

/** The plans that can add this extra, with their price. */
export function addonPrices(key: AddonKey) {
  return PLAN_KEYS.flatMap((plan) => {
    const cents = (ADDONS[key] as Partial<Record<PlanKey, number>>)[plan];
    return cents === undefined ? [] : [{ plan, cents }];
  });
}

/** A cell of the comparison: included or not, a number, no limit, or available as a paid extra. */
export type PlanValue = boolean | number | "unlimited" | "addon";

type Row = { key: string; values: Record<PlanKey, PlanValue> };

const all = { free: true, hobby: true, pro: true, team: true };
const fromHobby = { free: false, hobby: true, pro: true, team: true };
const fromPro = { free: false, hobby: false, pro: true, team: true };

/** The comparison table, by theme. The labels are in the dictionary under `pricing.compare`. */
export const COMPARISON = [
  {
    group: "sessions",
    rows: [
      { key: "sessions", values: all },
      { key: "lapImport", values: all },
      { key: "pitwall", values: fromHobby },
      { key: "aiDebrief", values: fromPro },
    ],
  },
  {
    group: "analysis",
    rows: [
      { key: "progress", values: all },
      { key: "setupCompare", values: fromHobby },
      { key: "telemetry", values: fromHobby },
      { key: "aiAdvice", values: fromPro },
    ],
  },
  {
    group: "raceDay",
    rows: [
      { key: "packing", values: all },
      { key: "prestart", values: fromHobby },
      { key: "live", values: fromPro },
      { key: "pitboard", values: fromPro },
    ],
  },
  {
    group: "material",
    rows: [
      { key: "karts", values: { free: 1, hobby: 2, pro: 3, team: "unlimited" } },
      { key: "extraKart", values: { free: false, hobby: false, pro: "addon", team: false } },
      { key: "maintenance", values: all },
      { key: "gear", values: all },
      { key: "limits", values: fromHobby },
    ],
  },
  {
    group: "costs",
    rows: [
      { key: "costs", values: all },
      { key: "receipts", values: fromPro },
    ],
  },
  {
    group: "team",
    rows: [
      { key: "drivers", values: { free: 1, hobby: 1, pro: 2, team: 5 } },
      { key: "extraDriver", values: { free: false, hobby: false, pro: "addon", team: "addon" } },
      { key: "members", values: { free: 1, hobby: 1, pro: 5, team: 10 } },
      { key: "roles", values: fromPro },
      { key: "agenda", values: all },
    ],
  },
  {
    group: "support",
    rows: [
      { key: "export", values: all },
      { key: "email", values: all },
      { key: "priority", values: { free: false, hobby: false, pro: false, team: true } },
    ],
  },
] as const satisfies readonly { group: string; rows: readonly Row[] }[];

export type ComparisonGroup = (typeof COMPARISON)[number]["group"];
export type ComparisonRow = (typeof COMPARISON)[number]["rows"][number]["key"];

/** An amount in euros the way the language writes it: "€ 4,99", "€4.99", "4,99 €"; whole euros without cents. */
export function formatEuro(cents: number, locale: Locale) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}
