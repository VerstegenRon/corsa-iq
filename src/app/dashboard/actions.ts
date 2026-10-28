"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { FormState } from "@/components/form-message";
import { getCurrentGarage } from "@/lib/garage";
import {
  KART_STATUSES,
  PART_CATEGORIES,
  PART_STATUSES,
  isPartCategory,
  labelFor,
  todayInAmsterdam,
} from "@/lib/karting";

import { optionalNumber, text } from "./form-data";

type Supabase = Awaited<ReturnType<typeof getCurrentGarage>>["supabase"];

function readKart(formData: FormData) {
  const name = text(formData, "name");
  if (!name) return { error: "Geef je kart een naam, bijvoorbeeld “Kart A”." };

  const year = optionalNumber(formData, "chassis_year");
  if (year === undefined || (year !== null && (year < 1950 || year > 2100))) {
    return { error: "Vul een geldig bouwjaar in." };
  }

  return {
    values: {
      name,
      chassis_brand: text(formData, "chassis_brand"),
      chassis_model: text(formData, "chassis_model"),
      chassis_year: year === null ? null : Math.round(year),
      class: text(formData, "class"),
      serial_number: text(formData, "serial_number"),
    },
  };
}

export async function createKart(_prev: FormState, formData: FormData): Promise<FormState> {
  const kart = readKart(formData);
  if ("error" in kart) return kart;

  const { supabase, garage } = await getCurrentGarage();
  const { error } = await supabase.from("karts").insert({ garage_id: garage.id, ...kart.values });
  if (error) return { error: `Opslaan mislukt: ${error.message}` };

  revalidatePath("/dashboard", "layout");
  return { success: `${kart.values.name} is toegevoegd.` };
}

export async function updateKart(kartId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const kart = readKart(formData);
  if ("error" in kart) return kart;
  const status = text(formData, "status");
  if (!status || !(status in KART_STATUSES)) return { error: "Kies een status." };

  const { supabase, garage } = await getCurrentGarage();
  const { error } = await supabase
    .from("karts")
    .update({ ...kart.values, status })
    .eq("id", kartId)
    .eq("garage_id", garage.id);
  if (error) return { error: `Opslaan mislukt: ${error.message}` };

  revalidatePath("/dashboard", "layout");
  return { success: "Wijzigingen opgeslagen." };
}

export async function deleteKart(kartId: string): Promise<FormState> {
  const { supabase, garage } = await getCurrentGarage();

  // Sessions keep pointing at the kart they ran with, so a kart with history stays.
  const { count } = await supabase.from("sessions").select("id", { count: "exact", head: true }).eq("kart_id", kartId);
  if (count) {
    return {
      error: `Deze kart heeft ${count} ${count === 1 ? "sessie" : "sessies"}. Zet de status op “Verkocht” of “Uit dienst” om hem te bewaren, of verwijder eerst die sessies.`,
    };
  }

  // Mounted parts go back to stock; the installation history is removed with the kart.
  const { data: mounted } = await supabase
    .from("part_installations")
    .select("part_id")
    .eq("kart_id", kartId)
    .is("removed_at", null);

  const { error } = await supabase.from("karts").delete().eq("id", kartId).eq("garage_id", garage.id);
  if (error) return { error: `Verwijderen mislukt: ${error.message}` };

  if (mounted && mounted.length > 0) {
    await supabase
      .from("parts")
      .update({ status: "in_stock" })
      .in(
        "id",
        mounted.map((m) => m.part_id),
      );
  }

  revalidatePath("/dashboard", "layout");
  redirect("/dashboard/karts");
}

function readPart(formData: FormData) {
  const category = text(formData, "category");
  if (!category || !isPartCategory(category)) return { error: "Kies een categorie." };

  const price = optionalNumber(formData, "purchase_price");
  if (price === undefined) return { error: "Vul een geldige prijs in, bijvoorbeeld 249,95." };

  const limitHours = optionalNumber(formData, "usage_limit_hours");
  if (limitHours === undefined || limitHours === 0) {
    return { error: "Vul een geldig aantal draaiuren in, of laat het veld leeg." };
  }

  return {
    values: {
      category,
      brand: text(formData, "brand"),
      model: text(formData, "model"),
      serial_number: text(formData, "serial_number"),
      purchased_on: text(formData, "purchased_on"),
      purchase_price_cents: price === null ? null : Math.round(price * 100),
      usage_limit_minutes: limitHours === null ? null : Math.round(limitHours * 60),
      notes: text(formData, "notes"),
    },
  };
}

type PartValues = Extract<ReturnType<typeof readPart>, { values: unknown }>["values"];

/**
 * A part's purchase is also a cost, booked on the season of the purchase year. Keeps that one
 * expense in line with the part: created, updated or removed together with the purchase price.
 */
async function syncPurchaseExpense(supabase: Supabase, garageId: string, partId: string, part: PartValues) {
  const { data: existing } = await supabase
    .from("expenses")
    .select("id")
    .eq("part_id", partId)
    .order("created_at")
    .limit(1)
    .maybeSingle();

  if (!part.purchase_price_cents) {
    if (existing) return supabase.from("expenses").delete().eq("id", existing.id);
    return { error: null };
  }

  const spentOn = part.purchased_on ?? todayInAmsterdam();
  const { data: season } = await supabase
    .from("seasons")
    .select("id")
    .eq("garage_id", garageId)
    .eq("year", Number(spentOn.slice(0, 4)))
    .order("created_at")
    .limit(1)
    .maybeSingle();
  const expense = {
    season_id: season?.id ?? null,
    category: part.category === "tyre_set" ? "tyres" : "parts",
    spent_on: spentOn,
    amount_cents: part.purchase_price_cents,
    description: [labelFor(PART_CATEGORIES, part.category), part.brand, part.model].filter(Boolean).join(" "),
  };

  if (existing) return supabase.from("expenses").update(expense).eq("id", existing.id);
  return supabase.from("expenses").insert({ garage_id: garageId, part_id: partId, ...expense });
}

export async function createPart(_prev: FormState, formData: FormData): Promise<FormState> {
  const part = readPart(formData);
  if ("error" in part) return part;

  const { supabase, garage } = await getCurrentGarage();
  const { data: inserted, error } = await supabase
    .from("parts")
    .insert({ garage_id: garage.id, ...part.values })
    .select("id")
    .single();
  if (error) return { error: `Opslaan mislukt: ${error.message}` };

  const { error: expenseError } = await syncPurchaseExpense(supabase, garage.id, inserted.id, part.values);
  if (expenseError) return { error: `Onderdeel opgeslagen, maar kosten vastleggen mislukt: ${expenseError.message}` };

  revalidatePath("/dashboard", "layout");
  return { success: "Onderdeel toegevoegd." };
}

export async function updatePart(partId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const part = readPart(formData);
  if ("error" in part) return part;

  const { supabase, garage } = await getCurrentGarage();

  // "Gemonteerd" follows from mounting; a mounted part keeps that status until it is removed.
  const { data: current } = await supabase.from("parts").select("status").eq("id", partId).eq("garage_id", garage.id).maybeSingle();
  if (!current) return { error: "Dit onderdeel bestaat niet meer." };
  const status = text(formData, "status");
  const nextStatus = current.status === "installed" ? "installed" : status;
  if (!nextStatus || !(nextStatus in PART_STATUSES) || (current.status !== "installed" && nextStatus === "installed")) {
    return { error: "Kies een status. Monteren doe je op de pagina van de kart." };
  }

  const { error } = await supabase
    .from("parts")
    .update({ ...part.values, status: nextStatus })
    .eq("id", partId)
    .eq("garage_id", garage.id);
  if (error) return { error: `Opslaan mislukt: ${error.message}` };

  const { error: expenseError } = await syncPurchaseExpense(supabase, garage.id, partId, part.values);
  if (expenseError) return { error: `Onderdeel opgeslagen, maar kosten bijwerken mislukt: ${expenseError.message}` };

  revalidatePath("/dashboard", "layout");
  return { success: "Wijzigingen opgeslagen." };
}

export async function deletePart(partId: string): Promise<FormState> {
  const { supabase, garage } = await getCurrentGarage();

  // Deleting a part would also erase it from past sessions, so used parts are written off instead.
  const { count } = await supabase.from("session_parts").select("part_id", { count: "exact", head: true }).eq("part_id", partId);
  if (count) {
    return {
      error: `Dit onderdeel is in ${count} ${count === 1 ? "sessie" : "sessies"} gebruikt. Zet de status op “Afgeschreven” of “Verkocht” om de geschiedenis te bewaren.`,
    };
  }

  // The automatically booked purchase goes with it; other costs linked to the part stay.
  const { data: purchase } = await supabase
    .from("expenses")
    .select("id")
    .eq("part_id", partId)
    .order("created_at")
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("parts").delete().eq("id", partId).eq("garage_id", garage.id);
  if (error) return { error: `Verwijderen mislukt: ${error.message}` };
  if (purchase) await supabase.from("expenses").delete().eq("id", purchase.id);

  revalidatePath("/dashboard", "layout");
  redirect("/dashboard/parts");
}

export async function installPart(kartId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const partId = text(formData, "part_id");
  if (!partId) return { error: "Kies een onderdeel om te monteren." };

  const { supabase } = await getCurrentGarage();
  const { error } = await supabase.from("part_installations").insert({ part_id: partId, kart_id: kartId });
  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Dit onderdeel zit al op een kart. Demonteer het daar eerst."
          : `Monteren mislukt: ${error.message}`,
    };
  }

  await supabase.from("parts").update({ status: "installed" }).eq("id", partId);

  revalidatePath("/dashboard", "layout");
  return { success: "Onderdeel gemonteerd." };
}

export async function removePart(installationId: string, partId: string) {
  const { supabase } = await getCurrentGarage();

  const { error } = await supabase
    .from("part_installations")
    .update({ removed_at: new Date().toISOString() })
    .eq("id", installationId)
    .is("removed_at", null);
  if (error) throw new Error(`Demonteren mislukt: ${error.message}`);

  await supabase.from("parts").update({ status: "in_stock" }).eq("id", partId);

  revalidatePath("/dashboard", "layout");
}
