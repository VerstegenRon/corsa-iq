"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { FormState } from "@/components/form-message";
import { getCurrentGarage } from "@/lib/garage";
import { EVENT_TYPES } from "@/lib/karting";
import { seasonIdForDate } from "@/lib/season-for-date";

import { createKart } from "./actions";
import { text } from "./form-data";
import { updateProfile } from "./settings-actions";
import { createDriver, updateDriver } from "./track-actions";

// ---------------------------------------------------------------------------
// The start route for a new garage: team, driver, kart, first event. Each step saves with the same
// rules as the normal forms and goes on to the next one.
// ---------------------------------------------------------------------------

const next = (step: number) => redirect(`/dashboard/start?stap=${step}`);

export async function saveTeamStep(_prev: FormState, formData: FormData): Promise<FormState> {
  const result = await updateProfile({}, formData);
  if (result.error) return result;
  next(2);
  return {};
}

export async function saveDriverStep(driverId: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  const result = driverId ? await updateDriver(driverId, {}, formData) : await createDriver({}, formData);
  if (result.error) return result;
  next(3);
  return {};
}

export async function saveKartStep(_prev: FormState, formData: FormData): Promise<FormState> {
  const result = await createKart({}, formData);
  if (result.error) return result;
  next(4);
  return {};
}

/** The first event, on a season of its year (made when the garage has none yet). */
export async function saveEventStep(_prev: FormState, formData: FormData): Promise<FormState> {
  const trackId = text(formData, "track_id");
  const type = text(formData, "type");
  const startsOn = text(formData, "starts_on");
  if (!trackId) return { error: "Kies het circuit." };
  if (!type || !(type in EVENT_TYPES)) return { error: "Kies het soort evenement." };
  if (!startsOn || !/^\d{4}-\d{2}-\d{2}$/.test(startsOn)) return { error: "Vul de datum in." };

  const { supabase, garage } = await getCurrentGarage();
  const { data: track } = await supabase.from("tracks").select("name").eq("id", trackId).maybeSingle();
  if (!track) return { error: "Dat circuit bestaat niet." };
  const name = text(formData, "name") ?? `${EVENT_TYPES[type as keyof typeof EVENT_TYPES]} ${track.name}`;

  let seasonId = await seasonIdForDate(supabase, garage.id, startsOn);
  if (!seasonId) {
    const year = Number(startsOn.slice(0, 4));
    const { data: season } = await supabase.from("seasons").insert({ garage_id: garage.id, name: `Seizoen ${year}`, year }).select("id").single();
    seasonId = season?.id ?? null;
  }

  const { error } = await supabase
    .from("events")
    .insert({ garage_id: garage.id, season_id: seasonId, track_id: trackId, name, type, starts_on: startsOn });
  if (error) return { error: `Opslaan mislukt: ${error.message}` };

  revalidatePath("/dashboard", "layout");
  next(5);
  return {};
}
