import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentGarage } from "@/lib/garage";
import { formatDate, ownOrOfficial, sortByLabel, todayInAmsterdam, trackLabel, type SetupValues } from "@/lib/karting";

import { Pitwall, type KartDefaults, type PitwallEvent, type PitwallSession } from "./pitwall";

export const metadata: Metadata = {
  title: "Pitwall — CorsaIQ",
};

/**
 * The trackside screen: log a session in seconds with big buttons. It works offline too: the
 * service worker keeps this page, and sessions wait on the phone until there is signal.
 */
export default async function PitwallPage() {
  const { supabase, garage, canEdit } = await getCurrentGarage();
  // Logging only: a viewer has nothing to do here, Live shows the same sessions.
  if (!canEdit) redirect("/dashboard/live");
  const today = todayInAmsterdam();

  const [eventsResult, kartsResult, driversResult, sessionsResult, tracksResult] = await Promise.all([
    supabase
      .from("events")
      .select("id, name, starts_on, ends_on, track_id, tracks(name)")
      .eq("garage_id", garage.id)
      .order("starts_on", { ascending: false })
      .limit(20),
    supabase.from("karts").select("id, name").eq("garage_id", garage.id).in("status", ["active", "spare"]).order("created_at"),
    supabase.from("drivers").select("id, name").eq("garage_id", garage.id).order("created_at"),
    // The latest sessions give each kart its usual driver, duration and setup, and the day so far.
    supabase
      .from("sessions")
      .select("id, event_id, started_at, best_lap_ms, kart_id, driver_id, type, duration_s, setups(values), events!inner(garage_id)")
      .eq("events.garage_id", garage.id)
      .order("started_at", { ascending: false })
      .limit(50),
    supabase.from("tracks").select("id, name, city, country, latitude, longitude").or(ownOrOfficial(garage.id)),
  ]);
  if (eventsResult.error) throw new Error(eventsResult.error.message);

  const events: PitwallEvent[] = eventsResult.data.map((event) => ({
    id: event.id,
    label: `${event.name} · ${formatDate(event.starts_on)}${event.tracks ? ` · ${event.tracks.name}` : ""}`,
    isToday: event.starts_on <= today && (event.ends_on ?? event.starts_on) >= today,
  }));
  // Today's event; without one the pitwall starts a new event for today.
  const defaultEventId = events.find((event) => event.isToday)?.id ?? null;

  const defaults: Record<string, KartDefaults> = {};
  let lastType: string | null = null;
  for (const session of sessionsResult.data ?? []) {
    lastType ??= session.type;
    defaults[session.kart_id] ??= {
      driverId: session.driver_id,
      durationMin: session.duration_s ? Math.round(session.duration_s / 60) : null,
      setup: null,
    };
    // The newest session with a setup gives the setup, even when a later one had none.
    if (!defaults[session.kart_id].setup && session.setups) defaults[session.kart_id].setup = session.setups.values as SetupValues;
  }

  const history: PitwallSession[] = (sessionsResult.data ?? []).map((session) => ({
    id: session.id,
    eventId: session.event_id,
    kartId: session.kart_id,
    startedAt: session.started_at,
    bestLapMs: session.best_lap_ms,
    setup: (session.setups?.values ?? null) as SetupValues | null,
  }));

  return (
    <Pitwall
      history={history}
      events={events}
      defaultEventId={defaultEventId}
      karts={sortByLabel((kartsResult.data ?? []).map((kart) => ({ id: kart.id, label: kart.name })))}
      drivers={sortByLabel((driversResult.data ?? []).map((driver) => ({ id: driver.id, label: driver.name })))}
      defaults={defaults}
      lastType={lastType}
      tracks={sortByLabel(
        (tracksResult.data ?? []).map((track) => ({
          id: track.id,
          label: trackLabel(track),
          name: track.name,
          latitude: track.latitude,
          longitude: track.longitude,
        })),
      )}
      lastTrackId={eventsResult.data[0]?.track_id ?? null}
      today={today}
    />
  );
}
