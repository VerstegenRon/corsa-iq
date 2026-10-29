import type { Metadata } from "next";
import Link from "next/link";

import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { getDictionary } from "@/lib/i18n/server";

import { LoginForm } from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).login.metaTitle };
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const [{ error, confirmed, next }, t] = await Promise.all([searchParams, getDictionary()]);

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-950 text-zinc-50">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Link
          href="/"
          className="text-sm font-semibold tracking-[0.2em] text-brand-300 uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
        >
          CorsaIQ
        </Link>
        <div className="flex items-center gap-2">
          <ThemeSwitcher />
          <LanguageSwitcher />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 pb-24">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-8">
          <h1 className="text-2xl font-semibold tracking-tight">{t.login.heading}</h1>
          <p className="mt-2 mb-8 text-sm text-zinc-400">{t.login.intro}</p>
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
        </div>
      </main>
    </div>
  );
}
