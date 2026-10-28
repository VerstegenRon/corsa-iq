"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { FormState } from "@/components/form-message";
import { getCurrentGarage } from "@/lib/garage";

import { optionalNumber, text } from "./form-data";

// ---------------------------------------------------------------------------
// Tracks: the official catalogue is read-only; a garage adds and edits its own entries.
// ---------------------------------------------------------------------------

function readTrack(formData: FormData) {
  const name = text(formData, "name");
  if (!name) return { error: "Geef het circuit een naam." };
  const country = text(formData, "country")?.toUpperCase() ?? null;
  if (country && !/^[A-Z]{2}$/.test(country)) return { error: "Gebruik een landcode van twee letters, bijvoorbeeld NL of IT." };
  return { values: { name, city: text(formData, "city"), country } };
}

export async function createTrack(_prev: FormState, formData: FormData): Promise<FormState> {
  const track = readTrack(formData);
  if ("error" in track) return track;

  const { supabase, garage } = await getCurrentGarage();
  const { error } = await supabase.from("tracks").insert({ ...track.values, created_by_garage_id: garage.id });
  if (error) return { error: `Opslaan mislukt: ${error.message}` };

  revalidatePath("/dashboard", "layout");
  return { success: `${track.values.name} is toegevoegd.` };
}

export async function updateTrack(trackId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const track = readTrack(formData);
  if ("error" in track) return track;

  const { supabase, garage } = await getCurrentGarage();
  const { data, error } = await supabase
    .from("tracks")
    .update(track.values)
    .eq("id", trackId)
    .eq("created_by_garage_id", garage.id)
    .select("id");
  if (error) return { error: `Opslaan mislukt: ${error.message}` };
  if (!data?.length) return { error: "Alleen circuits die je zelf hebt toegevoegd kun je bewerken." };

  revalidatePath("/dashboard", "layout");
  return { success: "Wijzigingen opgeslagen." };
}

export async function deleteTrack(trackId: string): Promise<FormState> {
  const { supabase, garage } = await getCurrentGarage();
  const { data, error } = await supabase
    .from("tracks")
    .delete()
    .eq("id", trackId)
    .eq("created_by_garage_id", garage.id)
    .select("id");
  if (error) {
    // Events keep pointing at the track they were held on.
    return {
      error:
        error.code === "23503"
          ? "Er zijn nog evenementen op dit circuit. Verwijder of verplaats die eerst."
          : `Verwijderen mislukt: ${error.message}`,
    };
  }
  if (!data?.length) return { error: "Alleen circuits die je zelf hebt toegevoegd kun je verwijderen." };

  revalidatePath("/dashboard", "layout");
  redirect("/dashboard/tracks");
}

// ---------------------------------------------------------------------------
// Drivers
// ---------------------------------------------------------------------------

function readDriver(formData: FormData) {
  const firstName = text(formData, "first_name");
  if (!firstName) return { error: "Vul de voornaam van de coureur in." };
  const weight = optionalNumber(formData, "weight_kg");
  if (weight === undefined || (weight !== null && (weight < 10 || weight > 250))) {
    return { error: "Vul een geldig gewicht in kilo in, of laat het veld leeg." };
  }
  return {
    values: {
      first_name: firstName,
      last_name: text(formData, "last_name"),
      race_number: text(formData, "race_number"),
      weight_kg: weight,
      licence_number: text(formData, "licence_number"),
    },
  };
}

export async function createDriver(_prev: FormState, formData: FormData): Promise<FormState> {
  const driver = readDriver(formData);
  if ("error" in driver) return driver;

  const { supabase, garage } = await getCurrentGarage();
  const { error } = await supabase.from("drivers").insert({ garage_id: garage.id, ...driver.values });
  if (error) return { error: `Opslaan mislukt: ${error.message}` };

  revalidatePath("/dashboard", "layout");
  const fullName = [driver.values.first_name, driver.values.last_name].filter(Boolean).join(" ");
  return { success: `${fullName} is toegevoegd.` };
}

export async function updateDriver(driverId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const driver = readDriver(formData);
  if ("error" in driver) return driver;

  const { supabase, garage } = await getCurrentGarage();
  const { error } = await supabase.from("drivers").update(driver.values).eq("id", driverId).eq("garage_id", garage.id);
  if (error) return { error: `Opslaan mislukt: ${error.message}` };

  revalidatePath("/dashboard", "layout");
  return { success: "Wijzigingen opgeslagen." };
}

export async function deleteDriver(driverId: string): Promise<FormState> {
  const { supabase, garage } = await getCurrentGarage();

  // Sessions keep the driver who drove them; and a garage always keeps one driver to log sessions with.
  const [{ count: sessions }, { count: drivers }] = await Promise.all([
    supabase.from("sessions").select("id", { count: "exact", head: true }).eq("driver_id", driverId),
    supabase.from("drivers").select("id", { count: "exact", head: true }).eq("garage_id", garage.id),
  ]);
  if (sessions) {
    return { error: `Deze coureur heeft ${sessions} ${sessions === 1 ? "sessie" : "sessies"} gereden en blijft daarom bewaard.` };
  }
  if ((drivers ?? 0) <= 1) return { error: "Je garage heeft minimaal één coureur nodig." };

  const { error } = await supabase.from("drivers").delete().eq("id", driverId).eq("garage_id", garage.id);
  if (error) return { error: `Verwijderen mislukt: ${error.message}` };

  revalidatePath("/dashboard", "layout");
  return {};
}
