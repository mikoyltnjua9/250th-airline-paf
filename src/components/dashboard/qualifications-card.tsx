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
import { MOCK_QUALIFICATION_SUMMARY } from "@/lib/mock/dashboard";

export function QualificationsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Equipment Qualifications</CardTitle>
        <CardDescription>Pilots qualified per aircraft type, by status.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aircraft</TableHead>
                <TableHead className="text-right">Current</TableHead>
                <TableHead className="text-right">Expiring</TableHead>
                <TableHead className="text-right">Expired</TableHead>
                <TableHead className="text-right">In Training</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_QUALIFICATION_SUMMARY.map((row) => (
                <TableRow key={row.aircraftType}>
                  <TableCell className="font-medium whitespace-nowrap">
                    {row.aircraftType}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                    {row.current || "–"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-amber-600 dark:text-amber-400">
                    {row.expiringSoon || "–"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-red-600 dark:text-red-400">
                    {row.expired || "–"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sky-600 dark:text-sky-400">
                    {row.inTraining || "–"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
