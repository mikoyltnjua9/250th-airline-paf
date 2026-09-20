import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getExamSetsOverview, getHeldQuestions, getRecentAttempts } from "@/lib/exams/admin-queries";
import { formatManilaDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

export default async function ExamManagementPage() {
  const [sets, held, recent] = await Promise.all([
    getExamSetsOverview(),
    getHeldQuestions(),
    getRecentAttempts(30),
  ]);

  const heldBySet = new Map<string, typeof held>();
  for (const q of held) heldBySet.set(q.setId, [...(heldBySet.get(q.setId) ?? []), q]);
  const setsWithHeld = sets.filter((s) => s.held > 0);
  const totalUsable = sets.reduce((a, s) => a + s.usable, 0);
  const totalHeld = sets.reduce((a, s) => a + s.held, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Written Exams</h1>
        <p className="text-muted-foreground">
          {sets.length} exams · {totalUsable.toLocaleString()} scored questions
          {totalHeld > 0 ? ` · ${totalHeld} held back for review` : ""}. Assign exams to maintenance
          staff and cabin crew from their profile in the Personnel Directory.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent results</CardTitle>
          <CardDescription>The latest submitted attempts, newest first.</CardDescription>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No exams have been taken yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Person</TableHead>
                    <TableHead>Exam</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                    <TableHead className="text-right">Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="whitespace-nowrap">{formatManilaDate(a.submittedAt)}</TableCell>
                      <TableCell className="font-medium whitespace-nowrap">
                        <Link href={`/personnel/${a.personnelId}`} className="hover:underline">
                          {a.personName}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {a.examTitle}
                        {a.skillLevel ? ` (${a.skillLevel})` : ""}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {a.percent}% <span className="text-muted-foreground">({a.correct}/{a.total})</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                            a.passed
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
                              : "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
                          )}
                        >
                          {a.passed ? "Passed" : "Not passed"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Question bank</CardTitle>
          <CardDescription>
            Every exam loaded from the client&apos;s files. Held-back questions have no marked
            answer, more than one, a broken option list, or the two source files disagree — they
            aren&apos;t scored until corrected.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Exam</TableHead>
                  <TableHead>Skill</TableHead>
                  <TableHead className="text-right">Scored</TableHead>
                  <TableHead className="text-right">Held back</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sets.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{s.category}</TableCell>
                    <TableCell className="font-medium">{s.title}</TableCell>
                    <TableCell>{s.skillLevel ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.usable}</TableCell>
                    <TableCell
                      className={cn(
                        "text-right tabular-nums",
                        s.held > 0 && "font-medium text-amber-600 dark:text-amber-400",
                      )}
                    >
                      {s.held || "–"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {setsWithHeld.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Held-back questions</CardTitle>
            <CardDescription>
              For the client to review. The marked answer (if any) is highlighted.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {setsWithHeld.map((s) => (
              <details key={s.id} className="rounded-lg border p-3">
                <summary className="cursor-pointer text-sm font-medium">
                  {s.skillLevel ? `${s.skillLevel} Skill — ` : ""}
                  {s.category} / {s.title}{" "}
                  <Badge variant="secondary" className="ml-1">
                    {s.held}
                  </Badge>
                </summary>
                <div className="mt-3 space-y-3">
                  {(heldBySet.get(s.id) ?? []).map((q) => (
                    <div key={q.position} className="rounded-md bg-muted/40 p-3 text-sm">
                      <p className="font-medium">
                        #{q.position} {q.body}
                      </p>
                      <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">{q.reviewNote}</p>
                      <ul className="mt-2 space-y-0.5">
                        {q.options.map((o, i) => (
                          <li
                            key={i}
                            className={cn(o.isCorrect && "font-semibold text-emerald-700 dark:text-emerald-400")}
                          >
                            {String.fromCharCode(65 + i)}. {o.body}
                            {o.isCorrect ? "  ✓" : ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
