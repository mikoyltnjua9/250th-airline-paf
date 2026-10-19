import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PersonnelDirectory } from "@/components/pilots/personnel-directory";
import { getPilotDirectory } from "@/lib/pilots/queries";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { hasPermission } from "@/lib/permissions";

export default async function PersonnelPage() {
  const [activePilots, inactivePilots, me] = await Promise.all([
    getPilotDirectory("active"),
    getPilotDirectory("inactive"),
    getCurrentProfile(),
  ]);
  // Adding, deactivating and reactivating people is for super admins.
  const canManage = hasPermission(me?.role_code, "pilots:manage");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Personnel Directory</h1>
          <p className="text-muted-foreground">{activePilots.length} personnel on record.</p>
        </div>
        {canManage && (
          <Button asChild>
            <Link href="/personnel/new">Add Pilot</Link>
          </Button>
        )}
      </div>

      <PersonnelDirectory
        activePilots={activePilots}
        inactivePilots={inactivePilots}
        canManage={canManage}
      />
    </div>
  );
}
