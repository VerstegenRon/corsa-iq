import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DeleteButton } from "@/components/delete-button";
import { EditOnly } from "@/components/edit-access";
import { cardClass, linkClass } from "@/components/ui";
import { getCurrentGarage } from "@/lib/garage";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { countryName, formatDate, formatLapTime, labelFor, type SetupValues } from "@/lib/karting";
import { findInsights } from "@/lib/setup-advisor";

import { ExplainButton } from "../../advice/explain-button";
import { InsightList, NoInsights } from "../../advice/insight-list";
import { deleteTrack } from "../../track-actions";
import { TrackForm } from "../track-form";
import { SetupComparison, type ComparedSession } from "./setup-comparison";

export const metadata: Metadata = {
  title: "Circuit — CorsaIQ",
};

/** The strongest findings on the circuit page; the advice page has the rest. */
const ADVICE_SHOWN = 5;

export default async function TrackPage({ params, searchParams }: PageProps<"/dashboard/tracks/[id]">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const weather = typeof query.weather === "string" ? query.weather : null;
  const kartId = typeof query.kart === "string" ? query.kart : null;
  const { supabase, garage } = await getCurrentGarage();
  const [t, locale] = await Promise.all([getDictionary(), getLocale()]);

  const [trackResult, eventsResult, sessionsResult] = await Promise.all([
    supabase.from("tracks").select("id, name, city, country, created_by_garage_id").eq("id", id).maybeSingle(),
    supabase
      .from("events")
      .select("id, name, type, starts_on, sessions(best_lap_ms)")
      .eq("track_id", id)
      .eq("garage_id", garage.id)
      .order("starts_on", { ascending: false }),
    supabase
      .from("sessions")
      .select("id, type, best_lap_ms, conditions, karts(id, name), setups(values), events!inner(name, starts_on, track_id, garage_id)")
      .eq("events.track_id", id)
      .eq("events.garage_id", garage.id)
      .not("best_lap_ms", "is", null),
  ]);
  const track = trackResult.data;
  // Another garage's own track is not shown, even though the catalogue is readable.
  if (!track || (track.created_by_garage_id !== null && track.created_by_garage_id !== garage.id)) notFound();

  const own = track.created_by_garage_id === garage.id;
  const events = (eventsResult.data ?? []).map((event) => {
    const laps = event.sessions.map((s) => s.best_lap_ms).filter((ms): ms is number => ms !== null);
    return { ...event, best: laps.length > 0 ? Math.min(...laps) : null };
  });
  const setupSessions: ComparedSession[] = (sessionsResult.data ?? []).map((s) => ({
    id: s.id,
    type: s.type,
    startsOn: s.events.starts_on,
    eventName: s.events.name,
    kart: s.karts,
    bestLapMs: s.best_lap_ms!,
    conditions: s.conditions as ComparedSession["conditions"],
    setup: (s.setups?.values ?? {}) as SetupValues,
  }));
  const insights = findInsights(setupSessions.map((s) => ({ ...s, trackId: track.id, trackName: track.name })));
  const showKart = new Set(setupSessions.map((s) => s.kart?.id)).size > 1;
  const bestEver = events.reduce<number | null>((best, e) => (e.best !== null && (best === null || e.best < best) ? e.best : best), null);

  return (
    <>
      <section>
        <Link href="/dashboard/tracks" className={`${linkClass} text-sm`}>
          ← Alle circuits
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">{track.name}</h1>
        <p className="mt-2 text-sm text-zinc-400">
          {[track.city, countryName(track.country)].filter(Boolean).join(" · ")}
          {own ? " · eigen circuit" : " · uit de catalogus"}
        </p>
      </section>

      <section aria-labelledby="events-heading" className={cardClass}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="events-heading" className="text-lg font-semibold">
            Jouw evenementen hier
          </h2>
          {bestEver !== null && (
            <p className="text-sm text-zinc-400">
              Snelste ronde <span className="font-semibold text-zinc-100 tabular-nums">{formatLapTime(bestEver)}</span>
            </p>
          )}
        </div>
        {events.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-400">
            Nog geen evenementen op dit circuit.{" "}
            <Link href="/dashboard/seasons" className={linkClass}>
              Evenement toevoegen
            </Link>
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-800/80">
            {events.map((event) => (
              <li key={event.id}>
                <Link
                  href={`/dashboard/events/${event.id}`}
                  className="flex flex-wrap items-baseline justify-between gap-2 py-2.5 text-sm hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
                >
                  <span>
                    <span className="font-medium text-zinc-100">{event.name}</span>
                    <span className="text-zinc-500">
                      {" "}
                      · {labelFor(t.options.eventTypes, event.type)} · {formatDate(event.starts_on)}
                    </span>
                  </span>
                  <span className="text-zinc-300 tabular-nums">{formatLapTime(event.best)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {setupSessions.length > 0 && (
        <section aria-labelledby="advice-heading" className={cardClass}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="advice-heading" className="text-lg font-semibold">
              Advies voor setup
            </h2>
            {insights.length > ADVICE_SHOWN && (
              <Link href={`/dashboard/advice?track=${track.id}`} className={`${linkClass} text-sm`}>
                Alle {insights.length} verbanden
              </Link>
            )}
          </div>
          {insights.length === 0 ? (
            <div className="mt-2">
              <NoInsights />
            </div>
          ) : (
            <>
              <div className="mt-2">
                <InsightList insights={insights.slice(0, ADVICE_SHOWN)} showTrack={false} showKart={showKart} />
              </div>
              <div className="mt-4">
                <ExplainButton trackId={track.id} />
              </div>
            </>
          )}
        </section>
      )}

      {setupSessions.length > 0 && <SetupComparison trackId={track.id} sessions={setupSessions} weather={weather} kartId={kartId} t={t} locale={locale} />}

      {own ? (
        <EditOnly>
          <section aria-labelledby="edit-heading" className={cardClass}>
            <h2 id="edit-heading" className="mb-6 text-lg font-semibold">
              Bewerken
            </h2>
            <TrackForm track={track} />
            <div className="mt-8 border-t border-zinc-800/80 pt-6">
              <DeleteButton action={deleteTrack.bind(null, track.id)} label="Circuit verwijderen" confirmText={`${track.name} verwijderen?`} />
              {events.length > 0 && (
                <p className="mt-2 text-xs text-zinc-500">Verwijderen kan pas als er geen evenementen meer op dit circuit staan.</p>
              )}
            </div>
          </section>
        </EditOnly>
      ) : (
        <p className="text-xs text-zinc-500">
          Circuits uit de catalogus zijn voor iedereen hetzelfde en kun je niet bewerken. Klopt er iets niet, laat het ons weten.
        </p>
      )}
    </>
  );
}
