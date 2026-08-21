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
] as const;

export type Rank = {
  code: string;
  label: string;
  sort_order: number;
};

export type AircraftType = {
  code: string;
  label: string;
  sort_order: number;
};

export type Pilot = {
  id: string;
  full_name: string;
  rank_code: string;
  afsn: string;
  position: string;
  photo_url: string | null;
  fit_to_fly: boolean;
  public_verify_token: string;
  created_at: string;
  updated_at: string;
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

/** Derives current/expiring_soon/expired from last_date + validity_days. */
export function currencyStatus(
  item: Pick<CurrencyItem, "last_date" | "validity_days">,
  thresholdDays = 30,
): QualificationStatus {
  const expiresAt = new Date(item.last_date);
  expiresAt.setDate(expiresAt.getDate() + item.validity_days);
  const daysLeft = Math.floor((expiresAt.getTime() - Date.now()) / 86_400_000);

  if (daysLeft < 0) return "expired";
  if (daysLeft <= thresholdDays) return "expiring_soon";
  return "current";
}
