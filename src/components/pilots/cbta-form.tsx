"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import {
  GRADE_LABELS,
  GROUP_LABELS,
  INSTRUCTOR_COMPETENCIES,
  MODE_LABELS,
  MODES,
  PILOT_COMPETENCIES,
  assess,
  type Competency,
  type GradeMap,
} from "@/lib/cbta/competencies";

const COUNTS: [string, string][] = [
  ["day_takeoff", "Day take-off"],
  ["day_landing", "Day landing"],
  ["night_takeoff", "Night take-off"],
  ["night_landing", "Night landing"],
  ["visual_count", "Visual"],
  ["rnp_count", "RNP"],
  ["ils_count", "ILS"],
  ["vor_count", "VOR"],
];

const textareaClass =
  "min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function CbtaForm({
  action,
  submitLabel,
  defaultValues,
  hiddenFields,
  error,
  today,
}: {
  action: (formData: FormData) => void;
  submitLabel: string;
  defaultValues?: Record<string, string>;
  hiddenFields: Record<string, string>;
  error?: string;
  today: string;
}) {
  const dv = defaultValues ?? {};
  const [grades, setGrades] = useState<GradeMap>(() => {
    const g: GradeMap = {};
    for (const c of [...PILOT_COMPETENCIES, ...INSTRUCTOR_COMPETENCIES]) {
      const raw = dv[`grade_${c.code}`];
      g[c.code] = { grade: raw ? Number(raw) : null, comment: dv[`comment_${c.code}`] ?? "" };
    }
    return g;
  });
  const [verdict, setVerdict] = useState<string>(dv.trainee_competent ?? "");
  const [mode, setMode] = useState<string>(dv.mode ?? "training");

  const result = assess(grades);
  // A grade of 1 always means "not competent": show it, and submit it.
  const effectiveVerdict = result.blocked ? "no" : verdict;

  function setGrade(code: string, grade: number) {
    setGrades((g) => ({ ...g, [code]: { ...g[code], grade } }));
  }
  function setComment(code: string, comment: string) {
    setGrades((g) => ({ ...g, [code]: { ...g[code], comment } }));
  }

  function competencyRow(c: Competency) {
    const e = grades[c.code];
    const needsComment = e.grade === 2 && !e.comment.trim() && !c.group.startsWith("instructor");
    return (
      <div key={c.code} className="space-y-2 rounded-lg border p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">{c.label}</p>
          <div className="flex gap-1" role="radiogroup" aria-label={`${c.label} grade`}>
            {[1, 2, 3, 4].map((n) => (
              <label
                key={n}
                title={GRADE_LABELS[n]}
                className={cn(
                  "flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border text-sm font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                  e.grade === n
                    ? n === 1
                      ? "border-red-600 bg-red-600 text-white"
                      : n === 2
                        ? "border-amber-500 bg-amber-500 text-white"
                        : "border-emerald-600 bg-emerald-600 text-white"
                    : "hover:bg-muted",
                )}
              >
                <input
                  type="radio"
                  name={`grade_${c.code}`}
                  value={n}
                  checked={e.grade === n}
                  onChange={() => setGrade(c.code, n)}
                  className="sr-only"
                />
                {n}
              </label>
            ))}
          </div>
        </div>
        <textarea
          name={`comment_${c.code}`}
          value={e.comment}
          onChange={(ev) => setComment(c.code, ev.target.value)}
          placeholder={needsComment ? "Comment required for a grade of 2" : "Comments"}
          className={cn(textareaClass, needsComment && "border-amber-500")}
          rows={2}
        />
      </div>
    );
  }

  const groups: (keyof typeof GROUP_LABELS)[] = ["knowledge", "skills", "attitude"];

  return (
    <form action={action} className="space-y-6">
      {Object.entries(hiddenFields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t save</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="assessed_on">Date</Label>
          <Input id="assessed_on" name="assessed_on" type="date" defaultValue={dv.assessed_on ?? today} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mode">Type</Label>
          <NativeSelect id="mode" name="mode" value={mode} onChange={(e) => setMode(e.target.value)}>
            {MODES.map((m) => (
              <option key={m} value={m}>
                {MODE_LABELS[m]}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="lesson">Lesson</Label>
          <Input id="lesson" name="lesson" defaultValue={dv.lesson} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="aircraft_tail_no">A/C and tail no.</Label>
          <Input id="aircraft_tail_no" name="aircraft_tail_no" defaultValue={dv.aircraft_tail_no} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="instructor_name">Instructor</Label>
          <Input id="instructor_name" name="instructor_name" defaultValue={dv.instructor_name} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="duration">Duration</Label>
          <Input id="duration" name="duration" placeholder="e.g. 1.5 hrs" defaultValue={dv.duration} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="itinerary">Itinerary</Label>
          <Input id="itinerary" name="itinerary" defaultValue={dv.itinerary} />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {COUNTS.map(([name, label]) => (
          <div key={name} className="space-y-1">
            <Label htmlFor={name} className="text-xs">
              {label}
            </Label>
            <Input id={name} name={name} type="number" min={0} step={1} defaultValue={dv[name] ?? "0"} />
          </div>
        ))}
      </section>

      <p className="text-xs text-muted-foreground">
        Grades: {Object.entries(GRADE_LABELS).map(([n, l]) => `${n} ${l}`).join(" · ")}
        {mode === "checking" ? " — assessed against the Checking descriptors." : " — assessed against the Training descriptors."}
      </p>

      {groups.map((g) => (
        <section key={g} className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {GROUP_LABELS[g]}
          </h3>
          {PILOT_COMPETENCIES.filter((c) => c.group === g).map(competencyRow)}
        </section>
      ))}

      <section className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {GROUP_LABELS.instructor}
        </h3>
        <p className="text-xs text-muted-foreground">
          Recorded on the slip; these do not affect the trainee&apos;s result.
        </p>
        {INSTRUCTOR_COMPETENCIES.map(competencyRow)}
      </section>

      <section className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="positive_remarks">Positive</Label>
          <textarea id="positive_remarks" name="positive_remarks" defaultValue={dv.positive_remarks} className={textareaClass} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="developmental_remarks">Developmental</Label>
          <textarea id="developmental_remarks" name="developmental_remarks" defaultValue={dv.developmental_remarks} className={textareaClass} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="summary">Summary</Label>
          <textarea id="summary" name="summary" defaultValue={dv.summary} className={textareaClass} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="student_concurrence" defaultChecked={dv.student_concurrence === "on"} />
          Student concurrence
        </label>
      </section>

      <section className="space-y-3 rounded-lg border bg-muted/30 p-4">
        <h3 className="text-sm font-semibold">Result</h3>
        <p
          className={cn(
            "text-sm",
            result.suggestion === "not_competent" && "text-red-700 dark:text-red-400",
            result.suggestion === "competent" && "text-emerald-700 dark:text-emerald-400",
          )}
        >
          {!result.complete && !result.blocked && "Grade every pilot competency to get a suggestion."}
          {result.blocked &&
            "A grade of 1 (Not Proficient) — the trainee cannot be marked competent. Outcome: Remedial."}
          {!result.blocked &&
            result.suggestion === "competent" &&
            "All competencies are 3 or higher — suggested: Trainee competent, outcome Passed."}
          {!result.blocked &&
            result.suggestion === "instructor_decides" &&
            "At least one grade of 2 — the instructor decides. Every 2 needs a comment."}
        </p>
        {result.twosMissingComment.length > 0 && (
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Comment needed on: {result.twosMissingComment.join("; ")}
          </p>
        )}

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Trainee competent</legend>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="trainee_competent"
                value="yes"
                checked={effectiveVerdict === "yes"}
                disabled={result.blocked}
                onChange={() => setVerdict("yes")}
              />
              Yes
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="trainee_competent"
                value="no"
                checked={effectiveVerdict === "no"}
                onChange={() => setVerdict("no")}
              />
              No
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            Training organization outcome:{" "}
            <span className="font-medium">
              {effectiveVerdict === "yes" ? "Passed" : effectiveVerdict === "no" ? "Remedial" : "—"}
            </span>
            . The slip records who made this decision.
          </p>
        </fieldset>
      </section>

      <div className="flex justify-end gap-3 border-t pt-6">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
