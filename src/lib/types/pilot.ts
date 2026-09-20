// Hand-written to match supabase/migrations/20260819084215_pilot_records.sql,
// 20260819094838_staneval_records.sql, and 20260819145142_training_records.sql.
// TODO: once the Supabase CLI is properly linked (needs a personal access
// token, not just the project keys), replace this with generated types via
// `supabase gen types typescript`.

export type QualificationStatus = "current" | "expiring_soon" | "expired" | "in_training";
export type FlightDuty = "PIC" | "SIC" | "IP" | "Student";
export type CurrencyItemType = "last_flight" | "ifr" | "night_proficiency" | "peculiar_runways";
export type TrainingStatus = "completed" | "scheduled" | "overdue";
export type StanevalStatus = "pass" | "fail";

// Fixed set, not a lookup table (like ranks/aircraft_types) -- personnel
// positions don't change often enough to justify the extra table, and
// unlike ranks there's no external numbering scheme to preserve.
export const POSITIONS = [
  "Fixed-Wing Pilot",
  "Rotary Pilot",
  "Ground Crew",
  "Maintenance Officer",
  "Maintenance Technician",
  "Flight Attendant",
] as const;

export type PersonnelType = "pilot" | "maintenance" | "cabin_crew" | "other";

/**
 * What kind of person a position is. The app began pilot-only, so anything
 * unrecognized (old free-text values like "Pilot") stays a pilot rather than
 * silently dropping out of wing-wide pilot views.
 */
export function personnelTypeForPosition(position: string): PersonnelType {
  if (position === "Maintenance Officer" || position === "Maintenance Technician") return "maintenance";
  if (position === "Flight Attendant") return "cabin_crew";
  if (position === "Ground Crew") return "other";
  return "pilot";
}

export const NON_PILOT_POSITIONS = [
  "Ground Crew",
  "Maintenance Officer",
  "Maintenance Technician",
  "Flight Attendant",
] as const;

/** PostgREST value for `.not("position", "in", ...)` -- keeps non-pilots out
 * of pilot-only views (alerts, dashboard counts, workload, reports). */
export const NON_PILOT_POSITIONS_FILTER = `(${NON_PILOT_POSITIONS.map((p) => `"${p}"`).join(",")})`;

export const SKILL_LEVELS = ["3rd", "5th", "7th"] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];

export type Rank = {
  code: string;
  label: string;
  sort_order: number;
};

export type AircraftCategory = "fixed_wing" | "rotary";

export type AircraftType = {
  code: string;
  label: string;
  sort_order: number;
  category: AircraftCategory | null;
  /** false = retired from the fleet list. Kept (not deleted) so existing
   * qualification/flight records referencing it stay valid history. */
  active: boolean;
};

/** Which aircraft category a pilot position flies. Ground Crew and
 * Maintenance Officer (and any unrecognized legacy value) have no category,
 * so they aren't restricted to one. */
export function aircraftCategoryForPosition(position: string): AircraftCategory | null {
  if (position === "Fixed-Wing Pilot") return "fixed_wing";
  if (position === "Rotary Pilot") return "rotary";
  return null;
}

export type Pilot = {
  id: string;
  full_name: string;
  rank_code: string;
  afsn: string;
  position: string;
  photo_url: string | null;
  fit_to_fly: boolean;
  active: boolean;
  public_verify_token: string;
  skill_level: SkillLevel | null;
  contact_phone: string | null;
  contact_email: string | null;
  created_at: string;
  updated_at: string;
};

// Crew-role qualifications: a separate dimension from the per-aircraft-type
// Qualifications above (Bell 412, C295, etc.) -- this tracks what duty
// role a pilot is qualified for (Pilot in Command, Instructor, etc.),
// regardless of aircraft. Fixed lookup like ranks/aircraft_types.
export type CrewRole = {
  code: string;
  label: string;
  sort_order: number;
  /** false = retired (e.g. Check Pilot). Kept, not deleted, so old rows and
   * their audit history survive -- it just stops displaying. */
  active: boolean;
  /** Which aircraft categories' pilots hold this role. */
  applies_to: AircraftCategory[];
};

/** Crew roles a pilot of this position is shown. Positions with no aircraft
 * category (Ground Crew, Maintenance Officer, unrecognized legacy values)
 * see every active role rather than none. */
export function crewRolesForPosition(roles: CrewRole[], position: string): CrewRole[] {
  const category = aircraftCategoryForPosition(position);
  return roles.filter(
    (r) => r.active && (category === null || r.applies_to.includes(category)),
  );
}

/** Currency requirements differ by position: everyone tracks Last Flight and
 * IFR; Fixed-Wing adds Peculiar Runways, Rotary adds Night Proficiency.
 * Other positions keep all four (no restriction is implied for them). */
export function currencyItemTypesForPosition(position: string): CurrencyItemType[] {
  const category = aircraftCategoryForPosition(position);
  if (category === "fixed_wing") return ["last_flight", "ifr", "peculiar_runways"];
  if (category === "rotary") return ["last_flight", "ifr", "night_proficiency"];
  return ["last_flight", "ifr", "night_proficiency", "peculiar_runways"];
}

// One row per (pilot, role) -- like CurrencyItem, not a history log.
export type PilotCrewQualification = {
  id: string;
  pilot_id: string;
  role_code: string;
  qualified: boolean;
};

export type Qualification = {
  id: string;
  pilot_id: string;
  aircraft_type_code: string;
  status: QualificationStatus;
  date_earned: string | null;
  expiry_date: string | null;
};

export type Flight = {
  id: string;
  pilot_id: string;
  flight_date: string;
  aircraft_type_code: string;
  route: string | null;
  duty: FlightDuty;
  flying_time_hours: number;
};

/** APE classification, as the client defined it (was free text). */
export const APE_CLASSIFICATIONS = ["P1", "P2", "P3"] as const;

export type ApeRecord = {
  id: string;
  pilot_id: string;
  last_ape_date: string;
  next_due_date: string;
  fit_to_fly: boolean;
  classification: string | null;
};

export type CurrencyItem = {
  id: string;
  pilot_id: string;
  item_type: CurrencyItemType;
  last_date: string;
  validity_days: number;
};

export const CURRENCY_ITEM_LABELS: Record<CurrencyItemType, string> = {
  last_flight: "Last Flight",
  ifr: "IFR",
  night_proficiency: "Night Proficiency",
  peculiar_runways: "Peculiar Runways",
};

export type StanevalRecord = {
  id: string;
  pilot_id: string;
  eval_date: string;
  status: StanevalStatus;
  grading: string | null;
  next_due_date: string | null;
};

export type TrainingRecord = {
  id: string;
  pilot_id: string;
  training_type: string;
  status: TrainingStatus;
  training_date: string;
};

import { addDaysIso, daysUntilDate } from "@/lib/dates";

export type FitnessReason = "manual" | "ape_expired" | "ape_not_fit" | "no_ape";

/** The two fields of a pilot's latest APE that decide fitness. */
export type LatestApe = { next_due_date: string; fit_to_fly: boolean };
export type EffectiveFitness = { fit: boolean; reason: FitnessReason | null };

/**
 * A pilot's real fit-to-fly status: the manual flag on the pilot record AND a
 * current APE whose result was "fit". Derived at read time rather than written back to the flag --
 * an expired APE flips the pilot to unfit automatically with no scheduled
 * job, and renewing the APE flips them back without anyone touching the flag.
 * No APE on file counts as unfit (nothing shows they're medically cleared),
 * and so does a latest APE whose own result was "not fit". Fit through the
 * APE's due date; unfit from the day after.
 */
export function effectiveFitness(
  manualFit: boolean,
  latestApe: LatestApe | null | undefined,
): EffectiveFitness {
  if (!manualFit) return { fit: false, reason: "manual" };
  if (!latestApe) return { fit: false, reason: "no_ape" };
  if (!latestApe.fit_to_fly) return { fit: false, reason: "ape_not_fit" };
  if (daysUntilDate(latestApe.next_due_date) < 0) return { fit: false, reason: "ape_expired" };
  return { fit: true, reason: null };
}

/** The date a currency item lapses: last_date plus its validity window. */
export function currencyExpiryDate(
  item: Pick<CurrencyItem, "last_date" | "validity_days">,
): string {
  return addDaysIso(item.last_date, item.validity_days);
}

/**
 * Derives current/expiring_soon/expired from last_date + validity_days, by
 * whole Manila calendar days. Valid through the expiry date itself and
 * expired from the day after -- the same rule APE, StanEval and alerts use.
 */
export function currencyStatus(
  item: Pick<CurrencyItem, "last_date" | "validity_days">,
  thresholdDays = 30,
): QualificationStatus {
  const daysLeft = daysUntilDate(currencyExpiryDate(item));

  if (daysLeft < 0) return "expired";
  if (daysLeft <= thresholdDays) return "expiring_soon";
  return "current";
}
