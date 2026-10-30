"use server";

import { revalidatePath } from "next/cache";

import type { FormState } from "@/components/form-message";
import type { Json } from "@/lib/supabase/database.types";
import { dbErrorText } from "@/lib/db-error";
import { readQuickTags } from "@/lib/feedback";
import { getCurrentGarage } from "@/lib/garage";
import { format } from "@/lib/i18n/locales";
import { getDictionary } from "@/lib/i18n/server";
import { countingLiveLaps, ENGINE_RANGES, type EngineChannel, type LiveLap } from "@/lib/live";
import { sessionLabel } from "@/lib/prestart";
import { SETUP_FIELDS } from "@/lib/setup";
import { lockedError } from "@/lib/plan-access";

import { text } from "./form-data";
import { insertSession, saveDebrief } from "./session-save";

// ---------------------------------------------------------------------------
// Live: start a session, record laps from the pit stopwatch, the pitbord, and close it into a session.
// ---------------------------------------------------------------------------

const SESSION_TYPES = ["practice", "qualifying", "heat", "prefinal", "final", "test"];
/** Closing keeps the kart's setup as it was: Live does not change it. */
const KEEP_ALL_SETUP = [...SETUP_FIELDS.map((f) => f.name), "setup_notes"];

const texts = async () => (await getDictionary()).raceDay.live.errors;
const failed = async (template: string, error: { message: string; code?: string }) => format(template, { error: await dbErrorText(error) });

async function ownLive(id: string) {
  const { supabase, garage, user } = await getCurrentGarage();
  const { data: live } = await supabase
    .from("live_sessions")
    .select("id, event_id, kart_id, driver_id, session_type, started_at, ended_at, reference_lap_id, session_id")
    .eq("id", id)
    .eq("garage_id", garage.id)
    .maybeSingle();
  return { supabase, garage, user, live };
}

export async function startLive(input: {
  eventId: string;
  kartId: string;
  driverId: string;
  type: string;
  plannedLaps: number | null;
  referenceLapId: number | null;
}): Promise<FormState & { id?: string }> {
  const locked = await lockedError("live");
  if (locked) return { error: locked };
  const te = await texts();
  if (!SESSION_TYPES.includes(input.type)) return { error: te.chooseType };
  if (input.plannedLaps !== null && (!Number.isInteger(input.plannedLaps) || input.plannedLaps < 1 || input.plannedLaps > 200)) {
    return { error: te.plannedRange };
  }
  const { supabase, garage } = await getCurrentGarage();

  const { data: running } = await supabase
    .from("live_sessions")
    .select("id")
    .eq("garage_id", garage.id)
    .eq("kart_id", input.kartId)
    .is("ended_at", null)
    .maybeSingle();
  if (running) return { error: te.alreadyRunning, id: running.id };

  // "Q2" when one qualifying was already driven or followed live today.
  const [{ count: driven }, { count: followed }] = await Promise.all([
    supabase
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .eq("event_id", input.eventId)
      .eq("kart_id", input.kartId)
      .eq("type", input.type),
    supabase
      .from("live_sessions")
      .select("id", { count: "exact", head: true })
      .eq("event_id", input.eventId)
      .eq("kart_id", input.kartId)
      .eq("session_type", input.type)
      .is("session_id", null),
  ]);
  if (input.referenceLapId !== null) {
    const { data: lap } = await supabase
      .from("laps")
      .select("id, sessions!laps_session_id_fkey!inner(events!inner(garage_id))")
      .eq("id", input.referenceLapId)
      .eq("sessions.events.garage_id", garage.id)
      .maybeSingle();
    if (!lap) return { error: te.noReferenceLap };
  }

  const { data, error } = await supabase
    .from("live_sessions")
    .insert({
      garage_id: garage.id,
      event_id: input.eventId,
      kart_id: input.kartId,
      driver_id: input.driverId,
      session_type: input.type,
      label: sessionLabel(input.type, (driven ?? 0) + (followed ?? 0)),
      planned_laps: input.plannedLaps,
      reference_lap_id: input.referenceLapId,
    })
    .select("id")
    .single();
  if (error) return { error: await failed(te.startFailed, error) };
  revalidatePath("/dashboard/live");
  return { success: te.started, id: data.id };
}

/** One passage of the pit stopwatch. Sending the same lap twice (after a lost connection) saves it once. */
export async function recordLap(
  liveId: string,
  lap: { lap_number: number; lap_time_ms: number; sectors_ms: number[] },
): Promise<FormState & { id?: number }> {
  const locked = await lockedError("live");
  if (locked) return { error: locked };
  const te = await texts();
  if (!Number.isInteger(lap.lap_number) || lap.lap_number < 0 || lap.lap_number > 500) return { error: te.unknownLap };
  if (!Number.isInteger(lap.lap_time_ms) || lap.lap_time_ms < 5_000 || lap.lap_time_ms > 30 * 60_000)
    return { error: te.impossibleLap };
  if (!Array.isArray(lap.sectors_ms) || lap.sectors_ms.length > 6 || !lap.sectors_ms.every((s) => Number.isInteger(s) && s > 0)) {
    return { error: te.badSectors };
  }
  const { supabase, garage, live } = await ownLive(liveId);
  if (!live || live.ended_at) return { error: te.closed };
  const { data, error } = await supabase
    .from("live_laps")
    .upsert(
      { live_session_id: liveId, garage_id: garage.id, lap_number: lap.lap_number, lap_time_ms: lap.lap_time_ms, sectors_ms: lap.sectors_ms },
      { onConflict: "live_session_id,lap_number", ignoreDuplicates: true },
    )
    .select("id");
  if (error) return { error: await failed(te.lapFailed, error) };
  return { id: data[0]?.id };
}

const NUMBER_FIELDS: (EngineChannel | "position" | "gap_to_p1_ms" | "max_speed_kmh")[] = [
  "position",
  "gap_to_p1_ms",
  "max_speed_kmh",
  ...(Object.keys(ENGINE_RANGES) as EngineChannel[]),
];

/** Position, gap to P1, top speed or an engine value read from the dash, or marking a pit lap. */
export async function updateLap(
  liveId: string,
  lapNumber: number,
  patch: Partial<Pick<LiveLap, "position" | "gap_to_p1_ms" | "max_speed_kmh" | EngineChannel | "is_pit_lap">>,
): Promise<FormState> {
  const locked = await lockedError("live");
  if (locked) return { error: locked };
  const te = await texts();
  const clean: Partial<Record<(typeof NUMBER_FIELDS)[number], number | null> & { is_pit_lap: boolean }> = {};
  for (const key of NUMBER_FIELDS) {
    if (!(key in patch)) continue;
    const value = patch[key];
    if (value !== null && (typeof value !== "number" || !Number.isFinite(value) || Math.abs(value) > 1_000_000))
      return { error: te.enterNumber };
    if (key === "position" && value !== null && (!Number.isInteger(value) || value < 1 || value > 99)) return { error: te.positionRange };
    clean[key] =
      value === null ? null : key === "position" || key === "gap_to_p1_ms" || key === "max_rpm" ? Math.round(value) : Math.round(value * 10) / 10;
  }
  if (typeof patch.is_pit_lap === "boolean") clean.is_pit_lap = patch.is_pit_lap;
  if (Object.keys(clean).length === 0) return {};
  const { supabase, live } = await ownLive(liveId);
  if (!live || live.ended_at) return { error: te.closed };
  const { error } = await supabase.from("live_laps").update(clean).eq("live_session_id", liveId).eq("lap_number", lapNumber);
  if (error) return { error: await failed(te.saveFailed, error) };
  return {};
}

/** A wrong tap on the stopwatch: the lap goes; the time of the lap after it is not changed. */
export async function deleteLap(liveId: string, lapNumber: number): Promise<FormState> {
  const te = await texts();
  const { supabase, live } = await ownLive(liveId);
  if (!live || live.ended_at) return { error: te.closed };
  const { error } = await supabase.from("live_laps").delete().eq("live_session_id", liveId).eq("lap_number", lapNumber);
  if (error) return { error: await failed(te.deleteFailed, error) };
  return {};
}

// ---------------------------------------------------------------------------
// Pitbord
// ---------------------------------------------------------------------------

export async function sendPitMessage(liveId: string | null, message: string): Promise<FormState> {
  const locked = await lockedError("pitboard");
  if (locked) return { error: locked };
  const te = await texts();
  const value = message.trim().replace(/\s+/g, " ");
  if (value.length === 0) return { error: te.typeMessage };
  if (value.length > 80) return { error: te.messageTooLong };
  const { supabase, garage } = await getCurrentGarage();
  // One message on the board at a time: a new one replaces the last.
  await supabase.from("pit_messages").update({ cleared_at: new Date().toISOString() }).eq("garage_id", garage.id).is("cleared_at", null);
  const { error } = await supabase.from("pit_messages").insert({ garage_id: garage.id, live_session_id: liveId, text: value });
  if (error) return { error: await failed(te.sendFailed, error) };
  revalidatePath("/pitbord");
  return { success: te.sent };
}

export async function clearPitMessages(): Promise<FormState> {
  const locked = await lockedError("pitboard");
  if (locked) return { error: locked };
  const te = await texts();
  const { supabase, garage } = await getCurrentGarage();
  const { error } = await supabase
    .from("pit_messages")
    .update({ cleared_at: new Date().toISOString() })
    .eq("garage_id", garage.id)
    .is("cleared_at", null);
  if (error) return { error: await failed(te.clearFailed, error) };
  revalidatePath("/pitbord");
  return { success: te.cleared };
}

// ---------------------------------------------------------------------------
// Closing
// ---------------------------------------------------------------------------

/**
 * Ends the live session: it becomes an ordinary session with its laps, the reference and the debrief,
 * so Analyse, the setup tree and the run time of the parts take it from here.
 */
export async function endLive(liveId: string, _prev: FormState, formData: FormData): Promise<FormState & { sessionId?: string }> {
  const te = await texts();
  const { supabase, garage, live } = await ownLive(liveId);
  if (!live) return { error: te.gone };
  if (live.session_id) return { success: te.alreadyClosed, sessionId: live.session_id };

  const { data: laps } = await supabase
    .from("live_laps")
    .select("lap_number, lap_time_ms, sectors_ms, position, gap_to_p1_ms, max_speed_kmh, max_water_temp_c, max_egt_c, max_rpm, is_pit_lap")
    .eq("live_session_id", liveId)
    .order("lap_number");
  const liveLaps = (laps ?? []) as LiveLap[];
  if (liveLaps.length === 0) return { error: te.noLaps };

  const endedAt = new Date();
  const minutes = Math.max(1, Math.round((endedAt.getTime() - Date.parse(live.started_at)) / 60_000));
  const lastPosition = [...liveLaps].reverse().find((l) => l.position !== null)?.position ?? null;
  const fields = new FormData();
  fields.set("kart_id", live.kart_id);
  fields.set("type", live.session_type);
  fields.set("driver_id", live.driver_id);
  fields.set("started_at_iso", live.started_at);
  fields.set("duration_min", String(minutes));
  if (lastPosition !== null) fields.set("position", String(lastPosition));

  const saved = await insertSession(supabase, garage.id, live.event_id, fields, { keepSetupFields: KEEP_ALL_SETUP });
  if (saved.error || !saved.id) return { error: saved.error ?? te.sessionFailed };
  const sessionId = saved.id;

  const counting = new Set(countingLiveLaps(liveLaps).map((l) => l.lap_number));
  const { error: lapsError } = await supabase.rpc("replace_session_laps", {
    p_session_id: sessionId,
    p_data_import_id: null as unknown as string,
    p_laps: liveLaps.map((l) => ({
      lap_number: l.lap_number,
      lap_time_ms: l.lap_time_ms,
      is_valid: counting.has(l.lap_number),
      is_pit_lap: l.is_pit_lap,
      max_speed_kmh: l.max_speed_kmh,
      max_rpm: l.max_rpm,
      sectors_ms: l.sectors_ms,
    })) as unknown as Json,
  });
  if (lapsError) return { error: format(te.lapsNotSaved, { error: lapsError.message }), sessionId };

  // The engine temperatures are not part of the lap import; set them per lap.
  for (const l of liveLaps.filter((lap) => lap.max_water_temp_c !== null || lap.max_egt_c !== null)) {
    await supabase
      .from("laps")
      .update({ max_water_temp_c: l.max_water_temp_c, max_egt_c: l.max_egt_c })
      .eq("session_id", sessionId)
      .eq("lap_number", l.lap_number);
  }

  await Promise.all([
    live.reference_lap_id ? supabase.from("sessions").update({ reference_lap_id: live.reference_lap_id }).eq("id", sessionId) : null,
    supabase.from("live_sessions").update({ ended_at: endedAt.toISOString(), session_id: sessionId }).eq("id", liveId),
    supabase.from("pit_messages").update({ cleared_at: endedAt.toISOString() }).eq("live_session_id", liveId).is("cleared_at", null),
  ]);

  const feedback = text(formData, "driver_feedback");
  const quick = readQuickTags(formData.getAll("quick"));
  if (feedback || quick.length > 0) await saveDebrief(supabase, garage.id, sessionId, feedback, quick);

  revalidatePath("/dashboard", "layout");
  return { success: te.sessionSaved, sessionId };
}

/** A live session that was started by mistake. Only before it is closed into a session. */
export async function discardLive(liveId: string): Promise<FormState> {
  const te = await texts();
  const { supabase, live } = await ownLive(liveId);
  if (!live) return { error: te.gone };
  if (live.session_id) return { error: te.alreadySession };
  const { error } = await supabase.from("live_sessions").delete().eq("id", liveId);
  if (error) return { error: await failed(te.deleteFailed, error) };
  revalidatePath("/dashboard/live");
  return { success: te.discarded };
}
