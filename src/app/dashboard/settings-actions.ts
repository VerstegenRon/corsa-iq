"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { FormState } from "@/components/form-message";
import { DELETE_WORD } from "@/lib/account";
import { GARAGE_COOKIE, getCurrentGarage } from "@/lib/garage";
import { dbError } from "@/lib/db-error";
import { format } from "@/lib/i18n/locales";
import { getDictionary } from "@/lib/i18n/server";
import { LOGGER_BUCKET, RECEIPT_BUCKET, TELEMETRY_BUCKET } from "@/lib/storage";
import { listFiles } from "@/lib/storage-files";

import { text } from "./form-data";

const MIN_PASSWORD_LENGTH = 8;

/** Your own name and your garage's name (only the garage owner may rename it; RLS enforces that). */
export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const t = await getDictionary();
  const garageName = text(formData, "garage_name");
  if (!garageName) return { error: t.settings.garageNameRequired };

  const { supabase, user, garage } = await getCurrentGarage();
  const [profile, garageUpdate] = await Promise.all([
    supabase
      .from("profiles")
      .update({ display_name: text(formData, "display_name") })
      .eq("id", user.id),
    supabase.from("garages").update({ name: garageName }).eq("id", garage.id).select("id"),
  ]);
  const error = profile.error ?? garageUpdate.error;
  if (error) return { error: format(t.settings.saveFailed, { error: error.message }) };
  if (!garageUpdate.data?.length) return { error: t.settings.notOwner };

  revalidatePath("/dashboard", "layout");
  return { success: t.settings.saved };
}

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const t = await getDictionary();
  const password = String(formData.get("password") ?? "");
  const repeat = String(formData.get("password_repeat") ?? "");
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: format(t.login.passwordTooShort, { min: MIN_PASSWORD_LENGTH }) };
  }
  if (password !== repeat) return { error: t.settings.passwordMismatch };

  const { supabase } = await getCurrentGarage();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return {
      error: error.code === "same_password" ? t.settings.samePassword : format(t.settings.saveFailed, { error: error.message }),
    };
  }
  return { success: t.settings.passwordChanged };
}

/**
 * Deletes your account. Garages where you are the only member go with it, files included; a garage
 * where you are the last owner next to other members blocks it until someone else is owner.
 */
export async function deleteAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  if (text(formData, "confirm")?.toUpperCase() !== DELETE_WORD) return { error: `Typ ${DELETE_WORD} om te bevestigen.` };
  const { supabase } = await getCurrentGarage();

  const { data: garages, error: listError } = await supabase.rpc("my_account_garages");
  if (listError) return { error: `Controleren mislukt: ${listError.message}` };
  const blocked = (garages ?? []).filter((g) => g.outcome === "blocked");
  if (blocked.length > 0) {
    return { error: `Maak eerst iemand anders eigenaar van ${blocked.map((g) => g.garage_name).join(", ")} (Meer → Team).` };
  }

  // Files cannot be deleted in SQL: remove those of the garages that go, before the garages themselves.
  for (const garage of (garages ?? []).filter((g) => g.outcome === "deleted")) {
    for (const bucket of [LOGGER_BUCKET, RECEIPT_BUCKET, TELEMETRY_BUCKET]) {
      const paths = await listFiles(supabase, bucket, garage.garage_id);
      for (let i = 0; i < paths.length; i += 100) {
        const { error } = await supabase.storage.from(bucket).remove(paths.slice(i, i + 100));
        if (error) return { error: `Bestanden verwijderen mislukt: ${dbError(error)}` };
      }
    }
  }

  const { error } = await supabase.rpc("delete_my_account");
  if (error) return { error: `Account verwijderen mislukt: ${dbError(error)}` };

  await supabase.auth.signOut();
  (await cookies()).delete(GARAGE_COOKIE);
  redirect("/login?deleted=1");
}
