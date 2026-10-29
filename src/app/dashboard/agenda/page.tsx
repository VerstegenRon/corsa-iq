import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";

import { DeleteButton } from "@/components/delete-button";
import { AddSection } from "@/components/edit-section";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { cardClass, linkClass } from "@/components/ui";
import { getCurrentGarage } from "@/lib/garage";
import { EVENT_TYPES, labelFor, todayInAmsterdam } from "@/lib/karting";
import { jobSentence, jobTitle } from "@/lib/maintenance-plan";
import { loadMaintenancePlan } from "@/lib/maintenance-plan-data";

import { deleteCalendarItem } from "../agenda-actions";
import { FeedSection } from "./feed-section";
import { CalendarItemForm } from "./item-form";
import { MaintenancePlanList } from "./maintenance-plan-list";

export const metadata: Metadata = {
  title: "Agenda — CorsaIQ",
};

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400";
const WEEKDAYS = ["ma", "di", "wo", "do", "vr", "za", "zo"];

type Kind = "event" | "item" | "maintenance";

type Entry = {
  key: string;
  kind: Kind;
  title: string;
  detail: string | null;
  href: string | null;
  /** First and last day it covers. */
  from: string;
  to: string;
  item?: { id: string; title: string; starts_on: string; ends_on: string | null; starts_at: string | null; notes: string | null };
};

const KIND: Record<Kind, { label: string; dot: string; chip: string }> = {
  event: { label: "Evenement", dot: "bg-brand-400", chip: "border-brand-400/50 bg-brand-500/15 text-zinc-50" },
  item: { label: "Afspraak", dot: "bg-zinc-400", chip: "border-zinc-700 bg-zinc-800 text-zinc-100" },
  maintenance: { label: "Onderhoud", dot: "bg-amber-400", chip: "border-amber-400/40 bg-amber-400/10 text-amber-200" },
};

const utc = (date: string) => new Date(`${date}T12:00:00Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);
function addDays(date: string, days: number) {
  const d = utc(date);
  d.setUTCDate(d.getUTCDate() + days);
  return iso(d);
}

const monthTitle = new Intl.DateTimeFormat("nl-NL", { month: "long", year: "numeric", timeZone: "UTC" });
const dayTitle = new Intl.DateTimeFormat("nl-NL", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const shortDate = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", timeZone: "UTC" });

export default async function AgendaPage({ searchParams }: PageProps<"/dashboard/agenda">) {
  const query = await searchParams;
  const today = todayInAmsterdam();
  const month = typeof query.month === "string" && /^\d{4}-\d{2}$/.test(query.month) ? query.month : today.slice(0, 7);
  const monthStart = `${month}-01`;
  const next = utc(monthStart);
  next.setUTCMonth(next.getUTCMonth() + 1);
  const nextMonth = iso(next).slice(0, 7);
  const monthEnd = addDays(iso(next), -1);
  const prev = utc(monthStart);
  prev.setUTCMonth(prev.getUTCMonth() - 1);
  const prevMonth = iso(prev).slice(0, 7);

  // The grid runs from the Monday on or before the 1st to the Sunday on or after the last day.
  const gridStart = addDays(monthStart, -((utc(monthStart).getUTCDay() + 6) % 7));
  const gridEnd = addDays(monthEnd, (7 - utc(monthEnd).getUTCDay()) % 7);

  const { supabase, user, garage } = await getCurrentGarage();
  const [events, items, feed, plan, requestHeaders] = await Promise.all([
    supabase
      .from("events")
      .select("id, name, type, starts_on, ends_on, tracks(name)")
      .eq("garage_id", garage.id)
      .lte("starts_on", gridEnd)
      .or(`ends_on.gte.${gridStart},starts_on.gte.${gridStart}`)
      .order("starts_on"),
    supabase
      .from("calendar_items")
      .select("id, title, starts_on, ends_on, starts_at, notes")
      .eq("garage_id", garage.id)
      .lte("starts_on", gridEnd)
      .or(`ends_on.gte.${gridStart},starts_on.gte.${gridStart}`)
      .order("starts_on")
      .order("starts_at", { nullsFirst: true }),
    supabase.from("calendar_feeds").select("token").eq("garage_id", garage.id).eq("user_id", user.id).maybeSingle(),
    loadMaintenancePlan(supabase, garage.id, today),
    headers(),
  ]);

  const entries: Entry[] = [
    ...(events.data ?? []).map((e) => ({
      key: `event-${e.id}`,
      kind: "event" as const,
      title: e.name,
      detail: [labelFor(EVENT_TYPES, e.type), e.tracks?.name].filter(Boolean).join(" · "),
      href: `/dashboard/events/${e.id}`,
      from: e.starts_on,
      to: e.ends_on ?? e.starts_on,
    })),
    ...(items.data ?? []).map((i) => ({
      key: `item-${i.id}`,
      kind: "item" as const,
      title: i.starts_at ? `${i.starts_at.slice(0, 5)} ${i.title}` : i.title,
      detail: i.notes,
      href: null,
      from: i.starts_on,
      to: i.ends_on ?? i.starts_on,
      item: i,
    })),
    ...plan
      .filter((job) => job.dueBy >= gridStart && job.dueBy <= gridEnd)
      .map((job) => ({
        key: `maintenance-${job.key}`,
        kind: "maintenance" as const,
        title: jobTitle(job),
        detail: job.event ? `${jobSentence(job)} Klaar vóór ${job.event.name}.` : jobSentence(job),
        href: job.href,
        from: job.dueBy,
        to: job.dueBy,
      })),
  ];
  const onDay = (date: string) => entries.filter((e) => e.from <= date && e.to >= date);
  // In the list, something that lasts several days only shows on its first day (in this month).
  const startsOn = (date: string) => entries.filter((e) => (e.from < monthStart ? monthStart : e.from) === date);

  const days: string[] = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) days.push(d);
  // The list below the grid: every day of this month on which something starts.
  const listDays = days.filter((d) => d >= monthStart && d <= monthEnd && startsOn(d).length > 0);

  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const feedUrl = feed.data && host ? `${proto}://${host}/api/agenda/${feed.data.token}` : null;

  const navLink = `inline-flex size-9 items-center justify-center rounded-full border border-zinc-800 text-zinc-300 transition-colors hover:border-brand-400/40 hover:text-white ${focusRing}`;

  return (
    <>
      <PageHeader icon="agenda" title="Agenda" subtitle="Evenementen, afspraken en gepland onderhoud" add="Afspraak" />

      <section aria-labelledby="month-heading" className={cardClass}>
        <div className="flex items-center justify-between gap-3">
          <h2 id="month-heading" className="text-lg font-semibold capitalize">
            {monthTitle.format(utc(monthStart))}
          </h2>
          <div className="flex items-center gap-2">
            {month !== today.slice(0, 7) && (
              <Link href="/dashboard/agenda" className={`${linkClass} mr-1 text-sm`}>
                Vandaag
              </Link>
            )}
            <Link href={`/dashboard/agenda?month=${prevMonth}`} aria-label="Vorige maand" className={navLink}>
              <Icon name="chevron" className="size-4 rotate-180" />
            </Link>
            <Link href={`/dashboard/agenda?month=${nextMonth}`} aria-label="Volgende maand" className={navLink}>
              <Icon name="chevron" className="size-4" />
            </Link>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-zinc-800 bg-zinc-800" role="grid" aria-label="Maandoverzicht">
          {WEEKDAYS.map((day) => (
            <div key={day} role="columnheader" className="bg-zinc-900 py-1.5 text-center text-xs text-zinc-500">
              {day}
            </div>
          ))}
          {days.map((date) => {
            const inMonth = date >= monthStart && date <= monthEnd;
            const dayEntries = onDay(date);
            return (
              <div
                key={date}
                role="gridcell"
                aria-label={`${dayTitle.format(utc(date))}${dayEntries.length > 0 ? `: ${dayEntries.map((e) => e.title).join(", ")}` : ""}`}
                className={`flex min-h-14 flex-col gap-1 p-1 sm:min-h-24 sm:p-1.5 ${inMonth ? "bg-zinc-950" : "bg-zinc-950/40"}`}
              >
                <span
                  className={`inline-flex size-6 items-center justify-center self-start rounded-full text-xs tabular-nums ${
                    date === today ? "bg-brand-500 font-semibold text-on-brand" : inMonth ? "text-zinc-300" : "text-zinc-600"
                  }`}
                >
                  {Number(date.slice(8))}
                </span>
                {/* Phones: a dot per kind; wider screens: the titles. */}
                <span className="flex flex-wrap gap-1 sm:hidden" aria-hidden="true">
                  {[...new Set(dayEntries.map((e) => e.kind))].map((kind) => (
                    <span key={kind} className={`size-1.5 rounded-full ${KIND[kind].dot}`} />
                  ))}
                </span>
                <span className="hidden flex-col gap-1 sm:flex" aria-hidden="true">
                  {dayEntries.slice(0, 3).map((e) => (
                    <span key={e.key} className={`truncate rounded border px-1.5 py-0.5 text-[11px] leading-tight ${KIND[e.kind].chip}`}>
                      {e.title}
                    </span>
                  ))}
                  {dayEntries.length > 3 && <span className="text-[11px] text-zinc-500">+{dayEntries.length - 3}</span>}
                </span>
              </div>
            );
          })}
        </div>

        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400" aria-label="Legenda">
          {(Object.keys(KIND) as Kind[]).map((kind) => (
            <li key={kind} className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className={`size-2 rounded-full ${KIND[kind].dot}`} />
              {KIND[kind].label}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="list-heading" className={cardClass}>
        <h2 id="list-heading" className="text-lg font-semibold">
          Deze maand
        </h2>
        {listDays.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-400">Niets gepland in deze maand.</p>
        ) : (
          <ol className="mt-3 flex flex-col gap-4">
            {listDays.map((date) => (
              <li key={date}>
                <h3 className={`text-xs font-medium tracking-wide uppercase ${date === today ? "text-brand-300" : "text-zinc-500"}`}>
                  {date === today ? "Vandaag · " : ""}
                  {dayTitle.format(utc(date))}
                </h3>
                <ul className="mt-1.5 divide-y divide-zinc-800/80">
                  {startsOn(date).map((entry) => (
                    <AgendaRow key={entry.key} entry={entry} />
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section aria-labelledby="plan-heading" className={cardClass}>
        <h2 id="plan-heading" className="text-lg font-semibold">
          Onderhoud plannen
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Op basis van de draaiuren en limieten van je karts en gemonteerde onderdelen, en de looptijd van je vorige evenementen.
        </p>
        <div className="mt-3">
          <MaintenancePlanList jobs={plan} />
        </div>
      </section>

      <AddSection title="Afspraak toevoegen" defaultOpen={false}>
        <CalendarItemForm defaultDate={month === today.slice(0, 7) ? today : monthStart} />
      </AddSection>

      <section aria-labelledby="feed-heading" className={cardClass}>
        <h2 id="feed-heading" className="mb-3 text-lg font-semibold">
          In je telefoonagenda
        </h2>
        <FeedSection url={feedUrl} />
      </section>
    </>
  );
}

function AgendaRow({ entry }: { entry: Entry }) {
  const range = entry.from !== entry.to ? `${shortDate.format(utc(entry.from))} – ${shortDate.format(utc(entry.to))}` : null;
  const body = (
    <span className="flex min-w-0 items-start gap-3">
      <span aria-hidden="true" className={`mt-1.5 size-2 shrink-0 rounded-full ${KIND[entry.kind].dot}`} />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-zinc-100">{entry.title}</span>
        <span className="block text-xs text-zinc-500">
          {KIND[entry.kind].label}
          {range && ` · ${range}`}
          {entry.detail && ` · ${entry.detail}`}
        </span>
      </span>
    </span>
  );

  return (
    <li className="py-2.5">
      {entry.href ? (
        <Link href={entry.href} className={`block rounded hover:text-white ${focusRing}`}>
          {body}
        </Link>
      ) : (
        body
      )}
      {entry.item && (
        <details className="group mt-2 ml-5">
          <summary className={`cursor-pointer list-none text-xs text-zinc-400 hover:text-white [&::-webkit-details-marker]:hidden ${focusRing}`}>
            Bewerken
          </summary>
          <div className="mt-3 flex flex-col gap-4 rounded-xl border border-zinc-800 p-4">
            <CalendarItemForm item={entry.item} />
            <DeleteButton action={deleteCalendarItem.bind(null, entry.item.id)} label="Afspraak verwijderen" confirmText={`${entry.item.title} verwijderen?`} compact />
          </div>
        </details>
      )}
    </li>
  );
}
