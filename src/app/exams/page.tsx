import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { requireExaminee } from "@/lib/exams/session";
import { getMyExams, type ExamStatus } from "@/lib/exams/queries";
import { startExam } from "@/app/exams/actions";
import { formatIsoDate } from "@/lib/dates";

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

export default async function MyExamsPage() {
  const me = await requireExaminee();
  const exams = await getMyExams(me.personnelId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">My exams</h2>
        <p className="text-muted-foreground">
          Exams assigned to you. The pass mark is 85%. Each exam is taken weekly; if you don&apos;t
          pass, you can retake it straight away.
        </p>
      </div>

      {exams.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No exams have been assigned to you yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {exams.map((exam) => (
            <Card key={exam.examSetId}>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <CardTitle className="flex flex-wrap items-center gap-2">
                    {exam.title}
                    <Badge className={STATUS_STYLE[exam.status]}>{STATUS_LABEL[exam.status]}</Badge>
                  </CardTitle>
                  <CardDescription>
                    {exam.category}
                    {exam.skillLevel ? ` · ${exam.skillLevel} Skill` : ""} · Pass mark {exam.passMark}%
                    {exam.lastPercent !== null && exam.status !== "in_progress"
                      ? ` · Last score ${exam.lastPercent}%`
                      : ""}
                    {exam.availableOn
                      ? ` · Available again ${formatIsoDate(exam.availableOn, { weekday: "long", month: "short", day: "numeric" })}`
                      : ""}
                    {exam.status === "due" && exam.daysOverdue
                      ? ` · Due ${exam.daysOverdue} day${exam.daysOverdue === 1 ? "" : "s"} ago`
                      : ""}
                    {exam.attemptCount > 0
                      ? ` · ${exam.attemptCount} attempt${exam.attemptCount === 1 ? "" : "s"}`
                      : ""}
                  </CardDescription>
                </div>
                <div className="flex shrink-0 gap-2">
                  {exam.lastAttemptId && (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/exams/${exam.lastAttemptId}/result`}>View result</Link>
                    </Button>
                  )}
                  {exam.status !== "passed" && (
                    <form action={startExam.bind(null, exam.examSetId)}>
                      <Button type="submit" size="sm">
                        {exam.status === "in_progress"
                          ? "Continue exam"
                          : exam.status === "failed"
                            ? "Retake exam"
                            : "Start exam"}
                      </Button>
                    </form>
                  )}
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
