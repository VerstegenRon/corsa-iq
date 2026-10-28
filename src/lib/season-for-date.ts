// Automatically booked costs (a part or gear purchase, a maintenance job) go on the season of the
// year they happened in, when the garage has one.

import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export async function seasonIdForDate(supabase: Supabase, garageId: string, date: string) {
  const { data: season } = await supabase
    .from("seasons")
    .select("id")
    .eq("garage_id", garageId)
    .eq("year", Number(date.slice(0, 4)))
    .order("created_at")
    .limit(1)
    .maybeSingle();
  return season?.id ?? null;
}
