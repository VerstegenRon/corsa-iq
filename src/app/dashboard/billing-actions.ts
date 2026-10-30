"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { billingEnabled, INTERVALS, isPaidPlan, KEEPS_PLAN, lookupKey, MANAGED_PAYMENTS, type Interval } from "@/lib/billing";
import { getCurrentGarage } from "@/lib/garage";
import { getLocale } from "@/lib/i18n/server";
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
    .select("stripe_customer_id, stripe_subscription_id, status")
    .eq("garage_id", current.garage.id)
    .maybeSingle();
  return { ...current, billing };
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

  if (billing?.stripe_customer_id && billing.status && KEEPS_PLAN.includes(billing.status)) await portal(billing.stripe_customer_id);
  if (!isPaidPlan(plan) || !INTERVALS.includes(interval)) redirect("/pricing");

  const { data: prices } = await stripe().prices.list({ lookup_keys: [lookupKey(plan, interval)], active: true, limit: 1 });
  const price = prices[0];
  if (!price) throw new Error(`No Stripe price for ${lookupKey(plan, interval)}; run scripts/stripe-setup.mjs.`);

  let customerId = billing?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe().customers.create({ email: user.email, name: garage.name, metadata: { garage_id: garage.id } });
    customerId = customer.id;
    const { error } = await createAdminClient().from("garage_billing").upsert({ garage_id: garage.id, stripe_customer_id: customerId });
    if (error) throw new Error(`Saving the Stripe customer failed: ${error.message}`);
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

export async function openBillingPortal() {
  const { billing } = await ownerBilling();
  if (!billing?.stripe_customer_id) redirect("/pricing");
  await portal(billing.stripe_customer_id);
}
