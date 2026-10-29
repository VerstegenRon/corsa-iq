import type { Metadata } from "next";
import Link from "next/link";

import { BarList, type BarRow } from "@/components/charts/bar-list";
import { ColumnChart } from "@/components/charts/column-chart";
import { CHART_COLORS } from "@/components/charts/palette";
import { Timeline, type TimelineItem } from "@/components/charts/timeline";
import { GEAR_ICONS, Icon, IconTile, PART_ICONS, iconFor, type IconName } from "@/components/icons";
import { Chip, Meter, toneForShare } from "@/components/meter";
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
import { formatHours, jobTitle } from "@/lib/maintenance-plan";
import { loadMaintenancePlan } from "@/lib/maintenance-plan-data";
import { computeUsage, readLimits } from "@/lib/part-usage";

import { TrackProgress } from "./track-progress";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).overview.metaTitle };
}

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400";
const tileLink = `${cardClass} transition-colors hover:border-brand-400/40 ${focusRing}`;

/** How far ahead the timeline looks. */
const TIMELINE_DAYS = 90;
/** Spend per category: the biggest ones, the rest together as "Overig". */
const TOP_CATEGORIES = 5;
/** Wear counters on the overview; the kart and part pages have them all. */
const WEAR_SHOWN = 6;

const monthLabel = new Intl.DateTimeFormat("nl-NL", { month: "narrow", timeZone: "UTC" });
const monthTitle = new Intl.DateTimeFormat("nl-NL", { month: "long", year: "numeric", timeZone: "UTC" });

function addDays(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export default async function DashboardPage() {
  const [{ supabase, user, garage, canSeeCosts }, t] = await Promise.all([getCurrentGarage(), getDictionary()]);
  const today = todayInAmsterdam();
  const horizon = addDays(today, TIMELINE_DAYS);
  const o = t.overview;

  const [karts, parts, installed, gearCount, season, progress, activeParts, activeKarts, activeGear, upcoming, items, lastEvent, me, plan] =
    await Promise.all([
      supabase.from("karts").select("id", { count: "exact", head: true }).eq("garage_id", garage.id),
      supabase.from("parts").select("id", { count: "exact", head: true }).eq("garage_id", garage.id),
      supabase.from("parts").select("id", { count: "exact", head: true }).eq("garage_id", garage.id).eq("status", "installed"),
      supabase.from("gear_items").select("id", { count: "exact", head: true }).eq("garage_id", garage.id).neq("status", "retired"),
      supabase
        .from("seasons")
        .select("id, name, year, budget_cents, expenses(amount_cents, category), events(id, starts_on, sessions(started_at, duration_s))")
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
        .select("id, name, type, starts_on, ends_on, tracks(name, city, country)")
        .eq("garage_id", garage.id)
        .lte("starts_on", horizon)
        .or(`starts_on.gte.${today},ends_on.gte.${today}`)
        .order("starts_on"),
      supabase
        .from("calendar_items")
        .select("id, title, starts_on, starts_at")
        .eq("garage_id", garage.id)
        .gte("starts_on", today)
        .lte("starts_on", horizon)
        .order("starts_on"),
      supabase.from("events").select("id").eq("garage_id", garage.id).lt("starts_on", today).order("starts_on", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("drivers").select("first_name").eq("garage_id", garage.id).eq("user_id", user.id).maybeSingle(),
      loadMaintenancePlan(supabase, garage.id, today),
    ]);
  const plannedByKey = new Map(plan.map((job) => [job.key, job]));

  // ---- Season in numbers -------------------------------------------------------------------
  const seasonEvents = season.data?.events ?? [];
  const seasonSessions = seasonEvents.flatMap((e) => e.sessions);
  const seasonMinutes = Math.round(seasonSessions.reduce((sum, s) => sum + (s.duration_s ?? 0), 0) / 60);
  const eventsDone = seasonEvents.filter((e) => e.starts_on <= today).length;
  const spent = (season.data?.expenses ?? []).reduce((sum, e) => sum + e.amount_cents, 0);
  const budget = season.data?.budget_cents ?? null;

  const allKpis: { label: string; value: string; detail: string; icon: IconName; color: string; href: string }[] = [
    { label: "Rijtijd", value: formatHours(seasonMinutes).replace(" uur", " u"), detail: "dit seizoen", icon: "stopwatch", color: CHART_COLORS[0], href: "/dashboard/seasons" },
    { label: "Sessies", value: String(seasonSessions.length), detail: `bij ${eventsDone} ${eventsDone === 1 ? "evenement" : "evenementen"}`, icon: "flag", color: CHART_COLORS[1], href: "/dashboard/seasons" },
    { label: "Evenementen", value: `${eventsDone} / ${seasonEvents.length}`, detail: "gereden / gepland", icon: "calendar", color: CHART_COLORS[2], href: "/dashboard/agenda" },
    {
      label: "Uitgegeven",
      value: formatCents(spent),
      detail: budget ? `${Math.round((spent / budget) * 100)}% van het budget` : "dit seizoen",
      icon: "euro",
      color: CHART_COLORS[6],
      href: season.data ? `/dashboard/costs?season=${season.data.id}` : "/dashboard/costs",
    },
  ];
  const kpis = canSeeCosts ? allKpis : allKpis.filter((k) => k.icon !== "euro");

  // ---- Run time per month of the season year -------------------------------------------------
  const year = season.data?.year ?? Number(today.slice(0, 4));
  const minutesPerMonth = Array.from({ length: 12 }, () => 0);
  for (const s of seasonSessions) {
    if (Number(s.started_at.slice(0, 4)) === year) minutesPerMonth[Number(s.started_at.slice(5, 7)) - 1] += (s.duration_s ?? 0) / 60;
  }
  const thisMonth = Number(today.slice(0, 4)) === year ? Number(today.slice(5, 7)) - 1 : -1;
  const columns = minutesPerMonth.map((minutes, month) => {
    const date = new Date(Date.UTC(year, month, 15));
    return {
      key: String(month),
      label: monthLabel.format(date),
      value: Math.round(minutes),
      valueLabel: formatMinutes(Math.round(minutes)),
      title: monthTitle.format(date),
      highlight: month === thisMonth,
    };
  });

  // ---- Spend per category ----------------------------------------------------------------------
  const perCategory = [...(season.data?.expenses ?? []).reduce((map, e) => map.set(e.category, (map.get(e.category) ?? 0) + e.amount_cents), new Map<string, number>())].sort(
    (a, b) => b[1] - a[1],
  );
  const rest = perCategory.slice(TOP_CATEGORIES).reduce((sum, [, cents]) => sum + cents, 0);
  const categoryRows: BarRow[] = [
    ...perCategory.slice(0, TOP_CATEGORIES).map(([category, cents]) => ({
      key: category,
      label: labelFor(t.options.expenseCategories, category),
      value: cents,
      valueLabel: formatCents(cents),
      color: "var(--color-zinc-400)",
    })),
    ...(rest > 0 ? [{ key: "rest", label: "Overig", value: rest, valueLabel: formatCents(rest), color: "var(--color-zinc-600)" }] : []),
  ];

  // ---- The coming months -----------------------------------------------------------------------
  const timeline: TimelineItem[] = [
    ...(upcoming.data ?? []).map((e) => ({
      key: `event-${e.id}`,
      date: e.starts_on < today ? today : e.starts_on,
      until: e.ends_on,
      label: e.name,
      detail: e.tracks ? trackLabel(e.tracks) : labelFor(t.options.eventTypes, e.type),
      href: `/dashboard/events/${e.id}`,
      kind: "event" as const,
    })),
    ...plan
      .filter((job) => job.dueBy <= horizon)
      .map((job) => ({
        key: `job-${job.key}`,
        date: job.dueBy,
        label: jobTitle(job),
        detail: job.event ? `vóór ${job.event.name}` : undefined,
        href: job.href,
        kind: "maintenance" as const,
      })),
    ...(items.data ?? []).map((i) => ({
      key: `item-${i.id}`,
      date: i.starts_on,
      label: i.starts_at ? `${i.starts_at.slice(0, 5)} ${i.title}` : i.title,
      href: `/dashboard/agenda?month=${i.starts_on.slice(0, 7)}`,
      kind: "item" as const,
    })),
  ];

  // ---- Wear: every counter with a limit, the most worn first --------------------------------
  const engineKeys = Object.keys(ENGINE_COMPONENTS);
  const chassisKeys = Object.keys(CHASSIS_COMPONENTS);
  type Wear = { key: string; href: string; icon: IconName; name: string; component: string | null; minutes: number; limit: number };
  const wear: Wear[] = [
    ...(activeParts.data ?? []).flatMap((part) => {
      const keys = part.category === "engine" ? engineKeys : [];
      const usage = computeUsage(part.session_parts.flatMap((sp) => (sp.sessions ? [sp.sessions] : [])), part.maintenance_records, keys);
      const base = {
        href: `/dashboard/parts/${part.id}`,
        icon: iconFor(PART_ICONS, part.category),
        name: [part.brand, part.model].filter(Boolean).join(" ") || labelFor(t.options.partCategories, part.category),
      };
      return [
        ...(part.usage_limit_minutes ? [{ ...base, key: `part-${part.id}`, component: null, minutes: usage.sinceResetMinutes, limit: part.usage_limit_minutes }] : []),
        ...Object.entries(readLimits(part.component_limits, keys)).map(([c, limit]) => ({
          ...base,
          key: `part-${part.id}-${c}`,
          component: labelFor(t.options.engineComponents, c),
          minutes: usage.components[c]?.minutes ?? usage.totalMinutes,
          limit,
        })),
      ];
    }),
    ...(activeKarts.data ?? []).flatMap((kart) => {
      const usage = computeUsage(kart.sessions, kart.maintenance_records, chassisKeys);
      const base = { href: `/dashboard/karts/${kart.id}`, icon: "kart" as IconName, name: kart.name };
      return [
        ...(kart.usage_limit_minutes ? [{ ...base, key: `kart-${kart.id}`, component: null, minutes: usage.sinceResetMinutes, limit: kart.usage_limit_minutes }] : []),
        ...Object.entries(readLimits(kart.component_limits, chassisKeys)).map(([c, limit]) => ({
          ...base,
          key: `kart-${kart.id}-${c}`,
          component: labelFor(t.options.chassisComponents, c),
          minutes: usage.components[c]?.minutes ?? usage.totalMinutes,
          limit,
        })),
      ];
    }),
  ].sort((a, b) => b.minutes / b.limit - a.minutes / a.limit);

  // Gear whose homologation runs out within two months, or has run out; soonest first.
  const gearAlerts = (activeGear.data ?? [])
    .map((item) => ({ ...item, validity: gearValidity(item.valid_until, today)! }))
    .filter((item) => item.validity.tone !== "ok")
    .sort((a, b) => a.validity.daysLeft - b.validity.daysLeft);

  const nextEvent = (upcoming.data ?? [])[0];
  // "Sessie" opens the add form of the next event, else of the last one, else plans an event.
  const sessionEventId = nextEvent?.id ?? lastEvent.data?.id;
  const quick: { href: string; icon: IconName; label: string; color: string }[] = [
    { href: sessionEventId ? `/dashboard/events/${sessionEventId}#add` : "/dashboard/seasons#add-event", icon: "stopwatch", label: o.addSession, color: CHART_COLORS[0] },
    ...(canSeeCosts ? [{ href: "/dashboard/costs#add", icon: "receipt" as IconName, label: o.scanReceipt, color: CHART_COLORS[6] }] : []),
    { href: "/dashboard/parts#add", icon: "engine", label: o.addPart, color: CHART_COLORS[1] },
    { href: "/dashboard/karts#add", icon: "kart", label: o.addKart, color: CHART_COLORS[2] },
  ];

  const equipment = [
    { href: "/dashboard/karts", label: plural(karts.count ?? 0, { one: "{count} kart", other: "{count} karts" }) },
    { href: "/dashboard/parts", label: `${parts.count ?? 0} onderdelen (${installed.count ?? 0} gemonteerd)` },
    { href: "/dashboard/gear", label: `${gearCount.count ?? 0} × uitrusting` },
  ];

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
              <IconTile name={action.icon} tone="neutral" />
              <span aria-hidden="true" className="absolute -right-1.5 -bottom-1.5 inline-flex size-5 items-center justify-center rounded-full border-2 border-zinc-950 bg-brand-500 text-on-brand">
                <Icon name="plus" className="size-3" />
              </span>
            </span>
            {action.label}
          </Link>
        ))}
      </nav>

      {karts.count === 0 && (
        <Link href="/dashboard/karts#add" className={`${tileLink} flex items-center gap-4 border-dashed`}>
          <IconTile name="kart" size="lg" />
          <span>
            <span className="block text-lg font-semibold">{o.startTitle}</span>
            <span className="block text-sm text-zinc-400">{o.startText}</span>
          </span>
        </Link>
      )}

      {/* The season in figures: a data grid of hairlines, every number in mono. */}
      <section
        aria-label={season.data ? `Seizoen ${season.data.name}` : "Seizoen"}
        className="grid grid-cols-2 gap-px border border-zinc-800 bg-zinc-800 lg:grid-cols-4"
      >
        {kpis.map((kpi) => (
          <Link key={kpi.label} href={kpi.href} className={`flex flex-col gap-1 bg-zinc-950 p-4 transition-colors hover:bg-zinc-900 ${focusRing}`}>
            <span className="channel-label">{kpi.label}</span>
            <span className="font-mono text-2xl font-bold text-zinc-50 sm:text-3xl">{kpi.value}</span>
            <span className="truncate text-xs text-zinc-500">{kpi.detail}</span>
          </Link>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <section aria-labelledby="timeline-heading" className={cardClass}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="timeline-heading" className="text-lg font-semibold">
              De komende 3 maanden
            </h2>
            <Link href="/dashboard/agenda" className={`${linkClass} text-sm`}>
              Agenda
            </Link>
          </div>
          {timeline.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-400">
              {o.noEvent}{" "}
              <Link href="/dashboard/seasons#add-event" className={linkClass}>
                {o.planEvent}
              </Link>
            </p>
          ) : (
            <div className="mt-3">
              <Timeline items={timeline} today={today} days={TIMELINE_DAYS} />
            </div>
          )}
        </section>

        {canSeeCosts && (
        <section aria-labelledby="budget-heading" className={cardClass}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="budget-heading" className="text-lg font-semibold">
              {season.data ? `${o.budget} · ${season.data.name}` : o.budget}
            </h2>
            <Link href={season.data ? `/dashboard/costs?season=${season.data.id}` : "/dashboard/seasons#add-season"} className={`${linkClass} text-sm`}>
              Kosten
            </Link>
          </div>
          {season.data ? (
            <>
              <p className="mt-3 flex flex-wrap items-baseline gap-x-2">
                <span className="text-4xl font-semibold">{formatCents(spent)}</span>
                <span className="text-sm text-zinc-400">{budget !== null ? format(o.budgetOf, { budget: formatCents(budget) }) : o.spent}</span>
              </p>
              <div className="mt-3">
                {budget !== null && budget > 0 ? <Meter share={spent / budget} label={o.budget} /> : <p className="text-xs text-zinc-500">{o.noBudget}</p>}
              </div>
              {categoryRows.length > 0 ? (
                <div className="mt-5">
                  <BarList rows={categoryRows} label="Uitgaven per categorie" />
                </div>
              ) : (
                <p className="mt-4 text-sm text-zinc-400">Nog geen uitgaven dit seizoen.</p>
              )}
            </>
          ) : (
            <p className="mt-3 text-lg font-semibold">{o.noSeason}</p>
          )}
        </section>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <section aria-labelledby="runtime-heading" className={cardClass}>
          <h2 id="runtime-heading" className="text-lg font-semibold">
            Rijtijd per maand
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            {year}
            {seasonMinutes > 0 && ` · ${formatMinutes(seasonMinutes)} in totaal`}
          </p>
          {seasonMinutes > 0 ? (
            <div className="mt-3">
              <ColumnChart
                columns={columns}
                label={`Rijtijd per maand in ${year}`}
                unit="minutes"
                color="var(--color-zinc-600)"
                highlightColor="var(--color-brand-400)"
              />
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-400">Nog geen sessies met een duur dit seizoen.</p>
          )}
        </section>

        <section aria-labelledby="wear-heading" className={cardClass}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="wear-heading" className="flex items-center gap-2 text-lg font-semibold">
              Slijtage & onderhoud
            </h2>
            <Link href="/dashboard/agenda" className={`${linkClass} text-sm`}>
              Planning
            </Link>
          </div>
          {wear.length === 0 && gearAlerts.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-400">
              {o.allGoodText} Stel limieten in bij je karts en onderdelen om hier de slijtage te volgen.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-1">
              {wear.slice(0, WEAR_SHOWN).map((item) => {
                const share = item.minutes / item.limit;
                const tone = toneForShare(share);
                const job = plannedByKey.get(item.key);
                return (
                  <li key={item.key}>
                    <Link href={item.href} className={`flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-zinc-800/60 ${focusRing}`}>
                      <IconTile name={item.icon} tone={tone === "due" ? "red" : tone === "soon" ? "amber" : undefined} color={tone === "ok" ? "var(--color-brand-400)" : undefined} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-sm font-medium text-zinc-100">
                            {item.name}
                            {item.component && <span className="font-normal text-zinc-400"> · {item.component}</span>}
                          </span>
                          {tone !== "ok" ? (
                            <Chip tone={tone}>{tone === "due" ? o.due : o.soon}</Chip>
                          ) : (
                            <span className="shrink-0 text-xs text-zinc-400">{Math.round(share * 100)}%</span>
                          )}
                        </span>
                        <span className="mt-1.5 block">
                          <Meter share={share} tone={tone} label={item.component ?? item.name} />
                        </span>
                        <span className="mt-1 block truncate text-xs text-zinc-400">
                          {formatHours(item.minutes)} van {formatHours(item.limit)}
                          {job && !job.dueNow && job.event && ` · plan vóór ${job.event.name} (${formatDate(job.event.starts_on)})`}
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
                    <Link href={`/dashboard/gear/${item.id}`} className={`flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-zinc-800/60 ${focusRing}`}>
                      <IconTile name={iconFor(GEAR_ICONS, item.category)} tone={expired ? "red" : "amber"} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-sm font-medium text-zinc-100">
                            {[labelFor(t.options.gearCategories, item.category), item.brand, item.model].filter(Boolean).join(" ")}
                          </span>
                          <Chip tone={expired ? "due" : "soon"}>{expired ? o.gearExpiredShort : plural(item.validity.daysLeft, o.gearDaysLeft)}</Chip>
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
          )}
        </section>
      </div>

      <TrackProgress sessions={progress.data ?? []} t={t} />

      <nav aria-label="Materiaal" className="flex flex-wrap gap-2">
        {equipment.map((e) => (
          <Link key={e.href} href={e.href} className={`rounded-full border border-zinc-800 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:border-brand-400/40 hover:text-white ${focusRing}`}>
            {e.label}
          </Link>
        ))}
      </nav>

      <p className="text-xs text-zinc-600">
        <Link href="/dashboard/settings" className={linkClass}>
          {format(o.signedInAs, { email: user.email ?? "" })}
        </Link>
      </p>
    </>
  );
}
