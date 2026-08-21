import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PersonnelDirectory } from "@/components/pilots/personnel-directory";
import { getPilotDirectory } from "@/lib/pilots/queries";

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

      <PersonnelDirectory activePilots={activePilots} inactivePilots={inactivePilots} />
    </div>
  );
}
