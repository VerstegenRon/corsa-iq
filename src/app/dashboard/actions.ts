"use server";

import { revalidatePath } from "next/cache";

import type { FormState } from "@/components/form-message";
import { getCurrentGarage } from "@/lib/garage";
import { PART_CATEGORIES, isPartCategory, labelFor, todayInAmsterdam } from "@/lib/karting";

import { optionalNumber, text } from "./form-data";

export async function createKart(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = text(formData, "name");
  if (!name) return { error: "Geef je kart een naam, bijvoorbeeld “Kart A”." };

  const year = optionalNumber(formData, "chassis_year");
  if (year === undefined || (year !== null && (year < 1950 || year > 2100))) {
    return { error: "Vul een geldig bouwjaar in." };
  }

  const { supabase, garage } = await getCurrentGarage();
  const { error } = await supabase.from("karts").insert({
    garage_id: garage.id,
    name,
    chassis_brand: text(formData, "chassis_brand"),
    chassis_model: text(formData, "chassis_model"),
    chassis_year: year === null ? null : Math.round(year),
    class: text(formData, "class"),
    serial_number: text(formData, "serial_number"),
  });
  if (error) return { error: `Opslaan mislukt: ${error.message}` };

  revalidatePath("/dashboard", "layout");
  return { success: `${name} is toegevoegd.` };
}

export async function createPart(_prev: FormState, formData: FormData): Promise<FormState> {
  const category = text(formData, "category");
  if (!category || !isPartCategory(category)) return { error: "Kies een categorie." };

  const price = optionalNumber(formData, "purchase_price");
  if (price === undefined) return { error: "Vul een geldige prijs in, bijvoorbeeld 249,95." };

  const limitHours = optionalNumber(formData, "usage_limit_hours");
  if (limitHours === undefined || limitHours === 0) {
    return { error: "Vul een geldig aantal draaiuren in, of laat het veld leeg." };
  }

  const purchasedOn = text(formData, "purchased_on");
  const priceCents = price === null ? null : Math.round(price * 100);

  const { supabase, garage } = await getCurrentGarage();
  const { data: part, error } = await supabase
    .from("parts")
    .insert({
      garage_id: garage.id,
      category,
      brand: text(formData, "brand"),
      model: text(formData, "model"),
      serial_number: text(formData, "serial_number"),
      purchased_on: purchasedOn,
      purchase_price_cents: priceCents,
      usage_limit_minutes: limitHours === null ? null : Math.round(limitHours * 60),
      notes: text(formData, "notes"),
    })
    .select("id")
    .single();
  if (error) return { error: `Opslaan mislukt: ${error.message}` };

  // The purchase also counts as a cost, booked on the season of the purchase year.
  if (priceCents) {
    const spentOn = purchasedOn ?? todayInAmsterdam();
    const { data: season } = await supabase
      .from("seasons")
      .select("id")
      .eq("garage_id", garage.id)
      .eq("year", Number(spentOn.slice(0, 4)))
      .order("created_at")
      .limit(1)
      .maybeSingle();
    const { error: expenseError } = await supabase.from("expenses").insert({
      garage_id: garage.id,
      season_id: season?.id ?? null,
      part_id: part.id,
      category: category === "tyre_set" ? "tyres" : "parts",
      spent_on: spentOn,
      amount_cents: priceCents,
      description: [labelFor(PART_CATEGORIES, category), text(formData, "brand"), text(formData, "model")]
        .filter(Boolean)
        .join(" "),
    });
    if (expenseError) return { error: `Onderdeel opgeslagen, maar kosten vastleggen mislukt: ${expenseError.message}` };
  }

  revalidatePath("/dashboard", "layout");
  return { success: "Onderdeel toegevoegd." };
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
