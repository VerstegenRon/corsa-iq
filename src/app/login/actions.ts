"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { format } from "@/lib/i18n/locales";
import { getDictionary } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; message?: string; email?: string };

const MIN_PASSWORD_LENGTH = 8;

/** Only a path on this site, never another host. */
function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : "/dashboard";
}

export async function authenticate(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const intent = formData.get("intent");
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  const t = (await getDictionary()).login;
  if (!email || !password) {
    return { error: t.missingFields, email };
  }

  const supabase = await createClient();

  if (intent === "signup") {
    if (formData.get("accept") !== "on") return { error: t.acceptRequired, email };
    if (password.length < MIN_PASSWORD_LENGTH) {
      return { error: format(t.passwordTooShort, { min: MIN_PASSWORD_LENGTH }), email };
    }

    // A new account starts with the start route, unless it came for something else (an invitation).
    const target = next === "/dashboard" ? "/dashboard/start" : next;
    const origin = (await headers()).get("origin") ?? "";
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(target)}` },
    });

    if (error) return { error: error.message, email };
    // Email confirmation disabled in Supabase: the user is signed in right away.
    if (data.session) redirect(target);

    return { message: t.signUpDone, email };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: error.code === "email_not_confirmed" ? t.emailNotConfirmed : t.invalidCredentials, email };
  }

  redirect(next);
}

/**
 * Sends the link to choose a new password. The answer is the same whether or not the address has an
 * account, so the form does not tell strangers who uses Corsa IQ.
 */
export async function requestPasswordReset(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const t = (await getDictionary()).login;
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: t.missingFields, email };
  const origin = (await headers()).get("origin") ?? "";
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/confirm?next=/wachtwoord-nieuw` });
  // Too many requests is worth saying; anything about the address itself is not.
  if (error?.status === 429) return { error: error.message, email };
  return { message: t.resetSent, email };
}

/** After the link from the e-mail: the user is signed in for this, and sets the new password. */
export async function setNewPassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const t = (await getDictionary()).login;
  const password = String(formData.get("password") ?? "");
  if (password.length < MIN_PASSWORD_LENGTH) return { error: format(t.passwordTooShort, { min: MIN_PASSWORD_LENGTH }) };
  if (password !== String(formData.get("password_repeat") ?? "")) return { error: t.passwordMismatch };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.code === "same_password" ? t.samePassword : error.message };
  redirect("/dashboard/vandaag");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
