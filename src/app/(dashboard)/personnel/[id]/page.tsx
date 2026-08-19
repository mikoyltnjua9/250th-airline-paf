import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PilotAvatar } from "@/components/pilots/pilot-avatar";
import { VerifyQr } from "@/components/pilots/verify-qr";
import { StatusBadge, LicenseStatusBadge, StanevalStatusBadge } from "@/components/status-badge";
import { getPilotProfile } from "@/lib/pilots/queries";
import {
  currencyStatus,
  CURRENCY_ITEM_LABELS,
  type CurrencyItemType,
} from "@/lib/types/pilot";

const CURRENCY_ITEM_TYPES = Object.keys(CURRENCY_ITEM_LABELS) as CurrencyItemType[];

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function PilotProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getPilotProfile(id);

  if (!profile) notFound();

  const {
    pilot,
    rankLabel,
    license,
    qualifications,
    flights,
    apeRecords,
    currencyItems,
    stanevalRecords,
  } = profile;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="outline" size="sm">
          <Link href="/personnel">← Directory</Link>
        </Button>
        <Button asChild size="sm">
          <Link href={`/personnel/${id}/edit`}>Edit Pilot</Link>
        </Button>
      </div>

      {/* Personal info + license */}
      <Card>
        <CardContent className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <PilotAvatar fullName={pilot.full_name} className="h-20 w-20 text-2xl" />
          <div className="flex-1 space-y-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {rankLabel} {pilot.full_name}
              </h1>
              <p className="text-muted-foreground">
                {pilot.position} · {pilot.unit_section ?? "Unit not set"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">AFSN</p>
                <p className="font-medium">{pilot.afsn}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">License No.</p>
                <p className="font-medium">{license?.license_no ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Date Issued</p>
                <p className="font-medium">{formatDate(license?.date_issued ?? null)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Date Expires</p>
                <p className="font-medium">{formatDate(license?.date_expires ?? null)}</p>
              </div>
            </div>
            {license && (
              <div>
                <LicenseStatusBadge status={license.status} />
              </div>
            )}
          </div>
          {license && <VerifyQr token={license.public_verify_token} />}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Equipment qualifications */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Equipment Qualifications</CardTitle>
            <Button asChild size="sm">
              <Link href={`/personnel/${id}/qualifications/new`}>Add Qualification</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {qualifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">No qualifications on record.</p>
            ) : (
              <div className="space-y-2">
                {qualifications.map((q) => (
                  <div
                    key={q.id}
                    className="flex items-center justify-between gap-2 rounded-lg border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {q.aircraft_types?.label ?? q.aircraft_type_code}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {q.date_earned ? `Earned ${formatDate(q.date_earned)}` : "In progress"}
                        {q.expiry_date ? ` · Expires ${formatDate(q.expiry_date)}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <StatusBadge status={q.status} />
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/personnel/${id}/qualifications/${q.id}/edit`}>Edit</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Currency status — 4 fixed requirements, at most one row each per
            pilot. Show every slot, even ones with nothing on file yet. */}
        <Card>
          <CardHeader>
            <CardTitle>Currency Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {CURRENCY_ITEM_TYPES.map((itemType) => {
                const item = currencyItems.find((c) => c.item_type === itemType);
                return (
                  <div
                    key={itemType}
                    className="flex items-center justify-between gap-2 rounded-lg border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{CURRENCY_ITEM_LABELS[itemType]}</p>
                      <p className="text-xs text-muted-foreground">
                        {item
                          ? `Last ${formatDate(item.last_date)} · ${item.validity_days}-day window`
                          : "Not on file"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {item && <StatusBadge status={currencyStatus(item)} />}
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/personnel/${id}/currency/${itemType}`}>
                          {item ? "Edit" : "Add"}
                        </Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* APE status — history, most recent first, like StanEval */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle>APE Status</CardTitle>
              <CardDescription>Aviation Physical Examination history.</CardDescription>
            </div>
            <Button asChild size="sm">
              <Link href={`/personnel/${id}/ape/new`}>Add APE Record</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {apeRecords.length === 0 ? (
              <p className="text-sm text-muted-foreground">No APE records on file.</p>
            ) : (
              <div className="space-y-2">
                {apeRecords.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{formatDate(record.last_ape_date)}</p>
                        <Badge
                          className={
                            record.fit_to_fly
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
                              : "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300"
                          }
                        >
                          {record.fit_to_fly ? "Fit to Fly" : "Not Fit to Fly"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {record.classification ?? "No classification"} · Next due{" "}
                        {formatDate(record.next_due_date)}
                      </p>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/personnel/${id}/ape/${record.id}/edit`}>Edit</Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent flights */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Flights</CardTitle>
            <CardDescription>Most recent flying-hours entries.</CardDescription>
          </CardHeader>
          <CardContent>
            {flights.length === 0 ? (
              <p className="text-sm text-muted-foreground">No flights on record.</p>
            ) : (
              <>
                <div className="space-y-2 sm:hidden">
                  {flights.map((f) => (
                    <div key={f.id} className="rounded-lg border p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{f.aircraft_types?.label ?? f.aircraft_type_code}</p>
                        <span className="text-muted-foreground">{formatDate(f.flight_date)}</span>
                      </div>
                      <p className="mt-1 text-muted-foreground">
                        {f.route ?? "—"} · {f.duty} · {f.flying_time_hours.toFixed(1)}h
                      </p>
                    </div>
                  ))}
                </div>
                <div className="hidden overflow-x-auto sm:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Aircraft</TableHead>
                        <TableHead>Route</TableHead>
                        <TableHead>Duty</TableHead>
                        <TableHead className="text-right">Hours</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {flights.map((f) => (
                        <TableRow key={f.id}>
                          <TableCell className="whitespace-nowrap">
                            {formatDate(f.flight_date)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {f.aircraft_types?.label ?? f.aircraft_type_code}
                          </TableCell>
                          <TableCell>{f.route ?? "—"}</TableCell>
                          <TableCell>{f.duty}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {f.flying_time_hours.toFixed(1)}
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
      </div>

      {/* StanEval & Check */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle>StanEval &amp; Check</CardTitle>
            <CardDescription>Standardization/evaluation check ride history.</CardDescription>
          </div>
          <Button asChild size="sm">
            <Link href={`/personnel/${id}/staneval/new`}>Add StanEval</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {stanevalRecords.length === 0 ? (
            <p className="text-sm text-muted-foreground">No StanEval records on file.</p>
          ) : (
            <div className="space-y-2">
              {stanevalRecords.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{formatDate(record.eval_date)}</p>
                      <StanevalStatusBadge status={record.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {record.grading ?? "No grading notes"}
                      {record.next_due_date
                        ? ` · Next due ${formatDate(record.next_due_date)}`
                        : ""}
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/personnel/${id}/staneval/${record.id}/edit`}>Edit</Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
