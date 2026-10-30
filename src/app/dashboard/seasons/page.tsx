import type { Metadata } from "next";
import Link from "next/link";

import { AddSection } from "@/components/edit-section";
import { Icon } from "@/components/icons";
import { Chip, Meter } from "@/components/meter";
import { EmptyState, PageHeader } from "@/components/page-header";
import { cardClass } from "@/components/ui";
import { getCurrentGarage } from "@/lib/garage";
import type { Dictionary } from "@/lib/i18n/dictionaries/nl";
import { format, plural } from "@/lib/i18n/locales";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { formatCents, labelFor, ownOrOfficial, todayInAmsterdam, trackLabel } from "@/lib/karting";

import { EventForm } from "./event-form";
import { SeasonForm } from "./season-form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: `${(await getDictionary()).events.title} — CorsaIQ` };
}

type EventRow = {
  id: string;
  name: string;
  type: string;
  starts_on: string;
  ends_on: string | null;
  season_id: string | null;
  tracks: { name: string; city: string | null; country: string | null } | null;
  sessions: { id: string }[];
};

function EventList({ events, t, locale }: { events: EventRow[]; t: Dictionary; locale: string }) {
  if (events.length === 0) return <p className="mt-3 text-sm text-zinc-500">{t.events.noEvents}</p>;
  const dayFormat = new Intl.DateTimeFormat(locale, { day: "numeric", timeZone: "UTC" });
  const monthFormat = new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" });
  return (
    <ul className="mt-4 flex flex-col gap-2">
      {events.map((event) => {
        const date = new Date(`${event.starts_on}T12:00:00Z`);
        const past = event.starts_on < todayInAmsterdam();
        return (
          <li key={event.id}>
            <Link
              href={`/dashboard/events/${event.id}`}
              className="group flex items-center gap-3 rounded-xl border border-zinc-800/80 p-2.5 transition-colors hover:border-brand-400/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
            >
              <span
                aria-hidden="true"
                className={`flex w-12 shrink-0 flex-col items-center rounded-lg py-1 ${past ? "bg-zinc-800 text-zinc-300" : "bg-brand-500 text-on-brand"}`}
              >
                <span className="text-lg leading-tight font-bold tabular-nums">{dayFormat.format(date)}</span>
                <span className="text-[10px] font-medium tracking-wide uppercase">{monthFormat.format(date)}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-zinc-100">{event.name}</span>
                <span className="flex items-center gap-1 truncate text-xs text-zinc-500">
                  <Icon name="pin" className="size-3 shrink-0" />
                  {event.tracks ? trackLabel(event.tracks) : t.events.unknownTrack}
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1">
                <Chip>{labelFor(t.options.eventTypes, event.type)}</Chip>
                <span className="flex items-center gap-1 text-xs text-zinc-500">
                  <Icon name="stopwatch" className="size-3" />
                  {event.sessions.length}
                  <span className="sr-only">{plural(event.sessions.length, t.events.sessionsWord)}</span>
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Spent against the season budget, as a meter that links to the season's costs. */
function SeasonBudget({ seasonId, spent, budget, t }: { seasonId: string; spent: number; budget: number | null; t: Dictionary }) {
  return (
    <Link
      href={`/dashboard/costs?season=${seasonId}`}
      className="mt-3 block rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
    >
      <span className="mb-1.5 flex items-center justify-between gap-2 text-xs text-zinc-400">
        <span className="flex items-center gap-1">
          <Icon name="euro" className="size-3.5" />
          {format(t.events.spent, { amount: formatCents(spent) })}
        </span>
        {budget !== null && <span className="tabular-nums">{format(t.events.budget, { amount: formatCents(budget) })}</span>}
      </span>
      {budget !== null && budget > 0 && <Meter share={spent / budget} label={t.events.budgetMeter} />}
    </Link>
  );
}

export default async function SeasonsPage() {
  const { supabase, garage } = await getCurrentGarage();
  const [t, locale] = await Promise.all([getDictionary(), getLocale()]);
  const te = t.events;

  const [seasonsResult, eventsResult, tracksResult] = await Promise.all([
    supabase
      .from("seasons")
      .select("id, name, year, class, championship, budget_cents, expenses(amount_cents)")
      .eq("garage_id", garage.id)
      .order("year", { ascending: false }),
    supabase
      .from("events")
      .select("id, name, type, starts_on, ends_on, season_id, tracks(name, city, country), sessions(id)")
      .eq("garage_id", garage.id)
      .order("starts_on", { ascending: false }),
    supabase.from("tracks").select("id, name, city, country").or(ownOrOfficial(garage.id)),
  ]);
  if (seasonsResult.error) throw new Error(seasonsResult.error.message);
  if (eventsResult.error) throw new Error(eventsResult.error.message);

  const seasons = seasonsResult.data;
  const events = eventsResult.data;
  const looseEvents = events.filter((event) => event.season_id === null);
  const tracks = (tracksResult.data ?? []).map((track) => ({
    id: track.id,
    label: trackLabel(track),
  }));

  return (
    <>
      <PageHeader icon="calendar" title={te.title} subtitle={te.subtitle} add={te.add} addId="add-event" />

      {seasons.length === 0 && events.length === 0 && (
        <EmptyState icon="calendar" title={te.emptyTitle} text={te.emptyText} />
      )}

      {seasons.map((season) => (
        <section key={season.id} aria-labelledby={`season-${season.id}`} className={cardClass}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id={`season-${season.id}`} className="text-lg font-semibold">
              {season.name}
              <Link
                href={`/dashboard/seasons/${season.id}`}
                className="ml-3 text-xs font-normal text-zinc-500 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
              >
                {te.edit}
              </Link>
            </h2>
            <p className="text-xs text-zinc-500">{[season.class, season.championship].filter(Boolean).join(" · ")}</p>
          </div>
          <SeasonBudget seasonId={season.id} spent={season.expenses.reduce((sum, e) => sum + e.amount_cents, 0)} budget={season.budget_cents} t={t} />
          <EventList events={events.filter((event) => event.season_id === season.id)} t={t} locale={locale} />
        </section>
      ))}

      {looseEvents.length > 0 && (
        <section aria-labelledby="loose-heading" className={cardClass}>
          <h2 id="loose-heading" className="text-lg font-semibold">
            {te.outsideSeason}
          </h2>
          <EventList events={looseEvents} t={t} locale={locale} />
        </section>
      )}

      <AddSection id="add-event" title={te.addEvent} defaultOpen={events.length === 0}>
        <EventForm seasons={seasons.map((s) => ({ id: s.id, label: s.name }))} tracks={tracks} />
      </AddSection>

      <AddSection id="add-season" title={te.addSeason} defaultOpen={seasons.length === 0}>
        <SeasonForm defaultYear={new Date().getFullYear() + (new Date().getMonth() >= 9 ? 1 : 0)} />
      </AddSection>
    </>
  );
}
