import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DeleteButton } from "@/components/delete-button";
import { cardClass, linkClass } from "@/components/ui";
import { getCurrentGarage } from "@/lib/garage";
import { getDictionary } from "@/lib/i18n/server";
import { countryName, formatDate, formatLapTime, labelFor } from "@/lib/karting";

import { deleteTrack } from "../../track-actions";
import { TrackForm } from "../track-form";

export const metadata: Metadata = {
  title: "Circuit — CorsaIQ",
};

export default async function TrackPage({ params }: PageProps<"/dashboard/tracks/[id]">) {
  const { id } = await params;
  const { supabase, garage } = await getCurrentGarage();
  const t = await getDictionary();

  const [trackResult, eventsResult] = await Promise.all([
    supabase.from("tracks").select("id, name, city, country, created_by_garage_id").eq("id", id).maybeSingle(),
    supabase
      .from("events")
      .select("id, name, type, starts_on, sessions(best_lap_ms)")
      .eq("track_id", id)
      .eq("garage_id", garage.id)
      .order("starts_on", { ascending: false }),
  ]);
  const track = trackResult.data;
  // Another garage's own track is not shown, even though the catalogue is readable.
  if (!track || (track.created_by_garage_id !== null && track.created_by_garage_id !== garage.id)) notFound();

  const own = track.created_by_garage_id === garage.id;
  const events = (eventsResult.data ?? []).map((event) => {
    const laps = event.sessions.map((s) => s.best_lap_ms).filter((ms): ms is number => ms !== null);
    return { ...event, best: laps.length > 0 ? Math.min(...laps) : null };
  });
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

      {own ? (
        <section aria-labelledby="edit-heading" className={cardClass}>
          <h2 id="edit-heading" className="mb-6 text-lg font-semibold">
            Bewerken
          </h2>
          <TrackForm track={track} />
          <div className="mt-8 border-t border-zinc-800/80 pt-6">
            <DeleteButton
              action={deleteTrack.bind(null, track.id)}
              label="Circuit verwijderen"
              confirmText={`${track.name} verwijderen?`}
            />
            {events.length > 0 && (
              <p className="mt-2 text-xs text-zinc-500">Verwijderen kan pas als er geen evenementen meer op dit circuit staan.</p>
            )}
          </div>
        </section>
      ) : (
        <p className="text-xs text-zinc-500">
          Circuits uit de catalogus zijn voor iedereen hetzelfde en kun je niet bewerken. Klopt er iets niet, laat het ons weten.
        </p>
      )}
    </>
  );
}
