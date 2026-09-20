import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PrintButton } from "@/components/reports/print-button";
import { getPilotProfile } from "@/lib/pilots/queries";
import { getCbtaAssessment } from "@/lib/cbta/queries";
import {
  GRADE_LABELS,
  GROUP_LABELS,
  INSTRUCTOR_COMPETENCIES,
  MODE_LABELS,
  OUTCOME_LABELS,
  PILOT_COMPETENCIES,
  type Competency,
  type CompetencyGroup,
} from "@/lib/cbta/competencies";
import { formatIsoDate } from "@/lib/dates";

function Field({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="min-h-5 border-b text-sm">{value === null || value === "" ? "" : value}</p>
    </div>
  );
}

export default async function CbtaSlipPage({
  params,
}: {
  params: Promise<{ id: string; slipId: string }>;
}) {
  const { id, slipId } = await params;
  const [profile, slip] = await Promise.all([getPilotProfile(id), getCbtaAssessment(id, slipId)]);
  if (!profile || !slip) notFound();

  const rows = (list: Competency[], group: CompetencyGroup) =>
    list
      .filter((c) => c.group === group)
      .map((c) => {
        const e = slip.grades[c.code];
        return (
          <div key={c.code} className="grid grid-cols-[1fr_2.5rem] gap-x-3 border-b py-1.5 text-sm">
            <div>
              <p className="font-medium">{c.label}</p>
              {e?.comment && <p className="whitespace-pre-wrap text-muted-foreground">{e.comment}</p>}
            </div>
            <p
              className="text-center font-semibold"
              title={e?.grade ? GRADE_LABELS[e.grade] : undefined}
            >
              {e?.grade ?? "–"}
            </p>
          </div>
        );
      });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={`/personnel/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Profile
        </Link>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/personnel/${id}/cbta/${slipId}/edit`}>Edit</Link>
          </Button>
          <PrintButton />
        </div>
      </div>

      <div className="space-y-5 rounded-xl border p-6 ring-1 ring-foreground/10 print:rounded-none print:border-0 print:p-0 print:ring-0">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wide">Philippine Air Force</p>
          <p className="text-xs font-semibold uppercase tracking-wide">250th Presidential Airlift Wing</p>
          <p className="text-[11px] text-muted-foreground">Colonel Jesus Villamor Air Base, Pasay City</p>
          <h1 className="mt-2 text-lg font-semibold uppercase tracking-wide">
            {MODE_LABELS[slip.mode]} / Assessment Grade Slip
          </h1>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <Field label="Student's name" value={`${profile.rankLabel} ${profile.pilot.full_name}`.trim()} />
          <Field label="Date" value={formatIsoDate(slip.assessed_on, { month: "short", day: "numeric", year: "numeric" })} />
          <Field label="Lesson" value={slip.lesson} />
          <Field label="A/C and tail no." value={slip.aircraft_tail_no} />
          <Field label="Instructor" value={slip.instructor_name} />
          <Field label="Duration" value={slip.duration} />
          <div className="col-span-2">
            <Field label="Itinerary" value={slip.itinerary} />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 text-center text-sm">
          {[
            ["Day take-off", slip.day_takeoff],
            ["Day landing", slip.day_landing],
            ["Night take-off", slip.night_takeoff],
            ["Night landing", slip.night_landing],
            ["Visual", slip.visual_count],
            ["RNP", slip.rnp_count],
            ["ILS", slip.ils_count],
            ["VOR", slip.vor_count],
          ].map(([l, n]) => (
            <div key={l as string} className="rounded-md border py-1">
              <p className="text-[11px] text-muted-foreground">{l}</p>
              <p className="font-semibold tabular-nums">{n}</p>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          {Object.entries(GRADE_LABELS).map(([n, l]) => `${n} ${l}`).join(" · ")}
        </p>

        {(["knowledge", "skills", "attitude"] as const).map((g) => (
          <section key={g}>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {GROUP_LABELS[g]}
            </h2>
            {rows(PILOT_COMPETENCIES, g)}
          </section>
        ))}

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {GROUP_LABELS.instructor}
          </h2>
          {rows(INSTRUCTOR_COMPETENCIES, "instructor")}
        </section>

        {[
          ["Positive", slip.positive_remarks],
          ["Developmental", slip.developmental_remarks],
          ["Summary", slip.summary],
        ].map(([l, v]) =>
          v ? (
            <section key={l}>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{l}</h2>
              <p className="whitespace-pre-wrap text-sm">{v}</p>
            </section>
          ) : null,
        )}

        <div className="grid grid-cols-2 gap-x-6 gap-y-3 border-t pt-4">
          <Field label="Trainee competent" value={slip.trainee_competent ? "YES" : "NO"} />
          <Field label="Training organization" value={OUTCOME_LABELS[slip.outcome].toUpperCase()} />
          <Field label="Decided by" value={slip.decided_by_name} />
          <Field label="Student concurrence" value={slip.student_concurrence ? "Yes" : "Not recorded"} />
        </div>
      </div>
    </div>
  );
}
