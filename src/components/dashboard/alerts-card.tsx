import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/dashboard/status-badge";
import {
  EXPIRING_SOON_THRESHOLD_DAYS,
  MOCK_ALERTS,
  findPilot,
  type AlertCategory,
} from "@/lib/mock/dashboard";

const CATEGORY_LABELS: Record<AlertCategory, string> = {
  license: "License",
  qualification: "Qualification",
  currency: "Currency",
  ape: "APE",
  staneval: "StanEval",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function AlertsCard() {
  const sorted = [...MOCK_ALERTS].sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alerts</CardTitle>
        <CardDescription>
          Items expired or due within {EXPIRING_SOON_THRESHOLD_DAYS} days, most urgent first.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing needs attention right now.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pilot</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Detail</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((alert) => {
                  const pilot = findPilot(alert.pilotId);
                  return (
                    <TableRow key={alert.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {pilot ? `${pilot.rank} ${pilot.fullName}` : "Unknown pilot"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {CATEGORY_LABELS[alert.category]}
                      </TableCell>
                      <TableCell>{alert.detail}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(alert.dueDate)}
                      </TableCell>
                      <TableCell className="text-right">
                        <StatusBadge status={alert.status} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
