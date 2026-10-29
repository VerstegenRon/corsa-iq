// Reading and saving a session, shared by the session form (Server Actions) and the pitwall, which
// sends its queued sessions to a route handler once there is signal again.

import { revalidatePath } from "next/cache";

import type { FormState } from "@/components/form-message";
import type { Json } from "@/lib/supabase/database.types";
import { EMPTY_TAGS, parseFeedbackTags, type QuickTag } from "@/lib/feedback";
import { tagFeedback } from "@/lib/feedback-tagger";
import type { getCurrentGarage } from "@/lib/garage";
import { SESSION_TYPES, WEATHER, parseLapTime, type SetupValues } from "@/lib/karting";
import { SETUP_FIELDS, getSetupValue, inputSetupValue, setSetupValue } from "@/lib/setup";
import { fetchWeather, mergeConditions, type SessionConditions } from "@/lib/weather";

import { optionalNumber, optionalSignedNumber, text } from "./form-data";

export type Supabase = Awaited<ReturnType<typeof getCurrentGarage>>["supabase"];

export function readSetup(formData: FormData): SetupValues | { error: string } {
  const setup: SetupValues = {};
  for (const field of SETUP_FIELDS) {
    if (field.kind === "text") {
      const value = text(formData, field.name);
      if (value) setSetupValue(setup, field, value);
      continue;
    }
    const value = optionalNumber(formData, field.name);
    if (value === null) continue;
    if (value === undefined || (field.kind === "integer" && !Number.isInteger(value))) {
      return { error: `Controleer de afstelling: ${field.label.toLowerCase()} moet een ${field.kind === "integer" ? "heel getal" : "getal"} zijn.` };
    }
    setSetupValue(setup, field, value);
  }
  const notes = text(formData, "setup_notes");
  if (notes) setup.notes = notes;
  return setup;
}

/** Everything on the session form except the kart, which is fixed once parts are linked. */
export function readSession(formData: FormData) {
  const type = text(formData, "type");
  const driverId = text(formData, "driver_id");
  const startedAt = text(formData, "started_at_iso");
  if (!type || !(type in SESSION_TYPES)) return { error: "Kies het soort sessie." };
  if (!driverId) return { error: "Kies de coureur." };
  if (!startedAt || Number.isNaN(Date.parse(startedAt))) return { error: "Vul de starttijd in." };

  const durationMin = optionalNumber(formData, "duration_min");
  if (durationMin === undefined || durationMin === null || durationMin === 0) {
    return { error: "Vul in hoeveel minuten de sessie duurde." };
  }

  const bestLapRaw = text(formData, "best_lap");
  const bestLapMs = bestLapRaw ? parseLapTime(bestLapRaw) : null;
  if (bestLapRaw && bestLapMs === null) return { error: "Schrijf de rondetijd als 52.345 of 1:02.345." };

  const position = optionalNumber(formData, "position");
  const airTemp = optionalSignedNumber(formData, "air_temp_c");
  const trackTemp = optionalSignedNumber(formData, "track_temp_c");
  const humidity = optionalNumber(formData, "humidity_pct");
  const rain = optionalNumber(formData, "precipitation_mm");
  if (position === undefined || airTemp === undefined || trackTemp === undefined || humidity === undefined || rain === undefined) {
    return { error: "Controleer positie, temperaturen, luchtvochtigheid en regen: vul alleen getallen in." };
  }
  if (humidity !== null && humidity > 100) return { error: "De luchtvochtigheid is hooguit 100%." };

  const setup = readSetup(formData);
  if ("error" in setup) return setup;

  const weather = text(formData, "weather");
  // Left empty (or "automatic"), weather and air temperature are filled in from Open-Meteo on saving.
  const conditions: SessionConditions = {};
  if (weather && weather in WEATHER) conditions.weather = weather;
  if (airTemp !== null) conditions.air_temp_c = airTemp;
  if (trackTemp !== null) conditions.track_temp_c = trackTemp;
  if (humidity !== null) conditions.humidity_pct = Math.round(humidity);
  if (rain !== null) conditions.precipitation_mm = Math.round(rain * 10) / 10;
  // The weather turned during the session: what it was at the end.
  const weatherTo = text(formData, "weather_to");
  if (weatherTo && weatherTo in WEATHER) conditions.weather_to = weatherTo;

  return {
    setup,
    values: {
      type,
      driver_id: driverId,
      started_at: new Date(startedAt).toISOString(),
      duration_s: Math.round(durationMin * 60),
      best_lap_ms: bestLapMs,
      position: position === null ? null : Math.round(position),
      conditions,
      driver_feedback: text(formData, "driver_feedback"),
    },
  };
}

type SessionValues = Extract<ReturnType<typeof readSession>, { values: unknown }>["values"];

/**
 * Fills in the weather the team left empty, from the circuit's location at the session's start. On an
 * edit, earlier fetched values stay when the lookup fails and the session did not move in time.
 */
export async function withWeather(
  supabase: Supabase,
  eventId: string,
  values: SessionValues,
  previous?: { conditions: SessionConditions; started_at: string } | null,
): Promise<SessionValues> {
  const { data: event } = await supabase.from("events").select("tracks(latitude, longitude)").eq("id", eventId).maybeSingle();
  const track = event?.tracks;
  const fetched =
    track?.latitude != null && track.longitude != null
      ? await fetchWeather(track.latitude, track.longitude, values.started_at, values.duration_s)
      : null;
  const sameStart = previous ? Date.parse(previous.started_at) === Date.parse(values.started_at) : false;
  return { ...values, conditions: mergeConditions(values.conditions, fetched, previous?.conditions ?? null, sameStart) };
}

export async function insertSetup(supabase: Supabase, garageId: string, setup: SetupValues, parentId: string | null) {
  if (Object.keys(setup).length === 0) return { id: null };
  const { data, error } = await supabase
    .from("setups")
    .insert({ garage_id: garageId, parent_setup_id: parentId, values: setup as Json })
    .select("id")
    .single();
  if (error) return { error: `Afstelling opslaan mislukt: ${error.message}` };
  return { id: data.id };
}

/**
 * Adds a session to an event. `id` lets a client pick the id, so sending the same queued session
 * twice saves it once. Setup fields named in `keepSetupFields` are not on the form: they keep the
 * value from the kart's previous setup.
 */
export async function insertSession(
  supabase: Supabase,
  garageId: string,
  eventId: string,
  formData: FormData,
  { id, keepSetupFields = [] }: { id?: string; keepSetupFields?: string[] } = {},
): Promise<FormState & { id?: string }> {
  const kartId = text(formData, "kart_id");
  if (!kartId) return { error: "Kies met welke kart je reed." };

  if (id) {
    const { data: existing } = await supabase.from("sessions").select("id").eq("id", id).maybeSingle();
    if (existing) return { success: "Sessie was al opgeslagen.", id };
  }

  // Link to the kart's previous setup so changes between sessions can be shown later.
  const { data: previous } = await supabase
    .from("sessions")
    .select("setup_id, setups(values)")
    .eq("kart_id", kartId)
    .not("setup_id", "is", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const previousValues = (previous?.setups?.values ?? {}) as SetupValues;
  for (const name of keepSetupFields) {
    const field = SETUP_FIELDS.find((f) => f.name === name);
    const value = field && inputSetupValue(field, getSetupValue(previousValues, field));
    if (value !== undefined) formData.set(name, value);
  }
  if (keepSetupFields.includes("setup_notes") && previousValues.notes) formData.set("setup_notes", previousValues.notes);

  const session = readSession(formData);
  if ("error" in session) return session;

  const setup = await insertSetup(supabase, garageId, session.setup, previous?.setup_id ?? null);
  if ("error" in setup) return { error: setup.error };

  const [values, feedbackTags] = await Promise.all([
    withWeather(supabase, eventId, session.values),
    tagFeedback(session.values.driver_feedback),
  ]);
  const { data: inserted, error } = await supabase
    .from("sessions")
    .insert({
      ...(id ? { id } : {}),
      event_id: eventId,
      kart_id: kartId,
      setup_id: setup.id,
      ...values,
      conditions: values.conditions as Json,
      feedback_tags: feedbackTags as Json,
    })
    .select("id")
    .single();
  if (error) return { error: `Sessie opslaan mislukt: ${error.message}` };

  // The pre-start round of this session ("Klaar voor Q1?") now belongs to the session that was driven.
  const { data: round } = await supabase
    .from("prestart_checks")
    .select("id")
    .eq("event_id", eventId)
    .eq("kart_id", kartId)
    .eq("session_type", values.type)
    .is("session_id", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (round) await supabase.from("prestart_checks").update({ session_id: inserted.id }).eq("id", round.id);

  // Record which parts ran: everything mounted on the kart right now. This drives run time per part.
  const { data: mounted } = await supabase
    .from("part_installations")
    .select("part_id")
    .eq("kart_id", kartId)
    .is("removed_at", null);
  if (mounted && mounted.length > 0) {
    const { error: partsError } = await supabase
      .from("session_parts")
      .insert(mounted.map(({ part_id }) => ({ session_id: inserted.id, part_id })));
    if (partsError) return { error: `Sessie opgeslagen, maar onderdelen koppelen mislukt: ${partsError.message}`, id: inserted.id };
  }

  return { success: "Sessie opgeslagen.", id: inserted.id };
}

/** Saves the debrief (text and tapped tags) on a session. The text is labelled again only when it changed. */
export async function saveDebrief(supabase: Supabase, garageId: string, sessionId: string, feedback: string | null, quick: QuickTag[]): Promise<FormState> {
  const { data: current } = await supabase
    .from("sessions")
    .select("driver_feedback, feedback_tags, events!inner(garage_id)")
    .eq("id", sessionId)
    .eq("events.garage_id", garageId)
    .maybeSingle();
  if (!current) return { error: "Deze sessie bestaat niet meer." };
  const stored = parseFeedbackTags(current.feedback_tags);
  const sameQuick = (stored?.quick ?? []).join() === quick.join();
  if (feedback === current.driver_feedback && sameQuick) return { success: "Niets veranderd." };

  const auto = feedback === current.driver_feedback ? stored : await tagFeedback(feedback);
  const tags = auto || quick.length > 0 ? { ...(auto ?? EMPTY_TAGS), quick } : null;
  const { error } = await supabase
    .from("sessions")
    .update({ driver_feedback: feedback, feedback_tags: tags as Json })
    .eq("id", sessionId);
  if (error) return { error: `Opslaan mislukt: ${error.message}` };

  revalidatePath("/dashboard", "layout");
  return { success: feedback || quick.length > 0 ? (auto ? "Debrief opgeslagen en gelabeld." : "Debrief opgeslagen.") : "Debrief verwijderd." };
}
