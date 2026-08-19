import "server-only";
import type { ReportColumn, ReportRow } from "@/lib/reports/queries";

function escapeCsvValue(value: string | number): string {
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Builds an RFC 4180-ish CSV string (CRLF line endings, quoted where needed). */
export function toCsv(columns: ReportColumn[], rows: ReportRow[]): string {
  const header = columns.map((c) => escapeCsvValue(c.header)).join(",");
  const lines = rows.map((row) =>
    columns.map((c) => escapeCsvValue(row[c.key] ?? "")).join(","),
  );
  return [header, ...lines].join("\r\n") + "\r\n";
}
