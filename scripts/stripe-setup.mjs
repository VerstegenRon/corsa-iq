// Creates the CorsaIQ products and prices in Stripe, or brings them up to date, plus the customer
// portal settings. Run once per Stripe environment (test, later live), with the key in .env.local:
//
//   node --env-file=.env.local scripts/stripe-setup.mjs
//
// The amounts come from src/lib/pricing.ts. A changed amount gets a new price that takes over the
// lookup key; existing subscribers keep the old price until they switch.

import Stripe from "stripe";

import { INTERVALS, lookupKey, PAID_PLANS } from "../src/lib/billing.ts";
import { MONTHLY_CENTS, MONTHS_PAID_PER_YEAR } from "../src/lib/pricing.ts";

const SITE = "https://corsaiq.com";
const NAMES = { hobby: "Driver", pro: "Pro", team: "Team" };
/** Software as a service, personal use: what Stripe needs to work out the VAT. */
const TAX_CODE = "txcd_10103000";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("STRIPE_SECRET_KEY is missing: put it in .env.local and run with --env-file=.env.local.");
  process.exit(1);
}
if (key.startsWith("sk_live_") && !process.argv.includes("--live")) {
  console.error("This is a live key. Run again with --live if you really mean the live environment.");
  process.exit(1);
}
const stripe = new Stripe(key);
console.log(key.startsWith("sk_live_") ? "Live environment" : "Test environment");

const products = (await stripe.products.list({ limit: 100 })).data;
const portalProducts = [];

for (const plan of PAID_PLANS) {
  const name = `CorsaIQ ${NAMES[plan]}`;
  let product = products.find((p) => p.metadata.corsaiq_plan === plan);
  product = product
    ? await stripe.products.update(product.id, { name, tax_code: TAX_CODE, active: true })
    : await stripe.products.create({ name, tax_code: TAX_CODE, metadata: { corsaiq_plan: plan } });

  const prices = [];
  for (const interval of INTERVALS) {
    const lookup = lookupKey(plan, interval);
    const amount = interval === "monthly" ? MONTHLY_CENTS[plan] : MONTHLY_CENTS[plan] * MONTHS_PAID_PER_YEAR;
    const recurring = interval === "monthly" ? "month" : "year";
    const [current] = (await stripe.prices.list({ lookup_keys: [lookup], active: true, limit: 1 })).data;

    const upToDate =
      current &&
      current.unit_amount === amount &&
      current.currency === "eur" &&
      current.recurring?.interval === recurring &&
      current.tax_behavior === "inclusive" &&
      (typeof current.product === "string" ? current.product : current.product.id) === product.id;
    if (upToDate) {
      console.log(`  ${lookup}: up to date (${amount / 100} EUR)`);
      prices.push(current.id);
      continue;
    }

    const price = await stripe.prices.create({
      product: product.id,
      currency: "eur",
      unit_amount: amount,
      recurring: { interval: recurring },
      tax_behavior: "inclusive",
      lookup_key: lookup,
      transfer_lookup_key: true,
    });
    if (current) await stripe.prices.update(current.id, { active: false });
    console.log(`  ${lookup}: ${current ? "replaced" : "created"} (${amount / 100} EUR)`);
    prices.push(price.id);
  }
  portalProducts.push({ product: product.id, prices });
}

// The customer portal: switch plan (prorated), payment method, invoices, cancel at the end of the period.
const portal = {
  business_profile: { headline: "CorsaIQ", privacy_policy_url: `${SITE}/privacy`, terms_of_service_url: `${SITE}/voorwaarden` },
  features: {
    customer_update: { enabled: true, allowed_updates: ["email", "name", "address"] },
    invoice_history: { enabled: true },
    payment_method_update: { enabled: true },
    subscription_cancel: { enabled: true, mode: "at_period_end" },
    subscription_update: {
      enabled: true,
      default_allowed_updates: ["price"],
      proration_behavior: "create_prorations",
      products: portalProducts,
    },
  },
};
const configurations = (await stripe.billingPortal.configurations.list({ limit: 100 })).data;
const existing = configurations.find((c) => c.metadata?.corsaiq === "1");
if (existing) await stripe.billingPortal.configurations.update(existing.id, { ...portal, active: true });
else await stripe.billingPortal.configurations.create({ ...portal, metadata: { corsaiq: "1" } });
console.log(`Customer portal: ${existing ? "updated" : "created"}`);
