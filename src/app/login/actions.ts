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
    if (password.length < MIN_PASSWORD_LENGTH) {
      return { error: format(t.passwordTooShort, { min: MIN_PASSWORD_LENGTH }), email };
    }

    const origin = (await headers()).get("origin") ?? "";
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(next)}` },
    });

    if (error) return { error: error.message, email };
    // Email confirmation disabled in Supabase: the user is signed in right away.
    if (data.session) redirect(next);

    return { message: t.signUpDone, email };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: error.code === "email_not_confirmed" ? t.emailNotConfirmed : t.invalidCredentials, email };
  }

  redirect(next);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
