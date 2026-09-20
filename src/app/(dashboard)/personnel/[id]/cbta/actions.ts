"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { hasPermission } from "@/lib/permissions";
import { personnelTypeForPosition } from "@/lib/types/pilot";
import { redirectWithFormError } from "@/lib/forms/error-redirect";
import {
  ALL_COMPETENCIES,
  MODES,
  assess,
  outcomeFor,
  type CbtaMode,
  type GradeMap,
} from "@/lib/cbta/competencies";

const COUNT_FIELDS = [
  "day_takeoff",
  "day_landing",
  "night_takeoff",
  "night_landing",
  "visual_count",
  "rnp_count",
  "ils_count",
  "vor_count",
] as const;

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim() || null;
}

/**
 * Validates a submitted slip and applies the grading rule. The rule lives here
 * (not just in the form) so it can't be bypassed: any pilot competency graded 1
 * forces "not competent" / Remedial, and every 2 needs a comment.
 */
function buildSlip(formData: FormData, backTo: string) {
  const fail = (msg: string): never => redirectWithFormError(backTo, msg, formData);

  const assessedOn = String(formData.get("assessed_on") ?? "").trim();
  if (!assessedOn) fail("Date is required.");
  const mode = String(formData.get("mode") ?? "training") as CbtaMode;
  if (!MODES.includes(mode)) fail("Choose Training or Checking.");

  const grades: GradeMap = {};
  for (const c of ALL_COMPETENCIES) {
    const raw = String(formData.get(`grade_${c.code}`) ?? "");
    const grade = raw ? Number(raw) : null;
    if (grade !== null && ![1, 2, 3, 4].includes(grade)) fail("Grades must be 1 to 4.");
    grades[c.code] = { grade, comment: String(formData.get(`comment_${c.code}`) ?? "").trim() };
  }

  const result = assess(grades);
  if (!result.complete) {
    fail("Grade every pilot competency (Knowledge, Skills and Attitude) before saving.");
  }
  if (result.twosMissingComment.length > 0) {
    fail(`A comment is required for every grade of 2. Missing: ${result.twosMissingComment.join("; ")}.`);
  }

  const verdict = String(formData.get("trainee_competent") ?? "");
  if (verdict !== "yes" && verdict !== "no") fail("Choose whether the trainee is competent: Yes or No.");
  // Hard rule: any grade of 1 means not competent, regardless of what was clicked.
  const competent = !result.blocked && verdict === "yes";

  const counts = Object.fromEntries(
    COUNT_FIELDS.map((f) => {
      const n = Number(String(formData.get(f) ?? "0") || 0);
      return [f, Number.isInteger(n) && n >= 0 ? n : 0];
    }),
  );

  return {
    assessed_on: assessedOn,
    mode,
    lesson: text(formData, "lesson"),
    aircraft_tail_no: text(formData, "aircraft_tail_no"),
    instructor_name: text(formData, "instructor_name"),
    duration: text(formData, "duration"),
    itinerary: text(formData, "itinerary"),
    ...counts,
    grades,
    positive_remarks: text(formData, "positive_remarks"),
    developmental_remarks: text(formData, "developmental_remarks"),
    summary: text(formData, "summary"),
    student_concurrence: formData.get("student_concurrence") === "on",
    trainee_competent: competent,
    outcome: outcomeFor(competent),
  };
}

async function requireAssessor(pilotId: string) {
  const profile = await getCurrentProfile();
  if (!profile || !hasPermission(profile.role_code, "pilots:manage")) {
    throw new Error("You don't have permission to record assessments.");
  }
  const supabase = await createClient();
  const { data: person } = await supabase.from("pilots").select("position").eq("id", pilotId).maybeSingle();
  if (!person || personnelTypeForPosition(person.position) !== "pilot") {
    throw new Error("CBTA grade slips are for pilots only.");
  }
  return { profile, supabase };
}

export async function createCbtaAssessment(formData: FormData) {
  const pilotId = String(formData.get("pilot_id") ?? "");
  const { profile, supabase } = await requireAssessor(pilotId);
  const slip = buildSlip(formData, `/personnel/${pilotId}/cbta/new`);

  const { data, error } = await supabase
    .from("cbta_assessments")
    .insert({
      pilot_id: pilotId,
      ...slip,
      decided_by: profile.id,
      decided_by_name: profile.full_name,
      created_by: profile.id,
      updated_by: profile.id,
    })
    .select("id")
    .single();
  if (error) redirectWithFormError(`/personnel/${pilotId}/cbta/new`, error.message, formData);

  revalidatePath(`/personnel/${pilotId}`);
  redirect(`/personnel/${pilotId}/cbta/${data!.id}`);
}

export async function updateCbtaAssessment(formData: FormData) {
  const pilotId = String(formData.get("pilot_id") ?? "");
  const slipId = String(formData.get("slip_id") ?? "");
  const back = `/personnel/${pilotId}/cbta/${slipId}/edit`;
  const { profile, supabase } = await requireAssessor(pilotId);
  const slip = buildSlip(formData, back);

  const { error } = await supabase
    .from("cbta_assessments")
    .update({
      ...slip,
      // The verdict is re-decided on every save, so the deciding person is too.
      decided_by: profile.id,
      decided_by_name: profile.full_name,
      updated_by: profile.id,
    })
    .eq("id", slipId)
    .eq("pilot_id", pilotId);
  if (error) redirectWithFormError(back, error.message, formData);

  revalidatePath(`/personnel/${pilotId}`);
  redirect(`/personnel/${pilotId}/cbta/${slipId}`);
}

export async function deleteCbtaAssessment(pilotId: string, slipId: string) {
  const { supabase } = await requireAssessor(pilotId);
  const { error } = await supabase.from("cbta_assessments").delete().eq("id", slipId).eq("pilot_id", pilotId);
  if (error) throw error;
  revalidatePath(`/personnel/${pilotId}`);
}
