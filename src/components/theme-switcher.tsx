"use client";

import { useT } from "@/lib/i18n/client";
import { THEME_PREFERENCES, isThemePreference } from "@/lib/theme";
import { setThemePreference, useThemePreference } from "@/lib/theme-client";

/** Automatic (day/night), light or dark; remembered on this device. */
export function ThemeSwitcher() {
  const t = useT();
  const preference = useThemePreference();
  const labels = { auto: t.common.themeAuto, light: t.common.themeLight, dark: t.common.themeDark };

  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{t.common.theme}</span>
      <select
        value={preference}
        onChange={(event) => {
          if (isThemePreference(event.target.value)) setThemePreference(event.target.value);
        }}
        className="h-9 appearance-none rounded-full border border-zinc-800 bg-zinc-950 pr-8 pl-3 text-sm text-zinc-300 transition-colors hover:border-cyan-400/40 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
      >
        {THEME_PREFERENCES.map((value) => (
          <option key={value} value={value}>
            {labels[value]}
          </option>
        ))}
      </select>
      <span aria-hidden="true" className="pointer-events-none absolute right-3 text-xs text-zinc-500">
        ▾
      </span>
    </label>
  );
}
