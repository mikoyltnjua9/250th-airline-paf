import Link from "next/link";
import { notFound } from "next/navigation";
import { Mail, Phone, ScanLine } from "lucide-react";
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
import { DutyGauge } from "@/components/pilots/duty-gauge";
import { CrewQualificationToggle } from "@/components/pilots/crew-qualification-toggle";
import { AlertsCard } from "@/components/dashboard/alerts-card";
import { ConfirmActionButton } from "@/components/confirm-action-button";
import { ReactivatePilotButton } from "@/components/pilots/reactivate-pilot-button";
import { PrintButton } from "@/components/reports/print-button";
import {
  StatusBadge,
  FitToFlyBadge,
  StanevalStatusBadge,
  TrainingStatusBadge,
} from "@/components/status-badge";
import { getPilotProfile, getDutyStatus } from "@/lib/pilots/queries";
import { getAlerts } from "@/lib/alerts/queries";
import { deactivatePilot } from "@/app/(dashboard)/personnel/actions";
import { deleteQualification } from "@/app/(dashboard)/personnel/[id]/qualifications/actions";
import { deleteCurrencyItem } from "@/app/(dashboard)/personnel/[id]/currency/actions";
import { deleteApeRecord } from "@/app/(dashboard)/personnel/[id]/ape/actions";
import { deleteFlight } from "@/app/(dashboard)/personnel/[id]/flights/actions";
import { deleteStanevalRecord } from "@/app/(dashboard)/personnel/[id]/staneval/actions";
import { deleteTrainingRecord } from "@/app/(dashboard)/personnel/[id]/training/actions";
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
  const [profile, allAlerts, dutyStatus] = await Promise.all([
    getPilotProfile(id),
    getAlerts(),
    getDutyStatus(id),
  ]);

  if (!profile) notFound();

  const pilotAlerts = allAlerts.filter((a) => a.pilotId === id);

  const {
    pilot,
    rankLabel,
    qualifications,
    flights,
    flightTotals,
    apeRecords,
    currencyItems,
    stanevalRecords,
    trainingRecords,
    crewRoles,
    crewQualifications,
  } = profile;

  const latestApe = apeRecords[0] ?? null;
  const latestStaneval = stanevalRecords[0] ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Button asChild variant="outline" size="sm">
          <Link href="/personnel">← Directory</Link>
        </Button>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/personnel/${id}/edit`}>Edit Pilot</Link>
          </Button>
          {pilot.active ? (
            <ConfirmActionButton
              onConfirm={deactivatePilot.bind(null, id)}
              triggerLabel="Deactivate Pilot"
              triggerVariant="outline"
              title="Deactivate this pilot?"
              description="They'll be hidden from the Directory, Dashboard, Alerts, Duty & Workload, and Reports. All their records stay intact, and they can be reactivated anytime."
              confirmLabel="Deactivate"
            />
          ) : (
            <ReactivatePilotButton pilotId={id} />
          )}
        </div>
      </div>

      {!pilot.active && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 print:hidden dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          This pilot is deactivated — hidden from the Directory, Dashboard, Alerts, Duty &amp;
          Workload, and Reports. Their records are all still here.
        </div>
      )}

      {/* Row 1: identity + QR, and Duty & Workload */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <PilotAvatar
              fullName={pilot.full_name}
              photoUrl={pilot.photo_url}
              className="h-20 w-20 text-2xl"
            />
            <div className="flex-1 space-y-4">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  {rankLabel} {pilot.full_name}
                </h1>
                <p className="text-muted-foreground">{pilot.position}</p>
              </div>
              <div className="flex flex-wrap items-center gap-6 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">AFSN</p>
                  <p className="font-medium">{pilot.afsn}</p>
                </div>
                <FitToFlyBadge fitToFly={pilot.fit_to_fly} />
              </div>
              {(pilot.contact_phone || pilot.contact_email) && (
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {pilot.contact_phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" /> {pilot.contact_phone}
                    </span>
                  )}
                  {pilot.contact_email && (
                    <span className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5" /> {pilot.contact_email}
                    </span>
                  )}
                </div>
              )}
            </div>
            <VerifyQr token={pilot.public_verify_token} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Duty &amp; Workload Status</CardTitle>
          </CardHeader>
          <CardContent>
            <DutyGauge status={dutyStatus} />
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Authorized Equipment + Qualification Status (crew role) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Authorized Equipment</CardTitle>
            <Button asChild size="sm">
              <Link href={`/personnel/${id}/qualifications/new`}>Add Qualification</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {qualifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">No qualifications on record.</p>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {qualifications.map((q) => (
                  <div key={q.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 truncate font-medium">
                        {q.aircraft_types?.label ?? q.aircraft_type_code}
                      </p>
                      <StatusBadge status={q.status} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {q.date_earned ? `Earned ${formatDate(q.date_earned)}` : "In progress"}
                      {q.expiry_date ? ` · Expires ${formatDate(q.expiry_date)}` : ""}
                    </p>
                    <div className="mt-2 flex justify-end gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/personnel/${id}/qualifications/${q.id}/edit`}>Edit</Link>
                      </Button>
                      <ConfirmActionButton
                        onConfirm={deleteQualification.bind(null, id, q.id)}
                        triggerLabel="Delete"
                        title="Delete this qualification?"
                        description="This can't be undone."
                        confirmLabel="Delete"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Qualification Status</CardTitle>
            <CardDescription>Crew role, independent of aircraft type. Click to toggle.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {crewRoles.map((role) => {
                const q = crewQualifications.find((cq) => cq.role_code === role.code);
                return (
                  <div
                    key={role.code}
                    className="flex items-center justify-between gap-2 rounded-lg border p-3"
                  >
                    <p className="font-medium">{role.label}</p>
                    <CrewQualificationToggle
                      pilotId={id}
                      roleCode={role.code}
                      qualified={q?.qualified ?? false}
                    />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Flying Hours + APE Status */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle>Previous Flights &amp; Flying Hours</CardTitle>
              <CardDescription>
                {flightTotals.flightCount} flight{flightTotals.flightCount === 1 ? "" : "s"} on
                record · {flightTotals.flyingHours.toFixed(1)}h flying, all-time. Showing 10 most
                recent.
              </CardDescription>
            </div>
            <Button asChild size="sm">
              <Link href={`/personnel/${id}/flights/new`}>Add Flight</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {flights.length === 0 ? (
              <p className="text-sm text-muted-foreground">No flights on record.</p>
            ) : (
              <>
                <div className="space-y-2 sm:hidden">
                  {flights.map((f) => (
                    <Link
                      key={f.id}
                      href={`/personnel/${id}/flights/${f.id}/edit`}
                      className="block rounded-lg border p-3 text-sm transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{f.aircraft_types?.label ?? f.aircraft_type_code}</p>
                        <span className="text-muted-foreground">{formatDate(f.flight_date)}</span>
                      </div>
                      <p className="mt-1 text-muted-foreground">
                        {f.route ?? "—"} · {f.duty} · {f.flying_time_hours.toFixed(1)}h
                      </p>
                      <div className="mt-2 flex justify-end">
                        <ConfirmActionButton
                          onConfirm={deleteFlight.bind(null, id, f.id)}
                          triggerLabel="Delete"
                          title="Delete this flight?"
                          description="This can't be undone."
                          confirmLabel="Delete"
                        />
                      </div>
                    </Link>
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
                        <TableHead className="text-right">
                          <span className="sr-only">Edit</span>
                        </TableHead>
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
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button asChild variant="outline" size="sm">
                                <Link href={`/personnel/${id}/flights/${f.id}/edit`}>Edit</Link>
                              </Button>
                              <ConfirmActionButton
                                onConfirm={deleteFlight.bind(null, id, f.id)}
                                triggerLabel="Delete"
                                title="Delete this flight?"
                                description="This can't be undone."
                                confirmLabel="Delete"
                              />
                            </div>
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

        <Card>
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle>APE Status</CardTitle>
              <CardDescription>
                {latestApe
                  ? `Fit to Fly: ${latestApe.fit_to_fly ? "Yes" : "No"} · Classification ${latestApe.classification ?? "—"}`
                  : "Aviation Physical Examination history."}
              </CardDescription>
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
                    <div className="flex shrink-0 items-center gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/personnel/${id}/ape/${record.id}/edit`}>Edit</Link>
                      </Button>
                      <ConfirmActionButton
                        onConfirm={deleteApeRecord.bind(null, id, record.id)}
                        triggerLabel="Delete"
                        title="Delete this APE record?"
                        description="This can't be undone."
                        confirmLabel="Delete"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Currency Status + StanEval & Check */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
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
                      {item && (
                        <ConfirmActionButton
                          onConfirm={deleteCurrencyItem.bind(null, id, itemType)}
                          triggerLabel="Delete"
                          title="Delete this currency record?"
                          description="This can't be undone."
                          confirmLabel="Delete"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle>StanEval &amp; Grading</CardTitle>
              <CardDescription>
                {latestStaneval
                  ? `Current status: ${latestStaneval.status === "pass" ? "Current" : "Fail"}`
                  : "Standardization/evaluation check ride history."}
              </CardDescription>
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
                    <div className="flex shrink-0 items-center gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/personnel/${id}/staneval/${record.id}/edit`}>Edit</Link>
                      </Button>
                      <ConfirmActionButton
                        onConfirm={deleteStanevalRecord.bind(null, id, record.id)}
                        triggerLabel="Delete"
                        title="Delete this StanEval record?"
                        description="This can't be undone."
                        confirmLabel="Delete"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 5: Training Records + Alerts */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle>Training Records</CardTitle>
              <CardDescription>Recurrent and specialized training history.</CardDescription>
            </div>
            <Button asChild size="sm">
              <Link href={`/personnel/${id}/training/new`}>Add Training Record</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {trainingRecords.length === 0 ? (
              <p className="text-sm text-muted-foreground">No training records on file.</p>
            ) : (
              <div className="space-y-2">
                {trainingRecords.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium">{record.training_type}</p>
                        <TrainingStatusBadge status={record.status} />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(record.training_date)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/personnel/${id}/training/${record.id}/edit`}>Edit</Link>
                      </Button>
                      <ConfirmActionButton
                        onConfirm={deleteTrainingRecord.bind(null, id, record.id)}
                        triggerLabel="Delete"
                        title="Delete this training record?"
                        description="This can't be undone."
                        confirmLabel="Delete"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <AlertsCard alerts={pilotAlerts} />
      </div>

      {/* Quick Actions */}
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/personnel/${id}/verify/print`}>
              <ScanLine className="h-4 w-4" />
              Print ID Card
            </Link>
          </Button>
          <PrintButton />
          {pilot.contact_email || pilot.contact_phone ? (
            <Button asChild variant="outline" size="sm">
              <a href={pilot.contact_email ? `mailto:${pilot.contact_email}` : `tel:${pilot.contact_phone}`}>
                <Mail className="h-4 w-4" />
                Contact Personnel
              </a>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled
              title="No phone or email on file — add one from Edit Pilot"
            >
              <Mail className="h-4 w-4" />
              Contact Personnel
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
