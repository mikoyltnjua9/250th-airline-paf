import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { WorkloadRow } from "@/lib/pilots/queries";

/** Top-N preview on the Overview — the full, sortable breakdown lives at
 * /duty-workload. Avoids duplicating that page's aggregation logic here. */
export function WorkloadCard({ rows, totalHours }: { rows: WorkloadRow[]; totalHours: number }) {
  const maxHours = Math.max(...rows.map((r) => r.hours), 1);

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <div>
          <CardTitle>Duty &amp; Workload</CardTitle>
          <CardDescription>
            Flight hours by pilot, last 30 days · {totalHours.toFixed(1)} hrs wing total.
          </CardDescription>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/duty-workload">View all</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pilots on record.</p>
        ) : (
          rows.map((row) => {
            const widthPct = (row.hours / maxHours) * 100;
            return (
              <div key={row.pilotId} className="flex items-center gap-2 sm:gap-3">
                <span className="w-24 shrink-0 truncate text-sm sm:w-40">
                  {row.rankLabel} {row.fullName}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${widthPct}%` }} />
                </div>
                <span className="w-12 shrink-0 text-right text-sm tabular-nums text-muted-foreground sm:w-14">
                  {row.hours.toFixed(1)}h
                </span>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
