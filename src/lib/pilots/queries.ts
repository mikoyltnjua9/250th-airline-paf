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
  Rank,
  AircraftType,
} from "@/lib/types/pilot";

export type DirectoryRow = Pick<Pilot, "id" | "full_name" | "rank_code" | "unit_section"> & {
  ranks: { label: string } | null;
  licenses: { status: License["status"] }[];
};

export async function getPilotDirectory(): Promise<DirectoryRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pilots")
    .select("id, full_name, rank_code, unit_section, ranks(label), licenses(status)")
    .order("full_name");

  if (error) throw error;
  return (data ?? []) as unknown as DirectoryRow[];
}

export type PilotProfile = {
  pilot: Pilot;
  rankLabel: string;
  license: License | null;
  qualifications: (Qualification & { aircraft_types: { label: string } | null })[];
  flights: (Flight & { aircraft_types: { label: string } | null })[];
  ape: ApeRecord | null;
  currencyItems: CurrencyItem[];
  stanevalRecords: StanevalRecord[];
};

export async function getPilotProfile(id: string): Promise<PilotProfile | null> {
  const supabase = await createClient();

  const [pilotRes, rankRes, licenseRes, qualsRes, flightsRes, apeRes, currencyRes, stanevalRes] =
    await Promise.all([
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
      supabase
        .from("ape_records")
        .select("*")
        .eq("pilot_id", id)
        .order("last_ape_date", { ascending: false })
        .limit(1),
      supabase.from("currency_items").select("*").eq("pilot_id", id),
      supabase
        .from("staneval_records")
        .select("*")
        .eq("pilot_id", id)
        .order("eval_date", { ascending: false }),
    ]);

  if (pilotRes.error) throw pilotRes.error;
  if (!pilotRes.data) return null;

  const rankLabel =
    (rankRes.data as unknown as { ranks: { label: string } | null } | null)?.ranks?.label ??
    pilotRes.data.rank_code;

  return {
    pilot: pilotRes.data as Pilot,
    rankLabel,
    license: (licenseRes.data?.[0] as License | undefined) ?? null,
    qualifications: (qualsRes.data ?? []) as unknown as PilotProfile["qualifications"],
    flights: (flightsRes.data ?? []) as unknown as PilotProfile["flights"],
    ape: (apeRes.data?.[0] as ApeRecord | undefined) ?? null,
    currencyItems: (currencyRes.data ?? []) as CurrencyItem[],
    stanevalRecords: (stanevalRes.data ?? []) as StanevalRecord[],
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
