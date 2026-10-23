import { getExaminee } from "@/lib/exams/session";
import { createAdminClient } from "@/lib/supabase/admin";

const FIGURE_BUCKET = "exam-figures";

/**
 * The picture belonging to an exam question. Only someone currently sitting an
 * unsubmitted exam that contains the question can load it; everyone else gets
 * a 404 (not 403, so question ids can't be probed).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ questionId: string }> }) {
  const { questionId } = await params;
  const me = await getExaminee();
  if (!me) return new Response("Not found", { status: 404 });

  const admin = createAdminClient();
  const { data: question } = await admin
    .from("exam_questions")
    .select("exam_set_id, image_path")
    .eq("id", questionId)
    .maybeSingle();
  if (!question?.image_path) return new Response("Not found", { status: 404 });

  const { data: open } = await admin
    .from("exam_attempts")
    .select("id")
    .eq("personnel_id", me.personnelId)
    .eq("exam_set_id", question.exam_set_id)
    .is("submitted_at", null)
    .limit(1);
  if (!open || open.length === 0) return new Response("Not found", { status: 404 });

  const { data: file, error } = await admin.storage.from(FIGURE_BUCKET).download(question.image_path);
  if (error || !file) return new Response("Not found", { status: 404 });

  return new Response(file, {
    headers: {
      "Content-Type": file.type || "image/png",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
