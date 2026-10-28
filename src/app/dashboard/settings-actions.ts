"use server";

import { revalidatePath } from "next/cache";

import type { FormState } from "@/components/form-message";
import { getCurrentGarage } from "@/lib/garage";
import { format } from "@/lib/i18n/locales";
import { getDictionary } from "@/lib/i18n/server";

import { text } from "./form-data";

const MIN_PASSWORD_LENGTH = 8;

/** Your own name and your garage's name (only the garage owner may rename it; RLS enforces that). */
export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const t = await getDictionary();
  const garageName = text(formData, "garage_name");
  if (!garageName) return { error: t.settings.garageNameRequired };

  const { supabase, user, garage } = await getCurrentGarage();
  const [profile, garageUpdate] = await Promise.all([
    supabase.from("profiles").update({ display_name: text(formData, "display_name") }).eq("id", user.id),
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
