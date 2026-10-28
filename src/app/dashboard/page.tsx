import type { Metadata } from "next";
import Link from "next/link";

import { EXPENSE_ICONS, GEAR_ICONS, Icon, IconTile, PART_ICONS, iconFor, type IconName } from "@/components/icons";
import { Chip, Meter } from "@/components/meter";
import { cardClass, linkClass } from "@/components/ui";
import { getCurrentGarage } from "@/lib/garage";
import { gearValidity } from "@/lib/gear";
import { format, plural } from "@/lib/i18n/locales";
import { getDictionary } from "@/lib/i18n/server";
import {
  CHASSIS_COMPONENTS,
  ENGINE_COMPONENTS,
  formatCents,
  formatDate,
  formatMinutes,
  labelFor,
  todayInAmsterdam,
  trackLabel,
} from "@/lib/karting";
import { computeUsage, dueChecks, readLimits } from "@/lib/part-usage";

import { TrackProgress } from "./track-progress";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).overview.metaTitle };
}

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400";
const tileLink = `${cardClass} transition-colors hover:border-brand-400/40 ${focusRing}`;

function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

export default async function DashboardPage() {
  const [{ supabase, user, garage }, t] = await Promise.all([getCurrentGarage(), getDictionary()]);
  const today = todayInAmsterdam();
  const o = t.overview;

  const [karts, parts, installed, gearCount, season, progress, activeParts, activeKarts, activeGear, nextEvent, lastEvent, me] =
    await Promise.all([
      supabase.from("karts").select("id", { count: "exact", head: true }).eq("garage_id", garage.id),
      supabase.from("parts").select("id", { count: "exact", head: true }).eq("garage_id", garage.id),
      supabase.from("parts").select("id", { count: "exact", head: true }).eq("garage_id", garage.id).eq("status", "installed"),
      supabase.from("gear_items").select("id", { count: "exact", head: true }).eq("garage_id", garage.id).neq("status", "retired"),
      supabase
        .from("seasons")
        .select("id, name, budget_cents, expenses(amount_cents, category)")
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
      supabase
        .from("events")
        .select("id, name, type, starts_on, tracks(name, city, country), sessions(id)")
        .eq("garage_id", garage.id)
        .gte("starts_on", today)
        .order("starts_on")
        .limit(1)
        .maybeSingle(),
      supabase.from("events").select("id").eq("garage_id", garage.id).lt("starts_on", today).order("starts_on", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("drivers").select("first_name").eq("garage_id", garage.id).eq("user_id", user.id).maybeSingle(),
    ]);

  // Gear whose homologation runs out within two months, or has run out; soonest first.
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
        icon: iconFor(PART_ICONS, part.category),
        name: [part.brand, part.model].filter(Boolean).join(" ") || labelFor(t.options.partCategories, part.category),
        componentLabel: check.component && labelFor(t.options.engineComponents, check.component),
        wholeText: o.sinceRevision,
      }));
    }),
    ...(activeKarts.data ?? []).flatMap((kart) => {
      const usage = computeUsage(kart.sessions, kart.maintenance_records, chassisKeys);
      return dueChecks(usage, kart.usage_limit_minutes, readLimits(kart.component_limits, chassisKeys)).map((check) => ({
        ...check,
        key: `kart-${kart.id}-${check.component ?? ""}`,
        href: `/dashboard/karts/${kart.id}`,
        icon: "kart" as IconName,
        name: kart.name,
        componentLabel: check.component && labelFor(t.options.chassisComponents, check.component),
        wholeText: o.sinceService,
      }));
    }),
  ].sort((a, b) => b.share - a.share);

  const hasEquipment = (karts.count ?? 0) > 0 || (parts.count ?? 0) > 0 || (gearCount.count ?? 0) > 0;
  const event = nextEvent.data;
  // "Sessie" opens the add form of the next event, else of the last one, else plans an event.
  const sessionEventId = event?.id ?? lastEvent.data?.id;
  const quick: { href: string; icon: IconName; label: string }[] = [
    { href: sessionEventId ? `/dashboard/events/${sessionEventId}#add` : "/dashboard/seasons#add-event", icon: "stopwatch", label: o.addSession },
    { href: "/dashboard/costs#add", icon: "receipt", label: o.scanReceipt },
    { href: "/dashboard/parts#add", icon: "engine", label: o.addPart },
    { href: "/dashboard/karts#add", icon: "kart", label: o.addKart },
  ];

  const stats: { href: string; icon: IconName; label: string; value: number }[] = [
    { href: "/dashboard/karts", icon: "kart", label: o.karts, value: karts.count ?? 0 },
    { href: "/dashboard/parts", icon: "engine", label: o.parts, value: parts.count ?? 0 },
    { href: "/dashboard/parts", icon: "check", label: o.installed, value: installed.count ?? 0 },
    { href: "/dashboard/gear", icon: "helmet", label: t.nav.gear, value: gearCount.count ?? 0 },
  ];

  const spent = (season.data?.expenses ?? []).reduce((sum, e) => sum + e.amount_cents, 0);
  const budget = season.data?.budget_cents ?? null;
  // The three biggest categories of the season, as small icons under the budget.
  const topCategories = [...(season.data?.expenses ?? []).reduce((map, e) => map.set(e.category, (map.get(e.category) ?? 0) + e.amount_cents), new Map<string, number>())]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const days = event ? daysBetween(today, event.starts_on) : null;
  const eventDate = event ? new Date(`${event.starts_on}T12:00:00Z`) : null;

  return (
    <>
      <section>
        <p className="text-sm text-zinc-500">{garage.name}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          {me.data?.first_name ? format(o.greeting, { name: me.data.first_name }) : garage.name}
        </h1>
      </section>

      <nav aria-label={o.quickLabel} className="grid grid-cols-4 gap-2 sm:gap-3">
        {quick.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className={`flex flex-col items-center gap-2 rounded-2xl border border-zinc-800/80 bg-zinc-900/50 px-1 py-4 text-xs font-medium text-zinc-200 transition-colors hover:border-brand-400/40 hover:text-white sm:text-sm ${focusRing}`}
          >
            <span className="relative">
              <IconTile name={action.icon} />
              <span aria-hidden="true" className="absolute -right-1.5 -bottom-1.5 inline-flex size-5 items-center justify-center rounded-full border-2 border-zinc-950 bg-brand-500 text-on-brand">
                <Icon name="plus" className="size-3" />
              </span>
            </span>
            {action.label}
          </Link>
        ))}
      </nav>

      <div className="grid gap-4 md:grid-cols-2">
        {event && eventDate ? (
          <Link href={`/dashboard/events/${event.id}`} className={`${tileLink} flex items-center gap-4`}>
            <span aria-hidden="true" className="flex w-16 shrink-0 flex-col items-center rounded-2xl bg-brand-500 py-2 text-on-brand">
              <span className="text-2xl leading-tight font-bold tabular-nums">
                {new Intl.DateTimeFormat("nl-NL", { day: "numeric", timeZone: "UTC" }).format(eventDate)}
              </span>
              <span className="text-[11px] font-medium tracking-wide uppercase">
                {new Intl.DateTimeFormat("nl-NL", { month: "short", timeZone: "UTC" }).format(eventDate)}
              </span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs text-zinc-500">{o.nextEvent}</span>
              <span className="block truncate text-lg font-semibold">{event.name}</span>
              <span className="flex items-center gap-1 truncate text-sm text-zinc-400">
                <Icon name="pin" className="size-3.5 shrink-0" />
                {event.tracks ? trackLabel(event.tracks) : labelFor(t.options.eventTypes, event.type)}
              </span>
              <span className="mt-2 flex flex-wrap gap-1.5">
                <Chip tone="brand">{days === 0 ? o.today : days === 1 ? o.tomorrow : plural(days!, o.inDays)}</Chip>
                {event.sessions.length > 0 && <Chip>{plural(event.sessions.length, o.sessionsCount)}</Chip>}
              </span>
            </span>
          </Link>
        ) : (
          <Link href="/dashboard/seasons#add-event" className={`${tileLink} flex items-center gap-4`}>
            <IconTile name="calendar" size="lg" tone="neutral" />
            <span>
              <span className="block text-xs text-zinc-500">{o.nextEvent}</span>
              <span className="block text-lg font-semibold">{o.noEvent}</span>
              <span className="text-sm text-brand-300">{o.planEvent} →</span>
            </span>
          </Link>
        )}

        <Link href={season.data ? `/dashboard/costs?season=${season.data.id}` : "/dashboard/seasons#add-season"} className={`${tileLink} flex flex-col gap-3`}>
          <span className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-xs text-zinc-500">
              <Icon name="euro" className="size-4" />
              {season.data ? `${o.budget} · ${season.data.name}` : o.budget}
            </span>
            {topCategories.length > 0 && (
              <span className="flex gap-1">
                {topCategories.map(([category]) => (
                  <span key={category} title={labelFor(t.options.expenseCategories, category)}>
                    <IconTile name={iconFor(EXPENSE_ICONS, category)} size="sm" tone="neutral" />
                  </span>
                ))}
              </span>
            )}
          </span>
          {season.data ? (
            <>
              <span className="flex items-baseline gap-2">
                <span className="text-3xl font-semibold tabular-nums">{formatCents(spent)}</span>
                <span className="text-sm text-zinc-500">{budget !== null ? format(o.budgetOf, { budget: formatCents(budget) }) : o.spent}</span>
              </span>
              {budget !== null && budget > 0 ? (
                <Meter share={spent / budget} label={o.budget} />
              ) : (
                <span className="text-xs text-zinc-500">{o.noBudget}</span>
              )}
            </>
          ) : (
            <span className="text-lg font-semibold">{o.noSeason}</span>
          )}
        </Link>
      </div>

      <section aria-label={o.statsLabel} className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className={`${tileLink} flex items-center gap-3`}>
            <IconTile name={stat.icon} tone="neutral" />
            <span>
              <span className="block text-2xl leading-tight font-semibold tabular-nums">{stat.value}</span>
              <span className="block text-xs text-zinc-400">{stat.label}</span>
            </span>
          </Link>
        ))}
      </section>

      {karts.count === 0 && (
        <Link href="/dashboard/karts#add" className={`${tileLink} flex items-center gap-4 border-dashed`}>
          <IconTile name="kart" size="lg" />
          <span>
            <span className="block text-lg font-semibold">{o.startTitle}</span>
            <span className="block text-sm text-zinc-400">{o.startText}</span>
          </span>
        </Link>
      )}

      {dueItems.length > 0 || gearAlerts.length > 0 ? (
        <section aria-labelledby="attention-heading" className={`${cardClass} border-amber-400/30`}>
          <h2 id="attention-heading" className="flex items-center gap-2 text-lg font-semibold">
            <Icon name="wrench" className="size-5 text-amber-300" />
            {o.attention}
          </h2>
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {dueItems.map((item) => {
              const counts = { used: formatMinutes(item.minutes), limit: formatMinutes(item.limit) };
              return (
                <li key={item.key}>
                  <Link href={item.href} className={`flex items-center gap-3 rounded-xl border border-zinc-800/80 p-3 transition-colors hover:border-brand-400/40 ${focusRing}`}>
                    <IconTile name={item.icon} tone={item.tone === "due" ? "red" : "amber"} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-medium text-zinc-100">{item.name}</span>
                        <span className={`shrink-0 text-xs font-medium ${item.tone === "due" ? "text-red-300" : "text-amber-300"}`}>
                          <span aria-hidden="true">{item.tone === "due" ? "● " : "▲ "}</span>
                          {item.tone === "due" ? o.due : o.soon}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-zinc-400 tabular-nums">
                        {item.componentLabel ? format(o.componentUsage, { component: item.componentLabel, ...counts }) : format(item.wholeText, counts)}
                      </span>
                      <span className="mt-2 block">
                        <Meter share={item.share} tone={item.tone} label={item.componentLabel ?? item.name} />
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
            {gearAlerts.map((item) => {
              const expired = item.validity.tone === "expired";
              return (
                <li key={item.id}>
                  <Link href={`/dashboard/gear/${item.id}`} className={`flex items-center gap-3 rounded-xl border border-zinc-800/80 p-3 transition-colors hover:border-brand-400/40 ${focusRing}`}>
                    <IconTile name={iconFor(GEAR_ICONS, item.category)} tone={expired ? "red" : "amber"} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-medium text-zinc-100">
                          {[labelFor(t.options.gearCategories, item.category), item.brand, item.model].filter(Boolean).join(" ")}
                        </span>
                        <span className={`shrink-0 text-xs font-medium ${expired ? "text-red-300" : "text-amber-300"}`}>
                          <span aria-hidden="true">{expired ? "● " : "▲ "}</span>
                          {expired ? o.gearExpiredShort : plural(item.validity.daysLeft, o.gearDaysLeft)}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-zinc-400">
                        {format(expired ? o.gearExpired : o.gearUntil, { date: formatDate(item.valid_until) })}
                        {item.drivers && ` · ${item.drivers.name}`}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        hasEquipment && (
          <section className={`${cardClass} flex items-center gap-4`}>
            <IconTile name="check" tone="neutral" />
            <span>
              <span className="block font-semibold">{o.allGood}</span>
              <span className="block text-sm text-zinc-400">{o.allGoodText}</span>
            </span>
          </section>
        )
      )}

      <TrackProgress sessions={progress.data ?? []} t={t} />

      <p className="text-xs text-zinc-600">
        <Link href="/dashboard/settings" className={linkClass}>
          {format(o.signedInAs, { email: user.email ?? "" })}
        </Link>
      </p>
    </>
  );
}
