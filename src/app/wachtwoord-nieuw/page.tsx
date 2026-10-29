import type { Metadata } from "next";
import Link from "next/link";

import { getDictionary } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

import { AuthShell } from "../login/auth-shell";
import { NewPasswordForm } from "./new-password-form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).login.newPasswordMetaTitle };
}

/** Reached through the link in the reset e-mail, which signs the user in for this. */
export default async function NewPasswordPage() {
  const [supabase, t] = await Promise.all([createClient(), getDictionary()]);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <AuthShell heading={t.login.newPasswordHeading} intro={user ? t.login.newPasswordIntro : t.login.resetExpired}>
      {user ? (
        <NewPasswordForm email={user.email ?? ""} />
      ) : (
        <Link href="/wachtwoord-vergeten" className="text-sm text-brand-300 underline-offset-4 hover:underline">
          {t.login.resetSend}
        </Link>
      )}
    </AuthShell>
  );
}
