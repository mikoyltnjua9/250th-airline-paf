import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireExaminee } from "@/lib/exams/session";
import { getAttemptResult } from "@/lib/exams/queries";
import { startExam } from "@/app/exams/actions";
import { cn } from "@/lib/utils";

export default async function ExamResultPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const me = await requireExaminee();
  const result = await getAttemptResult(attemptId, me.personnelId);
  if (!result) redirect("/exams");

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Card>
        <CardHeader className="text-center">
          <CardDescription>
            {result.category}
            {result.skillLevel ? ` · ${result.skillLevel} Skill` : ""}
          </CardDescription>
          <CardTitle className="text-xl">{result.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <div
            className={cn(
              "rounded-xl px-4 py-6",
              result.passed
                ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-200"
                : "bg-red-100 text-red-900 dark:bg-red-500/15 dark:text-red-200",
            )}
          >
            <p className="text-4xl font-bold tabular-nums">{result.percent}%</p>
            <p className="mt-1 text-lg font-semibold">{result.passed ? "PASSED" : "NOT PASSED"}</p>
          </div>
          <p className="text-sm text-muted-foreground">
            {result.correct} of {result.total} correct · pass mark {result.passMark}%
          </p>
          <p className="text-xs text-muted-foreground">
            {result.passed
              ? "This result has been recorded on your profile."
              : "This result has been recorded on your profile. You can retake the exam."}
          </p>
          <div className="flex justify-center gap-2">
            <Button asChild variant="outline">
              <Link href="/exams">Back to my exams</Link>
            </Button>
            {!result.passed && (
              <form action={startExam.bind(null, result.examSetId)}>
                <Button type="submit">Retake exam</Button>
              </form>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
