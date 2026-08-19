import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PrintButton } from "@/components/reports/print-button";
import { getReportDefinition } from "@/lib/reports/queries";

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const report = getReportDefinition(slug);
  if (!report) notFound();

  const rows = await report.getRows();
  const generatedAt = new Date().toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short",
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <Link
            href="/reports"
            className="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Reports &amp; Analytics
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{report.title}</h1>
          <p className="text-muted-foreground">{report.description}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <PrintButton />
          <Button asChild variant="outline" size="sm">
            <a href={`/reports/${report.slug}/export`}>
              <Download className="h-4 w-4" />
              Export CSV
            </a>
          </Button>
        </div>
      </div>

      {/* Print-only masthead — the app chrome (header/sidebar/footer) is
       * hidden via print:hidden, so this is what actually shows on paper. */}
      <div className="hidden print:block">
        <p className="text-xs font-semibold uppercase tracking-wide">
          250th Presidential Airlift Wing — Wing Safety Dashboard
        </p>
        <h1 className="text-xl font-bold">{report.title}</h1>
        <p className="text-xs text-muted-foreground">
          Generated {generatedAt} · {rows.length} row{rows.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border ring-1 ring-foreground/10 print:rounded-none print:border-0 print:ring-0">
        <Table>
          <TableHeader>
            <TableRow>
              {report.columns.map((col) => (
                <TableHead key={col.key} className={col.numeric ? "text-right" : undefined}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={report.columns.length} className="text-center text-muted-foreground">
                  No data for this report yet.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, i) => (
                <TableRow key={i}>
                  {report.columns.map((col) => (
                    <TableCell key={col.key} className={col.numeric ? "text-right tabular-nums" : undefined}>
                      {row[col.key]}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground print:hidden">
        {rows.length} row{rows.length === 1 ? "" : "s"} · generated {generatedAt}
      </p>
    </div>
  );
}
