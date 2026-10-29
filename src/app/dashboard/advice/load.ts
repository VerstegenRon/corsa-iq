import type { SetupValues } from "@/lib/karting";
import type { AdvisorSession } from "@/lib/setup-advisor";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Every session of the garage with a lap time and a setup, optionally on one circuit only. */
export async function loadAdvisorSessions(supabase: Supabase, garageId: string, trackId?: string | null): Promise<AdvisorSession[]> {
  let query = supabase
    .from("sessions")
    .select("id, best_lap_ms, conditions, karts(id, name), setups!inner(values), events!inner(track_id, garage_id, tracks(name))")
    .eq("events.garage_id", garageId)
    .not("best_lap_ms", "is", null);
  if (trackId) query = query.eq("events.track_id", trackId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return data.map((s) => ({
    id: s.id,
    trackId: s.events.track_id,
    trackName: s.events.tracks?.name ?? "Onbekend circuit",
    kart: s.karts,
    bestLapMs: s.best_lap_ms!,
    conditions: (s.conditions ?? {}) as AdvisorSession["conditions"],
    setup: (s.setups?.values ?? {}) as SetupValues,
  }));
}
