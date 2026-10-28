"use client";

import { createContext, useContext, type ReactNode } from "react";

import { nl, type Dictionary } from "./dictionaries/nl";
import { DEFAULT_LOCALE, type Locale } from "./locales";

const I18nContext = createContext<{ locale: Locale; t: Dictionary }>({ locale: DEFAULT_LOCALE, t: nl });

/** Gives Client Components the dictionary the server picked for this request. */
export function I18nProvider({ locale, dictionary, children }: { locale: Locale; dictionary: Dictionary; children: ReactNode }) {
  return <I18nContext.Provider value={{ locale, t: dictionary }}>{children}</I18nContext.Provider>;
}

export function useT(): Dictionary {
  return useContext(I18nContext).t;
}

export function useLocale(): Locale {
  return useContext(I18nContext).locale;
}
