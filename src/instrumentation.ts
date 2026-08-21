import * as Sentry from "@sentry/nextjs";

/**
 * Server + edge error monitoring (Sentry). This file, not separate
 * sentry.server.config.ts/sentry.edge.config.ts files, is the convention
 * this Next.js version's @sentry/nextjs SDK expects -- confirmed against
 * the installed SDK (v10.70.0) rather than assumed, per AGENTS.md.
 *
 * DSN comes from NEXT_PUBLIC_SENTRY_DSN (same DSN as the client -- a DSN
 * isn't a secret, it only lets Sentry *receive* error reports).
 */
export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 1.0,
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 1.0,
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
