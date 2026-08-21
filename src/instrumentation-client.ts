import * as Sentry from "@sentry/nextjs";

/**
 * Browser-side error monitoring (Sentry). Runs after the HTML loads, before
 * React hydrates -- see Next.js's instrumentation-client.js convention.
 */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  // Session Replay: off. This app's screens routinely show real pilot
  // safety data (fitness status, medical exam results) -- recording user
  // sessions would mean that data leaving the app a second way, to a third
  // party, with no explicit sign-off from the client. Revisit only if the
  // client explicitly asks for it and the privacy tradeoff is discussed
  // with them first.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
