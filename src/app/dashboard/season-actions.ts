"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { FormState } from "@/components/form-message";
import type { Json } from "@/lib/supabase/database.types";
import { getCurrentGarage } from "@/lib/garage";
import { EVENT_TYPES, SESSION_TYPES, WEATHER, parseLapTime, type SetupValues } from "@/lib/karting";

import { optionalNumber, optionalSignedNumber, text } from "./form-data";

export async function createSeason(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = text(formData, "name");
  if (!name) return { error: "Geef het seizoen een naam, bijvoorbeeld “2027 – NK Rotax Senior”." };

  const year = optionalNumber(formData, "year");
  if (!year || year < 1950 || year > 2100) return { error: "Vul een geldig jaar in." };

  const budget = optionalNumber(formData, "budget");
  if (budget === undefined) return { error: "Vul een geldig budget in, of laat het veld leeg." };

  const { supabase, garage } = await getCurrentGarage();
  const { error } = await supabase.from("seasons").insert({
    garage_id: garage.id,
    name,
    year: Math.round(year),
    class: text(formData, "class"),
    championship: text(formData, "championship"),
    budget_cents: budget === null ? null : Math.round(budget * 100),
  });
  if (error) return { error: `Opslaan mislukt: ${error.message}` };

  revalidatePath("/dashboard", "layout");
  return { success: `${name} is toegevoegd.` };
}

export async function createEvent(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = text(formData, "name");
  const type = text(formData, "type");
  const startsOn = text(formData, "starts_on");
  const endsOn = text(formData, "ends_on");
  if (!name) return { error: "Geef het evenement een naam." };
  if (!type || !(type in EVENT_TYPES)) return { error: "Kies het soort evenement." };
  if (!startsOn) return { error: "Vul de startdatum in." };
  if (endsOn && endsOn < startsOn) return { error: "De einddatum ligt voor de startdatum." };

  const { supabase, garage } = await getCurrentGarage();

  let trackId = text(formData, "track_id");
  const newTrackName = text(formData, "new_track_name");
  if (!trackId || trackId === "new") {
    if (!newTrackName) return { error: "Kies een circuit, of vul de naam van een nieuw circuit in." };
    const { data: track, error } = await supabase
      .from("tracks")
      .insert({
        name: newTrackName,
        country: text(formData, "new_track_country")?.toUpperCase().slice(0, 2) ?? null,
        created_by_garage_id: garage.id,
      })
      .select("id")
      .single();
    if (error) return { error: `Circuit opslaan mislukt: ${error.message}` };
    trackId = track.id;
  }

  const { data: event, error } = await supabase
    .from("events")
    .insert({
      garage_id: garage.id,
      season_id: text(formData, "season_id"),
      track_id: trackId,
      name,
      type,
      starts_on: startsOn,
      ends_on: endsOn,
    })
    .select("id")
    .single();
  if (error) return { error: `Opslaan mislukt: ${error.message}` };

  revalidatePath("/dashboard", "layout");
  redirect(`/dashboard/events/${event.id}`);
}

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

export async function createSession(eventId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const type = text(formData, "type");
  const kartId = text(formData, "kart_id");
  const driverId = text(formData, "driver_id");
  const startedAt = text(formData, "started_at_iso");
  if (!type || !(type in SESSION_TYPES)) return { error: "Kies het soort sessie." };
  if (!kartId) return { error: "Kies met welke kart je reed." };
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
  const weather = text(formData, "weather");

  const setup = readSetup(formData);
  if ("error" in setup) return setup;

  const { supabase, garage } = await getCurrentGarage();

  let setupId: string | null = null;
  if (Object.keys(setup).length > 0) {
    // Link to the kart's previous setup so changes between sessions can be shown later.
    const { data: previous } = await supabase
      .from("sessions")
      .select("setup_id")
      .eq("kart_id", kartId)
      .not("setup_id", "is", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: inserted, error } = await supabase
      .from("setups")
      .insert({ garage_id: garage.id, parent_setup_id: previous?.setup_id ?? null, values: setup as Json })
      .select("id")
      .single();
    if (error) return { error: `Afstelling opslaan mislukt: ${error.message}` };
    setupId = inserted.id;
  }

  const conditions: Record<string, string | number> = {};
  if (weather && weather in WEATHER) conditions.weather = weather;
  if (airTemp !== null) conditions.air_temp_c = airTemp;
  if (trackTemp !== null) conditions.track_temp_c = trackTemp;

  const { data: session, error } = await supabase
    .from("sessions")
    .insert({
      event_id: eventId,
      kart_id: kartId,
      driver_id: driverId,
      setup_id: setupId,
      type,
      started_at: new Date(startedAt).toISOString(),
      duration_s: Math.round(durationMin * 60),
      best_lap_ms: bestLapMs,
      position: position === null ? null : Math.round(position),
      conditions,
      driver_feedback: text(formData, "driver_feedback"),
    })
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
      .insert(mounted.map(({ part_id }) => ({ session_id: session.id, part_id })));
    if (partsError) return { error: `Sessie opgeslagen, maar onderdelen koppelen mislukt: ${partsError.message}` };
  }

  revalidatePath("/dashboard", "layout");
  return { success: "Sessie opgeslagen." };
}
