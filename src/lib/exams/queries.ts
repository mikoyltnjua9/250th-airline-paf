import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SkillLevel } from "@/lib/types/pilot";
import { addDaysIso, daysUntilDate, manilaDateOf } from "@/lib/dates";
import { EXAM_CYCLE_DAYS } from "@/lib/exams/cycle";

export type ExamStatus = "not_started" | "in_progress" | "failed" | "passed" | "due";

export type AssignedExam = {
  examSetId: string;
  title: string;
  category: string;
  skillLevel: SkillLevel | null;
  passMark: number;
  status: ExamStatus;
  openAttemptId: string | null;
  lastAttemptId: string | null;
  lastPercent: number | null;
  attemptCount: number;
  /** For a passed exam: the date it can be taken again (YYYY-MM-DD). */
  availableOn: string | null;
  /** For a due exam: days since it came due. */
  daysOverdue: number | null;
};

type AttemptRow = {
  id: string;
  exam_set_id: string;
  started_at: string;
  submitted_at: string | null;
  percent: number | null;
  passed: boolean | null;
};

/**
 * Status of one assignment. Only attempts made since the assignment was last
 * (re)issued count, so an admin resetting an exam starts the person fresh.
 *   passed       -> passed within the last EXAM_CYCLE_DAYS (weekly): locked
 *                   until availableOn
 *   in_progress  -> an unsubmitted attempt exists; they resume it
 *   failed       -> the latest attempt failed; they may retake
 *   due          -> last passed more than a cycle ago and nothing since:
 *                   time to take it again (daysOverdue = days past due)
 */
export function examStatus(assignedAt: string, attempts: AttemptRow[]) {
  const mine = attempts
    .filter((a) => a.started_at >= assignedAt)
    .sort((a, b) => (a.started_at < b.started_at ? 1 : -1)); // newest first
  const open = mine.find((a) => !a.submitted_at) ?? null;
  const submitted = mine.filter((a) => a.submitted_at);
  const last = submitted[0] ?? null;

  const latestPass = submitted.find((a) => a.passed) ?? null;
  const availableOn = latestPass
    ? addDaysIso(manilaDateOf(latestPass.submitted_at!), EXAM_CYCLE_DAYS)
    : null;
  const passLocks = !!availableOn && daysUntilDate(availableOn) > 0;

  let status: ExamStatus = "not_started";
  let daysOverdue: number | null = null;
  if (passLocks) status = "passed";
  else if (open) status = "in_progress";
  else if (last && !last.passed) status = "failed";
  else if (latestPass && availableOn) {
    status = "due";
    daysOverdue = -daysUntilDate(availableOn);
  }

  return {
    status,
    openAttemptId: open?.id ?? null,
    lastAttemptId: last?.id ?? null,
    lastPercent: last?.percent != null ? Number(last.percent) : null,
    attemptCount: submitted.length,
    availableOn: status === "passed" ? availableOn : null,
    daysOverdue,
  };
}

export async function getMyExams(personnelId: string): Promise<AssignedExam[]> {
  const admin = createAdminClient();
  const [assignRes, attemptRes] = await Promise.all([
    admin
      .from("exam_assignments")
      .select("assigned_at, exam_sets(id, title, category, skill_level, pass_mark, active)")
      .eq("personnel_id", personnelId),
    admin
      .from("exam_attempts")
      .select("id, exam_set_id, started_at, submitted_at, percent, passed")
      .eq("personnel_id", personnelId),
  ]);
  if (assignRes.error) throw assignRes.error;
  if (attemptRes.error) throw attemptRes.error;

  const attempts = (attemptRes.data ?? []) as AttemptRow[];
  type Row = {
    assigned_at: string;
    exam_sets: {
      id: string;
      title: string;
      category: string;
      skill_level: SkillLevel | null;
      pass_mark: number;
      active: boolean;
    } | null;
  };
  return ((assignRes.data ?? []) as unknown as Row[])
    .filter((r) => r.exam_sets?.active)
    .map((r) => {
      const set = r.exam_sets!;
      const s = examStatus(
        r.assigned_at,
        attempts.filter((a) => a.exam_set_id === set.id),
      );
      return {
        examSetId: set.id,
        title: set.title,
        category: set.category,
        skillLevel: set.skill_level,
        passMark: Number(set.pass_mark),
        ...s,
      };
    })
    .sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title));
}

export type RunnerQuestion = {
  id: string;
  body: string;
  options: { id: string; body: string }[];
};

export type RunnerData = {
  attemptId: string;
  title: string;
  category: string;
  skillLevel: SkillLevel | null;
  questions: RunnerQuestion[];
  answers: Record<string, string>;
};

/**
 * Everything the exam screen needs for an attempt that belongs to this
 * person and isn't submitted yet, in the order frozen when it started.
 *
 * Deliberately never selects exam_options.is_correct: the answer key stays
 * in the database until grading.
 */
export async function getRunnerData(
  attemptId: string,
  personnelId: string,
): Promise<{ kind: "open"; data: RunnerData } | { kind: "submitted" } | { kind: "missing" }> {
  const admin = createAdminClient();
  const { data: attempt, error } = await admin
    .from("exam_attempts")
    .select("id, exam_set_id, submitted_at, question_order, answers, exam_sets(title, category, skill_level)")
    .eq("id", attemptId)
    .eq("personnel_id", personnelId)
    .maybeSingle();
  if (error) throw error;
  if (!attempt) return { kind: "missing" };
  if (attempt.submitted_at) return { kind: "submitted" };

  const { data: qs, error: qErr } = await admin
    .from("exam_questions")
    .select("id, body, exam_options(id, body)")
    .eq("exam_set_id", attempt.exam_set_id);
  if (qErr) throw qErr;

  const byId = new Map(
    ((qs ?? []) as unknown as { id: string; body: string; exam_options: { id: string; body: string }[] }[]).map(
      (q) => [q.id, q],
    ),
  );
  const order = attempt.question_order as { q: string; opts: string[] }[];
  const questions: RunnerQuestion[] = [];
  for (const item of order) {
    const q = byId.get(item.q);
    if (!q) continue;
    const optById = new Map(q.exam_options.map((o) => [o.id, o]));
    questions.push({
      id: q.id,
      body: q.body,
      options: item.opts.map((id) => optById.get(id)).filter((o): o is { id: string; body: string } => !!o),
    });
  }

  const set = attempt.exam_sets as unknown as { title: string; category: string; skill_level: SkillLevel | null };
  return {
    kind: "open",
    data: {
      attemptId: attempt.id,
      title: set.title,
      category: set.category,
      skillLevel: set.skill_level,
      questions,
      answers: (attempt.answers ?? {}) as Record<string, string>,
    },
  };
}

export type AttemptResult = {
  attemptId: string;
  examSetId: string;
  title: string;
  category: string;
  skillLevel: SkillLevel | null;
  passMark: number;
  submittedAt: string;
  correct: number;
  total: number;
  percent: number;
  passed: boolean;
};

export async function getAttemptResult(
  attemptId: string,
  personnelId: string,
): Promise<AttemptResult | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("exam_attempts")
    .select(
      "id, exam_set_id, submitted_at, scored_total, scored_correct, percent, passed, exam_sets(title, category, skill_level, pass_mark)",
    )
    .eq("id", attemptId)
    .eq("personnel_id", personnelId)
    .maybeSingle();
  if (error) throw error;
  if (!data || !data.submitted_at) return null;
  const set = data.exam_sets as unknown as {
    title: string;
    category: string;
    skill_level: SkillLevel | null;
    pass_mark: number;
  };
  return {
    attemptId: data.id,
    examSetId: data.exam_set_id,
    title: set.title,
    category: set.category,
    skillLevel: set.skill_level,
    passMark: Number(set.pass_mark),
    submittedAt: data.submitted_at,
    correct: data.scored_correct ?? 0,
    total: data.scored_total ?? 0,
    percent: Number(data.percent ?? 0),
    passed: !!data.passed,
  };
}
