"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import type { Alert, AlertCategory, Acknowledgement } from "@/lib/alerts/queries";
import { acknowledgeAlert, unacknowledgeAlert } from "@/app/(dashboard)/alerts/actions";

const CATEGORY_LABELS: Record<AlertCategory, string> = {
  license: "License",
  qualification: "Qualification",
  currency: "Currency",
  ape: "APE",
  staneval: "StanEval",
};

const CATEGORIES = Object.keys(CATEGORY_LABELS) as AlertCategory[];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type Row = { alert: Alert; acknowledgement: Acknowledgement | null };

function AckControl({ row }: { row: Row }) {
  const [isPending, startTransition] = useTransition();

  if (row.acknowledgement) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Badge variant="secondary" className="whitespace-nowrap">
          Acknowledged
        </Badge>
        <p className="text-right text-[11px] text-muted-foreground">
          by {row.acknowledgement.acknowledgedByName}
          <br />
          {formatDate(row.acknowledgement.acknowledgedAt)}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          disabled={isPending}
          onClick={() => startTransition(() => unacknowledgeAlert(row.alert.id))}
        >
          Undo
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(() => acknowledgeAlert(row.alert.id, row.alert.pilotId, row.alert.category))
      }
    >
      Acknowledge
    </Button>
  );
}

export function AlertsTable({ rows }: { rows: Row[] }) {
  const [tab, setTab] = useState<"all" | "unacknowledged" | "acknowledged">("all");
  const [category, setCategory] = useState<AlertCategory | "all">("all");
  const [severity, setSeverity] = useState<"all" | "expired" | "expiring_soon">("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(({ alert, acknowledgement }) => {
      if (tab === "unacknowledged" && acknowledgement) return false;
      if (tab === "acknowledged" && !acknowledgement) return false;
      if (category !== "all" && alert.category !== category) return false;
      if (severity !== "all" && alert.status !== severity) return false;
      if (q && !alert.pilotName.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, tab, category, severity, search]);

  const acknowledgedCount = rows.filter((r) => r.acknowledgement).length;

  return (
    <Card>
      <CardContent className="space-y-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="all">All Alerts ({rows.length})</TabsTrigger>
            <TabsTrigger value="unacknowledged">
              Unacknowledged ({rows.length - acknowledgedCount})
            </TabsTrigger>
            <TabsTrigger value="acknowledged">Acknowledged ({acknowledgedCount})</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search pilot…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-40"
          />
          <Select value={category} onValueChange={(v) => setCategory(v as AlertCategory | "all")}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={severity}
            onValueChange={(v) => setSeverity(v as "all" | "expired" | "expiring_soon")}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
            </SelectContent>
          </Select>
          <span className="ml-auto text-xs text-muted-foreground">
            {filtered.length} of {rows.length}
          </span>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">No alerts match these filters.</p>
        ) : (
          <>
            {/* Below sm: stacked cards, same reasoning as the Dashboard's AlertsCard. */}
            <div className="space-y-3 sm:hidden">
              {filtered.map((row) => (
                <div key={row.alert.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/personnel/${row.alert.pilotId}`}
                        className="truncate font-medium hover:underline"
                      >
                        {row.alert.pilotName}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {CATEGORY_LABELS[row.alert.category]}
                      </p>
                    </div>
                    <StatusBadge status={row.alert.status} />
                  </div>
                  <p className="mt-2 text-sm">{row.alert.detail}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Due {formatDate(row.alert.dueDate)}
                  </p>
                  <div className="mt-3 flex justify-end">
                    <AckControl row={row} />
                  </div>
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
                    <TableHead>Severity</TableHead>
                    <TableHead className="text-right">Acknowledgement</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row) => (
                    <TableRow key={row.alert.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        <Link href={`/personnel/${row.alert.pilotId}`} className="hover:underline">
                          {row.alert.pilotName}
                        </Link>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {CATEGORY_LABELS[row.alert.category]}
                      </TableCell>
                      <TableCell>{row.alert.detail}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(row.alert.dueDate)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={row.alert.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <AckControl row={row} />
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
