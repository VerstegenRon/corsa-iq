// Light/dark theme. The preference ("auto", "light" or "dark") is a per-device setting kept in
// localStorage; "auto" follows the time of day. The theme is set as data-theme on <html> by an
// inline script before the first paint (see app/layout.tsx), so there is no flash of the wrong theme.

export const THEME_PREFERENCES = ["auto", "light", "dark"] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];
export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "theme-preference";

/** Pages that always follow the time of day, whatever the visitor chose elsewhere (the homepage). */
export const AUTO_THEME_PATHS = ["/"];

/** "auto" is light from 09:00 up to 21:00 local time, dark in the evening and at night. */
export const DAY_STARTS_AT = 9;
export const NIGHT_STARTS_AT = 21;

export function isThemePreference(value: unknown): value is ThemePreference {
  return THEME_PREFERENCES.includes(value as ThemePreference);
}

export function resolveTheme(preference: ThemePreference, now = new Date()): Theme {
  if (preference !== "auto") return preference;
  const hour = now.getHours();
  return hour >= DAY_STARTS_AT && hour < NIGHT_STARTS_AT ? "light" : "dark";
}

/** Runs in <head> before anything is painted; mirrors resolveTheme without imports. */
export const themeScript = `(function(){try{var p=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(p!=="light"&&p!=="dark"||${JSON.stringify(AUTO_THEME_PATHS)}.indexOf(location.pathname)>=0)p="auto";var t=p;if(p==="auto"){var h=new Date().getHours();t=h>=${DAY_STARTS_AT}&&h<${NIGHT_STARTS_AT}?"light":"dark"}document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;
