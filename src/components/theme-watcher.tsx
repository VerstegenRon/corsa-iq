"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { applyTheme } from "@/lib/theme-client";

/**
 * Keeps "auto" in step with the clock while a page stays open: checks every minute and when the
 * tab becomes visible again, so the theme turns dark at 21:00 without a reload. Also re-applies
 * the theme after client-side navigation, since some pages ignore the stored preference.
 */
export function ThemeWatcher() {
  const pathname = usePathname();

  useEffect(() => {
    applyTheme();
  }, [pathname]);

  useEffect(() => {
    const update = () => applyTheme();
    const interval = window.setInterval(update, 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") update();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
