import type { PersonnelType } from "@/lib/types/pilot";

/** Each exam set is written for one audience; this is which one a kind of
 * person sits. */
export type ExamAudience = "pilot" | "maintenance" | "cabin_crew";

export function examAudienceFor(type: PersonnelType): ExamAudience {
  if (type === "pilot") return "pilot";
  if (type === "cabin_crew") return "cabin_crew";
  return "maintenance";
}
