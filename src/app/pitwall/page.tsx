import type { Metadata } from "next";

import { getCurrentGarage } from "@/lib/garage";
import { formatDate, sortByLabel, todayInAmsterdam, type SetupValues } from "@/lib/karting";

import { Pitwall, type KartDefaults, type PitwallEvent } from "./pitwall";

export const metadata: Metadata = {
  title: "Pitwall — CorsaIQ",
};

/**
 * The trackside screen: log a session in seconds with big buttons. It works offline too: the
 * service worker keeps this page, and sessions wait on the phone until there is signal.
 */
export default async function PitwallPage() {
  const { supabase, garage } = await getCurrentGarage();
  const today = todayInAmsterdam();

  const [eventsResult, kartsResult, driversResult, sessionsResult] = await Promise.all([
    supabase
      .from("events")
      .select("id, name, starts_on, ends_on, tracks(name)")
      .eq("garage_id", garage.id)
      .order("starts_on", { ascending: false })
      .limit(20),
    supabase.from("karts").select("id, name").eq("garage_id", garage.id).in("status", ["active", "spare"]).order("created_at"),
    supabase.from("drivers").select("id, name").eq("garage_id", garage.id).order("created_at"),
    // The latest sessions give each kart its usual driver, duration and setup.
    supabase
      .from("sessions")
      .select("kart_id, driver_id, type, duration_s, setups(values), events!inner(garage_id)")
      .eq("events.garage_id", garage.id)
      .order("started_at", { ascending: false })
      .limit(50),
  ]);
  if (eventsResult.error) throw new Error(eventsResult.error.message);

  const events: PitwallEvent[] = eventsResult.data.map((event) => ({
    id: event.id,
    label: `${event.name} · ${formatDate(event.starts_on)}${event.tracks ? ` · ${event.tracks.name}` : ""}`,
    isToday: event.starts_on <= today && (event.ends_on ?? event.starts_on) >= today,
  }));
  // Today's event first, else the nearest upcoming one, else the most recent one.
  const upcoming = eventsResult.data.filter((event) => event.starts_on >= today).at(-1);
  const defaultEventId = events.find((event) => event.isToday)?.id ?? upcoming?.id ?? events[0]?.id ?? null;

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

  return (
    <Pitwall
      events={events}
      defaultEventId={defaultEventId}
      karts={sortByLabel((kartsResult.data ?? []).map((kart) => ({ id: kart.id, label: kart.name })))}
      drivers={sortByLabel((driversResult.data ?? []).map((driver) => ({ id: driver.id, label: driver.name })))}
      defaults={defaults}
      lastType={lastType}
    />
  );
}
