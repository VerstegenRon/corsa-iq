// What someone sees in place of a feature or an add form their plan does not include: what it is,
// which plan has it, and for the owner the way to upgrade.

import Link from "next/link";

import { cardClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui";
import { format, plural } from "@/lib/i18n/locales";
import { getDictionary } from "@/lib/i18n/server";
import { getPlanAccess, lowestPlanWith, type Counted, type Feature } from "@/lib/plan-access";

function Upgrade({ isOwner, label, askOwner, compact }: { isOwner: boolean; label: string; askOwner: string; compact: boolean }) {
  if (!isOwner) return <p className="mt-3 text-sm text-zinc-500">{askOwner}</p>;
  return (
    <Link href="/pricing" className={`mt-4 ${compact ? `${secondaryButtonClass} h-11` : primaryButtonClass}`}>
      {label}
    </Link>
  );
}

/** A feature outside the plan. `compact` for a part of a page, else it stands in for the whole page. */
export async function PlanLock({ feature, compact = false }: { feature: Feature; compact?: boolean }) {
  const [t, access] = await Promise.all([getDictionary(), getPlanAccess()]);
  const needed = t.pricing.plans[lowestPlanWith(feature)].name;
  const name = t.pricing.compare.rows[feature];

  return (
    <section aria-label={name} className={compact ? "border border-zinc-800 bg-zinc-900/60 p-4" : cardClass}>
      <p className="channel-label text-brand-300">{format(t.plan.lockedTitle, { plan: needed })}</p>
      <h2 className={compact ? "mt-1 font-semibold text-zinc-100" : "mt-2 text-xl font-semibold"}>{name}</h2>
      <p className="mt-2 text-sm text-zinc-400">
        {format(t.plan.lockedText, { feature: name, plan: needed, current: t.pricing.plans[access.plan].name })}
      </p>
      <Upgrade isOwner={access.isOwner} label={format(t.plan.upgrade, { plan: needed })} askOwner={t.plan.askOwner} compact={compact} />
    </section>
  );
}

/** The lock card as a full screen, for the pages outside the dashboard (pitwall, pit board). */
export async function PlanLockScreen({ feature }: { feature: Feature }) {
  const t = await getDictionary();
  return (
    <main className="mx-auto flex min-h-full w-full max-w-xl flex-1 flex-col justify-center gap-6 bg-zinc-950 px-4 py-12 text-zinc-50">
      <PlanLock feature={feature} />
      <Link href="/dashboard" className={`${secondaryButtonClass} h-11 self-start`}>
        {t.home.toDashboard}
      </Link>
    </main>
  );
}

/** In place of an add form once the plan is full; nothing while there is room. */
export async function LimitReached({ counted, used }: { counted: Counted; used: number }) {
  const [t, access] = await Promise.all([getDictionary(), getPlanAccess()]);
  const allowed = access.limit(counted);
  if (allowed === null || used < allowed) return null;

  return (
    <section aria-label={t.plan.limitTitle} className="border border-zinc-800 bg-zinc-900/60 p-4">
      <p className="channel-label text-brand-300">{t.plan.limitTitle}</p>
      <p className="mt-2 text-sm text-zinc-300">
        {format(t.plan.limitReached, { plan: t.pricing.plans[access.plan].name, things: plural(allowed, t.plan.things[counted]) })}
      </p>
      {counted === "karts" && <p className="mt-1 text-xs text-zinc-500">{t.plan.kartsNote}</p>}
      <Upgrade isOwner={access.isOwner} label={t.plan.upgradeMore} askOwner={t.plan.askOwner} compact />
    </section>
  );
}

/** Whether an add form should give way to `LimitReached`. */
export async function atLimit(counted: Counted, used: number) {
  const allowed = (await getPlanAccess()).limit(counted);
  return allowed !== null && used >= allowed;
}
