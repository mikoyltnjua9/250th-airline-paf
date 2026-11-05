import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { PersonnelClassCount } from "@/lib/dashboard/queries";

/** Everyone on record, by classification. Each tile opens the directory on that group. */
export function PersonnelByClassCard({ rows, total }: { rows: PersonnelClassCount[]; total: number }) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <div>
          <CardTitle>Personnel</CardTitle>
          <CardDescription>{total} active personnel on record, by classification.</CardDescription>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/personnel">View all</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {rows.map((row) => (
            <Link
              key={row.key}
              href={`/personnel?class=${row.key}`}
              className="rounded-lg border bg-card p-3 transition-colors hover:bg-muted/50"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{row.label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{row.count}</p>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
