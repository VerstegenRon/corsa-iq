import type { Metadata } from "next";

import { getDictionary } from "@/lib/i18n/server";

import { AuthShell } from "../login/auth-shell";
import { ResetRequestForm } from "./reset-request-form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).login.resetMetaTitle };
}

/** Asks for the e-mail address and sends the link to choose a new password. */
export default async function ForgotPasswordPage({ searchParams }: PageProps<"/wachtwoord-vergeten">) {
  const [{ error }, t] = await Promise.all([searchParams, getDictionary()]);
  return (
    <AuthShell heading={t.login.resetHeading} intro={t.login.resetIntro}>
      {error === "expired" && (
        <p role="alert" className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {t.login.resetExpired}
        </p>
      )}
      <ResetRequestForm />
    </AuthShell>
  );
}
