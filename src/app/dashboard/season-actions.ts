"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { FormState } from "@/components/form-message";
import type { Json } from "@/lib/supabase/database.types";
import { getCurrentGarage } from "@/lib/garage";
import { EVENT_TYPES, SESSION_TYPES, WEATHER, parseLapTime, type SetupValues } from "@/lib/karting";
import { LOGGER_BUCKET } from "@/lib/storage";

import { optionalNumber, optionalSignedNumber, text } from "./form-data";

type Supabase = Awaited<ReturnType<typeof getCurrentGarage>>["supabase"];

// ---------------------------------------------------------------------------
// Seasons
// ---------------------------------------------------------------------------

function readSeason(formData: FormData) {
  const name = text(formData, "name");
  if (!name) return { error: "Geef het seizoen een naam, bijvoorbeeld “2027 – NK Rotax Senior”." };

  const year = optionalNumber(formData, "year");
  if (!year || year < 1950 || year > 2100) return { error: "Vul een geldig jaar in." };

  const budget = optionalNumber(formData, "budget");
  if (budget === undefined) return { error: "Vul een geldig budget in, of laat het veld leeg." };

  return {
    values: {
      name,
      year: Math.round(year),
      class: text(formData, "class"),
      championship: text(formData, "championship"),
      budget_cents: budget === null ? null : Math.round(budget * 100),
    },
  };
}

export async function createSeason(_prev: FormState, formData: FormData): Promise<FormState> {
  const season = readSeason(formData);
  if ("error" in season) return season;

  const { supabase, garage } = await getCurrentGarage();
  const { error } = await supabase.from("seasons").insert({ garage_id: garage.id, ...season.values });
  if (error) return { error: `Opslaan mislukt: ${error.message}` };

  revalidatePath("/dashboard", "layout");
  return { success: `${season.values.name} is toegevoegd.` };
}

export async function updateSeason(seasonId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const season = readSeason(formData);
  if ("error" in season) return season;

  const { supabase, garage } = await getCurrentGarage();
  const { error } = await supabase.from("seasons").update(season.values).eq("id", seasonId).eq("garage_id", garage.id);
  if (error) return { error: `Opslaan mislukt: ${error.message}` };

  revalidatePath("/dashboard", "layout");
  return { success: "Wijzigingen opgeslagen." };
}

/** Events and costs of the season stay; they move to “Buiten seizoen”. */
export async function deleteSeason(seasonId: string): Promise<FormState> {
  const { supabase, garage } = await getCurrentGarage();
  const { error } = await supabase.from("seasons").delete().eq("id", seasonId).eq("garage_id", garage.id);
  if (error) return { error: `Verwijderen mislukt: ${error.message}` };

  revalidatePath("/dashboard", "layout");
  redirect("/dashboard/seasons");
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

async function readEvent(supabase: Supabase, garageId: string, formData: FormData) {
  const name = text(formData, "name");
  const type = text(formData, "type");
  const startsOn = text(formData, "starts_on");
  const endsOn = text(formData, "ends_on");
  if (!name) return { error: "Geef het evenement een naam." };
  if (!type || !(type in EVENT_TYPES)) return { error: "Kies het soort evenement." };
  if (!startsOn) return { error: "Vul de startdatum in." };
  if (endsOn && endsOn < startsOn) return { error: "De einddatum ligt voor de startdatum." };

  let trackId = text(formData, "track_id");
  const newTrackName = text(formData, "new_track_name");
  if (!trackId || trackId === "new") {
    if (!newTrackName) return { error: "Kies een circuit, of vul de naam van een nieuw circuit in." };
    const { data: track, error } = await supabase
      .from("tracks")
      .insert({
        name: newTrackName,
        city: text(formData, "new_track_city"),
        country: text(formData, "new_track_country")?.toUpperCase().slice(0, 2) ?? null,
        created_by_garage_id: garageId,
      })
      .select("id")
      .single();
    if (error) return { error: `Circuit opslaan mislukt: ${error.message}` };
    trackId = track.id;
  }

  return {
    values: { season_id: text(formData, "season_id"), track_id: trackId, name, type, starts_on: startsOn, ends_on: endsOn },
  };
}

export async function createEvent(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, garage } = await getCurrentGarage();
  const event = await readEvent(supabase, garage.id, formData);
  if ("error" in event) return event;

  const { data: inserted, error } = await supabase
    .from("events")
    .insert({ garage_id: garage.id, ...event.values })
    .select("id")
    .single();
  if (error) return { error: `Opslaan mislukt: ${error.message}` };

  revalidatePath("/dashboard", "layout");
  redirect(`/dashboard/events/${inserted.id}`);
}

export async function updateEvent(eventId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, garage } = await getCurrentGarage();
  const event = await readEvent(supabase, garage.id, formData);
  if ("error" in event) return event;

  const { error } = await supabase.from("events").update(event.values).eq("id", eventId).eq("garage_id", garage.id);
  if (error) return { error: `Opslaan mislukt: ${error.message}` };

  // Costs booked on the event follow it to its (new) season.
  await supabase.from("expenses").update({ season_id: event.values.season_id }).eq("event_id", eventId);

  revalidatePath("/dashboard", "layout");
  return { success: "Wijzigingen opgeslagen." };
}

/** Removes the event with its sessions and laps. Costs stay, without the event link. */
export async function deleteEvent(eventId: string): Promise<FormState> {
  const { supabase, garage } = await getCurrentGarage();
  const { data: sessions } = await supabase
    .from("sessions")
    .select("setup_id, data_imports(id, file_path), events!inner(garage_id)")
    .eq("event_id", eventId)
    .eq("events.garage_id", garage.id);

  const { error } = await supabase.from("events").delete().eq("id", eventId).eq("garage_id", garage.id);
  if (error) return { error: `Verwijderen mislukt: ${error.message}` };
  await removeSessionLeftovers(supabase, sessions ?? []);

  revalidatePath("/dashboard", "layout");
  redirect("/dashboard/seasons");
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

function readSetup(formData: FormData): SetupValues | { error: string } {
  const numbers = {
    pressureFront: optionalNumber(formData, "pressure_front"),
    pressureRear: optionalNumber(formData, "pressure_rear"),
    frontTeeth: optionalNumber(formData, "front_teeth"),
    rearTeeth: optionalNumber(formData, "rear_teeth"),
    rearWidth: optionalNumber(formData, "rear_track_width_mm"),
    frontWidth: optionalNumber(formData, "front_track_width_mm"),
    mainJet: optionalNumber(formData, "main_jet"),
  };
  if (Object.values(numbers).some((value) => value === undefined)) {
    return { error: "Controleer de afstelling: vul alleen getallen in." };
  }
  const n = (value: number | null | undefined) => value ?? undefined;

  const setup: SetupValues = {};
  if (numbers.pressureFront !== null || numbers.pressureRear !== null) {
    setup.tyre_pressure_cold_bar = { front: n(numbers.pressureFront), rear: n(numbers.pressureRear) };
  }
  if (numbers.frontTeeth !== null || numbers.rearTeeth !== null) {
    setup.gearing = { front_teeth: n(numbers.frontTeeth), rear_teeth: n(numbers.rearTeeth) };
  }
  const hardness = text(formData, "axle_hardness");
  if (hardness) setup.rear_axle = { hardness };
  if (numbers.rearWidth !== null) setup.rear_track_width_mm = n(numbers.rearWidth);
  if (numbers.frontWidth !== null) setup.front_track_width_mm = n(numbers.frontWidth);
  if (numbers.mainJet !== null) setup.carburettor = { main_jet: n(numbers.mainJet) };
  const notes = text(formData, "setup_notes");
  if (notes) setup.notes = notes;
  return setup;
}

/** Everything on the session form except the kart, which is fixed once parts are linked. */
function readSession(formData: FormData) {
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
  if (position === undefined || airTemp === undefined || trackTemp === undefined) {
    return { error: "Controleer positie en temperaturen: vul alleen getallen in." };
  }

  const setup = readSetup(formData);
  if ("error" in setup) return setup;

  const weather = text(formData, "weather");
  const conditions: Record<string, string | number> = {};
  if (weather && weather in WEATHER) conditions.weather = weather;
  if (airTemp !== null) conditions.air_temp_c = airTemp;
  if (trackTemp !== null) conditions.track_temp_c = trackTemp;

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

async function insertSetup(supabase: Supabase, garageId: string, setup: SetupValues, parentId: string | null) {
  if (Object.keys(setup).length === 0) return { id: null };
  const { data, error } = await supabase
    .from("setups")
    .insert({ garage_id: garageId, parent_setup_id: parentId, values: setup as Json })
    .select("id")
    .single();
  if (error) return { error: `Afstelling opslaan mislukt: ${error.message}` };
  return { id: data.id };
}

/** Compares setups regardless of key order (jsonb reorders keys). */
function sameSetup(a: unknown, b: unknown): boolean {
  const sorted = (value: unknown): unknown =>
    value && typeof value === "object"
      ? Object.fromEntries(Object.entries(value).sort(([x], [y]) => x.localeCompare(y)).map(([k, v]) => [k, sorted(v)]))
      : value;
  return JSON.stringify(sorted(a ?? {})) === JSON.stringify(sorted(b ?? {}));
}

/**
 * After sessions are gone: drop setup snapshots nothing points at any more (a setup that is the
 * parent of a later one stays, to keep the change history), plus imports and their logger files.
 */
async function removeSessionLeftovers(
  supabase: Supabase,
  sessions: { setup_id: string | null; data_imports: { id: string; file_path: string | null } | null }[],
) {
  for (const setupId of sessions.map((s) => s.setup_id).filter((id): id is string => id !== null)) {
    const [{ count: users }, { count: children }] = await Promise.all([
      supabase.from("sessions").select("id", { count: "exact", head: true }).eq("setup_id", setupId),
      supabase.from("setups").select("id", { count: "exact", head: true }).eq("parent_setup_id", setupId),
    ]);
    if (!users && !children) await supabase.from("setups").delete().eq("id", setupId);
  }

  const imports = sessions.map((s) => s.data_imports).filter((i): i is { id: string; file_path: string | null } => i !== null);
  if (imports.length > 0) {
    await supabase.from("data_imports").delete().in("id", imports.map((i) => i.id));
    const files = imports.map((i) => i.file_path).filter((path): path is string => path !== null);
    if (files.length > 0) await supabase.storage.from(LOGGER_BUCKET).remove(files);
  }
}

export async function createSession(eventId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const kartId = text(formData, "kart_id");
  if (!kartId) return { error: "Kies met welke kart je reed." };
  const session = readSession(formData);
  if ("error" in session) return session;

  const { supabase, garage } = await getCurrentGarage();

  // Link to the kart's previous setup so changes between sessions can be shown later.
  const { data: previous } = await supabase
    .from("sessions")
    .select("setup_id")
    .eq("kart_id", kartId)
    .not("setup_id", "is", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const setup = await insertSetup(supabase, garage.id, session.setup, previous?.setup_id ?? null);
  if ("error" in setup) return { error: setup.error };

  const { data: inserted, error } = await supabase
    .from("sessions")
    .insert({ event_id: eventId, kart_id: kartId, setup_id: setup.id, ...session.values })
    .select("id")
    .single();
  if (error) return { error: `Sessie opslaan mislukt: ${error.message}` };

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
    if (partsError) return { error: `Sessie opgeslagen, maar onderdelen koppelen mislukt: ${partsError.message}` };
  }

  revalidatePath("/dashboard", "layout");
  return { success: "Sessie opgeslagen." };
}

export async function updateSession(sessionId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const session = readSession(formData);
  if ("error" in session) return session;

  const { supabase, garage } = await getCurrentGarage();
  const { data: current } = await supabase
    .from("sessions")
    .select("setup_id, setups(values, parent_setup_id), laps(lap_number), events!inner(garage_id)")
    .eq("id", sessionId)
    .eq("events.garage_id", garage.id)
    .limit(1, { referencedTable: "laps" })
    .maybeSingle();
  if (!current) return { error: "Deze sessie bestaat niet meer." };

  // A used setup is a snapshot and never changes: a different setup becomes a new snapshot that takes
  // the old one's place in the chain (same parent), so the old one can usually be removed.
  let setupId = current.setup_id;
  const setupChanged = !sameSetup(current.setups?.values, session.setup);
  if (setupChanged) {
    const setup = await insertSetup(supabase, garage.id, session.setup, current.setups?.parent_setup_id ?? null);
    if ("error" in setup) return { error: setup.error };
    setupId = setup.id;
  }

  // With imported laps the best lap follows from the laps, not from the form.
  const { best_lap_ms, ...values } = session.values;
  const { error } = await supabase
    .from("sessions")
    .update({ ...values, ...(current.laps.length > 0 ? {} : { best_lap_ms }), setup_id: setupId })
    .eq("id", sessionId);
  if (error) return { error: `Opslaan mislukt: ${error.message}` };

  // The old snapshot goes, unless a later setup was derived from it (those are frozen and keep their parent).
  if (setupChanged && current.setup_id) {
    await removeSessionLeftovers(supabase, [{ setup_id: current.setup_id, data_imports: null }]);
  }

  revalidatePath("/dashboard", "layout");
  return { success: "Wijzigingen opgeslagen." };
}

export async function deleteSession(sessionId: string): Promise<FormState> {
  const { supabase, garage } = await getCurrentGarage();
  const { data: session } = await supabase
    .from("sessions")
    .select("event_id, setup_id, data_imports(id, file_path), events!inner(garage_id)")
    .eq("id", sessionId)
    .eq("events.garage_id", garage.id)
    .maybeSingle();
  if (!session) return { error: "Deze sessie bestaat niet meer." };

  const { error } = await supabase.from("sessions").delete().eq("id", sessionId);
  if (error) return { error: `Verwijderen mislukt: ${error.message}` };
  await removeSessionLeftovers(supabase, [session]);

  revalidatePath("/dashboard", "layout");
  redirect(`/dashboard/events/${session.event_id}`);
}
