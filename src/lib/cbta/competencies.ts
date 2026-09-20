/** The CBTA Training/Assessment Grade Slip: competencies, grade scale and the
 * rule that turns pilot grades into a "trainee competent" verdict. Pure (no
 * server imports) so the form and the server action share one implementation. */

export type CompetencyGroup = "knowledge" | "skills" | "attitude" | "instructor";

export type Competency = { code: string; label: string; group: CompetencyGroup };

export const GROUP_LABELS: Record<CompetencyGroup, string> = {
  knowledge: "Knowledge",
  skills: "Skills",
  attitude: "Attitude",
  instructor: "Instructor competency",
};

export const PILOT_COMPETENCIES: Competency[] = [
  { code: "know", label: "Application of Knowledge", group: "knowledge" },
  { code: "proc", label: "Application of Procedures and Compliance with Regulations", group: "knowledge" },
  { code: "fpm_manual", label: "Aeroplane Flight Path Management – Manual Controls", group: "skills" },
  { code: "fpm_auto", label: "Aeroplane Flight Path Management – Automation", group: "skills" },
  { code: "com", label: "Communication", group: "attitude" },
  { code: "ltw", label: "Leadership and Teamwork", group: "attitude" },
  { code: "psd", label: "Problem Solving and Decision Making", group: "attitude" },
  { code: "saw", label: "Situational Awareness and Management of Information", group: "attitude" },
  { code: "wlm", label: "Workload Management", group: "attitude" },
];

export const INSTRUCTOR_COMPETENCIES: Competency[] = [
  { code: "i_mle", label: "Management of the Learning Environment", group: "instructor" },
  { code: "i_int", label: "Interaction with Trainees", group: "instructor" },
  { code: "i_ae", label: "Assessment and Evaluation", group: "instructor" },
];

export const ALL_COMPETENCIES = [...PILOT_COMPETENCIES, ...INSTRUCTOR_COMPETENCIES];

export const GRADE_LABELS: Record<number, string> = {
  1: "Not Proficient",
  2: "Progressing",
  3: "Standard",
  4: "Exemplary",
};

export const MODES = ["training", "checking"] as const;
export type CbtaMode = (typeof MODES)[number];
export const MODE_LABELS: Record<CbtaMode, string> = { training: "Training", checking: "Checking" };

export type CbtaOutcome = "remedial" | "passed" | "na";
export const OUTCOME_LABELS: Record<CbtaOutcome, string> = {
  remedial: "Remedial",
  passed: "Passed",
  na: "N/A",
};

export type GradeEntry = { grade: number | null; comment: string };
export type GradeMap = Record<string, GradeEntry>;

export type Assessment = {
  /** True once every pilot competency has a grade. */
  complete: boolean;
  /** Any pilot competency graded 1: "competent" is blocked, outcome is Remedial. */
  blocked: boolean;
  /** Pilot competencies graded 2 with no comment yet. */
  twosMissingComment: string[];
  /** What the app suggests: competent when all >= 3; not competent on any 1; open otherwise. */
  suggestion: "competent" | "not_competent" | "instructor_decides" | null;
};

/** The rule. Only the nine pilot competencies drive the verdict; the
 * instructor competencies are recorded but never affect the trainee. */
export function assess(grades: GradeMap): Assessment {
  const pilot = PILOT_COMPETENCIES.map((c) => ({ c, e: grades[c.code] }));
  const complete = pilot.every(({ e }) => e?.grade != null);
  const blocked = pilot.some(({ e }) => e?.grade === 1);
  const twosMissingComment = pilot
    .filter(({ e }) => e?.grade === 2 && !e.comment.trim())
    .map(({ c }) => c.label);

  let suggestion: Assessment["suggestion"] = null;
  if (blocked) suggestion = "not_competent";
  else if (complete) {
    suggestion = pilot.every(({ e }) => (e?.grade ?? 0) >= 3) ? "competent" : "instructor_decides";
  }
  return { complete, blocked, twosMissingComment, suggestion };
}

export function outcomeFor(competent: boolean): CbtaOutcome {
  return competent ? "passed" : "remedial";
}
