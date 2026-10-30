"use server";

import { revalidatePath } from "next/cache";

import type { FormState } from "@/components/form-message";
import { defaultChecklist, isChecklistCategory } from "@/lib/checklist";
import { dbErrorText } from "@/lib/db-error";
import { getCurrentGarage } from "@/lib/garage";
import type { Dictionary } from "@/lib/i18n/dictionaries/nl";
import { format } from "@/lib/i18n/locales";
import { getDictionary } from "@/lib/i18n/server";

import { text } from "./form-data";

// ---------------------------------------------------------------------------
// Packing list: the garage's fixed list, and the list per event that is ticked off.
// ---------------------------------------------------------------------------

const failed = async (template: string, error: { message: string; code?: string }) => format(template, { error: await dbErrorText(error) });

function readItem(formData: FormData, t: Dictionary) {
  const title = text(formData, "title");
  const category = text(formData, "category") ?? "other";
  if (!title) return { error: t.checklist.titleMissing };
  if (title.length > 120) return { error: t.checklist.tooLong };
  if (!isChecklistCategory(category)) return { error: t.equipment.chooseCategory };
  return { values: { title, category } };
}

export async function addChecklistItem(_prev: FormState, formData: FormData): Promise<FormState> {
  const t = await getDictionary();
  const item = readItem(formData, t);
  if ("error" in item) return item;
  const { supabase, garage } = await getCurrentGarage();
  const { error } = await supabase.from("checklist_items").insert({ ...item.values, garage_id: garage.id });
  if (error) return { error: await failed(t.equipment.saveFailed, error) };
  revalidatePath("/dashboard/checklist");
  return { success: format(t.checklist.onList, { item: item.values.title }) };
}

export async function deleteChecklistItem(id: string): Promise<FormState | void> {
  const { supabase } = await getCurrentGarage();
  const { error } = await supabase.from("checklist_items").delete().eq("id", id);
  if (error) return { error: await failed((await getDictionary()).equipment.deleteFailed, error) };
  revalidatePath("/dashboard/checklist");
}

/** Fills an empty fixed list with the standard one. */
export async function fillDefaultChecklist(): Promise<FormState> {
  const { supabase, garage } = await getCurrentGarage();
  const t = await getDictionary();
  const { count } = await supabase.from("checklist_items").select("id", { count: "exact", head: true }).eq("garage_id", garage.id);
  if ((count ?? 0) > 0) return { error: t.checklist.hasItems };
  const { error } = await supabase.from("checklist_items").insert(defaultChecklist(t.checklist).map((item) => ({ ...item, garage_id: garage.id })));
  if (error) return { error: await failed(t.equipment.saveFailed, error) };
  revalidatePath("/dashboard", "layout");
  return {};
}

/**
 * Copies the fixed list into an event: the first time the whole list, later only what was added to
 * the fixed list since. Without a fixed list it starts from the standard one.
 */
export async function copyChecklistToEvent(eventId: string): Promise<FormState> {
  const { supabase, garage } = await getCurrentGarage();
  const t = await getDictionary();
  let { data: template } = await supabase.from("checklist_items").select("id, title, category").eq("garage_id", garage.id);
  if (!template || template.length === 0) {
    const { data, error } = await supabase
      .from("checklist_items")
      .insert(defaultChecklist(t.checklist).map((item) => ({ ...item, garage_id: garage.id })))
      .select("id, title, category");
    if (error) return { error: await failed(t.checklist.makeFailed, error) };
    template = data;
  }
  const { error } = await supabase.from("event_checklist_items").upsert(
    template.map((item) => ({ garage_id: garage.id, event_id: eventId, template_item_id: item.id, title: item.title, category: item.category })),
    { onConflict: "event_id,template_item_id", ignoreDuplicates: true },
  );
  if (error) return { error: await failed(t.checklist.makeFailed, error) };
  revalidatePath(`/dashboard/events/${eventId}`);
  return {};
}

export async function toggleEventChecklistItem(id: string, checked: boolean): Promise<FormState> {
  const { supabase } = await getCurrentGarage();
  const { error } = await supabase
    .from("event_checklist_items")
    .update({ checked, checked_at: checked ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return { error: await failed((await getDictionary()).equipment.saveFailed, error) };
  return {};
}

export async function addEventChecklistItem(eventId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const t = await getDictionary();
  const item = readItem(formData, t);
  if ("error" in item) return item;
  const { supabase, garage } = await getCurrentGarage();
  const { error } = await supabase.from("event_checklist_items").insert({ ...item.values, garage_id: garage.id, event_id: eventId });
  if (error) return { error: await failed(t.equipment.saveFailed, error) };
  revalidatePath(`/dashboard/events/${eventId}`);
  return { success: format(t.checklist.itemAdded, { item: item.values.title }) };
}

/** Puts one of the app's suggestions on the event's list; the key keeps it from being suggested again. */
export async function addSuggestedItem(eventId: string, key: string, title: string, category: string): Promise<FormState> {
  const tc = (await getDictionary()).checklist;
  if (!isChecklistCategory(category) || !title || title.length > 120 || key.length > 120) return { error: tc.unknownSuggestion };
  const { supabase, garage } = await getCurrentGarage();
  const { error } = await supabase
    .from("event_checklist_items")
    .upsert(
      { garage_id: garage.id, event_id: eventId, suggestion_key: key, title, category },
      { onConflict: "event_id,suggestion_key", ignoreDuplicates: true },
    );
  if (error) return { error: await failed(tc.addFailed, error) };
  revalidatePath(`/dashboard/events/${eventId}`);
  return {};
}

export async function deleteEventChecklistItem(id: string, eventId: string): Promise<FormState | void> {
  const { supabase } = await getCurrentGarage();
  const { error } = await supabase.from("event_checklist_items").delete().eq("id", id);
  if (error) return { error: await failed((await getDictionary()).equipment.deleteFailed, error) };
  revalidatePath(`/dashboard/events/${eventId}`);
}
