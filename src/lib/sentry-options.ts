// Sentry settings shared by the browser, the server and the edge: errors only, and no personal data.
// Without NEXT_PUBLIC_SENTRY_DSN (local development, previews) nothing is sent.

import type { ErrorEvent } from "@sentry/nextjs";

export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

/** Removes what could identify a person before an error leaves the app. */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  if (event.user) event.user = event.user.id ? { id: event.user.id } : undefined;
  if (event.request) {
    delete event.request.cookies;
    delete event.request.data;
    if (event.request.headers) {
      for (const name of Object.keys(event.request.headers)) {
        if (/cookie|authorization|x-forwarded-for|x-real-ip/i.test(name)) delete event.request.headers[name];
      }
    }
    // Invitation links and reset links carry a token in the path or query.
    if (event.request.url) event.request.url = event.request.url.replace(/\/uitnodiging\/[^/?#]+/, "/uitnodiging/[token]").replace(/\?.*$/, "");
    delete event.request.query_string;
  }
  return event;
}

export const sentryOptions = {
  dsn: SENTRY_DSN,
  enabled: Boolean(SENTRY_DSN) && process.env.NODE_ENV === "production",
  environment: process.env.VERCEL_ENV ?? process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  // Errors only: no performance tracing, no session replay.
  tracesSampleRate: 0,
  sendDefaultPii: false,
  beforeSend: scrubEvent,
};
