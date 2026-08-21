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
import { StatusBadge } from "@/components/status-badge";
import {
  EXPIRING_SOON_THRESHOLD_DAYS,
  type DashboardAlert,
  type DashboardAlertCategory,
} from "@/lib/dashboard/queries";

const CATEGORY_LABELS: Record<DashboardAlertCategory, string> = {
  fitness: "Fitness",
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

export function AlertsCard({ alerts }: { alerts: DashboardAlert[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Alerts</CardTitle>
        <CardDescription>
          Items expired or due within {EXPIRING_SOON_THRESHOLD_DAYS} days, most urgent first.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing needs attention right now.</p>
        ) : (
          <>
            {/* Below sm: stacked cards. A wide table with 5 columns has no
                room to breathe on a phone, and relying on an invisible
                horizontal scrollbar to reveal the rest is easy to miss. */}
            <div className="space-y-3 sm:hidden">
              {alerts.map((alert) => (
                <div key={alert.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{alert.pilotName}</p>
                      <p className="text-xs text-muted-foreground">
                        {CATEGORY_LABELS[alert.category]}
                      </p>
                    </div>
                    <StatusBadge status={alert.status} />
                  </div>
                  <p className="mt-2 text-sm">{alert.detail}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Due {formatDate(alert.dueDate)}
                  </p>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto sm:block">
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
                  {alerts.map((alert) => (
                    <TableRow key={alert.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {alert.pilotName}
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
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
