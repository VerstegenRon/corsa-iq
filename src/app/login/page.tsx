import type { Metadata } from "next";

import { getDictionary } from "@/lib/i18n/server";

import { AuthShell } from "./auth-shell";
import { LoginForm } from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).login.metaTitle };
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const [{ error, confirmed, next }, t] = await Promise.all([searchParams, getDictionary()]);

  return (
    <AuthShell heading={t.login.heading} intro={t.login.intro}>
      {confirmed === "1" && (
        <p role="status" className="mb-5 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100">
          {t.login.confirmed}
        </p>
      )}
      {error === "confirm" && (
        <p role="alert" className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {t.login.confirmFailed}
        </p>
      )}
      <LoginForm next={typeof next === "string" ? next : undefined} />
    </AuthShell>
  );
}
