"use server";

import { randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";

import type { FormState } from "@/components/form-message";
import { getCurrentGarage } from "@/lib/garage";

import { text } from "./form-data";

// ---------------------------------------------------------------------------
// The agenda: the garage's own appointments, and a member's subscription link.
// ---------------------------------------------------------------------------

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;

function readItem(formData: FormData) {
  const title = text(formData, "title");
  const startsOn = text(formData, "starts_on");
  const endsOn = text(formData, "ends_on");
  const startsAt = text(formData, "starts_at");
  const notes = text(formData, "notes");
  if (!title) return { error: "Geef de afspraak een titel." };
  if (title.length > 120) return { error: "Houd de titel korter dan 120 tekens." };
  if (!startsOn || !DATE.test(startsOn)) return { error: "Kies een datum." };
  if (endsOn && (!DATE.test(endsOn) || endsOn < startsOn)) return { error: "De einddatum ligt vóór de begindatum." };
  if (startsAt && !TIME.test(startsAt)) return { error: "Vul de tijd in als uu:mm." };
  if (notes && notes.length > 2000) return { error: "Houd de notitie korter dan 2000 tekens." };
  return { values: { title, starts_on: startsOn, ends_on: endsOn && endsOn !== startsOn ? endsOn : null, starts_at: startsAt, notes } };
}

export async function createCalendarItem(_prev: FormState, formData: FormData): Promise<FormState> {
  const item = readItem(formData);
  if ("error" in item) return item;
  const { supabase, garage } = await getCurrentGarage();
  const { error } = await supabase.from("calendar_items").insert({ ...item.values, garage_id: garage.id });
  if (error) return { error: `Opslaan mislukt: ${error.message}` };
  revalidatePath("/dashboard", "layout");
  return { success: "Afspraak toegevoegd." };
}

export async function updateCalendarItem(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const item = readItem(formData);
  if ("error" in item) return item;
  const { supabase } = await getCurrentGarage();
  const { error } = await supabase.from("calendar_items").update(item.values).eq("id", id);
  if (error) return { error: `Opslaan mislukt: ${error.message}` };
  revalidatePath("/dashboard", "layout");
  return { success: "Afspraak bijgewerkt." };
}

export async function deleteCalendarItem(id: string): Promise<FormState | void> {
  const { supabase } = await getCurrentGarage();
  const { error } = await supabase.from("calendar_items").delete().eq("id", id);
  if (error) return { error: `Verwijderen mislukt: ${error.message}` };
  revalidatePath("/dashboard", "layout");
}

/** Makes the member's subscription link, replacing (and so revoking) the one they had. */
export async function createCalendarFeed(): Promise<FormState> {
  const { supabase, user, garage } = await getCurrentGarage();
  await supabase.from("calendar_feeds").delete().eq("garage_id", garage.id).eq("user_id", user.id);
  const { error } = await supabase
    .from("calendar_feeds")
    .insert({ garage_id: garage.id, user_id: user.id, token: randomBytes(32).toString("base64url") });
  if (error) return { error: `Link maken mislukt: ${error.message}` };
  revalidatePath("/dashboard/agenda");
  return {};
}

export async function deleteCalendarFeed(): Promise<FormState> {
  const { supabase, user, garage } = await getCurrentGarage();
  const { error } = await supabase.from("calendar_feeds").delete().eq("garage_id", garage.id).eq("user_id", user.id);
  if (error) return { error: `Intrekken mislukt: ${error.message}` };
  revalidatePath("/dashboard/agenda");
  return {};
}
