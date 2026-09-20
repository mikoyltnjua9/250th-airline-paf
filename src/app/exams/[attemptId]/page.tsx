import { redirect } from "next/navigation";
import { requireExaminee } from "@/lib/exams/session";
import { getRunnerData } from "@/lib/exams/queries";
import { ExamRunner } from "@/components/exams/exam-runner";

export default async function TakeExamPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const me = await requireExaminee();
  const result = await getRunnerData(attemptId, me.personnelId);

  if (result.kind === "missing") redirect("/exams");
  if (result.kind === "submitted") redirect(`/exams/${attemptId}/result`);

  return <ExamRunner {...result.data} />;
}
