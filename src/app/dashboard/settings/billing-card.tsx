import Link from "next/link";

import { cardClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui";
import { KEEPS_PLAN } from "@/lib/billing";
import type { Dictionary } from "@/lib/i18n/dictionaries/nl";
import { format, type Locale } from "@/lib/i18n/locales";
import { PLAN_KEYS, type PlanKey } from "@/lib/pricing";

import { openBillingPortal } from "../billing-actions";

type Billing = {
  stripe_customer_id: string | null;
  status: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
} | null;

/** The garage's plan; the owner goes from here to the pricing page or the Stripe portal. */
export function BillingCard({
  t,
  locale,
  plan,
  billing,
  isOwner,
  justPaid,
}: {
  t: Dictionary;
  locale: Locale;
  plan: string;
  billing: Billing;
  isOwner: boolean;
  justPaid: boolean;
}) {
  const b = t.billing;
  const planKey: PlanKey = PLAN_KEYS.includes(plan as PlanKey) ? (plan as PlanKey) : "free";
  const running = Boolean(billing?.status && KEEPS_PLAN.includes(billing.status));
  const date = billing?.current_period_end
    ? new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "Europe/Amsterdam" }).format(new Date(billing.current_period_end))
    : null;

  return (
    <section aria-labelledby="billing-heading" className={cardClass}>
      <h2 id="billing-heading" className="text-lg font-semibold">
        {b.title}
      </h2>
      {justPaid && (
        <p role="status" className="mt-4 rounded-xl border border-brand-400/40 bg-brand-500/10 px-4 py-3 text-sm text-zinc-100">
          {b.success}
        </p>
      )}
      <dl className="mt-4">
        <dt className="text-xs tracking-wide text-zinc-500 uppercase">{b.current}</dt>
        <dd className="mt-1 text-sm font-medium text-zinc-100">{t.pricing.plans[planKey].name}</dd>
        {running && date && <dd className="mt-1 text-xs text-zinc-500">{format(billing?.cancel_at_period_end ? b.ends : b.renews, { date })}</dd>}
      </dl>
      {billing?.status === "past_due" && (
        <p role="alert" className="mt-4 text-sm text-amber-300">
          {b.pastDue}
        </p>
      )}

      {isOwner ? (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {running ? (
            <form action={openBillingPortal}>
              <button type="submit" className={primaryButtonClass}>
                {b.manage}
              </button>
            </form>
          ) : (
            <Link href="/pricing" className={primaryButtonClass}>
              {b.choose}
            </Link>
          )}
          {running ? (
            <Link href="/pricing" className={`${secondaryButtonClass} h-11`}>
              {b.choose}
            </Link>
          ) : (
            billing?.stripe_customer_id && (
              <form action={openBillingPortal}>
                <button type="submit" className={`${secondaryButtonClass} h-11`}>
                  {b.manage}
                </button>
              </form>
            )
          )}
          <p className="w-full text-xs text-zinc-500">{running ? b.manageHelp : b.chooseHelp}</p>
        </div>
      ) : (
        <p className="mt-4 text-xs text-zinc-500">{b.ownerOnly}</p>
      )}
    </section>
  );
}
