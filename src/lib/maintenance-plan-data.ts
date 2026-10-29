import { planMaintenance, type PlanPart } from "@/lib/maintenance-plan";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** How far ahead the plan looks. */
const UPCOMING_EVENTS = 20;

/** The maintenance plan of the garage, from its karts, fitted parts and upcoming events. */
export async function loadMaintenancePlan(supabase: Supabase, garageId: string, today: string) {
  const [karts, parts, events] = await Promise.all([
    supabase
      .from("karts")
      .select(
        "id, name, status, usage_limit_minutes, component_limits, sessions(event_id, started_at, duration_s), maintenance_records(performed_on, resets_usage, components)",
      )
      .eq("garage_id", garageId)
      .in("status", ["active", "spare"]),
    supabase
      .from("parts")
      .select(
        "id, category, brand, model, usage_limit_minutes, component_limits, part_installations(kart_id, removed_at), session_parts(sessions(started_at, duration_s)), maintenance_records(performed_on, resets_usage, components)",
      )
      .eq("garage_id", garageId)
      .eq("status", "installed"),
    supabase
      .from("events")
      .select("id, name, starts_on, ends_on")
      .eq("garage_id", garageId)
      .or(`starts_on.gte.${today},ends_on.gte.${today}`)
      .order("starts_on")
      .limit(UPCOMING_EVENTS),
  ]);
  for (const result of [karts, parts, events]) if (result.error) throw new Error(result.error.message);

  return planMaintenance({
    karts: karts.data!,
    parts: parts.data!.map(
      (p): PlanPart => ({
        ...p,
        kart_id: p.part_installations.find((i) => i.removed_at === null)?.kart_id ?? null,
        sessions: p.session_parts.flatMap((sp) => (sp.sessions ? [sp.sessions] : [])),
      }),
    ),
    events: events.data!,
    today,
  });
}
