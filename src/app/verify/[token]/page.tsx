import type { Metadata } from "next";
import * as Sentry from "@sentry/nextjs";
import { Crest } from "@/components/crest";
import { PilotAvatar } from "@/components/pilots/pilot-avatar";
import { FitToFlyBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/admin";
import { effectiveFitness } from "@/lib/types/pilot";

// Never index a page that names a real person, even minimally.
export const metadata: Metadata = {
  title: "Personnel Verification — 250th PAW",
  robots: { index: false, follow: false },
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type VerifyResult = {
  fullName: string;
  rankLabel: string;
  fitToFly: boolean;
  photoUrl: string | null;
};

/**
 * Three outcomes, kept distinct on purpose: a token that genuinely matches
 * nothing ("not_found") must never look the same as the database being
 * unreachable ("unavailable"). When the backend paused earlier, every valid
 * QR briefly read "Not a recognized record" -- on a safety verification page
 * that tells someone a real pilot's card is fake.
 */
type LookupOutcome =
  | { kind: "found"; result: VerifyResult }
  | { kind: "not_found" }
  | { kind: "unavailable" };

async function lookupPilot(token: string): Promise<LookupOutcome> {
  // Fail fast on malformed input rather than sending it to the database —
  // public_verify_token is a uuid column.
  if (!UUID_RE.test(token)) return { kind: "not_found" };

  try {
    return await queryPilot(token);
  } catch (err) {
    Sentry.captureException(err);
    return { kind: "unavailable" };
  }
}

async function queryPilot(token: string): Promise<LookupOutcome> {
  // Service-role client: this route is intentionally reachable with no
  // login, so it can't rely on RLS. Only these four fields are ever
  // selected — no AFSN, no position, no quals, no contact info. That
  // allow-list is the actual security boundary here, not RLS.
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("pilots")
    .select("id, full_name, rank_code, fit_to_fly, photo_url, ranks(label)")
    .eq("public_verify_token", token)
    .maybeSingle();

  if (error) throw error;
  if (!data) return { kind: "not_found" };

  // Latest APE due date and result feed the fit/unfit answer only -- it's never
  // returned or displayed, so the allow-list of visible fields is unchanged.
  const { data: ape, error: apeError } = await supabase
    .from("ape_records")
    .select("next_due_date, fit_to_fly")
    .eq("pilot_id", data.id)
    .order("last_ape_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  // A failed APE lookup must not be read as "no APE on file".
  if (apeError) throw apeError;

  const ranks = data.ranks as unknown as { label: string } | null;

  return {
    kind: "found",
    result: {
      fullName: data.full_name,
      rankLabel: ranks?.label ?? data.rank_code,
      fitToFly: effectiveFitness(data.fit_to_fly, ape).fit,
      photoUrl: data.photo_url,
    },
  };
}

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const outcome = await lookupPilot(token);

  return (
    <div className="flex min-h-svh items-center justify-center bg-navy p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-navy-foreground">
          <Crest className="h-14 w-14" />
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-gold">
              250th Presidential Airlift Wing
            </p>
            <h1 className="text-lg font-semibold">Personnel Verification</h1>
          </div>
        </div>

        <Card>
          <CardContent className="pt-2">
            {outcome.kind === "found" ? (
              <div className="flex flex-col items-center gap-3 py-2 text-center">
                <PilotAvatar
                  fullName={outcome.result.fullName}
                  photoUrl={outcome.result.photoUrl}
                  className="h-16 w-16 text-xl"
                />
                <p className="text-lg font-semibold">
                  {outcome.result.rankLabel} {outcome.result.fullName}
                </p>
                <FitToFlyBadge fitToFly={outcome.result.fitToFly} />
              </div>
            ) : outcome.kind === "unavailable" ? (
              <div className="space-y-2 py-4 text-center">
                <p className="font-semibold">Verification temporarily unavailable</p>
                <p className="text-sm text-muted-foreground">
                  We couldn&apos;t check this record right now. This does not mean the QR code
                  is invalid. Please try again in a few minutes, or contact the 250th PAW Wing
                  Safety Office directly.
                </p>
              </div>
            ) : (
              <div className="space-y-2 py-4 text-center">
                <p className="font-semibold text-destructive">Not a recognized record</p>
                <p className="text-sm text-muted-foreground">
                  This QR code doesn&apos;t match any record on file. If you believe this is an
                  error, contact the 250th PAW Wing Safety Office directly.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
