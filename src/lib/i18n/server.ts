// Server-side language lookup. Uses next/headers, so it cannot end up in a Client Component.

import { cookies, headers } from "next/headers";
import { cache } from "react";

import { de } from "./dictionaries/de";
import { en } from "./dictionaries/en";
import { fr } from "./dictionaries/fr";
import { nl, type Dictionary } from "./dictionaries/nl";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, localeFromAcceptLanguage, type Locale } from "./locales";

const dictionaries: Record<Locale, Dictionary> = { nl, en, de, fr };

/**
 * The interface language: the driver's own choice (cookie), else the browser language, else Dutch.
 * Works in Server Components and Server Actions alike.
 */
export const getLocale = cache(async (): Promise<Locale> => {
  const chosen = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(chosen)) return chosen;
  return localeFromAcceptLanguage((await headers()).get("accept-language")) ?? DEFAULT_LOCALE;
});

export async function getDictionary(): Promise<Dictionary> {
  return dictionaries[await getLocale()];
}
