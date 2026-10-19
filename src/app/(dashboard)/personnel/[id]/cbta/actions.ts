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
 * Signature images are far too big to ride along in an error-redirect URL, so
 * they're left out of the values handed back to the form.
 */
function withoutSignatures(formData: FormData) {
  const copy = new FormData();
  for (const [key, value] of formData) if (!key.endsWith("_signature")) copy.append(key, value);
  return copy;
}

// A signature is the small PNG the signature pad produces; anything else (or
// anything huge) is refused rather than stored.
const SIGNATURE_RE = /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/;
const MAX_SIGNATURE_LENGTH = 200_000;

/**
 * Validates a submitted slip and applies the grading rule. The rule lives here
 * (not just in the form) so it can't be bypassed: any pilot competency graded 1
 * forces "not competent" / Remedial, and every 2 needs a comment.
 */
function buildSlip(formData: FormData, backTo: string) {
  const fail = (msg: string): never => redirectWithFormError(backTo, msg, withoutSignatures(formData));

  const signature = (name: string, who: string) => {
    const raw = String(formData.get(name) ?? "").trim();
    if (!raw) return null;
    if (raw.length > MAX_SIGNATURE_LENGTH || !SIGNATURE_RE.test(raw)) {
      fail(`The ${who} signature couldn't be read. Clear it and sign again.`);
    }
    return raw;
  };
  const instructorSignature = signature("instructor_signature", "instructor");
  const studentSignature = signature("student_signature", "student");

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
    instructor_signature: instructorSignature,
    student_signature: studentSignature,
    // The student's concurrence is their signature.
    student_concurrence: studentSignature !== null,
    trainee_competent: competent,
    outcome: outcomeFor(competent),
  };
}

async function requireAssessor(pilotId: string) {
  const profile = await getCurrentProfile();
  if (!profile || !hasPermission(profile.role_code, "cbta:manage")) {
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
      instructor_signed_at: slip.instructor_signature ? new Date().toISOString() : null,
      student_signed_at: slip.student_signature ? new Date().toISOString() : null,
      created_by: profile.id,
      updated_by: profile.id,
    })
    .select("id")
    .single();
  if (error) {
    redirectWithFormError(`/personnel/${pilotId}/cbta/new`, error.message, withoutSignatures(formData));
  }

  revalidatePath(`/personnel/${pilotId}`);
  redirect(`/personnel/${pilotId}/cbta/${data!.id}`);
}

export async function updateCbtaAssessment(formData: FormData) {
  const pilotId = String(formData.get("pilot_id") ?? "");
  const slipId = String(formData.get("slip_id") ?? "");
  const back = `/personnel/${pilotId}/cbta/${slipId}/edit`;
  const { profile, supabase } = await requireAssessor(pilotId);
  const slip = buildSlip(formData, back);

  // A signature keeps the date it was made; only a new or cleared one changes it.
  const { data: existing } = await supabase
    .from("cbta_assessments")
    .select("instructor_signature, instructor_signed_at, student_signature, student_signed_at")
    .eq("id", slipId)
    .eq("pilot_id", pilotId)
    .maybeSingle();
  const signedAt = (next: string | null, prev: string | null | undefined, prevAt: string | null | undefined) =>
    next === null ? null : next === prev ? (prevAt ?? new Date().toISOString()) : new Date().toISOString();

  const { error } = await supabase
    .from("cbta_assessments")
    .update({
      ...slip,
      // The verdict is re-decided on every save, so the deciding person is too.
      decided_by: profile.id,
      decided_by_name: profile.full_name,
      instructor_signed_at: signedAt(
        slip.instructor_signature,
        existing?.instructor_signature,
        existing?.instructor_signed_at,
      ),
      student_signed_at: signedAt(
        slip.student_signature,
        existing?.student_signature,
        existing?.student_signed_at,
      ),
      updated_by: profile.id,
    })
    .eq("id", slipId)
    .eq("pilot_id", pilotId);
  if (error) redirectWithFormError(back, error.message, withoutSignatures(formData));

  revalidatePath(`/personnel/${pilotId}`);
  redirect(`/personnel/${pilotId}/cbta/${slipId}`);
}

export async function deleteCbtaAssessment(pilotId: string, slipId: string) {
  const { supabase } = await requireAssessor(pilotId);
  const { error } = await supabase.from("cbta_assessments").delete().eq("id", slipId).eq("pilot_id", pilotId);
  if (error) throw error;
  revalidatePath(`/personnel/${pilotId}`);
}
