// Which Stripe price belongs to which plan. The prices are found by lookup key, so the app needs no
// price ids: `scripts/stripe-setup.mjs` creates them in Stripe with these keys.

import type { AddonKey, PlanKey } from "@/lib/pricing";

export const PAID_PLANS = ["hobby", "pro", "team"] as const satisfies readonly PlanKey[];
export type PaidPlan = (typeof PAID_PLANS)[number];
export const INTERVALS = ["monthly", "yearly"] as const;
export type Interval = (typeof INTERVALS)[number];

/** The name in the lookup key: "hobby" is sold as Driver. */
const SLUG: Record<PaidPlan, string> = { hobby: "driver", pro: "pro", team: "team" };

export function lookupKey(plan: PaidPlan, interval: Interval) {
  return `${SLUG[plan]}_${interval}`;
}

/** The plan a lookup key stands for, or null for a key that is not ours. */
export function planFromLookupKey(key: string | null | undefined): PaidPlan | null {
  const [slug, interval] = (key ?? "").split("_");
  if (!INTERVALS.includes(interval as Interval)) return null;
  return PAID_PLANS.find((plan) => SLUG[plan] === slug) ?? null;
}

/** An extra's price differs per plan, so its lookup key names both: "extra_driver_pro". Always monthly. */
export function extraLookupKey(key: AddonKey, plan: PlanKey) {
  return `extra_${key}_${plan}`;
}

export function extraFromLookupKey(lookup: string | null | undefined): { key: AddonKey; plan: PlanKey } | null {
  const match = /^extra_(driver|kart)_(pro|team)$/.exec(lookup ?? "");
  return match ? { key: match[1] as AddonKey, plan: match[2] as PlanKey } : null;
}

export function isPaidPlan(value: string): value is PaidPlan {
  return PAID_PLANS.includes(value as PaidPlan);
}

/** Subscription states that keep the plan; past_due gives the customer time to fix the payment. */
export const KEEPS_PLAN = ["active", "trialing", "past_due"];

/**
 * Stripe as merchant of record (Managed Payments): Stripe sells the subscription in its name and
 * handles VAT, fraud and chargebacks, for 3.5% extra per transaction.
 */
export const MANAGED_PAYMENTS = true;

/** Only with a Stripe key can people pay; without one the site works as before payment existed. */
export function billingEnabled() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
