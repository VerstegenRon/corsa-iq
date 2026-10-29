// CorsaIQ service worker: keeps the pitwall usable without signal. Pages come from the network when
// there is one; without it, the last copy of the page, or else the pitwall. Built files (hashed, so
// they never change) come from the cache first. Sessions themselves wait in the page's own queue.

const PAGES = "corsaiq-pages-v1";
const ASSETS = "corsaiq-assets-v1";
const PITWALL = "/pitwall";

/** Stores the pitwall and the scripts and styles it needs, so it also opens offline. */
async function cachePitwall(response) {
  const pages = await caches.open(PAGES);
  // A redirect means signed out: drop the old copy instead of keeping someone's data.
  if (!response.ok || response.redirected) {
    await pages.delete(PITWALL);
    return;
  }
  await pages.put(PITWALL, response.clone());
  const html = await response.text();
  const assets = [...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)].map((match) => match[1]);
  const cache = await caches.open(ASSETS);
  await Promise.all(
    [...new Set(assets)].map(async (url) => {
      if (!(await cache.match(url))) await cache.add(url).catch(() => {});
    }),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    fetch(PITWALL, { credentials: "same-origin" })
      .then(cachePitwall)
      .catch(() => {})
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== PAGES && key !== ASSETS).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(ASSETS).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      }),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (url.pathname === PITWALL) event.waitUntil(cachePitwall(response.clone()));
          return response;
        })
        .catch(async () => (await caches.match(PITWALL, { cacheName: PAGES })) ?? Response.error()),
    );
  }
});
