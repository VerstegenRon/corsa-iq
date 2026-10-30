// What the current garage's plan allows. Read from the pricing comparison, so the pricing page and
// the app never disagree. During the launch phase (`plan_limits_active()` false) everything is
// allowed; the database enforces the counts with the same numbers.

import { cache } from "react";

import { getCurrentGarage } from "@/lib/garage";
import { format } from "@/lib/i18n/locales";
import { getDictionary } from "@/lib/i18n/server";
import { COMPARISON, PLAN_KEYS, type PlanKey, type PlanValue } from "@/lib/pricing";

export const FEATURES = [
  "pitwall",
  "setupCompare",
  "telemetry",
  "prestart",
  "limits",
  "aiDebrief",
  "aiAdvice",
  "live",
  "pitboard",
  "receipts",
] as const;
export type Feature = (typeof FEATURES)[number];
export type Counted = "karts" | "drivers" | "members";

const rows: readonly { key: string; values: Record<PlanKey, PlanValue> }[] = COMPARISON.flatMap((group) => [...group.rows]);
const valueFor = (key: Feature | Counted, plan: PlanKey) => rows.find((row) => row.key === key)?.values[plan];

export function planIncludes(plan: PlanKey, feature: Feature) {
  return valueFor(feature, plan) === true;
}

/** How many the plan allows; null is no limit. */
export function planLimit(plan: PlanKey, counted: Counted): number | null {
  const value = valueFor(counted, plan);
  return typeof value === "number" ? value : null;
}

/** The cheapest plan with the feature, for "upgrade to …". */
export function lowestPlanWith(feature: Feature): PlanKey {
  return PLAN_KEYS.find((plan) => planIncludes(plan, feature)) ?? "team";
}

export const getPlanAccess = cache(async () => {
  const { supabase, garage, canManageTeam } = await getCurrentGarage();
  const { data } = await supabase.rpc("plan_limits_active");
  const active = data === true;
  const plan: PlanKey = PLAN_KEYS.includes(garage.plan as PlanKey) ? (garage.plan as PlanKey) : "free";
  const extras: Record<Counted, number> = { karts: garage.extra_karts, drivers: garage.extra_drivers, members: 0 };
  const withExtras = (counted: Counted) => {
    const base = planLimit(plan, counted);
    return base === null ? null : base + extras[counted];
  };
  return {
    active,
    plan,
    isOwner: canManageTeam,
    has: (feature: Feature) => !active || planIncludes(plan, feature),
    limit: (counted: Counted) => (active ? withExtras(counted) : null),
  };
});

/** For a server action: the reason it may not run, or null when the plan includes the feature. */
export async function lockedError(feature: Feature) {
  const access = await getPlanAccess();
  if (access.has(feature)) return null;
  const t = await getDictionary();
  return format(t.plan.lockedError, { feature: t.pricing.compare.rows[feature], plan: t.pricing.plans[lowestPlanWith(feature)].name });
}
