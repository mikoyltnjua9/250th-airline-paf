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
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { hasPermission, type Permission } from "@/lib/permissions";
import { PersonExamsCard } from "@/components/exams/person-exams-card";
import { getCbtaAssessments } from "@/lib/cbta/queries";
import { OUTCOME_LABELS } from "@/lib/cbta/competencies";
import { deleteCbtaAssessment } from "@/app/(dashboard)/personnel/[id]/cbta/actions";
import { formatIsoDate } from "@/lib/dates";
import { getPersonExams, getRecentAttempts } from "@/lib/exams/admin-queries";
import { deactivatePilot } from "@/app/(dashboard)/personnel/actions";
import { deleteQualification } from "@/app/(dashboard)/personnel/[id]/qualifications/actions";
import { deleteCurrencyItem } from "@/app/(dashboard)/personnel/[id]/currency/actions";
import { deleteApeRecord } from "@/app/(dashboard)/personnel/[id]/ape/actions";
import { deleteFlight } from "@/app/(dashboard)/personnel/[id]/flights/actions";
import { deleteStanevalRecord } from "@/app/(dashboard)/personnel/[id]/staneval/actions";
import { deleteTrainingRecord } from "@/app/(dashboard)/personnel/[id]/training/actions";
import {
  currencyStatus,
  currencyItemTypesForPosition,
  crewRolesForPosition,
  effectiveFitness,
  personnelTypeForPosition,
  CURRENCY_ITEM_LABELS,
} from "@/lib/types/pilot";

/** A link when the viewer may follow it, otherwise the same box without one. */
function MaybeLink({
  href,
  className,
  children,
}: {
  href: string | null;
  className?: string;
  children: React.ReactNode;
}) {
  return href ? (
    <Link href={href} className={className}>
      {children}
    </Link>
  ) : (
    <div className={className}>{children}</div>
  );
}

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
  const [profile, allAlerts, dutyStatus, me] = await Promise.all([
    getPilotProfile(id),
    getAlerts(),
    getDutyStatus(id),
    getCurrentProfile(),
  ]);

  if (!profile) notFound();

  // What this account may change on the page. The database enforces the same
  // rules; this just keeps buttons the account couldn't use off the screen.
  const can = (permission: Permission) => hasPermission(me?.role_code, permission);
  const canManagePerson = can("pilots:manage");
  const canQualifications = can("qualifications:manage");
  const canFlights = can("flights:manage");
  const canApe = can("ape:manage");
  const canCurrency = can("currency:manage");
  const canStaneval = can("staneval:manage");
  const canCbta = can("cbta:manage");
  const canTraining = can("training:manage");
  const canExams = can("exams:manage");

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

  // The pilot-only panels (flying, APE, currency, equipment, crew roles, duty
  // gauge, fitness) are hidden for maintenance staff, cabin crew and others.
  const personnelType = personnelTypeForPosition(pilot.position);
  const isPilot = personnelType === "pilot";
  // Pilots, maintenance staff and cabin crew take written exams.
  const examData =
    personnelType !== "other" && canExams
      ? await Promise.all([getPersonExams(id, personnelType), getRecentAttempts(20, id)])
      : null;
  const cbtaSlips = isPilot ? await getCbtaAssessments(id) : [];
  const currencyItemTypes = currencyItemTypesForPosition(pilot.position);
  // Currency is tracked per aircraft the pilot is qualified on, so a pilot who
  // flies two types gets a separate set of requirements for each.
  const currencyGroups = (() => {
    const aircraft = new Map<string, string>();
    for (const q of qualifications) {
      aircraft.set(q.aircraft_type_code, q.aircraft_types?.label ?? q.aircraft_type_code);
    }
    for (const c of currencyItems) {
      if (c.aircraft_type_code && !aircraft.has(c.aircraft_type_code)) {
        aircraft.set(c.aircraft_type_code, c.aircraft_type_code);
      }
    }
    const groups: { code: string | null; label: string }[] = [...aircraft].map(([code, label]) => ({
      code,
      label,
    }));
    // Records saved without an aircraft stay visible; a pilot with no aircraft
    // qualification yet still gets the one plain set.
    if (groups.length === 0 || currencyItems.some((c) => !c.aircraft_type_code)) {
      groups.push({ code: null, label: groups.length ? "All aircraft" : "" });
    }
    return groups;
  })();
  const visibleCrewRoles = crewRolesForPosition(crewRoles, pilot.position);
  const latestApe = apeRecords[0] ?? null;
  const fitness = effectiveFitness(pilot.fit_to_fly, latestApe);
  const latestStaneval = stanevalRecords[0] ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Button asChild variant="outline" size="sm">
          <Link href="/personnel">← Directory</Link>
        </Button>
        {canManagePerson && (
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
        )}
      </div>

      {!pilot.active && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 print:hidden dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          This pilot is deactivated — hidden from the Directory, Dashboard, Alerts, Duty &amp;
          Workload, and Reports. Their records are all still here.
        </div>
      )}

      {/* Row 1: identity + QR, and Duty & Workload */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className={isPilot ? "lg:col-span-2" : "lg:col-span-3"}>
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
                {isPilot ? (
                  <FitToFlyBadge fitToFly={fitness.fit} reason={fitness.reason} />
                ) : (
                  pilot.skill_level && (
                    <div>
                      <p className="text-xs text-muted-foreground">Skill level</p>
                      <p className="font-medium">{pilot.skill_level} Skill</p>
                    </div>
                  )
                )}
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

        {isPilot && (
        <Card>
          <CardHeader>
            <CardTitle>Duty &amp; Workload Status</CardTitle>
          </CardHeader>
          <CardContent>
            <DutyGauge status={dutyStatus} />
          </CardContent>
        </Card>
        )}
      </div>

      {examData && (
        <PersonExamsCard
          personnelId={id}
          assigned={examData[0].assigned}
          assignable={examData[0].assignable}
          hasLogin={examData[0].hasLogin}
          history={examData[1]}
          recordsToStaneval={!isPilot}
        />
      )}

      {/* Row 2: Authorized Equipment + Qualification Status (crew role) */}
      {isPilot && (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Authorized Equipment</CardTitle>
            {canQualifications && (
              <Button asChild size="sm">
                <Link href={`/personnel/${id}/qualifications/new`}>Add Qualification</Link>
              </Button>
            )}
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
                    {canQualifications && (
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
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Qualification Status</CardTitle>
            <CardDescription>
              Crew role, independent of aircraft type.{canQualifications ? " Click to toggle." : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {visibleCrewRoles.map((role) => {
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
                      readOnly={!canQualifications}
                    />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
      )}

      {/* Row 3: Flying Hours + APE Status */}
      {isPilot && (
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
            {canFlights && (
              <Button asChild size="sm">
                <Link href={`/personnel/${id}/flights/new`}>Add Flight</Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {flights.length === 0 ? (
              <p className="text-sm text-muted-foreground">No flights on record.</p>
            ) : (
              <>
                <div className="space-y-2 sm:hidden">
                  {flights.map((f) => (
                    <MaybeLink
                      key={f.id}
                      href={canFlights ? `/personnel/${id}/flights/${f.id}/edit` : null}
                      className="block rounded-lg border p-3 text-sm transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{f.aircraft_types?.label ?? f.aircraft_type_code}</p>
                        <span className="text-muted-foreground">{formatDate(f.flight_date)}</span>
                      </div>
                      <p className="mt-1 text-muted-foreground">
                        {f.route ?? "—"} · {f.duty} · {f.flying_time_hours.toFixed(1)}h
                      </p>
                      {canFlights && (
                        <div className="mt-2 flex justify-end">
                          <ConfirmActionButton
                            onConfirm={deleteFlight.bind(null, id, f.id)}
                            triggerLabel="Delete"
                            title="Delete this flight?"
                            description="This can't be undone."
                            confirmLabel="Delete"
                          />
                        </div>
                      )}
                    </MaybeLink>
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
                            {canFlights && (
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
                            )}
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
            {canApe && (
              <Button asChild size="sm">
                <Link href={`/personnel/${id}/ape/new`}>Add APE Record</Link>
              </Button>
            )}
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
                    {canApe && (
                      <div className="flex shrink-0 items-center gap-2">
                        {record.certificate_path && (
                          <Button asChild variant="outline" size="sm">
                            <a
                              href={`/personnel/${id}/ape/${record.id}/certificate`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={record.certificate_name ?? "Medical certificate"}
                            >
                              Certificate
                            </a>
                          </Button>
                        )}
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
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      )}

      {/* Row 4: Currency Status + StanEval & Check */}
      <div className={isPilot ? "grid grid-cols-1 gap-4 xl:grid-cols-2" : "grid grid-cols-1 gap-4"}>
        {isPilot && (
        <Card>
          <CardHeader>
            <CardTitle>Currency Status</CardTitle>
            {currencyGroups.length > 1 && (
              <CardDescription>Tracked separately for each aircraft this pilot flies.</CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {currencyGroups.map((group) => (
            <div key={group.code ?? "all"} className="space-y-2">
              {currencyGroups.length > 1 && (
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </p>
              )}
              {currencyItemTypes.map((itemType) => {
                const item = currencyItems.find(
                  (c) => c.item_type === itemType && (c.aircraft_type_code ?? null) === group.code,
                );
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
                      {canCurrency && (
                        <>
                          <Button asChild variant="outline" size="sm">
                            <Link
                              href={`/personnel/${id}/currency/${itemType}${group.code ? `?aircraft=${group.code}` : ""}`}
                            >
                              {item ? "Edit" : "Add"}
                            </Link>
                          </Button>
                          {item && (
                            <ConfirmActionButton
                              onConfirm={deleteCurrencyItem.bind(null, id, itemType, group.code)}
                              triggerLabel="Delete"
                              title="Delete this currency record?"
                              description="This can't be undone."
                              confirmLabel="Delete"
                            />
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            ))}
          </CardContent>
        </Card>
        )}

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
            {canStaneval && (
              <Button asChild size="sm">
                <Link href={`/personnel/${id}/staneval/new`}>Add StanEval</Link>
              </Button>
            )}
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
                    {canStaneval && (
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
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {isPilot && (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle>CBTA Grade Slips</CardTitle>
              <CardDescription>Competency-based training and checking assessments.</CardDescription>
            </div>
            {canCbta && (
              <Button asChild size="sm" className="print:hidden">
                <Link href={`/personnel/${id}/cbta/new`}>New Grade Slip</Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {cbtaSlips.length === 0 ? (
              <p className="text-sm text-muted-foreground">No grade slips on file.</p>
            ) : (
              <div className="space-y-2">
                {cbtaSlips.map((slip) => (
                  <div
                    key={slip.id}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3"
                  >
                    <Link href={`/personnel/${id}/cbta/${slip.id}`} className="min-w-0 flex-1 hover:underline">
                      <p className="truncate font-medium">
                        {slip.lesson || (slip.mode === "checking" ? "Checking" : "Training")}
                        <span
                          className={
                            slip.outcome === "passed"
                              ? "ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
                              : "ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-500/15 dark:text-red-300"
                          }
                        >
                          {OUTCOME_LABELS[slip.outcome]}
                        </span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatIsoDate(slip.assessed_on, { month: "short", day: "numeric", year: "numeric" })}
                        {slip.instructor_name ? ` · ${slip.instructor_name}` : ""}
                        {slip.decided_by_name ? ` · decided by ${slip.decided_by_name}` : ""}
                      </p>
                    </Link>
                    {canCbta && (
                      <div className="flex shrink-0 items-center gap-2 print:hidden">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/personnel/${id}/cbta/${slip.id}/edit`}>Edit</Link>
                        </Button>
                        <ConfirmActionButton
                          onConfirm={deleteCbtaAssessment.bind(null, id, slip.id)}
                          triggerLabel="Delete"
                          title="Delete this grade slip?"
                          description="This can't be undone."
                          confirmLabel="Delete"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Row 5: Training Records + Alerts */}
      <div className={isPilot ? "grid grid-cols-1 gap-4 xl:grid-cols-2" : "grid grid-cols-1 gap-4"}>
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle>Training Records</CardTitle>
              <CardDescription>Recurrent and specialized training history.</CardDescription>
            </div>
            {canTraining && (
              <Button asChild size="sm">
                <Link href={`/personnel/${id}/training/new`}>Add Training Record</Link>
              </Button>
            )}
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
                    {canTraining && (
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
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {isPilot && <AlertsCard alerts={pilotAlerts} />}
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
