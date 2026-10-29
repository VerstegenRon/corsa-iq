import Link from "next/link";

import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";

/** The frame of the sign-in pages: logo, theme and language, and one card in the middle. */
export function AuthShell({ heading, intro, children }: { heading: string; intro: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-950 text-zinc-50">
      <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 sm:px-6">
        <Link
          href="/"
          className="text-sm font-semibold tracking-[0.2em] text-brand-300 uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
        >
          CorsaIQ
        </Link>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <ThemeSwitcher />
          <LanguageSwitcher />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 pb-24 sm:px-6">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-6 sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>
          <p className="mt-2 mb-8 text-sm text-zinc-400">{intro}</p>
          {children}
        </div>
      </main>
    </div>
  );
}
