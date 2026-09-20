import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CbtaMode, CbtaOutcome, GradeMap } from "@/lib/cbta/competencies";

export type CbtaAssessment = {
  id: string;
  pilot_id: string;
  assessed_on: string;
  mode: CbtaMode;
  lesson: string | null;
  aircraft_tail_no: string | null;
  instructor_name: string | null;
  duration: string | null;
  itinerary: string | null;
  day_takeoff: number;
  day_landing: number;
  night_takeoff: number;
  night_landing: number;
  visual_count: number;
  rnp_count: number;
  ils_count: number;
  vor_count: number;
  grades: GradeMap;
  positive_remarks: string | null;
  developmental_remarks: string | null;
  summary: string | null;
  student_concurrence: boolean;
  trainee_competent: boolean;
  outcome: CbtaOutcome;
  decided_by_name: string | null;
  created_at: string;
};

export async function getCbtaAssessments(pilotId: string): Promise<CbtaAssessment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cbta_assessments")
    .select("*")
    .eq("pilot_id", pilotId)
    .order("assessed_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CbtaAssessment[];
}

export async function getCbtaAssessment(pilotId: string, id: string): Promise<CbtaAssessment | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cbta_assessments")
    .select("*")
    .eq("id", id)
    .eq("pilot_id", pilotId)
    .maybeSingle();
  if (error) throw error;
  return (data as CbtaAssessment | null) ?? null;
}
