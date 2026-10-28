"use server";

import { revalidatePath } from "next/cache";

import type { FormState } from "@/components/form-message";
import { getCurrentGarage } from "@/lib/garage";
import { isPartCategory } from "@/lib/karting";

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

  const { supabase, garage } = await getCurrentGarage();
  const { error } = await supabase.from("parts").insert({
    garage_id: garage.id,
    category,
    brand: text(formData, "brand"),
    model: text(formData, "model"),
    serial_number: text(formData, "serial_number"),
    purchased_on: text(formData, "purchased_on"),
    purchase_price_cents: price === null ? null : Math.round(price * 100),
    usage_limit_minutes: limitHours === null ? null : Math.round(limitHours * 60),
    notes: text(formData, "notes"),
  });
  if (error) return { error: `Opslaan mislukt: ${error.message}` };

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
