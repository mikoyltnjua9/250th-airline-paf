import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. BYPASSES ROW LEVEL SECURITY entirely.
 *
 * Only ever import this from server-only code (Server Actions, Route
 * Handlers) — the `server-only` import above makes it a build error to
 * accidentally pull this into a Client Component bundle.
 *
 * Legitimate uses in this app:
 *  - super_admin creating new accounts (Supabase Auth Admin API)
 *  - the public "Scan to Verify" pilot verification endpoint, which
 *    intentionally reads across RLS but returns only an explicit, minimal
 *    field allow-list
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
