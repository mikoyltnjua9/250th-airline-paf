import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { ConfirmActionButton } from "@/components/confirm-action-button";
import { cn } from "@/lib/utils";
import { assignExam, reassignExam, unassignExam } from "@/app/(dashboard)/personnel/[id]/exams/actions";
import type { AssignableExam, PersonExam, RecentAttempt } from "@/lib/exams/admin-queries";
import type { ExamStatus } from "@/lib/exams/queries";
import { formatIsoDate, formatManilaDate } from "@/lib/dates";

const STATUS_LABEL: Record<ExamStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  failed: "Not passed",
  passed: "Passed",
  due: "Due again",
};
const STATUS_STYLE: Record<ExamStatus, string> = {
  not_started: "bg-muted text-muted-foreground",
  in_progress: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
  failed: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
  passed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  due: "bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300",
};

/** "Written Exams" on a maintenance / cabin-crew profile: assign exams, see
 * where each stands, and the attempt history. */
export function PersonExamsCard({
  personnelId,
  assigned,
  assignable,
  hasLogin,
  history,
}: {
  personnelId: string;
  assigned: PersonExam[];
  assignable: AssignableExam[];
  hasLogin: boolean;
  history: RecentAttempt[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Written Exams</CardTitle>
        <CardDescription>
          Exams assigned to this person. A result is recorded below and as a Pass/Fail entry under
          StanEval &amp; Grading.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasLogin && (
          <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
            No login yet — create an Examinee account for this person under System Management so
            they can take these exams.
          </p>
        )}

        {assigned.length === 0 ? (
          <p className="text-sm text-muted-foreground">No exams assigned yet.</p>
        ) : (
          <div className="space-y-2">
            {assigned.map((exam) => (
              <div
                key={exam.examSetId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {exam.title}
                    <span
                      className={cn(
                        "ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                        STATUS_STYLE[exam.status],
                      )}
                    >
                      {STATUS_LABEL[exam.status]}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {exam.category}
                    {exam.skillLevel ? ` · ${exam.skillLevel} Skill` : ""}
                    {exam.lastPercent !== null ? ` · Last score ${exam.lastPercent}%` : ""}
                    {exam.availableOn
                      ? ` · Available again ${formatIsoDate(exam.availableOn, { month: "short", day: "numeric" })}`
                      : ""}
                    {exam.status === "due" && exam.daysOverdue
                      ? ` · Due ${exam.daysOverdue} day${exam.daysOverdue === 1 ? "" : "s"} ago`
                      : ""}
                    {exam.attemptCount > 0
                      ? ` · ${exam.attemptCount} attempt${exam.attemptCount === 1 ? "" : "s"}`
                      : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <ConfirmActionButton
                    onConfirm={reassignExam.bind(null, personnelId, exam.examSetId)}
                    triggerLabel="Reset"
                    title="Reset this exam?"
                    description="Reopens the exam right now, without waiting for the weekly cycle: a recent pass stops locking it and earlier fails no longer count. Past attempts and their StanEval records stay on file."
                    confirmLabel="Reset"
                    confirmVariant="default"
                  />
                  <ConfirmActionButton
                    onConfirm={unassignExam.bind(null, personnelId, exam.examSetId)}
                    triggerLabel="Remove"
                    title="Remove this exam?"
                    description="They won't be able to take it any more. Past attempts and StanEval records stay on file."
                    confirmLabel="Remove"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <form action={assignExam} className="flex flex-wrap items-end gap-2 border-t pt-4">
          <input type="hidden" name="personnel_id" value={personnelId} />
          <div className="min-w-0 flex-1 basis-64">
            <label htmlFor="exam_set_id" className="mb-1 block text-xs text-muted-foreground">
              Assign an exam
            </label>
            <NativeSelect id="exam_set_id" name="exam_set_id" defaultValue="" required>
              <option value="" disabled>
                {assignable.length === 0 ? "No more exams available" : "Select an exam"}
              </option>
              {assignable.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.label}
                </option>
              ))}
            </NativeSelect>
          </div>
          <Button type="submit" size="sm" disabled={assignable.length === 0}>
            Assign
          </Button>
        </form>

        {history.length > 0 && (
          <div className="space-y-1 border-t pt-4">
            <p className="text-xs font-medium text-muted-foreground">Attempt history</p>
            {history.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate">
                  {a.examTitle}
                  {a.skillLevel ? ` (${a.skillLevel})` : ""}
                  <span className="text-muted-foreground">
                    {" "}
                    · {formatManilaDate(a.submittedAt)}
                  </span>
                </span>
                <span
                  className={cn(
                    "shrink-0 font-medium tabular-nums",
                    a.passed ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
                  )}
                >
                  {a.percent}% · {a.passed ? "Passed" : "Not passed"}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
