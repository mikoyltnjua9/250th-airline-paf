import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PilotAvatar } from "@/components/pilots/pilot-avatar";
import { LicenseStatusBadge } from "@/components/status-badge";
import { getPilotDirectory } from "@/lib/pilots/queries";

export default async function PersonnelPage() {
  const pilots = await getPilotDirectory();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Personnel Directory</h1>
          <p className="text-muted-foreground">{pilots.length} pilots on record.</p>
        </div>
        <Button asChild>
          <Link href="/personnel/new">Add Pilot</Link>
        </Button>
      </div>

      <div className="divide-y overflow-hidden rounded-xl border bg-card ring-1 ring-foreground/10">
        {pilots.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            No pilots yet. Add the first one to get started.
          </p>
        ) : (
          pilots.map((pilot) => {
            const licenseStatus = pilot.licenses[0]?.status;
            return (
              <Link
                key={pilot.id}
                href={`/personnel/${pilot.id}`}
                className="flex items-center gap-4 p-4 transition-colors hover:bg-muted/50"
              >
                <PilotAvatar fullName={pilot.full_name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {pilot.ranks?.label ?? pilot.rank_code} {pilot.full_name}
                  </p>
                </div>
                {licenseStatus && <LicenseStatusBadge status={licenseStatus} />}
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
