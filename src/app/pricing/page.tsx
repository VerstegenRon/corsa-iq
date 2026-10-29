import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter, SiteHeader } from "@/components/site-header";
import { primaryButtonClass, secondaryButtonClass } from "@/components/ui";
import { billingEnabled, isPaidPlan, KEEPS_PLAN } from "@/lib/billing";
import { getCurrentGarage } from "@/lib/garage";
import { format } from "@/lib/i18n/locales";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import {
  addonPrices,
  ADDONS,
  COMPARISON,
  FEATURED_PLAN,
  formatEuro,
  MONTHLY_CENTS,
  MONTHS_PAID_PER_YEAR,
  PLAN_KEYS,
  type AddonKey,
  type PlanKey,
} from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";

import { openBillingPortal, startCheckout } from "../dashboard/billing-actions";
import { ComparisonTable } from "./comparison-table";

// Without a Stripe key every plan's button creates an account (or opens the dashboard). With one,
// a signed-in garage owner buys a plan here: Stripe Checkout, or the portal once subscribed.

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: t.pricing.metaTitle, description: t.pricing.metaDescription };
}

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400";

export default async function PricingPage() {
  const [t, locale, supabase] = await Promise.all([getDictionary(), getLocale(), createClient()]);
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);
  const p = t.pricing;
  const cta = signedIn ? { href: "/dashboard", label: t.home.toDashboard } : { href: "/login", label: p.cta };
  // The garage owner can buy; everyone else sees the plain buttons.
  const owner = signedIn && billingEnabled() ? await getCurrentGarage() : null;
  const buyer = owner?.canManageTeam ? owner : null;
  const { data: billing } = buyer
    ? await buyer.supabase.from("garage_billing").select("status").eq("garage_id", buyer.garage.id).maybeSingle()
    : { data: null };
  const subscribed = Boolean(billing?.status && KEEPS_PLAN.includes(billing.status));
  const price = (key: (typeof PLAN_KEYS)[number]) => formatEuro(MONTHLY_CENTS[key], locale);
  const addonPrice = (key: AddonKey, plan: PlanKey) => formatEuro(addonPrices(key).find((a) => a.plan === plan)?.cents ?? 0, locale);
  // Comparison rows that are a paid extra, and which extra.
  const rowAddon: Partial<Record<string, AddonKey>> = { extraDriver: "driver", extraKart: "kart" };

  /** The card's button: sign up, or for the owner the current plan, checkout, or the portal. */
  function PlanButton({ plan, featured }: { plan: PlanKey; featured: boolean }) {
    const className = `mt-6 w-full ${featured ? primaryButtonClass : `${secondaryButtonClass} h-11`}`;
    if (!buyer)
      return (
        <Link href={cta.href} className={className}>
          {cta.label}
        </Link>
      );
    if (buyer.garage.plan === plan)
      return (
        <p aria-current="true" className={`mt-6 flex min-h-11 w-full items-center justify-center border border-zinc-800 text-sm text-zinc-400`}>
          {t.billing.yourPlan}
        </p>
      );
    if (isPaidPlan(plan))
      return (
        <form action={startCheckout}>
          <input type="hidden" name="plan" value={plan} />
          <input type="hidden" name="interval" value="monthly" />
          <button type="submit" className={className}>
            {format(t.billing.choosePlan, { plan: p.plans[plan].name })}
          </button>
        </form>
      );
    if (subscribed)
      return (
        <form action={openBillingPortal}>
          <button type="submit" className={className}>
            {t.billing.manage}
          </button>
        </form>
      );
    return (
      <Link href={cta.href} className={className}>
        {cta.label}
      </Link>
    );
  }

  return (
    <div className="relative isolate flex min-h-full flex-1 flex-col overflow-x-clip bg-zinc-950 text-zinc-50">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[40rem] bg-[radial-gradient(ellipse_at_top,_rgba(220,38,38,0.14),_transparent_60%)]"
      />
      <SiteHeader t={t} current="pricing" signedIn={signedIn} />

      <main className="flex-1">
        <section className="mx-auto w-full max-w-6xl px-4 pt-12 pb-10 text-center sm:px-6 sm:pt-20">
          <p className="text-sm font-semibold tracking-wide text-brand-300 uppercase">{p.eyebrow}</p>
          <h1 className="mx-auto mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">{p.title}</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-pretty text-zinc-400">{p.intro}</p>
          <p
            role="note"
            className="mx-auto mt-8 max-w-2xl rounded-2xl border border-zinc-700 bg-zinc-900 px-5 py-3 text-sm text-pretty text-zinc-200"
          >
            {p.launchNote}
          </p>
        </section>

        <section aria-label={p.plansLabel} className="mx-auto w-full max-w-6xl px-4 pb-6 sm:px-6">
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {PLAN_KEYS.map((key) => {
              const plan = p.plans[key];
              const featured = key === FEATURED_PLAN;
              const monthly = MONTHLY_CENTS[key];
              return (
                <li
                  key={key}
                  className={`relative flex flex-col rounded-3xl border p-6 ${
                    featured ? "border-brand-400/60 bg-zinc-900 shadow-2xl shadow-brand-500/10" : "border-zinc-800/80 bg-zinc-900/50"
                  }`}
                >
                  {featured && (
                    <span className="absolute -top-3 left-6 rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold text-on-brand">
                      {p.recommended}
                    </span>
                  )}
                  <h2 className="text-xl font-semibold tracking-tight">{plan.name}</h2>
                  <p className="mt-2 min-h-12 text-sm text-zinc-400">{plan.text}</p>
                  <p className="mt-6 flex flex-wrap items-baseline gap-x-2">
                    <span className="text-4xl font-semibold tracking-tight whitespace-nowrap tabular-nums">{price(key)}</span>
                    <span className="text-sm text-zinc-400">{p.perMonth}</span>
                  </p>
                  <p className="mt-1 min-h-10 text-sm text-zinc-500">
                    {monthly > 0 ? format(p.perYear, { price: formatEuro(monthly * MONTHS_PAID_PER_YEAR, locale) }) : p.forever}
                  </p>
                  <PlanButton plan={key} featured={featured} />
                  {buyer && !subscribed && isPaidPlan(key) && buyer.garage.plan !== key && (
                    <form action={startCheckout} className="mt-2 text-center">
                      <input type="hidden" name="plan" value={key} />
                      <input type="hidden" name="interval" value="yearly" />
                      <button type="submit" className={`min-h-11 px-2 text-sm text-brand-300 hover:underline ${focusRing}`}>
                        {t.billing.payYearly}
                      </button>
                    </form>
                  )}
                  <ul className="mt-8 flex flex-col gap-3 text-sm text-zinc-300">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-3">
                        <span aria-hidden="true" className="mt-0.5 text-brand-300">
                          ✓
                        </span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
          <div aria-labelledby="addons-heading" role="region" className="mt-6 rounded-3xl border border-zinc-800/80 bg-zinc-900/50 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 id="addons-heading" className="text-lg font-semibold tracking-tight">
                  {p.addons.title}
                </h2>
                <p className="mt-1 text-sm text-zinc-400">{p.addons.text}</p>
              </div>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:min-w-[28rem]">
                {(Object.keys(ADDONS) as AddonKey[]).map((key) => (
                  <li key={key} className="rounded-2xl border border-zinc-800 px-4 py-3">
                    <p className="font-medium text-zinc-100">{p.addons[key].name}</p>
                    <ul className="mt-1 flex flex-col gap-0.5">
                      {addonPrices(key).map(({ plan, cents }) => (
                        <li key={plan} className="flex items-baseline justify-between gap-3 text-sm">
                          <span className="text-zinc-400">{p.plans[plan].name}</span>
                          <span className="whitespace-nowrap text-zinc-200 tabular-nums">
                            {format(p.addons.perMonth, { price: formatEuro(cents, locale) })}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-1 text-xs text-zinc-500">{p.addons[key].text}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-6 text-center text-xs text-zinc-500">{p.vatNote}</p>
        </section>

        <section aria-labelledby="compare-heading" className="mx-auto w-full max-w-6xl px-4 pt-16 sm:px-6">
          <h2 id="compare-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {p.compare.title}
          </h2>
          <p className="mt-2 mb-6 text-zinc-400">{p.compare.intro}</p>
          <ComparisonTable
            plans={PLAN_KEYS.map((key) => ({ key, name: p.plans[key].name, price: `${price(key)} ${p.perMonth}` }))}
            groups={COMPARISON.map(({ group, rows }) => ({
              key: group,
              label: p.compare.groups[group],
              rows: rows.map((row) => {
                const addon = rowAddon[row.key];
                return {
                  key: row.key,
                  label: p.compare.rows[row.key],
                  values: row.values,
                  addon:
                    addon &&
                    Object.fromEntries(
                      addonPrices(addon).map(({ plan, cents }) => [plan, format(p.compare.addon, { price: formatEuro(cents, locale) })]),
                    ),
                };
              }),
            }))}
            featured={FEATURED_PLAN}
            labels={{
              feature: p.compare.feature,
              pickPlan: p.compare.pickPlan,
              unlimited: p.compare.unlimited,
              included: p.compare.included,
              notIncluded: p.compare.notIncluded,
            }}
          />
        </section>

        <section aria-labelledby="pricing-faq" className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
          <h2 id="pricing-faq" className="text-2xl font-semibold tracking-tight">
            {p.faqTitle}
          </h2>
          <div className="mt-4 divide-y divide-zinc-800/80 border-y border-zinc-800/80">
            {(["now", "switch", "yearly", "team"] as const).map((key) => (
              <details key={key} className="group py-4">
                <summary
                  className={`flex cursor-pointer list-none items-center justify-between gap-4 text-left font-medium text-zinc-100 [&::-webkit-details-marker]:hidden ${focusRing}`}
                >
                  {p.faq[key].question}
                  <span aria-hidden="true" className="text-xl text-zinc-500 transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-6 text-zinc-400">
                  {format(p.faq[key].answer, { driverPrice: addonPrice("driver", "pro"), kartPrice: addonPrice("kart", "pro") })}
                </p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter t={t} current="pricing" />
    </div>
  );
}
