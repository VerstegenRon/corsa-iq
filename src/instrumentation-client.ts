// Error tracking in the browser (Sentry). The settings, and what is left out, are in sentry-options.ts.

import * as Sentry from "@sentry/nextjs";

import { sentryOptions } from "@/lib/sentry-options";

Sentry.init(sentryOptions);

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
