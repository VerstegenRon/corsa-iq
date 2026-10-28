"use client";

import { useSyncExternalStore } from "react";

import { AUTO_THEME_PATHS, THEME_STORAGE_KEY, isThemePreference, resolveTheme, type ThemePreference } from "./theme";

const listeners = new Set<() => void>();

function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : "auto";
  } catch {
    // Private mode or blocked storage: fall back to the time of day.
    return "auto";
  }
}

/** The stored preference, except on pages that always follow the time of day. */
function pagePreference(): ThemePreference {
  return AUTO_THEME_PATHS.includes(window.location.pathname) ? "auto" : readPreference();
}

export function applyTheme(preference = pagePreference()) {
  document.documentElement.setAttribute("data-theme", resolveTheme(preference));
}

export function setThemePreference(preference: ThemePreference) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Not stored; still applied for this visit.
  }
  applyTheme(preference);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab changed the setting.
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) {
      applyTheme();
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** The stored preference; "auto" during server rendering, the real value after hydration. */
export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribe, readPreference, () => "auto");
}
