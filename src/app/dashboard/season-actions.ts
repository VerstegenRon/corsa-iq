"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { FormState } from "@/components/form-message";
import type { Json } from "@/lib/supabase/database.types";
import { dbError, dbErrorText } from "@/lib/db-error";
import { readQuickTags } from "@/lib/feedback";
import { tagFeedback } from "@/lib/feedback-tagger";
import { getCurrentGarage } from "@/lib/garage";
import { format } from "@/lib/i18n/locales";
import { getDictionary } from "@/lib/i18n/server";
import { EVENT_TYPES, parseLapTime } from "@/lib/karting";
import { LOGGER_BUCKET } from "@/lib/storage";
import type { SessionConditions } from "@/lib/weather";

import { optionalNumber, text } from "./form-data";
import { insertSession, insertSetup, readSession, saveDebrief, withWeather, type Supabase } from "./session-save";

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
  if (error) return { error: `Opslaan mislukt: ${dbError(error)}` };

  revalidatePath("/dashboard", "layout");
  return { success: `${season.values.name} is toegevoegd.` };
}

export async function updateSeason(seasonId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const season = readSeason(formData);
  if ("error" in season) return season;

  const { supabase, garage } = await getCurrentGarage();
  const { error } = await supabase.from("seasons").update(season.values).eq("id", seasonId).eq("garage_id", garage.id);
  if (error) return { error: `Opslaan mislukt: ${dbError(error)}` };

  revalidatePath("/dashboard", "layout");
  return { success: "Wijzigingen opgeslagen." };
}

/** Events and costs of the season stay; they move to “Buiten seizoen”. */
export async function deleteSeason(seasonId: string): Promise<FormState> {
  const { supabase, garage } = await getCurrentGarage();
  const { error } = await supabase.from("seasons").delete().eq("id", seasonId).eq("garage_id", garage.id);
  if (error) return { error: `Verwijderen mislukt: ${dbError(error)}` };

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
    if (error) return { error: `Circuit opslaan mislukt: ${dbError(error)}` };
    trackId = track.id;
  }

  // The result and pole time are only on the form once the event exists (after it was driven).
  const result: { result_position?: number | null; pole_lap_ms?: number | null } = {};
  if (formData.has("result_position")) {
    const position = optionalNumber(formData, "result_position");
    if (position === undefined || (position !== null && (!Number.isInteger(position) || position < 1))) {
      return { error: "Vul de uitslag in als een positie: 1, 2, 3…" };
    }
    result.result_position = position;
  }
  if (formData.has("pole_lap")) {
    const raw = text(formData, "pole_lap");
    const pole = raw ? parseLapTime(raw) : null;
    if (raw && pole === null) return { error: "Schrijf de pole-tijd als 48.871 of 1:02.345." };
    result.pole_lap_ms = pole;
  }

  return {
    values: { season_id: text(formData, "season_id"), track_id: trackId, name, type, starts_on: startsOn, ends_on: endsOn, ...result },
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
  if (error) return { error: `Opslaan mislukt: ${dbError(error)}` };

  revalidatePath("/dashboard", "layout");
  redirect(`/dashboard/events/${inserted.id}`);
}

export async function updateEvent(eventId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, garage } = await getCurrentGarage();
  const event = await readEvent(supabase, garage.id, formData);
  if ("error" in event) return event;

  const { error } = await supabase.from("events").update(event.values).eq("id", eventId).eq("garage_id", garage.id);
  if (error) return { error: `Opslaan mislukt: ${dbError(error)}` };

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
  if (error) return { error: `Verwijderen mislukt: ${dbError(error)}` };
  await removeSessionLeftovers(supabase, sessions ?? []);

  revalidatePath("/dashboard", "layout");
  redirect("/dashboard/seasons");
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

/** Compares setups regardless of key order (jsonb reorders keys). */
function sameSetup(a: unknown, b: unknown): boolean {
  const sorted = (value: unknown): unknown =>
    value && typeof value === "object"
      ? Object.fromEntries(
          Object.entries(value)
            .sort(([x], [y]) => x.localeCompare(y))
            .map(([k, v]) => [k, sorted(v)]),
        )
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
    await supabase
      .from("data_imports")
      .delete()
      .in(
        "id",
        imports.map((i) => i.id),
      );
    const files = imports.map((i) => i.file_path).filter((path): path is string => path !== null);
    if (files.length > 0) await supabase.storage.from(LOGGER_BUCKET).remove(files);
  }
}

export async function createSession(eventId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, garage } = await getCurrentGarage();
  const result = await insertSession(supabase, garage.id, eventId, formData);
  if (result.id) revalidatePath("/dashboard", "layout");
  return result.error ? { error: result.error } : { success: result.success };
}

export async function updateSession(sessionId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const session = readSession(formData);
  if ("error" in session) return session;

  const { supabase, garage } = await getCurrentGarage();
  const { data: current } = await supabase
    .from("sessions")
    .select(
      "event_id, started_at, conditions, setup_id, driver_feedback, setups(values, parent_setup_id), laps!laps_session_id_fkey(lap_number), events!inner(garage_id)",
    )
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

  // With imported laps the best lap follows from the laps, not from the form. Label the feedback again
  // only when it changed.
  const [{ best_lap_ms, ...values }, newTags] = await Promise.all([
    withWeather(supabase, current.event_id, session.values, {
      conditions: (current.conditions ?? {}) as SessionConditions,
      started_at: current.started_at,
    }),
    session.values.driver_feedback !== current.driver_feedback ? tagFeedback(session.values.driver_feedback) : undefined,
  ]);
  const tags = newTags === undefined ? {} : { feedback_tags: newTags as Json };
  const { error } = await supabase
    .from("sessions")
    .update({
      ...values,
      conditions: values.conditions as Json,
      ...tags,
      ...(current.laps.length > 0 ? {} : { best_lap_ms }),
      setup_id: setupId,
    })
    .eq("id", sessionId);
  if (error) return { error: `Opslaan mislukt: ${dbError(error)}` };

  // The old snapshot goes, unless a later setup was derived from it (those are frozen and keep their parent).
  if (setupChanged && current.setup_id) {
    await removeSessionLeftovers(supabase, [{ setup_id: current.setup_id, data_imports: null }]);
  }

  revalidatePath("/dashboard", "layout");
  return { success: "Wijzigingen opgeslagen." };
}

/**
 * The debrief: the driver's feedback and the tapped tags, from the card on the session page or at the
 * end of a live session. The text is labelled again only when it changed.
 */
export async function saveFeedback(sessionId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, garage } = await getCurrentGarage();
  return saveDebrief(supabase, garage.id, sessionId, text(formData, "driver_feedback"), readQuickTags(formData.getAll("quick")));
}

export async function deleteSession(sessionId: string): Promise<FormState> {
  const { supabase, garage } = await getCurrentGarage();
  const { data: session } = await supabase
    .from("sessions")
    .select("event_id, setup_id, data_imports(id, file_path), events!inner(garage_id)")
    .eq("id", sessionId)
    .eq("events.garage_id", garage.id)
    .maybeSingle();
  const t = await getDictionary();
  if (!session) return { error: t.session.gone };

  const { error } = await supabase.from("sessions").delete().eq("id", sessionId);
  if (error) return { error: format(t.session.deleteFailed, { error: await dbErrorText(error) }) };
  await removeSessionLeftovers(supabase, [session]);

  revalidatePath("/dashboard", "layout");
  redirect(`/dashboard/events/${session.event_id}`);
}
