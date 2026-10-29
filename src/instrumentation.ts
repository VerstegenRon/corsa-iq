// Error tracking on the server and the edge (Sentry). The settings are in sentry-options.ts.

import * as Sentry from "@sentry/nextjs";

export async function register() {
  const { sentryOptions } = await import("@/lib/sentry-options");
  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") Sentry.init(sentryOptions);
}

/** Errors in Server Components, route handlers and Server Actions. */
export const onRequestError = Sentry.captureRequestError;
