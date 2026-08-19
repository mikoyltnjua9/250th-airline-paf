import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatTile } from "@/components/stat-tile";
import { getDutyWorkload } from "@/lib/pilots/queries";

const WINDOW_DAYS = 30;

export default async function DutyWorkloadPage() {
  const rows = await getDutyWorkload(WINDOW_DAYS);

  const totalHours = rows.reduce((sum, r) => sum + r.hours, 0);
  const averageHours = rows.length > 0 ? totalHours / rows.length : 0;
  const zeroFlightCount = rows.filter((r) => r.flightCount === 0).length;
  const maxHours = Math.max(...rows.map((r) => r.hours), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Duty &amp; Workload</h1>
        <p className="text-muted-foreground">
          Flight hours by pilot, last {WINDOW_DAYS} days — spot who&apos;s overloaded or
          underused.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Wing Total" value={totalHours.toFixed(1)} hint="hours, last 30 days" />
        <StatTile
          label="Average per Pilot"
          value={averageHours.toFixed(1)}
          hint={`across ${rows.length} pilots`}
        />
        <StatTile
          label="No Flights Logged"
          value={zeroFlightCount}
          hint="in the last 30 days"
          tone={zeroFlightCount > 0 ? "warning" : "good"}
        />
        <StatTile label="Pilots" value={rows.length} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>By Pilot</CardTitle>
          <CardDescription>Sorted heaviest workload first.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pilots on record.</p>
          ) : (
            rows.map((row) => {
              const widthPct = (row.hours / maxHours) * 100;
              return (
                <Link
                  key={row.pilotId}
                  href={`/personnel/${row.pilotId}`}
                  className="block rounded-lg p-2 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-32 shrink-0 truncate text-sm font-medium sm:w-48">
                      {row.rankLabel} {row.fullName}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                    <span className="w-24 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
                      {row.hours.toFixed(1)}h · {row.flightCount}
                    </span>
                  </div>
                </Link>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
