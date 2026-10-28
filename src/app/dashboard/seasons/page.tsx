import type { Metadata } from "next";
import Link from "next/link";

import { AddSection } from "@/components/edit-section";
import { cardClass } from "@/components/ui";
import { getCurrentGarage } from "@/lib/garage";
import type { Dictionary } from "@/lib/i18n/dictionaries/nl";
import { getDictionary } from "@/lib/i18n/server";
import { formatCents, formatDate, labelFor, ownOrOfficial, trackLabel } from "@/lib/karting";

import { EventForm } from "./event-form";
import { SeasonForm } from "./season-form";

export const metadata: Metadata = {
  title: "Seizoen — CorsaIQ",
};

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

function EventList({ events, t }: { events: EventRow[]; t: Dictionary }) {
  if (events.length === 0) return <p className="mt-3 text-sm text-zinc-500">Nog geen evenementen.</p>;
  return (
    <ul className="mt-4 divide-y divide-zinc-800/80">
      {events.map((event) => (
        <li key={event.id}>
          <Link
            href={`/dashboard/events/${event.id}`}
            className="flex flex-wrap items-center justify-between gap-2 py-3 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
          >
            <span>
              <span className="block text-sm font-medium text-zinc-100">{event.name}</span>
              <span className="block text-xs text-zinc-500">
                {labelFor(t.options.eventTypes, event.type)} · {event.tracks ? trackLabel(event.tracks) : "Onbekend circuit"}
              </span>
            </span>
            <span className="text-right text-xs text-zinc-400">
              {formatDate(event.starts_on)}
              {event.ends_on && event.ends_on !== event.starts_on && ` – ${formatDate(event.ends_on)}`}
              <span className="block text-zinc-500">
                {event.sessions.length} {event.sessions.length === 1 ? "sessie" : "sessies"}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function SeasonsPage() {
  const { supabase, garage } = await getCurrentGarage();
  const t = await getDictionary();

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
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">Seizoen</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Je seizoenen met hun races en trainingen. Open een evenement om sessies en afstellingen vast te leggen.
        </p>
      </section>

      {seasons.map((season) => (
        <section key={season.id} aria-labelledby={`season-${season.id}`} className={cardClass}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id={`season-${season.id}`} className="text-lg font-semibold">
              {season.name}
              <Link
                href={`/dashboard/seasons/${season.id}`}
                className="ml-3 text-xs font-normal text-zinc-500 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
              >
                Bewerken
              </Link>
            </h2>
            <p className="text-xs text-zinc-500">{[season.class, season.championship].filter(Boolean).join(" · ")}</p>
          </div>
          <Link
            href={`/dashboard/costs?season=${season.id}`}
            className="mt-1 inline-block text-xs text-zinc-400 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
          >
            {formatCents(season.expenses.reduce((sum, e) => sum + e.amount_cents, 0))} uitgegeven
            {season.budget_cents !== null && ` van ${formatCents(season.budget_cents)} budget`}
          </Link>
          <EventList events={events.filter((event) => event.season_id === season.id)} t={t} />
        </section>
      ))}

      {looseEvents.length > 0 && (
        <section aria-labelledby="loose-heading" className={cardClass}>
          <h2 id="loose-heading" className="text-lg font-semibold">
            Buiten seizoen
          </h2>
          <EventList events={looseEvents} t={t} />
        </section>
      )}

      <AddSection title="Evenement toevoegen" defaultOpen={events.length === 0}>
        <EventForm seasons={seasons.map((s) => ({ id: s.id, label: s.name }))} tracks={tracks} />
      </AddSection>

      <AddSection title="Seizoen toevoegen" defaultOpen={seasons.length === 0}>
        <SeasonForm defaultYear={new Date().getFullYear() + (new Date().getMonth() >= 9 ? 1 : 0)} />
      </AddSection>
    </>
  );
}
