// Supported interface languages. The language lives in a cookie, not in the URL: the app sits
// behind a login, so links, auth redirects and e-mail links stay the same in every language.

export const LOCALES = ["nl", "en", "de", "fr"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "nl";
export const LOCALE_COOKIE = "locale";

/** Each language in its own words, for the language switcher. */
export const LOCALE_NAMES: Record<Locale, string> = {
  nl: "Nederlands",
  en: "English",
  de: "Deutsch",
  fr: "Français",
};

export function isLocale(value: string | undefined | null): value is Locale {
  return LOCALES.includes(value as Locale);
}

/** Picks the best supported language from an Accept-Language header ("de-DE,de;q=0.9,en;q=0.8"). */
export function localeFromAcceptLanguage(header: string | null): Locale | null {
  if (!header) return null;
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { language: tag.toLowerCase().split("-")[0], q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  return ranked.map((r) => r.language).find(isLocale) ?? null;
}

/** Fills {name} placeholders: format("{count} ronden", { count: 3 }) → "3 ronden". */
export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}

/** Picks the singular or plural form and fills {count}. */
export function plural(count: number, forms: { one: string; other: string }): string {
  return format(count === 1 ? forms.one : forms.other, { count });
}
