"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Stripe from "stripe";

import { billingEnabled, extraLookupKey, INTERVALS, isPaidPlan, KEEPS_PLAN, lookupKey, MANAGED_PAYMENTS, type Interval } from "@/lib/billing";
import { getCurrentGarage } from "@/lib/garage";
import { getLocale } from "@/lib/i18n/server";
import { ADDONS, type AddonKey, type PlanKey } from "@/lib/pricing";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";

async function origin() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  return `${requestHeaders.get("x-forwarded-proto") ?? "https"}://${host}`;
}

/** The owner's garage and its billing row; anyone else goes back to the settings page. */
async function ownerBilling() {
  if (!billingEnabled()) redirect("/pricing");
  const current = await getCurrentGarage();
  if (!current.canManageTeam) redirect("/dashboard/settings?billing=owner");
  const { data: billing } = await current.supabase
    .from("garage_billing")
    .select("stripe_customer_id, stripe_subscription_id, status, cancel_at_period_end")
    .eq("garage_id", current.garage.id)
    .maybeSingle();
  return { ...current, billing };
}

/**
 * The saved customer, if Stripe knows it with the current key. A customer made with the test key does
 * not exist for the live key (and the other way round), so after switching modes the garage starts afresh.
 */
async function currentCustomer(customerId: string | null | undefined): Promise<string | null> {
  if (!customerId) return null;
  try {
    const customer = await stripe().customers.retrieve(customerId);
    return customer.deleted ? null : customer.id;
  } catch (error) {
    if (error instanceof Stripe.errors.StripeInvalidRequestError && error.code === "resource_missing") return null;
    throw error;
  }
}

/** The Stripe customer portal: change plan, payment method, invoices, cancel. */
async function portal(customerId: string) {
  const configurations = await stripe().billingPortal.configurations.list({ active: true, limit: 100 });
  const configuration = configurations.data.find((c) => c.metadata?.corsaiq === "1");
  const session = await stripe().billingPortal.sessions.create({
    customer: customerId,
    configuration: configuration?.id,
    return_url: `${await origin()}/dashboard/settings`,
    locale: await getLocale(),
  });
  redirect(session.url);
}

/**
 * Buying a plan. Without a subscription: Stripe Checkout. With one: the portal, where switching plans
 * is prorated (two subscriptions for one garage would bill twice).
 */
export async function startCheckout(formData: FormData) {
  const plan = String(formData.get("plan") ?? "");
  const interval = String(formData.get("interval") ?? "monthly") as Interval;
  const { user, garage, billing } = await ownerBilling();

  const savedCustomer = await currentCustomer(billing?.stripe_customer_id);
  if (savedCustomer && billing?.status && KEEPS_PLAN.includes(billing.status)) await portal(savedCustomer);
  if (!isPaidPlan(plan) || !INTERVALS.includes(interval)) redirect("/pricing");

  const { data: prices } = await stripe().prices.list({ lookup_keys: [lookupKey(plan, interval)], active: true, limit: 1 });
  const price = prices[0];
  if (!price) throw new Error(`No Stripe price for ${lookupKey(plan, interval)}; run scripts/stripe-setup.mjs.`);

  let customerId = savedCustomer;
  if (!customerId) {
    const customer = await stripe().customers.create({ email: user.email, name: garage.name, metadata: { garage_id: garage.id } });
    customerId = customer.id;
    // A new customer has no subscription yet; clear what an old one (from the other mode) left behind.
    const { error } = await createAdminClient().from("garage_billing").upsert({
      garage_id: garage.id,
      stripe_customer_id: customerId,
      stripe_subscription_id: null,
      status: null,
      price_lookup_key: null,
      current_period_end: null,
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(`Saving the Stripe customer failed: ${error.message}`);
    const { error: extrasError } = await createAdminClient().from("garages").update({ extra_drivers: 0, extra_karts: 0 }).eq("id", garage.id);
    if (extrasError) throw new Error(`Resetting extras failed: ${extrasError.message}`);
  }

  const base = await origin();
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: garage.id,
    line_items: [{ price: price.id, quantity: 1 }],
    subscription_data: { metadata: { garage_id: garage.id } },
    allow_promotion_codes: true,
    managed_payments: { enabled: MANAGED_PAYMENTS },
    locale: await getLocale(),
    success_url: `${base}/dashboard/settings?billing=success`,
    cancel_url: `${base}/pricing`,
  });
  if (!session.url) throw new Error("Stripe gave no checkout link.");
  redirect(session.url);
}

/**
 * Buying one extra driver or kart: a monthly subscription of its own, through Checkout, for a garage
 * with a running plan that offers it. Never makes a customer: without a known one, the plan comes first.
 */
export async function startExtraCheckout(formData: FormData) {
  const key = String(formData.get("key") ?? "");
  const { garage, billing } = await ownerBilling();
  const customerId = await currentCustomer(billing?.stripe_customer_id);
  const offered = key in ADDONS ? (ADDONS[key as AddonKey] as Partial<Record<PlanKey, number>>)[garage.plan as PlanKey] : undefined;
  if (!customerId || !billing?.status || !KEEPS_PLAN.includes(billing.status) || billing.cancel_at_period_end || offered === undefined) redirect("/pricing");

  const lookup = extraLookupKey(key as AddonKey, garage.plan as PlanKey);
  const { data: prices } = await stripe().prices.list({ lookup_keys: [lookup], active: true, limit: 1 });
  if (!prices[0]) throw new Error(`No Stripe price for ${lookup}; run scripts/stripe-setup.mjs.`);

  const base = await origin();
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: garage.id,
    line_items: [{ price: prices[0].id, quantity: 1 }],
    subscription_data: { metadata: { garage_id: garage.id } },
    managed_payments: { enabled: MANAGED_PAYMENTS },
    locale: await getLocale(),
    success_url: `${base}/dashboard/settings?billing=extra`,
    cancel_url: `${base}/dashboard/settings`,
  });
  if (!session.url) throw new Error("Stripe gave no checkout link.");
  redirect(session.url);
}

export async function openBillingPortal() {
  const { billing } = await ownerBilling();
  const customerId = await currentCustomer(billing?.stripe_customer_id);
  if (!customerId) redirect("/pricing");
  await portal(customerId);
}
