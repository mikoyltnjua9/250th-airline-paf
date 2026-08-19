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
import { StatusBadge, LicenseStatusBadge } from "@/components/status-badge";
import { getPilotProfile } from "@/lib/pilots/queries";
import { currencyStatus, CURRENCY_ITEM_LABELS } from "@/lib/types/pilot";

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

  const { pilot, rankLabel, license, qualifications, flights, ape, currencyItems } = profile;

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
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Equipment qualifications */}
        <Card>
          <CardHeader>
            <CardTitle>Equipment Qualifications</CardTitle>
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
                    <StatusBadge status={q.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Currency status */}
        <Card>
          <CardHeader>
            <CardTitle>Currency Status</CardTitle>
          </CardHeader>
          <CardContent>
            {currencyItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No currency items on record.</p>
            ) : (
              <div className="space-y-2">
                {currencyItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 rounded-lg border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{CURRENCY_ITEM_LABELS[item.item_type]}</p>
                      <p className="text-xs text-muted-foreground">
                        Last {formatDate(item.last_date)} · {item.validity_days}-day window
                      </p>
                    </div>
                    <StatusBadge status={currencyStatus(item)} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* APE status */}
        <Card>
          <CardHeader>
            <CardTitle>APE Status</CardTitle>
            <CardDescription>Aviation Physical Examination</CardDescription>
          </CardHeader>
          <CardContent>
            {ape ? (
              <div className="space-y-3 text-sm">
                <Badge
                  className={
                    ape.fit_to_fly
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
                      : "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300"
                  }
                >
                  {ape.fit_to_fly ? "Fit to Fly" : "Not Fit to Fly"}
                </Badge>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Last APE</p>
                    <p className="font-medium">{formatDate(ape.last_ape_date)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Next Due</p>
                    <p className="font-medium">{formatDate(ape.next_due_date)}</p>
                  </div>
                </div>
                {ape.classification && (
                  <div>
                    <p className="text-xs text-muted-foreground">Classification</p>
                    <p className="font-medium">{ape.classification}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No APE record on file.</p>
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
    </div>
  );
}
