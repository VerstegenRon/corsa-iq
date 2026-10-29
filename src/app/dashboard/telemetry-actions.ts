"use server";

import { revalidatePath } from "next/cache";

import type { FormState } from "@/components/form-message";
import type { Json } from "@/lib/supabase/database.types";
import { getCurrentGarage } from "@/lib/garage";
import type { LapSource } from "@/lib/lap-import";
import { TELEMETRY_BUCKET } from "@/lib/storage";
import { CHANNELS, type Corner } from "@/lib/telemetry";

// ---------------------------------------------------------------------------
// Telemetry: the browser resamples the export and uploads one channel file per lap; this links them.
// ---------------------------------------------------------------------------

export type TelemetryUpload = {
  source: LapSource;
  channels: string[];
  laps: { lap_number: number; lap_time_ms: number; is_valid: boolean; max_speed_kmh: number | null; max_rpm: number | null; length_m: number; path: string }[];
};

const SOURCES: LapSource[] = ["aim", "alfano", "unipro", "csv"];
/** A lap from a lap-time import and the same lap in the telemetry: the lap times agree within this. */
const MATCH_MS = 100;

function validUpload(input: TelemetryUpload, prefix: string): boolean {
  if (!input || !Array.isArray(input.laps) || input.laps.length === 0 || input.laps.length > 200) return false;
  if (!Array.isArray(input.channels) || !input.channels.every((c) => c in CHANNELS)) return false;
  return input.laps.every(
    (lap) =>
      Number.isInteger(lap.lap_number) &&
      lap.lap_number >= 0 &&
      Number.isInteger(lap.lap_time_ms) &&
      lap.lap_time_ms > 0 &&
      typeof lap.is_valid === "boolean" &&
      Number.isFinite(lap.length_m) &&
      lap.length_m > 0 &&
      typeof lap.path === "string" &&
      lap.path.startsWith(prefix) &&
      /^[\w-]+\.json$/.test(lap.path.slice(prefix.length)),
  );
}

export async function saveTelemetry(sessionId: string, input: TelemetryUpload): Promise<FormState> {
  const { supabase, garage } = await getCurrentGarage();
  const prefix = `${garage.id}/${sessionId}/`;
  if (!validUpload(input, prefix)) return { error: "De telemetrie kon niet gekoppeld worden. Probeer het opnieuw." };

  const { data: session } = await supabase
    .from("sessions")
    .select("id, laps!laps_session_id_fkey(id, lap_number, lap_time_ms, lap_channels(storage_path)), events!inner(garage_id)")
    .eq("id", sessionId)
    .eq("events.garage_id", garage.id)
    .maybeSingle();
  if (!session) return { error: "Sessie niet gevonden." };

  const { data: dataImport, error: importError } = await supabase
    .from("data_imports")
    .insert({
      garage_id: garage.id,
      source: SOURCES.find((s) => s === input.source) ?? "csv",
      file_format: "csv",
      status: "parsed",
      telemetry_path: prefix,
      channel_summary: { laps: input.laps.length, channels: input.channels, telemetry: true },
    })
    .select("id")
    .single();
  if (importError) return { error: `Opslaan mislukt: ${importError.message}` };

  // No laps yet: the telemetry brings them. Otherwise link to the laps already there, by number and time.
  let laps = session.laps;
  if (laps.length === 0) {
    const { error } = await supabase.rpc("replace_session_laps", {
      p_session_id: sessionId,
      p_data_import_id: dataImport.id,
      p_laps: input.laps.map((lap) => ({
        lap_number: lap.lap_number,
        lap_time_ms: lap.lap_time_ms,
        is_valid: lap.is_valid,
        is_pit_lap: false,
        max_speed_kmh: lap.max_speed_kmh,
        max_rpm: lap.max_rpm,
        sectors_ms: [],
      })) as unknown as Json,
    });
    if (error) {
      await supabase.from("data_imports").update({ status: "failed", error: error.message }).eq("id", dataImport.id);
      return { error: `Ronden opslaan mislukt: ${error.message}` };
    }
    const { data } = await supabase.from("laps").select("id, lap_number, lap_time_ms, lap_channels(storage_path)").eq("session_id", sessionId);
    laps = data ?? [];
  }

  const rows = input.laps.flatMap((lap) => {
    const match = laps.find((l) => l.lap_number === lap.lap_number && Math.abs(l.lap_time_ms - lap.lap_time_ms) <= MATCH_MS);
    return match
      ? [{ lap_id: match.id, garage_id: garage.id, storage_path: lap.path, sample_m: 2.5, length_m: Math.round(lap.length_m * 10) / 10, channels: input.channels }]
      : [];
  });
  if (rows.length === 0) {
    await supabase.from("data_imports").update({ status: "needs_mapping", error: "no matching laps" }).eq("id", dataImport.id);
    return { error: "Geen enkele ronde komt overeen met de ronden van deze sessie. Controleer of het bestand bij deze sessie hoort." };
  }

  const { error } = await supabase.from("lap_channels").upsert(rows, { onConflict: "lap_id" });
  if (error) return { error: `Telemetrie koppelen mislukt: ${error.message}` };

  // Files of an earlier import of this session are no longer used.
  const kept = new Set(rows.map((r) => r.storage_path));
  const stale = laps.flatMap((l) => (l.lap_channels ? [l.lap_channels.storage_path] : [])).filter((p) => !kept.has(p));
  const unused = input.laps.map((l) => l.path).filter((p) => !kept.has(p));
  if (stale.length + unused.length > 0) await supabase.storage.from(TELEMETRY_BUCKET).remove([...stale, ...unused]);

  revalidatePath("/dashboard", "layout");
  const skipped = input.laps.length - rows.length;
  return {
    success: `Telemetrie van ${rows.length} ${rows.length === 1 ? "ronde" : "ronden"} opgeslagen.${skipped > 0 ? ` ${skipped} niet herkend en overgeslagen.` : ""}`,
  };
}

/** The lap this session is compared against by default. */
export async function setReferenceLap(sessionId: string, lapId: number | null): Promise<FormState> {
  const { supabase, garage } = await getCurrentGarage();
  if (lapId !== null) {
    const { data: lap } = await supabase.from("lap_channels").select("lap_id").eq("lap_id", lapId).eq("garage_id", garage.id).maybeSingle();
    if (!lap) return { error: "Die ronde heeft geen telemetrie." };
  }
  const { error } = await supabase.from("sessions").update({ reference_lap_id: lapId }).eq("id", sessionId);
  if (error) return { error: `Opslaan mislukt: ${error.message}` };
  revalidatePath(`/dashboard/sessions/${sessionId}/analyse`);
  return { success: lapId === null ? "Referentie losgelaten." : "Referentie vastgezet." };
}

/** Stores the corners found in the reference lap for the session's layout, so names and positions stay. */
export async function saveCorners(sessionId: string, layoutId: string, corners: Corner[]): Promise<FormState> {
  if (!Array.isArray(corners) || corners.length === 0 || corners.length > 40) return { error: "Geen bochten om op te slaan." };
  const valid = corners.every(
    (c) => Number.isInteger(c.number) && c.number > 0 && [c.start_m, c.apex_m, c.end_m].every(Number.isFinite) && c.start_m <= c.apex_m && c.apex_m <= c.end_m,
  );
  if (!valid) return { error: "De bochten kloppen niet." };
  const { supabase, garage } = await getCurrentGarage();
  const { error } = await supabase.from("track_layout_corners").upsert(
    corners.map((c) => ({
      garage_id: garage.id,
      track_layout_id: layoutId,
      number: c.number,
      name: c.name?.slice(0, 40) || null,
      apex_m: c.apex_m,
      start_m: c.start_m,
      end_m: c.end_m,
    })),
    { onConflict: "garage_id,track_layout_id,number" },
  );
  if (error) return { error: `Bochten opslaan mislukt: ${error.message}` };
  revalidatePath(`/dashboard/sessions/${sessionId}/analyse`);
  return { success: `${corners.length} bochten vastgelegd.` };
}
