import { ALL_COMPETENCIES } from "@/lib/cbta/competencies";
import type { CbtaAssessment } from "@/lib/cbta/queries";

/** Flattens a saved slip into the same field names the form submits, so the
 * edit page can reuse the form's `defaultValues`. */
export function slipToDefaults(s: CbtaAssessment): Record<string, string> {
  const d: Record<string, string> = {
    assessed_on: s.assessed_on,
    mode: s.mode,
    lesson: s.lesson ?? "",
    aircraft_tail_no: s.aircraft_tail_no ?? "",
    instructor_name: s.instructor_name ?? "",
    duration: s.duration ?? "",
    itinerary: s.itinerary ?? "",
    day_takeoff: String(s.day_takeoff),
    day_landing: String(s.day_landing),
    night_takeoff: String(s.night_takeoff),
    night_landing: String(s.night_landing),
    visual_count: String(s.visual_count),
    rnp_count: String(s.rnp_count),
    ils_count: String(s.ils_count),
    vor_count: String(s.vor_count),
    positive_remarks: s.positive_remarks ?? "",
    developmental_remarks: s.developmental_remarks ?? "",
    summary: s.summary ?? "",
    trainee_competent: s.trainee_competent ? "yes" : "no",
  };
  if (s.student_concurrence) d.student_concurrence = "on";
  for (const c of ALL_COMPETENCIES) {
    const e = s.grades[c.code];
    if (e?.grade != null) d[`grade_${c.code}`] = String(e.grade);
    d[`comment_${c.code}`] = e?.comment ?? "";
  }
  return d;
}
