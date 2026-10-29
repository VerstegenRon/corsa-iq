import type { Metadata } from "next";

import { getCurrentGarage } from "@/lib/garage";

import { PitboardScreen, type BoardSession } from "./pitboard-screen";

export const metadata: Metadata = {
  title: "Pitbord — CorsaIQ",
};

/** The digital pit board: one message and the live gap, big enough to read from the kart. */
export default async function PitboardPage() {
  const { supabase, garage } = await getCurrentGarage();
  const [{ data: message }, { data: running }] = await Promise.all([
    supabase.from("pit_messages").select("id, text").eq("garage_id", garage.id).is("cleared_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase
      .from("live_sessions")
      .select("id, label, planned_laps, karts(name), laps(lap_time_ms), live_laps(lap_number, lap_time_ms, position, gap_to_p1_ms, is_pit_lap)")
      .eq("garage_id", garage.id)
      .is("ended_at", null)
      .order("started_at", { ascending: false }),
  ]);

  const sessions: BoardSession[] = (running ?? []).map((s) => ({
    id: s.id,
    label: s.label,
    plannedLaps: s.planned_laps,
    kartName: s.karts?.name ?? "",
    referenceMs: s.laps?.lap_time_ms ?? null,
    laps: s.live_laps,
  }));

  return <PitboardScreen garageId={garage.id} initialMessage={message ?? null} initialSessions={sessions} />;
}
