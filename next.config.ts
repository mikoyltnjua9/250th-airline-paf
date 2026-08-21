import path from "node:path";
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  turbopack: {
    // Pin explicitly — otherwise Turbopack walks up looking for a lockfile
    // and can land on an unrelated one outside this repo.
    root: path.resolve(__dirname),
  },
};

export default withSentryConfig(nextConfig, {
  org: "startup-sites-ph",
  project: "javascript-nextjs",
  // No SENTRY_AUTH_TOKEN configured yet, so source map upload is skipped
  // (stack traces show minified code instead of real source lines until
  // one is added) — error capture itself still works fully without it.
  // Add SENTRY_AUTH_TOKEN to enable it later, no code change needed here.
  silent: !process.env.CI,
  widenClientFileUpload: true,
  // disableLogger and reactComponentAnnotation are webpack-only options —
  // this project builds exclusively with Turbopack (see turbopack.root
  // above), so both are omitted rather than set to a no-op.
});
