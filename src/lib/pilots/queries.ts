import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  Pilot,
  License,
  Qualification,
  Flight,
  ApeRecord,
  CurrencyItem,
  StanevalRecord,
  TrainingRecord,
  Rank,
  AircraftType,
} from "@/lib/types/pilot";

export type DirectoryRow = Pick<Pilot, "id" | "full_name" | "rank_code"> & {
  ranks: { label: string } | null;
  licenses: { status: License["status"] }[];
};

export async function getPilotDirectory(): Promise<DirectoryRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pilots")
    .select("id, full_name, rank_code, ranks(label), licenses(status)")
    .order("full_name");

  if (error) throw error;
  return (data ?? []) as unknown as DirectoryRow[];
}

export type WorkloadRow = {
  pilotId: string;
  fullName: string;
  rankLabel: string;
  hours: number;
  flightCount: number;
};

/** Wing-wide rolling-window flight-hours workload, heaviest first. */
export async function getDutyWorkload(windowDays = 30): Promise<WorkloadRow[]> {
  const supabase = await createClient();

  const since = new Date();
  since.setDate(since.getDate() - windowDays);
  const sinceIso = since.toISOString().slice(0, 10);

  const [pilotsRes, flightsRes] = await Promise.all([
    supabase
      .from("pilots")
      .select("id, full_name, rank_code, ranks(label)")
      .order("full_name"),
    supabase.from("flights").select("pilot_id, flying_time_hours").gte("flight_date", sinceIso),
  ]);

  if (pilotsRes.error) throw pilotsRes.error;
  if (flightsRes.error) throw flightsRes.error;

  const byPilot = new Map<string, { hours: number; count: number }>();
  for (const f of flightsRes.data ?? []) {
    const entry = byPilot.get(f.pilot_id) ?? { hours: 0, count: 0 };
    entry.hours += f.flying_time_hours ?? 0;
    entry.count += 1;
    byPilot.set(f.pilot_id, entry);
  }

  const rows: WorkloadRow[] = (pilotsRes.data ?? []).map((p) => {
    const agg = byPilot.get(p.id) ?? { hours: 0, count: 0 };
    const rankLabel =
      (p as unknown as { ranks: { label: string } | null }).ranks?.label ?? p.rank_code;
    return {
      pilotId: p.id,
      fullName: p.full_name,
      rankLabel,
      hours: agg.hours,
      flightCount: agg.count,
    };
  });

  rows.sort((a, b) => b.hours - a.hours);
  return rows;
}

export type PilotProfile = {
  pilot: Pilot;
  rankLabel: string;
  license: License | null;
  qualifications: (Qualification & { aircraft_types: { label: string } | null })[];
  flights: (Flight & { aircraft_types: { label: string } | null })[];
  flightTotals: { flyingHours: number; blockHours: number; flightCount: number };
  apeRecords: ApeRecord[];
  currencyItems: CurrencyItem[];
  stanevalRecords: StanevalRecord[];
  trainingRecords: TrainingRecord[];
};

export async function getPilotProfile(id: string): Promise<PilotProfile | null> {
  const supabase = await createClient();

  const [
    pilotRes,
    rankRes,
    licenseRes,
    qualsRes,
    flightsRes,
    allFlightHoursRes,
    apeRes,
    currencyRes,
    stanevalRes,
    trainingRes,
  ] = await Promise.all([
    supabase.from("pilots").select("*").eq("id", id).maybeSingle(),
    supabase.from("pilots").select("rank_code, ranks(label)").eq("id", id).maybeSingle(),
    supabase
      .from("licenses")
      .select("*")
      .eq("pilot_id", id)
      .order("date_issued", { ascending: false })
      .limit(1),
    supabase
      .from("qualifications")
      .select("*, aircraft_types(label)")
      .eq("pilot_id", id)
      .order("aircraft_type_code"),
    supabase
      .from("flights")
      .select("*, aircraft_types(label)")
      .eq("pilot_id", id)
      .order("flight_date", { ascending: false })
      .limit(10),
    // Separate, uncapped fetch just for totals — the list above is
    // deliberately limited to the 10 most recent entries.
    supabase.from("flights").select("flying_time_hours, block_time_hours").eq("pilot_id", id),
    supabase
      .from("ape_records")
      .select("*")
      .eq("pilot_id", id)
      .order("last_ape_date", { ascending: false }),
    supabase.from("currency_items").select("*").eq("pilot_id", id),
    supabase
      .from("staneval_records")
      .select("*")
      .eq("pilot_id", id)
      .order("eval_date", { ascending: false }),
    supabase
      .from("training_records")
      .select("*")
      .eq("pilot_id", id)
      .order("training_date", { ascending: false }),
  ]);

  if (pilotRes.error) throw pilotRes.error;
  if (!pilotRes.data) return null;

  const rankLabel =
    (rankRes.data as unknown as { ranks: { label: string } | null } | null)?.ranks?.label ??
    pilotRes.data.rank_code;

  const allFlightHours = allFlightHoursRes.data ?? [];
  const flightTotals = {
    flyingHours: allFlightHours.reduce((sum, f) => sum + (f.flying_time_hours ?? 0), 0),
    blockHours: allFlightHours.reduce((sum, f) => sum + (f.block_time_hours ?? 0), 0),
    flightCount: allFlightHours.length,
  };

  return {
    pilot: pilotRes.data as Pilot,
    rankLabel,
    license: (licenseRes.data?.[0] as License | undefined) ?? null,
    qualifications: (qualsRes.data ?? []) as unknown as PilotProfile["qualifications"],
    flights: (flightsRes.data ?? []) as unknown as PilotProfile["flights"],
    flightTotals,
    apeRecords: (apeRes.data ?? []) as ApeRecord[],
    currencyItems: (currencyRes.data ?? []) as CurrencyItem[],
    stanevalRecords: (stanevalRes.data ?? []) as StanevalRecord[],
    trainingRecords: (trainingRes.data ?? []) as TrainingRecord[],
  };
}

export async function getStanevalRecord(
  pilotId: string,
  recordId: string,
): Promise<StanevalRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("staneval_records")
    .select("*")
    .eq("pilot_id", pilotId)
    .eq("id", recordId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getQualification(
  pilotId: string,
  qualificationId: string,
): Promise<Qualification | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("qualifications")
    .select("*")
    .eq("pilot_id", pilotId)
    .eq("id", qualificationId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getFlight(pilotId: string, flightId: string): Promise<Flight | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("flights")
    .select("*")
    .eq("pilot_id", pilotId)
    .eq("id", flightId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getApeRecord(
  pilotId: string,
  recordId: string,
): Promise<ApeRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ape_records")
    .select("*")
    .eq("pilot_id", pilotId)
    .eq("id", recordId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getTrainingRecord(
  pilotId: string,
  recordId: string,
): Promise<TrainingRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("training_records")
    .select("*")
    .eq("pilot_id", pilotId)
    .eq("id", recordId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getCurrencyItem(
  pilotId: string,
  itemType: CurrencyItem["item_type"],
): Promise<CurrencyItem | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("currency_items")
    .select("*")
    .eq("pilot_id", pilotId)
    .eq("item_type", itemType)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getRanks(): Promise<Rank[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("ranks").select("*").order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function getAircraftTypes(): Promise<AircraftType[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("aircraft_types").select("*").order("sort_order");
  if (error) throw error;
  return data ?? [];
}
