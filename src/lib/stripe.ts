// Stripe on the server: the client, and keeping a garage's plan in step with its subscription.
// Stripe is the source of truth; the webhook calls `syncSubscription` for every change.

import Stripe from "stripe";

import { extraFromLookupKey, KEEPS_PLAN, planFromLookupKey } from "@/lib/billing";
import { createAdminClient } from "@/lib/supabase/admin";

let client: Stripe | undefined;

export function stripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY.");
  return (client ??= new Stripe(key));
}

export const idOf = (value: string | { id: string }) => (typeof value === "string" ? value : value.id);

/**
 * Recounts a garage's extras from its running subscriptions. An extra that does not fit the current
 * plan (after switching or leaving it) no longer counts and stops at the end of its paid month.
 */
async function syncExtras(garageId: string, customerId: string) {
  const admin = createAdminClient();
  const { data: garage } = await admin.from("garages").select("plan").eq("id", garageId).maybeSingle();
  if (!garage) return;

  const counts = { driver: 0, kart: 0 };
  const { data: subscriptions } = await stripe().subscriptions.list({ customer: customerId, status: "all", limit: 100 });
  for (const subscription of subscriptions) {
    const item = subscription.items.data[0];
    const extra = extraFromLookupKey(item?.price.lookup_key);
    if (!extra || !KEEPS_PLAN.includes(subscription.status)) continue;
    if (extra.plan === garage.plan) counts[extra.key] += item.quantity ?? 1;
    else if (!subscription.cancel_at_period_end && subscription.cancel_at === null)
      await stripe().subscriptions.update(subscription.id, { cancel_at_period_end: true });
  }

  const { error } = await admin.from("garages").update({ extra_drivers: counts.driver, extra_karts: counts.kart }).eq("id", garageId);
  if (error) throw new Error(`Saving extras failed: ${error.message}`);
}

/**
 * Writes the subscription's current state to the garage it belongs to: the billing row, and the plan
 * (back to free once the subscription has ended). Fetches it afresh, because Stripe does not send
 * events in order.
 */
export async function syncSubscription(subscriptionId: string) {
  const subscription = await stripe().subscriptions.retrieve(subscriptionId);
  const admin = createAdminClient();
  const customerId = idOf(subscription.customer);

  let garageId: string | undefined = subscription.metadata.garage_id;
  if (!garageId) {
    const { data } = await admin.from("garage_billing").select("garage_id").eq("stripe_customer_id", customerId).maybeSingle();
    garageId = data?.garage_id;
  }
  // Not one of ours (a test event from the Stripe CLI, a subscription made by hand): nothing to update.
  if (!garageId) {
    console.warn("Stripe subscription without a garage, skipped", subscription.id);
    return;
  }

  // A garage deleted with its account: nothing left to update.
  const { data: garage } = await admin.from("garages").select("id").eq("id", garageId).maybeSingle();
  if (!garage) return;

  const item = subscription.items.data[0];
  const lookupKey = item?.price.lookup_key ?? null;
  // An extra has its own subscription: it never touches the plan or the billing row.
  if (extraFromLookupKey(lookupKey)) {
    await syncExtras(garageId, customerId);
    return;
  }
  const paidPlan = planFromLookupKey(lookupKey);
  const plan = paidPlan && KEEPS_PLAN.includes(subscription.status) ? paidPlan : "free";
  const periodEnd = subscription.cancel_at ?? item?.current_period_end;

  const { error: billingError } = await admin.from("garage_billing").upsert({
    garage_id: garageId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    status: subscription.status,
    price_lookup_key: lookupKey,
    // A cancelled subscription has an end date (`cancel_at`, the portal's way) or the older flag.
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: subscription.cancel_at_period_end || subscription.cancel_at !== null,
    updated_at: new Date().toISOString(),
  });
  if (billingError) throw new Error(`Saving billing failed: ${billingError.message}`);

  const { error: planError } = await admin.from("garages").update({ plan }).eq("id", garageId);
  if (planError) throw new Error(`Saving plan failed: ${planError.message}`);

  await syncExtras(garageId, customerId);
}
