"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getExaminee } from "@/lib/exams/session";
import { examStatus } from "@/lib/exams/queries";
import { todayInManila } from "@/lib/dates";

/**
 * Every action here runs on the server with the service-role client, because
 * examinees have no database access of their own (that's what keeps the
 * answer key unreachable from a browser). So each one re-derives who's
 * calling from the session and scopes every read/write to THEIR personnel
 * record -- an attempt id or exam id from the client is never trusted on its
 * own.
 */
async function requireExamineeForAction() {
  const me = await getExaminee();
  if (!me) throw new Error("You aren't signed in as an examinee.");
  return me;
}

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function startExam(examSetId: string) {
  const me = await requireExamineeForAction();
  const admin = createAdminClient();

  const { data: assignment } = await admin
    .from("exam_assignments")
    .select("assigned_at")
    .eq("personnel_id", me.personnelId)
    .eq("exam_set_id", examSetId)
    .maybeSingle();
  if (!assignment) throw new Error("That exam isn't assigned to you.");

  const { data: set } = await admin.from("exam_sets").select("active").eq("id", examSetId).single();
  if (!set?.active) throw new Error("That exam isn't available.");

  const { data: attempts } = await admin
    .from("exam_attempts")
    .select("id, exam_set_id, started_at, submitted_at, percent, passed")
    .eq("personnel_id", me.personnelId)
    .eq("exam_set_id", examSetId);
  const status = examStatus(assignment.assigned_at, attempts ?? []);

  // A pass locks the exam until an admin re-assigns it; an unfinished attempt
  // is resumed rather than restarted (so a refresh or timeout loses nothing).
  if (status.status === "passed") redirect("/exams");
  if (status.openAttemptId) redirect(`/exams/${status.openAttemptId}`);

  // Only questions with a verified single correct answer are ever scored.
  const { data: qs, error } = await admin
    .from("exam_questions")
    .select("id, exam_options(id)")
    .eq("exam_set_id", examSetId)
    .eq("status", "ok");
  if (error) throw error;
  const questions = (qs ?? []) as unknown as { id: string; exam_options: { id: string }[] }[];
  if (questions.length === 0) throw new Error("This exam has no scorable questions yet.");

  // Full official set every time, but shuffled: question order AND option
  // order, so a retake can't be passed by remembering positions.
  const order = shuffle(questions).map((q) => ({
    q: q.id,
    opts: shuffle(q.exam_options.map((o) => o.id)),
  }));

  const { data: created, error: insErr } = await admin
    .from("exam_attempts")
    .insert({ personnel_id: me.personnelId, exam_set_id: examSetId, question_order: order })
    .select("id")
    .single();
  if (insErr) throw insErr;

  redirect(`/exams/${created.id}`);
}

export async function saveAnswer(
  attemptId: string,
  questionId: string,
  optionId: string,
): Promise<{ ok: boolean; error?: string }> {
  const me = await requireExamineeForAction();
  const admin = createAdminClient();

  const { data: attempt } = await admin
    .from("exam_attempts")
    .select("question_order, answers, submitted_at")
    .eq("id", attemptId)
    .eq("personnel_id", me.personnelId)
    .maybeSingle();
  if (!attempt) return { ok: false, error: "Attempt not found." };
  if (attempt.submitted_at) return { ok: false, error: "This exam was already submitted." };

  // The answer must be one of the options actually shown for that question
  // in this attempt.
  const item = (attempt.question_order as { q: string; opts: string[] }[]).find((x) => x.q === questionId);
  if (!item || !item.opts.includes(optionId)) return { ok: false, error: "Invalid answer." };

  const answers = { ...((attempt.answers ?? {}) as Record<string, string>), [questionId]: optionId };
  const { error } = await admin
    .from("exam_attempts")
    .update({ answers })
    .eq("id", attemptId)
    .is("submitted_at", null);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function submitExam(attemptId: string) {
  const me = await requireExamineeForAction();
  const admin = createAdminClient();

  const { data: attempt } = await admin
    .from("exam_attempts")
    .select("id, exam_set_id, submitted_at, question_order, answers, exam_sets(title, category, skill_level, pass_mark)")
    .eq("id", attemptId)
    .eq("personnel_id", me.personnelId)
    .maybeSingle();
  if (!attempt) throw new Error("Attempt not found.");
  if (attempt.submitted_at) redirect(`/exams/${attemptId}/result`);

  // Grading -- the ONLY place the answer key is read.
  const { data: keyRows, error } = await admin
    .from("exam_questions")
    .select("id, exam_options(id, is_correct)")
    .eq("exam_set_id", attempt.exam_set_id);
  if (error) throw error;
  const correctByQuestion = new Map<string, string>();
  for (const q of (keyRows ?? []) as unknown as { id: string; exam_options: { id: string; is_correct: boolean }[] }[]) {
    const correct = q.exam_options.filter((o) => o.is_correct);
    if (correct.length === 1) correctByQuestion.set(q.id, correct[0].id);
  }

  const order = attempt.question_order as { q: string }[];
  const answers = (attempt.answers ?? {}) as Record<string, string>;
  const total = order.length;
  const correct = order.filter((item) => correctByQuestion.get(item.q) === answers[item.q]).length;
  const percent = total > 0 ? Math.round((correct / total) * 10000) / 100 : 0;

  const set = attempt.exam_sets as unknown as {
    title: string;
    category: string;
    skill_level: string | null;
    pass_mark: number;
  };
  const passed = percent >= Number(set.pass_mark);

  // The result becomes a Pass/Fail StanEval record on the person's profile.
  const grading = `Written exam: ${set.category} / ${set.title}${
    set.skill_level ? ` (${set.skill_level} Skill)` : ""
  } - ${percent}% (${correct}/${total})`;
  const { data: staneval, error: sErr } = await admin
    .from("staneval_records")
    .insert({
      pilot_id: me.personnelId,
      eval_date: todayInManila(),
      status: passed ? "pass" : "fail",
      grading,
      created_by: me.userId,
      updated_by: me.userId,
    })
    .select("id")
    .single();
  if (sErr) throw sErr;

  // Guarded on submitted_at IS NULL so a double-click / second tab can't
  // grade the same attempt twice.
  const { data: updated, error: uErr } = await admin
    .from("exam_attempts")
    .update({
      submitted_at: new Date().toISOString(),
      scored_total: total,
      scored_correct: correct,
      percent,
      passed,
      staneval_record_id: staneval.id,
    })
    .eq("id", attemptId)
    .is("submitted_at", null)
    .select("id");
  if (uErr || !updated || updated.length === 0) {
    await admin.from("staneval_records").delete().eq("id", staneval.id);
    if (uErr) throw uErr;
  }

  revalidatePath("/exams");
  revalidatePath(`/personnel/${me.personnelId}`);
  redirect(`/exams/${attemptId}/result`);
}
