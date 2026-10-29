// The four plans and what each one includes, for the pricing page. The keys match `garages.plan`
// in the database ("hobby" is shown as Driver). Payment is not built yet: nothing here limits the
// app, everything is free during the launch phase.

import type { Locale } from "@/lib/i18n/locales";

export const PLAN_KEYS = ["free", "hobby", "pro", "team"] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];

/** The plan the page puts forward. */
export const FEATURED_PLAN: PlanKey = "pro";

/** Price per month in cents; a year costs ten months. */
export const MONTHLY_CENTS: Record<PlanKey, number> = { free: 0, hobby: 499, pro: 799, team: 1799 };
export const MONTHS_PAID_PER_YEAR = 10;

/** A cell of the comparison: included or not, a number, or no limit. */
export type PlanValue = boolean | number | "unlimited";

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
      { key: "pitwall", values: all },
      { key: "aiDebrief", values: fromPro },
    ],
  },
  {
    group: "analysis",
    rows: [
      { key: "progress", values: fromHobby },
      { key: "setupCompare", values: fromHobby },
      { key: "telemetry", values: fromPro },
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
      { key: "karts", values: { free: 1, hobby: 3, pro: "unlimited", team: "unlimited" } },
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
      { key: "drivers", values: { free: 1, hobby: 1, pro: 2, team: 6 } },
      { key: "members", values: { free: 1, hobby: 1, pro: 3, team: 10 } },
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
