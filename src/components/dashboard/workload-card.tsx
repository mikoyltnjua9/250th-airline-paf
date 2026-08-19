import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MOCK_WORKLOAD, findPilot } from "@/lib/mock/dashboard";

export function WorkloadCard() {
  const sorted = [...MOCK_WORKLOAD].sort((a, b) => b.hoursLast30Days - a.hoursLast30Days);
  const maxHours = Math.max(...sorted.map((w) => w.hoursLast30Days));
  const totalHours = sorted.reduce((sum, w) => sum + w.hoursLast30Days, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Duty &amp; Workload</CardTitle>
        <CardDescription>
          Flight hours by pilot, last 30 days · {totalHours.toFixed(1)} hrs wing total.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {sorted.map((entry) => {
          const pilot = findPilot(entry.pilotId);
          const widthPct = maxHours > 0 ? (entry.hoursLast30Days / maxHours) * 100 : 0;
          return (
            <div key={entry.pilotId} className="flex items-center gap-2 sm:gap-3">
              <span className="w-24 shrink-0 truncate text-sm sm:w-40">
                {pilot ? `${pilot.rank} ${pilot.fullName}` : "Unknown pilot"}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${widthPct}%` }}
                />
              </div>
              <span className="w-12 shrink-0 text-right text-sm tabular-nums text-muted-foreground sm:w-14">
                {entry.hoursLast30Days.toFixed(1)}h
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
