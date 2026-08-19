import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AuditLogRow } from "@/lib/system/queries";

const TABLE_LABELS: Record<string, string> = {
  pilots: "Pilot",
  licenses: "License",
  qualifications: "Qualification",
  ape_records: "APE Record",
  staneval_records: "StanEval Record",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function fieldSummary(row: AuditLogRow) {
  if (row.fieldChanged === "(record created)") return "Created";
  if (row.fieldChanged === "(record deleted)") return "Deleted";
  return row.fieldChanged;
}

function valueChange(row: AuditLogRow) {
  if (row.fieldChanged === "(record created)" || row.fieldChanged === "(record deleted)") {
    return null;
  }
  return `${row.oldValue ?? "—"} → ${row.newValue ?? "—"}`;
}

export function AuditLogTable({ rows }: { rows: AuditLogRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No changes logged yet.</p>;
  }

  return (
    <>
      <div className="space-y-2 sm:hidden">
        {rows.map((row) => (
          <div key={row.id} className="rounded-lg border p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {TABLE_LABELS[row.tableName] ?? row.tableName} · {fieldSummary(row)}
              </span>
              <span className="text-xs text-muted-foreground">{formatDateTime(row.changedAt)}</span>
            </div>
            {valueChange(row) && <p className="mt-1 text-muted-foreground">{valueChange(row)}</p>}
            <p className="mt-1 text-xs text-muted-foreground">By {row.changedByName}</p>
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Who</TableHead>
              <TableHead>Record</TableHead>
              <TableHead>Field</TableHead>
              <TableHead>Change</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="whitespace-nowrap">{formatDateTime(row.changedAt)}</TableCell>
                <TableCell className="whitespace-nowrap">{row.changedByName}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {TABLE_LABELS[row.tableName] ?? row.tableName}
                </TableCell>
                <TableCell className="whitespace-nowrap">{fieldSummary(row)}</TableCell>
                <TableCell className="text-muted-foreground">{valueChange(row) ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
