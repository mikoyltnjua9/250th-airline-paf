"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { hasPermission } from "@/lib/permissions";
import { personnelTypeForPosition } from "@/lib/types/pilot";

async function requireExamsManage() {
  const profile = await getCurrentProfile();
  if (!profile || !hasPermission(profile.role_code, "exams:manage")) {
    throw new Error("You don't have permission to manage exams.");
  }
  return profile;
}

/**
 * Assigns an exam to a person -- or re-issues it if they already have it:
 * setting assigned_at to now means only attempts from here on count, so a
 * previous pass stops locking the exam (e.g. for a yearly re-check) and a
 * string of old fails is forgotten. Past attempts and their StanEval
 * records are never touched.
 */
export async function assignExam(formData: FormData) {
  await requireExamsManage();
  const personnelId = String(formData.get("personnel_id") ?? "");
  const examSetId = String(formData.get("exam_set_id") ?? "");
  if (!personnelId || !examSetId) return;

  const supabase = await createClient();
  const { data: person } = await supabase
    .from("pilots")
    .select("position")
    .eq("id", personnelId)
    .maybeSingle();
  if (!person || personnelTypeForPosition(person.position) === "pilot") {
    throw new Error("Written exams are for maintenance staff and cabin crew.");
  }

  await reissue(personnelId, examSetId);
}

async function reissue(personnelId: string, examSetId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // No update policy on assignments (nothing else is ever edited on one), so
  // re-issuing is delete + insert, which yields a fresh assigned_at.
  const { error: delError } = await supabase
    .from("exam_assignments")
    .delete()
    .eq("personnel_id", personnelId)
    .eq("exam_set_id", examSetId);
  if (delError) throw delError;

  const { error } = await supabase
    .from("exam_assignments")
    .insert({ personnel_id: personnelId, exam_set_id: examSetId, assigned_by: user?.id });
  if (error) throw error;
  revalidatePath(`/personnel/${personnelId}`);
}

export async function reassignExam(personnelId: string, examSetId: string) {
  await requireExamsManage();
  await reissue(personnelId, examSetId);
}

export async function unassignExam(personnelId: string, examSetId: string) {
  await requireExamsManage();
  const supabase = await createClient();
  const { error } = await supabase
    .from("exam_assignments")
    .delete()
    .eq("personnel_id", personnelId)
    .eq("exam_set_id", examSetId);
  if (error) throw error;
  revalidatePath(`/personnel/${personnelId}`);
}
