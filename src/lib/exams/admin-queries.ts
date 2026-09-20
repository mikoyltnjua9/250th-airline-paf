import "server-only";
import { createClient } from "@/lib/supabase/server";
import { examStatus, type ExamStatus } from "@/lib/exams/queries";
import type { PersonnelType, SkillLevel } from "@/lib/types/pilot";

/** PostgREST returns at most 1000 rows per request; page through the rest. */
async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export type ExamSetSummary = {
  id: string;
  code: string | null;
  title: string;
  category: string;
  skillLevel: SkillLevel | null;
  audience: string;
  active: boolean;
  total: number;
  usable: number;
  held: number;
};

export async function getExamSetsOverview(): Promise<ExamSetSummary[]> {
  const supabase = await createClient();
  const { data: sets, error } = await supabase
    .from("exam_sets")
    .select("id, code, title, category, skill_level, audience, active")
    .order("category")
    .order("title");
  if (error) throw error;
  const qs = await fetchAll<{ exam_set_id: string; status: string }>((from, to) =>
    supabase.from("exam_questions").select("exam_set_id, status").order("id").range(from, to),
  );
  const counts = new Map<string, { total: number; held: number }>();
  for (const q of qs) {
    const c = counts.get(q.exam_set_id) ?? { total: 0, held: 0 };
    c.total += 1;
    if (q.status !== "ok") c.held += 1;
    counts.set(q.exam_set_id, c);
  }
  const skillOrder = { "3rd": 0, "5th": 1, "7th": 2 } as Record<string, number>;
  return (sets ?? [])
    .map((s) => {
      const c = counts.get(s.id) ?? { total: 0, held: 0 };
      return {
        id: s.id,
        code: s.code,
        title: s.title,
        category: s.category,
        skillLevel: s.skill_level as SkillLevel | null,
        audience: s.audience,
        active: s.active,
        total: c.total,
        usable: c.total - c.held,
        held: c.held,
      };
    })
    .sort(
      (a, b) =>
        a.category.localeCompare(b.category) ||
        a.title.localeCompare(b.title) ||
        (skillOrder[a.skillLevel ?? ""] ?? 9) - (skillOrder[b.skillLevel ?? ""] ?? 9),
    );
}

export type HeldQuestion = {
  setId: string;
  position: number;
  body: string;
  reviewNote: string | null;
  options: { body: string; isCorrect: boolean }[];
};

/** Questions held out of scoring, for the client to review and correct. */
export async function getHeldQuestions(): Promise<HeldQuestion[]> {
  const supabase = await createClient();
  const rows = await fetchAll<{
    exam_set_id: string;
    position: number;
    body: string;
    review_note: string | null;
    exam_options: { body: string; is_correct: boolean; position: number }[];
  }>((from, to) =>
    supabase
      .from("exam_questions")
      .select("exam_set_id, position, body, review_note, exam_options(body, is_correct, position)")
      .eq("status", "needs_review")
      .order("exam_set_id")
      .order("position")
      .range(from, to),
  );
  return rows.map((r) => ({
    setId: r.exam_set_id,
    position: r.position,
    body: r.body,
    reviewNote: r.review_note,
    options: [...r.exam_options]
      .sort((a, b) => a.position - b.position)
      .map((o) => ({ body: o.body, isCorrect: o.is_correct })),
  }));
}

export type RecentAttempt = {
  id: string;
  submittedAt: string;
  personnelId: string;
  personName: string;
  examTitle: string;
  skillLevel: SkillLevel | null;
  percent: number;
  correct: number;
  total: number;
  passed: boolean;
};

export async function getRecentAttempts(limit = 50, personnelId?: string): Promise<RecentAttempt[]> {
  const supabase = await createClient();
  let query = supabase
    .from("exam_attempts")
    .select(
      "id, submitted_at, personnel_id, percent, scored_correct, scored_total, passed, pilots(full_name), exam_sets(title, skill_level)",
    )
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false })
    .limit(limit);
  if (personnelId) query = query.eq("personnel_id", personnelId);
  const { data, error } = await query;
  if (error) throw error;
  type Row = {
    id: string;
    submitted_at: string;
    personnel_id: string;
    percent: number;
    scored_correct: number;
    scored_total: number;
    passed: boolean;
    pilots: { full_name: string } | null;
    exam_sets: { title: string; skill_level: SkillLevel | null } | null;
  };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    submittedAt: r.submitted_at,
    personnelId: r.personnel_id,
    personName: r.pilots?.full_name ?? "Unknown",
    examTitle: r.exam_sets?.title ?? "Unknown exam",
    skillLevel: r.exam_sets?.skill_level ?? null,
    percent: Number(r.percent),
    correct: r.scored_correct,
    total: r.scored_total,
    passed: r.passed,
  }));
}

export type PersonExam = {
  examSetId: string;
  title: string;
  category: string;
  skillLevel: SkillLevel | null;
  status: ExamStatus;
  lastPercent: number | null;
  attemptCount: number;
  assignedAt: string;
  availableOn: string | null;
  daysOverdue: number | null;
};

export type AssignableExam = { id: string; label: string };

/** Everything the profile's "Written Exams" card shows for one person. */
export async function getPersonExams(personnelId: string, type: PersonnelType) {
  const supabase = await createClient();
  const audience = type === "cabin_crew" ? "cabin_crew" : "maintenance";

  const [assignRes, attemptRes, setsRes, accountRes] = await Promise.all([
    supabase
      .from("exam_assignments")
      .select("assigned_at, exam_sets(id, title, category, skill_level)")
      .eq("personnel_id", personnelId),
    supabase
      .from("exam_attempts")
      .select("id, exam_set_id, started_at, submitted_at, percent, passed")
      .eq("personnel_id", personnelId),
    supabase
      .from("exam_sets")
      .select("id, title, category, skill_level")
      .eq("active", true)
      .eq("audience", audience)
      .order("category")
      .order("title"),
    supabase.from("profiles").select("id").eq("personnel_id", personnelId).maybeSingle(),
  ]);
  if (assignRes.error) throw assignRes.error;
  if (attemptRes.error) throw attemptRes.error;
  if (setsRes.error) throw setsRes.error;

  const attempts = (attemptRes.data ?? []) as {
    id: string;
    exam_set_id: string;
    started_at: string;
    submitted_at: string | null;
    percent: number | null;
    passed: boolean | null;
  }[];
  type A = {
    assigned_at: string;
    exam_sets: { id: string; title: string; category: string; skill_level: SkillLevel | null } | null;
  };
  const assigned: PersonExam[] = ((assignRes.data ?? []) as unknown as A[])
    .filter((a) => a.exam_sets)
    .map((a) => {
      const set = a.exam_sets!;
      const s = examStatus(a.assigned_at, attempts.filter((x) => x.exam_set_id === set.id));
      return {
        examSetId: set.id,
        title: set.title,
        category: set.category,
        skillLevel: set.skill_level,
        status: s.status,
        lastPercent: s.lastPercent,
        attemptCount: s.attemptCount,
        assignedAt: a.assigned_at,
        availableOn: s.availableOn,
        daysOverdue: s.daysOverdue,
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title));

  const assignedIds = new Set(assigned.map((a) => a.examSetId));
  const assignable: AssignableExam[] = (setsRes.data ?? [])
    .filter((s) => !assignedIds.has(s.id))
    .map((s) => ({
      id: s.id,
      label: `${s.skill_level ? `${s.skill_level} Skill — ` : ""}${s.category} / ${s.title}`,
    }));

  return { assigned, assignable, hasLogin: !!accountRes.data };
}

export type DueExam = {
  personnelId: string;
  personName: string;
  examTitle: string;
  skillLevel: SkillLevel | null;
  daysOverdue: number;
};

/** Everyone whose weekly exam has come due again and hasn't been retaken. */
export async function getDueForRetake(): Promise<DueExam[]> {
  const supabase = await createClient();
  const [assignRes, attemptRes] = await Promise.all([
    supabase
      .from("exam_assignments")
      .select("personnel_id, exam_set_id, assigned_at, pilots(full_name, active), exam_sets(title, skill_level, active)"),
    supabase
      .from("exam_attempts")
      .select("id, personnel_id, exam_set_id, started_at, submitted_at, percent, passed"),
  ]);
  if (assignRes.error) throw assignRes.error;
  if (attemptRes.error) throw attemptRes.error;
  const attempts = (attemptRes.data ?? []) as {
    id: string;
    personnel_id: string;
    exam_set_id: string;
    started_at: string;
    submitted_at: string | null;
    percent: number | null;
    passed: boolean | null;
  }[];
  type A = {
    personnel_id: string;
    exam_set_id: string;
    assigned_at: string;
    pilots: { full_name: string; active: boolean } | null;
    exam_sets: { title: string; skill_level: SkillLevel | null; active: boolean } | null;
  };
  const due: DueExam[] = [];
  for (const a of (assignRes.data ?? []) as unknown as A[]) {
    if (!a.pilots?.active || !a.exam_sets?.active) continue;
    const s = examStatus(
      a.assigned_at,
      attempts.filter((x) => x.personnel_id === a.personnel_id && x.exam_set_id === a.exam_set_id),
    );
    if (s.status === "due" && s.daysOverdue !== null) {
      due.push({
        personnelId: a.personnel_id,
        personName: a.pilots.full_name,
        examTitle: a.exam_sets.title,
        skillLevel: a.exam_sets.skill_level,
        daysOverdue: s.daysOverdue,
      });
    }
  }
  return due.sort((x, y) => y.daysOverdue - x.daysOverdue || x.personName.localeCompare(y.personName));
}
