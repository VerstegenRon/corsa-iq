import type { Metadata } from "next";
import Link from "next/link";

import { cardClass, linkClass } from "@/components/ui";
import { getCurrentGarage } from "@/lib/garage";
import { gearValidity } from "@/lib/gear";
import { format, plural } from "@/lib/i18n/locales";
import { getDictionary } from "@/lib/i18n/server";
import { CHASSIS_COMPONENTS, ENGINE_COMPONENTS, formatCents, formatDate, formatMinutes, labelFor, todayInAmsterdam } from "@/lib/karting";
import { computeUsage, dueChecks, readLimits } from "@/lib/part-usage";

import { TrackProgress } from "./track-progress";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).overview.metaTitle };
}

export default async function DashboardPage() {
  const [{ supabase, user, garage }, t] = await Promise.all([getCurrentGarage(), getDictionary()]);

  const [karts, parts, installed, season, progress, activeParts, activeKarts, activeGear] = await Promise.all([
    supabase.from("karts").select("id", { count: "exact", head: true }).eq("garage_id", garage.id),
    supabase.from("parts").select("id", { count: "exact", head: true }).eq("garage_id", garage.id),
    supabase
      .from("parts")
      .select("id", { count: "exact", head: true })
      .eq("garage_id", garage.id)
      .eq("status", "installed"),
    supabase
      .from("seasons")
      .select("id, name, expenses(amount_cents)")
      .eq("garage_id", garage.id)
      .order("year", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("sessions")
      .select("best_lap_ms, events!inner(id, name, starts_on, garage_id, tracks(id, name, city, country))")
      .eq("events.garage_id", garage.id)
      .not("best_lap_ms", "is", null),
    supabase
      .from("parts")
      .select(
        "id, category, brand, model, usage_limit_minutes, component_limits, session_parts(sessions(started_at, duration_s)), maintenance_records(performed_on, resets_usage, components)",
      )
      .eq("garage_id", garage.id)
      .in("status", ["in_stock", "installed"]),
    supabase
      .from("karts")
      .select("id, name, usage_limit_minutes, component_limits, sessions(started_at, duration_s), maintenance_records(performed_on, resets_usage, components)")
      .eq("garage_id", garage.id)
      .in("status", ["active", "spare"]),
    supabase
      .from("gear_items")
      .select("id, category, brand, model, valid_until, drivers(name)")
      .eq("garage_id", garage.id)
      .neq("status", "retired")
      .not("valid_until", "is", null),
  ]);

  // Gear whose homologation runs out within two months, or has run out; soonest first.
  const today = todayInAmsterdam();
  const gearAlerts = (activeGear.data ?? [])
    .map((item) => ({ ...item, validity: gearValidity(item.valid_until, today)! }))
    .filter((item) => item.validity.tone !== "ok")
    .sort((a, b) => a.validity.daysLeft - b.validity.daysLeft);

  // Every counter (a part or kart as a whole, or one of its components) at 90% or more of its limit,
  // most urgent first.
  const engineKeys = Object.keys(ENGINE_COMPONENTS);
  const chassisKeys = Object.keys(CHASSIS_COMPONENTS);
  const dueItems = [
    ...(activeParts.data ?? []).flatMap((part) => {
      const keys = part.category === "engine" ? engineKeys : [];
      const sessions = part.session_parts.flatMap((sp) => (sp.sessions ? [sp.sessions] : []));
      const usage = computeUsage(sessions, part.maintenance_records, keys);
      return dueChecks(usage, part.usage_limit_minutes, readLimits(part.component_limits, keys)).map((check) => ({
        ...check,
        key: `part-${part.id}-${check.component ?? ""}`,
        href: `/dashboard/parts/${part.id}`,
        name: [part.brand, part.model].filter(Boolean).join(" ") || labelFor(t.options.partCategories, part.category),
        componentLabel: check.component && labelFor(t.options.engineComponents, check.component),
        wholeText: t.overview.sinceRevision,
      }));
    }),
    ...(activeKarts.data ?? []).flatMap((kart) => {
      const usage = computeUsage(kart.sessions, kart.maintenance_records, chassisKeys);
      return dueChecks(usage, kart.usage_limit_minutes, readLimits(kart.component_limits, chassisKeys)).map((check) => ({
        ...check,
        key: `kart-${kart.id}-${check.component ?? ""}`,
        href: `/dashboard/karts/${kart.id}`,
        name: kart.name,
        componentLabel: check.component && labelFor(t.options.chassisComponents, check.component),
        wholeText: t.overview.sinceService,
      }));
    }),
  ].sort((a, b) => b.share - a.share);

  const stats = [
    { label: t.overview.karts, value: String(karts.count ?? 0), href: "/dashboard/karts" },
    { label: t.overview.parts, value: String(parts.count ?? 0), href: "/dashboard/parts" },
    { label: t.overview.installed, value: String(installed.count ?? 0), href: "/dashboard/parts" },
    season.data
      ? {
          label: format(t.overview.costsSeason, { season: season.data.name }),
          value: formatCents(season.data.expenses.reduce((sum, e) => sum + e.amount_cents, 0)),
          href: `/dashboard/costs?season=${season.data.id}`,
        }
      : { label: t.overview.costs, value: formatCents(0), href: "/dashboard/costs" },
  ];

  return (
    <>
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">{garage.name}</h1>
        <p className="mt-2 text-sm text-zinc-400">{format(t.overview.signedInAs, { email: user.email ?? "" })}</p>
      </section>

      <section aria-label={t.overview.statsLabel} className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className={`${cardClass} transition-colors hover:border-brand-400/40`}>
            <p className="text-sm text-zinc-400">{stat.label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums sm:text-3xl">{stat.value}</p>
          </Link>
        ))}
      </section>

      {karts.count === 0 && (
        <section className={cardClass}>
          <h2 className="text-lg font-semibold">{t.overview.startTitle}</h2>
          <p className="mt-2 text-sm text-zinc-400">
            {t.overview.startText}{" "}
            <Link href="/dashboard/karts" className={linkClass}>
              {t.overview.startLink}
            </Link>
          </p>
        </section>
      )}

      {dueItems.length > 0 && (
        <section aria-labelledby="due-heading" className={`${cardClass} border-amber-400/30`}>
          <h2 id="due-heading" className="text-lg font-semibold">
            {t.overview.dueTitle}
          </h2>
          <ul className="mt-3 divide-y divide-zinc-800/80">
            {dueItems.map((item) => {
              const counts = { used: formatMinutes(item.minutes), limit: formatMinutes(item.limit) };
              return (
                <li key={item.key} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5 text-sm">
                  <Link href={item.href} className={linkClass}>
                    {item.name}
                  </Link>
                  <span className="text-zinc-400 tabular-nums">
                    {item.componentLabel
                      ? format(t.overview.componentUsage, { component: item.componentLabel, ...counts })
                      : format(item.wholeText, counts)}
                    <span className={`ml-2 text-xs font-medium ${item.tone === "due" ? "text-red-300" : "text-amber-300"}`}>
                      <span aria-hidden="true">{item.tone === "due" ? "● " : "▲ "}</span>
                      {item.tone === "due" ? t.overview.due : t.overview.soon}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {gearAlerts.length > 0 && (
        <section aria-labelledby="gear-heading" className={`${cardClass} border-amber-400/30`}>
          <h2 id="gear-heading" className="text-lg font-semibold">
            {t.overview.gearTitle}
          </h2>
          <ul className="mt-3 divide-y divide-zinc-800/80">
            {gearAlerts.map((item) => {
              const expired = item.validity.tone === "expired";
              const date = formatDate(item.valid_until);
              return (
                <li key={item.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5 text-sm">
                  <Link href={`/dashboard/gear/${item.id}`} className={linkClass}>
                    {[labelFor(t.options.gearCategories, item.category), item.brand, item.model].filter(Boolean).join(" ")}
                    {item.drivers && <span className="text-zinc-500"> · {item.drivers.name}</span>}
                  </Link>
                  <span className="text-zinc-400 tabular-nums">
                    {format(expired ? t.overview.gearExpired : t.overview.gearUntil, { date })}
                    <span className={`ml-2 text-xs font-medium ${expired ? "text-red-300" : "text-amber-300"}`}>
                      <span aria-hidden="true">{expired ? "● " : "▲ "}</span>
                      {expired ? t.overview.gearExpiredShort : plural(item.validity.daysLeft, t.overview.gearDaysLeft)}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <TrackProgress sessions={progress.data ?? []} t={t} />
    </>
  );
}
