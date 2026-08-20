import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PilotAvatar } from "@/components/pilots/pilot-avatar";
import { VerifyQr } from "@/components/pilots/verify-qr";
import { LicenseStatusBadge } from "@/components/status-badge";
import { PrintButton } from "@/components/reports/print-button";
import { getPilotProfile } from "@/lib/pilots/queries";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function PrintLicensePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getPilotProfile(id);
  if (!profile) notFound();

  const { pilot, rankLabel, license } = profile;

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
          <p className="text-xs text-muted-foreground">Digital Pilot License</p>
        </div>

        {!license ? (
          <p className="text-center text-sm text-muted-foreground">
            No license on file for this pilot.
          </p>
        ) : (
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              <PilotAvatar fullName={pilot.full_name} className="h-20 w-20 text-2xl" />
              <div className="space-y-3 text-center sm:text-left">
                <div>
                  <h1 className="text-xl font-semibold tracking-tight">
                    {rankLabel} {pilot.full_name}
                  </h1>
                  <p className="text-sm text-muted-foreground">{pilot.position}</p>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">AFSN</p>
                    <p className="font-medium">{pilot.afsn}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">License No.</p>
                    <p className="font-medium">{license.license_no}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Date Issued</p>
                    <p className="font-medium">{formatDate(license.date_issued)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Date Expires</p>
                    <p className="font-medium">{formatDate(license.date_expires)}</p>
                  </div>
                </div>
                <LicenseStatusBadge status={license.status} />
              </div>
            </div>
            <VerifyQr token={license.public_verify_token} />
          </div>
        )}
      </div>
    </div>
  );
}
