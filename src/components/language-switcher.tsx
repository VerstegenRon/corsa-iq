"use client";

import { useTransition } from "react";

import { setLocale } from "@/app/i18n-actions";
import { useLocale, useT } from "@/lib/i18n/client";
import { LOCALES, LOCALE_NAMES } from "@/lib/i18n/locales";

/** Compact language picker; each language is listed in its own words. */
export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useT();
  const [isPending, startTransition] = useTransition();

  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{t.common.language}</span>
      <select
        value={locale}
        disabled={isPending}
        onChange={(event) => {
          const next = event.target.value;
          startTransition(() => setLocale(next));
        }}
        className="h-9 appearance-none rounded-full border border-zinc-800 bg-zinc-950 pr-8 pl-3 text-sm text-zinc-300 transition-colors hover:border-cyan-400/40 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 disabled:opacity-60"
      >
        {LOCALES.map((code) => (
          <option key={code} value={code}>
            {LOCALE_NAMES[code]}
          </option>
        ))}
      </select>
      <span aria-hidden="true" className="pointer-events-none absolute right-3 text-xs text-zinc-500">
        ▾
      </span>
    </label>
  );
}
