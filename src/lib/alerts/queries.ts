import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  currencyStatus,
  CURRENCY_ITEM_LABELS,
  type CurrencyItemType,
  type QualificationStatus,
} from "@/lib/types/pilot";

export const EXPIRING_SOON_THRESHOLD_DAYS = 30;

export type AlertCategory = "fitness" | "qualification" | "currency" | "ape" | "staneval";
export type AlertSeverity = "expired" | "expiring_soon";

export type Alert = {
  /** Stable across calls — `${category}:${pilotId}:${subKey}:${status}` —
   * so it can double as both a React key and the acknowledgement lookup
   * key. NOT array-index-based (an earlier version was; that broke the
   * moment acknowledgements needed something to key off of). */
  id: string;
  pilotId: string;
  pilotName: string;
  category: AlertCategory;
  detail: string;
  dueDate: string;
  status: AlertSeverity;
};

function daysUntil(iso: string): number {
  const target = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/** Keeps only the most recent row per pilot_id from a list already ordered
 * newest-first. */
function latestPerPilot<T extends { pilot_id: string }>(rows: T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const row of rows) {
    if (!map.has(row.pilot_id)) map.set(row.pilot_id, row);
  }
  return map;
}

export async function getAlerts(): Promise<Alert[]> {
  const supabase = await createClient();

  const [pilotsRes, qualsRes, currencyRes, apeRes, stanevalRes] = await Promise.all([
    supabase
      .from("pilots")
      .select("id, full_name, rank_code, fit_to_fly, ranks(label)")
      .eq("active", true)
      .order("full_name"),
    supabase
      .from("qualifications")
      .select("pilot_id, status, aircraft_type_code, expiry_date, aircraft_types(label)"),
    supabase.from("currency_items").select("pilot_id, item_type, last_date, validity_days"),
    supabase
      .from("ape_records")
      .select("pilot_id, fit_to_fly, next_due_date")
      .order("last_ape_date", { ascending: false }),
    supabase
      .from("staneval_records")
      .select("pilot_id, next_due_date")
      .order("eval_date", { ascending: false }),
  ]);

  if (pilotsRes.error) throw pilotsRes.error;
  if (qualsRes.error) throw qualsRes.error;
  if (currencyRes.error) throw currencyRes.error;
  if (apeRes.error) throw apeRes.error;
  if (stanevalRes.error) throw stanevalRes.error;

  const pilots = (pilotsRes.data ?? []) as unknown as {
    id: string;
    full_name: string;
    rank_code: string;
    fit_to_fly: boolean;
    ranks: { label: string } | null;
  }[];

  const pilotName = (pilotId: string) => {
    const p = pilots.find((row) => row.id === pilotId);
    if (!p) return "Unknown pilot";
    return `${p.ranks?.label ?? p.rank_code} ${p.full_name}`;
  };

  // The pilots query above is already filtered to active pilots, but the
  // per-record queries below (quals/currency/APE/StanEval) aren't scoped by
  // pilot at all -- this keeps a deactivated pilot's old records from still
  // generating alerts wing-wide.
  const activePilotIds = new Set(pilots.map((p) => p.id));

  const alerts: Alert[] = [];

  function pushAlert(
    pilotId: string,
    category: AlertCategory,
    /** Disambiguates alerts of the same category for the same pilot (e.g.
     * which aircraft type, which currency requirement). Empty string for
     * categories where a pilot only ever has one active alert of that kind
     * (fitness, APE, StanEval). */
    subKey: string,
    detail: string,
    dueDate: string,
    status: AlertSeverity,
  ) {
    alerts.push({
      id: `${category}:${pilotId}:${subKey}:${status}`,
      pilotId,
      pilotName: pilotName(pilotId),
      category,
      detail,
      dueDate,
      status,
    });
  }

  // --- fitness (fit to fly) -------------------------------------------------
  // No date involved -- this is a persistent flag, not a countdown, so it's
  // always "expired" severity (matches how the APE module treats "not fit
  // to fly") and sorts by today's date since there's no better one to use.
  const today = new Date().toISOString().slice(0, 10);
  for (const p of pilots) {
    if (!p.fit_to_fly) {
      pushAlert(p.id, "fitness", "", "Marked unfit to fly", today, "expired");
    }
  }

  // --- qualifications ---------------------------------------------------
  const quals = (qualsRes.data ?? []) as unknown as {
    pilot_id: string;
    status: QualificationStatus;
    aircraft_type_code: string;
    expiry_date: string | null;
    aircraft_types: { label: string } | null;
  }[];

  for (const q of quals) {
    if (!activePilotIds.has(q.pilot_id)) continue;
    if (q.status === "expired" || q.status === "expiring_soon") {
      const label = q.aircraft_types?.label ?? q.aircraft_type_code;
      // Falls back to "today" only for the rare row with no expiry_date on
      // file at all — every seeded row has one, this is just a guard.
      const dueDate = q.expiry_date ?? new Date().toISOString().slice(0, 10);
      pushAlert(
        q.pilot_id,
        "qualification",
        q.aircraft_type_code,
        `${label} qualification ${q.status === "expired" ? "expired" : "expiring"}`,
        dueDate,
        q.status,
      );
    }
  }

  // --- currency items -----------------------------------------------------
  const currencyItems = (currencyRes.data ?? []) as {
    pilot_id: string;
    item_type: CurrencyItemType;
    last_date: string;
    validity_days: number;
  }[];

  for (const item of currencyItems) {
    if (!activePilotIds.has(item.pilot_id)) continue;
    const status = currencyStatus(item, EXPIRING_SOON_THRESHOLD_DAYS);
    if (status === "expired" || status === "expiring_soon") {
      const expiresAt = new Date(item.last_date);
      expiresAt.setDate(expiresAt.getDate() + item.validity_days);
      pushAlert(
        item.pilot_id,
        "currency",
        item.item_type,
        `${CURRENCY_ITEM_LABELS[item.item_type]} ${status === "expired" ? "lapsed" : "expiring"}`,
        expiresAt.toISOString().slice(0, 10),
        status,
      );
    }
  }

  // --- APE (most recent per pilot) -----------------------------------------
  const latestApe = latestPerPilot(
    (apeRes.data ?? []) as { pilot_id: string; fit_to_fly: boolean; next_due_date: string }[],
  );
  for (const [pilotId, ape] of latestApe) {
    if (!activePilotIds.has(pilotId)) continue;
    if (!ape.fit_to_fly) {
      pushAlert(pilotId, "ape", "", "Not fit to fly", ape.next_due_date, "expired");
      continue;
    }
    const daysLeft = daysUntil(ape.next_due_date);
    if (daysLeft < 0) {
      pushAlert(pilotId, "ape", "", "APE overdue", ape.next_due_date, "expired");
    } else if (daysLeft <= EXPIRING_SOON_THRESHOLD_DAYS) {
      pushAlert(pilotId, "ape", "", "APE due soon", ape.next_due_date, "expiring_soon");
    }
  }

  // --- StanEval (most recent per pilot) ------------------------------------
  const latestStaneval = latestPerPilot(
    (stanevalRes.data ?? []) as { pilot_id: string; next_due_date: string | null }[],
  );
  for (const [pilotId, record] of latestStaneval) {
    if (!activePilotIds.has(pilotId)) continue;
    if (!record.next_due_date) continue;
    const daysLeft = daysUntil(record.next_due_date);
    if (daysLeft < 0) {
      pushAlert(pilotId, "staneval", "", "StanEval overdue", record.next_due_date, "expired");
    } else if (daysLeft <= EXPIRING_SOON_THRESHOLD_DAYS) {
      pushAlert(
        pilotId,
        "staneval",
        "",
        "StanEval check ride due",
        record.next_due_date,
        "expiring_soon",
      );
    }
  }

  alerts.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return alerts;
}

export type Acknowledgement = {
  acknowledgedAt: string;
  acknowledgedByName: string;
};

/** Keyed by alert id (see Alert.id / alert_acknowledgements.alert_key). */
export async function getAcknowledgements(): Promise<Map<string, Acknowledgement>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("alert_acknowledgements")
    .select("alert_key, acknowledged_at, acknowledged_by");
  if (error) throw error;

  const rows = data ?? [];
  const changedByIds = [...new Set(rows.map((r) => r.acknowledged_by).filter((id): id is string => !!id))];

  let namesById = new Map<string, string>();
  if (changedByIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", changedByIds);
    if (profilesError) throw profilesError;
    namesById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  }

  const map = new Map<string, Acknowledgement>();
  for (const row of rows) {
    map.set(row.alert_key, {
      acknowledgedAt: row.acknowledged_at,
      acknowledgedByName: row.acknowledged_by
        ? (namesById.get(row.acknowledged_by) ?? "Deleted account")
        : "Unknown",
    });
  }
  return map;
}
