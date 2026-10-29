import type { SetupValues } from "@/lib/karting";
import { buildTree, type Version } from "@/lib/setup-tree";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * The setup tree of one kart, plus the karts that have one, for the setup page and the pre-start
 * checklist. Without that kart (or with one that never ran a setup) it is the kart that ran a setup
 * most recently, unless `fallback` is off.
 */
export async function loadSetupTree(
  supabase: Supabase,
  garageId: string,
  kartId?: string | null,
  { fallback = true }: { fallback?: boolean } = {},
): Promise<{ karts: [string, string][]; kartId: string | null; versions: Version[]; trackName: string | null }> {
  const [sessionsResult, setupsResult] = await Promise.all([
    supabase
      .from("sessions")
      .select("id, type, started_at, best_lap_ms, conditions, setup_id, karts(id, name), events!inner(name, garage_id, tracks(name))")
      .eq("events.garage_id", garageId)
      .not("setup_id", "is", null)
      .order("started_at", { ascending: false }),
    supabase.from("setups").select("id, parent_setup_id, values, created_at").eq("garage_id", garageId),
  ]);
  const sessions = sessionsResult.data ?? [];
  const karts = [...new Map(sessions.flatMap((s) => (s.karts ? [[s.karts.id, s.karts.name] as const] : []))).entries()];
  const chosen = karts.find(([id]) => id === kartId)?.[0] ?? (fallback ? (karts[0]?.[0] ?? null) : null);
  const own = sessions.filter((s) => s.karts?.id === chosen);

  // The kart's setups and the ones they were derived from.
  const all = new Map((setupsResult.data ?? []).map((s) => [s.id, s]));
  const ids = new Set<string>();
  for (const s of own) {
    for (let id: string | null = s.setup_id; id && !ids.has(id); id = all.get(id)?.parent_setup_id ?? null) ids.add(id);
  }
  const versions = buildTree(
    [...ids].flatMap((id) => {
      const s = all.get(id);
      return s ? [{ id: s.id, parentId: s.parent_setup_id, createdAt: s.created_at, values: (s.values ?? {}) as SetupValues }] : [];
    }),
    own.map((s) => ({
      id: s.id,
      setupId: s.setup_id!,
      type: s.type,
      startedAt: s.started_at,
      bestLapMs: s.best_lap_ms,
      wet: (s.conditions as { weather?: string } | null)?.weather === "wet",
      eventName: s.events.name,
      trackName: s.events.tracks?.name ?? null,
    })),
  );
  return { karts, kartId: chosen, versions, trackName: own[0]?.events.tracks?.name ?? null };
}
