import type { Metadata } from "next";
import { Crest } from "@/components/crest";
import { PilotAvatar } from "@/components/pilots/pilot-avatar";
import { FitToFlyBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/admin";

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
};

async function lookupPilot(token: string): Promise<VerifyResult | null> {
  // Fail fast on malformed input rather than sending it to the database —
  // public_verify_token is a uuid column.
  if (!UUID_RE.test(token)) return null;

  // Service-role client: this route is intentionally reachable with no
  // login, so it can't rely on RLS. Only these three fields are ever
  // selected — no AFSN, no position, no quals, no contact info. That
  // allow-list is the actual security boundary here, not RLS.
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("pilots")
    .select("full_name, rank_code, fit_to_fly, ranks(label)")
    .eq("public_verify_token", token)
    .maybeSingle();

  if (!data) return null;

  const ranks = data.ranks as unknown as { label: string } | null;

  return {
    fullName: data.full_name,
    rankLabel: ranks?.label ?? data.rank_code,
    fitToFly: data.fit_to_fly,
  };
}

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await lookupPilot(token);

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
            {result ? (
              <div className="flex flex-col items-center gap-3 py-2 text-center">
                <PilotAvatar fullName={result.fullName} className="h-16 w-16 text-xl" />
                <p className="text-lg font-semibold">
                  {result.rankLabel} {result.fullName}
                </p>
                <FitToFlyBadge fitToFly={result.fitToFly} />
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
