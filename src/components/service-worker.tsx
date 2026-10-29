"use client";

import { useEffect } from "react";

/**
 * Registers the service worker that keeps the pitwall working offline. Production only: in
 * development it would serve stale builds.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
  }, []);
  return null;
}
