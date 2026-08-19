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
import { CURRENCY_ITEM_LABELS, MOCK_CURRENCY_SUMMARY } from "@/lib/mock/dashboard";

export function CurrencyCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Currency Status</CardTitle>
        <CardDescription>Pilots current on each flight-currency requirement.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 sm:hidden">
          {MOCK_CURRENCY_SUMMARY.map((row) => (
            <div key={row.itemType} className="rounded-lg border p-3">
              <p className="font-medium">{CURRENCY_ITEM_LABELS[row.itemType]}</p>
              <div className="mt-2 grid grid-cols-3 gap-x-4 gap-y-1 text-sm">
                <p>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    {row.current}
                  </span>{" "}
                  <span className="text-muted-foreground">current</span>
                </p>
                <p>
                  <span className="font-medium text-amber-600 dark:text-amber-400">
                    {row.expiringSoon}
                  </span>{" "}
                  <span className="text-muted-foreground">expiring</span>
                </p>
                <p>
                  <span className="font-medium text-red-600 dark:text-red-400">
                    {row.expired}
                  </span>{" "}
                  <span className="text-muted-foreground">expired</span>
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden overflow-x-auto sm:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Requirement</TableHead>
                <TableHead className="text-right">Current</TableHead>
                <TableHead className="text-right">Expiring</TableHead>
                <TableHead className="text-right">Expired</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_CURRENCY_SUMMARY.map((row) => (
                <TableRow key={row.itemType}>
                  <TableCell className="font-medium whitespace-nowrap">
                    {CURRENCY_ITEM_LABELS[row.itemType]}
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
