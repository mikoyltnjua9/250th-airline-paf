import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PilotAvatar } from "@/components/pilots/pilot-avatar";
import { FitToFlyBadge } from "@/components/status-badge";
import { ReactivatePilotButton } from "@/components/pilots/reactivate-pilot-button";
import { getPilotDirectory, type DirectoryRow } from "@/lib/pilots/queries";

function PilotList({ pilots, showReactivate }: { pilots: DirectoryRow[]; showReactivate?: boolean }) {
  if (pilots.length === 0) {
    return (
      <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground ring-1 ring-foreground/10">
        {showReactivate ? "No deactivated pilots." : "No pilots yet. Add the first one to get started."}
      </p>
    );
  }

  return (
    <div className="divide-y overflow-hidden rounded-xl border bg-card ring-1 ring-foreground/10">
      {pilots.map((pilot) => (
        <Link
          key={pilot.id}
          href={`/personnel/${pilot.id}`}
          className="flex items-center gap-4 p-4 transition-colors hover:bg-muted/50"
        >
          <PilotAvatar fullName={pilot.full_name} photoUrl={pilot.photo_url} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">
              {pilot.ranks?.label ?? pilot.rank_code} {pilot.full_name}
            </p>
          </div>
          {showReactivate ? (
            <ReactivatePilotButton pilotId={pilot.id} />
          ) : (
            <FitToFlyBadge fitToFly={pilot.fit_to_fly} />
          )}
        </Link>
      ))}
    </div>
  );
}

export default async function PersonnelPage() {
  const [activePilots, inactivePilots] = await Promise.all([
    getPilotDirectory("active"),
    getPilotDirectory("inactive"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Personnel Directory</h1>
          <p className="text-muted-foreground">{activePilots.length} pilots on record.</p>
        </div>
        <Button asChild>
          <Link href="/personnel/new">Add Pilot</Link>
        </Button>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active ({activePilots.length})</TabsTrigger>
          <TabsTrigger value="deactivated">Deactivated ({inactivePilots.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="pt-4">
          <PilotList pilots={activePilots} />
        </TabsContent>
        <TabsContent value="deactivated" className="pt-4">
          <PilotList pilots={inactivePilots} showReactivate />
        </TabsContent>
      </Tabs>
    </div>
  );
}
