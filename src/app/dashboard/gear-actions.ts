"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { FormState } from "@/components/form-message";
import { dbErrorText } from "@/lib/db-error";
import { getCurrentGarage } from "@/lib/garage";
import type { Dictionary } from "@/lib/i18n/dictionaries/nl";
import { format } from "@/lib/i18n/locales";
import { getDictionary } from "@/lib/i18n/server";
import { GEAR_STATUSES, isGearCategory, labelFor, todayInAmsterdam } from "@/lib/karting";
import { seasonIdForDate } from "@/lib/season-for-date";

import { optionalNumber, text } from "./form-data";

type Supabase = Awaited<ReturnType<typeof getCurrentGarage>>["supabase"];

const failed = async (template: string, error: { message: string; code?: string }) => format(template, { error: await dbErrorText(error) });

function readGear(formData: FormData, t: Dictionary) {
  const category = text(formData, "category");
  if (!category || !isGearCategory(category)) return { error: t.gear.chooseCategory };

  const status = text(formData, "status") ?? "in_use";
  if (!(status in GEAR_STATUSES)) return { error: t.equipment.chooseStatus };

  const price = optionalNumber(formData, "purchase_price");
  if (price === undefined) return { error: t.gear.invalidPrice };

  return {
    values: {
      category,
      status,
      driver_id: text(formData, "driver_id"),
      brand: text(formData, "brand"),
      model: text(formData, "model"),
      size: text(formData, "size"),
      homologation: text(formData, "homologation"),
      valid_until: text(formData, "valid_until"),
      purchased_on: text(formData, "purchased_on"),
      purchase_price_cents: price === null ? null : Math.round(price * 100),
      notes: text(formData, "notes"),
    },
  };
}

type GearValues = Extract<ReturnType<typeof readGear>, { values: unknown }>["values"];

/** The expense booked for buying the item. */
function purchaseExpense(supabase: Supabase, gearId: string) {
  return supabase.from("expenses").select("id").eq("gear_item_id", gearId).order("created_at").limit(1).maybeSingle();
}

/** Like a part: the purchase price is also a cost ("Kleding & uitrusting"), kept in line with the item. */
async function syncPurchaseExpense(supabase: Supabase, garageId: string, gearId: string, gear: GearValues) {
  const { data: existing } = await purchaseExpense(supabase, gearId);

  if (!gear.purchase_price_cents) {
    if (existing) return supabase.from("expenses").delete().eq("id", existing.id);
    return { error: null };
  }

  const t = await getDictionary();
  const spentOn = gear.purchased_on ?? todayInAmsterdam();
  const expense = {
    season_id: await seasonIdForDate(supabase, garageId, spentOn),
    category: "gear",
    spent_on: spentOn,
    amount_cents: gear.purchase_price_cents,
    description: [labelFor(t.options.gearCategories, gear.category), gear.brand, gear.model].filter(Boolean).join(" "),
  };

  if (existing) return supabase.from("expenses").update(expense).eq("id", existing.id);
  return supabase.from("expenses").insert({ garage_id: garageId, gear_item_id: gearId, ...expense });
}

export async function createGear(_prev: FormState, formData: FormData): Promise<FormState> {
  const t = await getDictionary();
  const gear = readGear(formData, t);
  if ("error" in gear) return gear;

  const { supabase, garage } = await getCurrentGarage();
  const { data: inserted, error } = await supabase
    .from("gear_items")
    .insert({ garage_id: garage.id, ...gear.values })
    .select("id")
    .single();
  if (error) return { error: await failed(t.equipment.saveFailed, error) };

  const { error: expenseError } = await syncPurchaseExpense(supabase, garage.id, inserted.id, gear.values);
  if (expenseError) return { error: await failed(t.gear.savedCostFailed, expenseError) };

  revalidatePath("/dashboard", "layout");
  return { success: t.gear.added };
}

export async function updateGear(gearId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const t = await getDictionary();
  const gear = readGear(formData, t);
  if ("error" in gear) return gear;

  const { supabase, garage } = await getCurrentGarage();
  const { data: updated, error } = await supabase
    .from("gear_items")
    .update(gear.values)
    .eq("id", gearId)
    .eq("garage_id", garage.id)
    .select("id")
    .maybeSingle();
  if (error) return { error: await failed(t.equipment.saveFailed, error) };
  if (!updated) return { error: t.gear.gone };

  const { error: expenseError } = await syncPurchaseExpense(supabase, garage.id, gearId, gear.values);
  if (expenseError) return { error: await failed(t.gear.savedCostUpdateFailed, expenseError) };

  revalidatePath("/dashboard", "layout");
  return { success: t.equipment.saved };
}

export async function deleteGear(gearId: string) {
  const { supabase, garage } = await getCurrentGarage();

  // The automatically booked purchase goes with it.
  const { data: purchase } = await purchaseExpense(supabase, gearId);
  const { error } = await supabase.from("gear_items").delete().eq("id", gearId).eq("garage_id", garage.id);
  if (error) throw new Error(await failed((await getDictionary()).equipment.deleteFailed, error));
  if (purchase) await supabase.from("expenses").delete().eq("id", purchase.id);

  revalidatePath("/dashboard", "layout");
  redirect("/dashboard/gear");
}
