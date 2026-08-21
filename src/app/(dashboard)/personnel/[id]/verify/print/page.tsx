import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PilotAvatar } from "@/components/pilots/pilot-avatar";
import { VerifyQr } from "@/components/pilots/verify-qr";
import { FitToFlyBadge } from "@/components/status-badge";
import { PrintButton } from "@/components/reports/print-button";
import { getPilotProfile } from "@/lib/pilots/queries";

export default async function PrintIdCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getPilotProfile(id);
  if (!profile) notFound();

  const { pilot, rankLabel } = profile;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Link
          href={`/personnel/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Profile
        </Link>
        <PrintButton />
      </div>

      <div className="rounded-xl border p-6 ring-1 ring-foreground/10 print:rounded-none print:border-0 print:p-0 print:ring-0">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide">
            250th Presidential Airlift Wing
          </p>
          <p className="text-xs text-muted-foreground">Personnel Verification</p>
        </div>

        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <PilotAvatar
              fullName={pilot.full_name}
              photoUrl={pilot.photo_url}
              className="h-20 w-20 text-2xl"
            />
            <div className="space-y-3 text-center sm:text-left">
              <div>
                <h1 className="text-xl font-semibold tracking-tight">
                  {rankLabel} {pilot.full_name}
                </h1>
                <p className="text-sm text-muted-foreground">{pilot.position}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">AFSN</p>
                <p className="font-medium">{pilot.afsn}</p>
              </div>
              <FitToFlyBadge fitToFly={pilot.fit_to_fly} />
            </div>
          </div>
          <VerifyQr token={pilot.public_verify_token} />
        </div>
      </div>
    </div>
  );
}
