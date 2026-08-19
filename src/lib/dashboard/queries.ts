import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  currencyStatus,
  CURRENCY_ITEM_LABELS,
  type CurrencyItemType,
  type QualificationStatus,
  type LicenseStatus,
} from "@/lib/types/pilot";

export const EXPIRING_SOON_THRESHOLD_DAYS = 30;

export type DashboardAlertCategory = "license" | "qualification" | "currency" | "ape" | "staneval";
export type DashboardAlertSeverity = "expired" | "expiring_soon";

export type DashboardAlert = {
  id: string;
  pilotId: string;
  pilotName: string;
  category: DashboardAlertCategory;
  detail: string;
  dueDate: string;
  status: DashboardAlertSeverity;
};

export type QualSummaryRow = {
  aircraftTypeCode: string;
  aircraftTypeLabel: string;
  current: number;
  expiringSoon: number;
  expired: number;
  inTraining: number;
};

export type CurrencySummaryRow = {
  itemType: CurrencyItemType;
  current: number;
  expiringSoon: number;
  expired: number;
};

export type DashboardOverview = {
  totalPilots: number;
  fullyMissionReady: number;
  alerts: DashboardAlert[];
  qualificationSummary: QualSummaryRow[];
  currencySummary: CurrencySummaryRow[];
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

export async function getDashboardOverview(): Promise<DashboardOverview> {
  const supabase = await createClient();

  const [
    pilotsRes,
    licensesRes,
    qualsRes,
    aircraftTypesRes,
    currencyRes,
    apeRes,
    stanevalRes,
  ] = await Promise.all([
    supabase.from("pilots").select("id, full_name, rank_code, ranks(label)").order("full_name"),
    supabase.from("licenses").select("pilot_id, status, date_expires"),
    supabase.from("qualifications").select("pilot_id, status, aircraft_type_code, aircraft_types(label)"),
    supabase.from("aircraft_types").select("code, label").order("sort_order"),
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
  if (licensesRes.error) throw licensesRes.error;
  if (qualsRes.error) throw qualsRes.error;
  if (aircraftTypesRes.error) throw aircraftTypesRes.error;
  if (currencyRes.error) throw currencyRes.error;
  if (apeRes.error) throw apeRes.error;
  if (stanevalRes.error) throw stanevalRes.error;

  const pilots = (pilotsRes.data ?? []) as unknown as {
    id: string;
    full_name: string;
    rank_code: string;
    ranks: { label: string } | null;
  }[];

  const pilotName = (pilotId: string) => {
    const p = pilots.find((row) => row.id === pilotId);
    if (!p) return "Unknown pilot";
    return `${p.ranks?.label ?? p.rank_code} ${p.full_name}`;
  };

  const alerts: DashboardAlert[] = [];
  const pilotsWithAlerts = new Set<string>();

  function pushAlert(
    pilotId: string,
    category: DashboardAlertCategory,
    detail: string,
    dueDate: string,
    status: DashboardAlertSeverity,
  ) {
    alerts.push({
      id: `${category}-${pilotId}-${alerts.length}`,
      pilotId,
      pilotName: pilotName(pilotId),
      category,
      detail,
      dueDate,
      status,
    });
    pilotsWithAlerts.add(pilotId);
  }

  // --- licenses -------------------------------------------------------
  for (const lic of (licensesRes.data ?? []) as {
    pilot_id: string;
    status: LicenseStatus;
    date_expires: string;
  }[]) {
    if (lic.status === "revoked" || lic.status === "suspended") {
      pushAlert(lic.pilot_id, "license", `License ${lic.status}`, lic.date_expires, "expired");
      continue;
    }
    const daysLeft = daysUntil(lic.date_expires);
    if (daysLeft < 0) {
      pushAlert(lic.pilot_id, "license", "License expired", lic.date_expires, "expired");
    } else if (daysLeft <= EXPIRING_SOON_THRESHOLD_DAYS) {
      pushAlert(lic.pilot_id, "license", "License expiring soon", lic.date_expires, "expiring_soon");
    }
  }

  // --- qualifications ---------------------------------------------------
  const quals = (qualsRes.data ?? []) as unknown as {
    pilot_id: string;
    status: QualificationStatus;
    aircraft_type_code: string;
    aircraft_types: { label: string } | null;
  }[];

  for (const q of quals) {
    if (q.status === "expired" || q.status === "expiring_soon") {
      const label = q.aircraft_types?.label ?? q.aircraft_type_code;
      pushAlert(
        q.pilot_id,
        "qualification",
        `${label} qualification ${q.status === "expired" ? "expired" : "expiring"}`,
        // No expiry date is guaranteed on a qualification row; fall back to
        // "today" so it still sorts near the top rather than crashing.
        new Date().toISOString().slice(0, 10),
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
    const status = currencyStatus(item, EXPIRING_SOON_THRESHOLD_DAYS);
    if (status === "expired" || status === "expiring_soon") {
      pushAlert(
        item.pilot_id,
        "currency",
        `${CURRENCY_ITEM_LABELS[item.item_type]} ${status === "expired" ? "lapsed" : "expiring"}`,
        item.last_date,
        status,
      );
    }
  }

  // --- APE (most recent per pilot) -----------------------------------------
  const latestApe = latestPerPilot(
    (apeRes.data ?? []) as { pilot_id: string; fit_to_fly: boolean; next_due_date: string }[],
  );
  for (const [pilotId, ape] of latestApe) {
    if (!ape.fit_to_fly) {
      pushAlert(pilotId, "ape", "Not fit to fly", ape.next_due_date, "expired");
      continue;
    }
    const daysLeft = daysUntil(ape.next_due_date);
    if (daysLeft < 0) {
      pushAlert(pilotId, "ape", "APE overdue", ape.next_due_date, "expired");
    } else if (daysLeft <= EXPIRING_SOON_THRESHOLD_DAYS) {
      pushAlert(pilotId, "ape", "APE due soon", ape.next_due_date, "expiring_soon");
    }
  }

  // --- StanEval (most recent per pilot) ------------------------------------
  const latestStaneval = latestPerPilot(
    (stanevalRes.data ?? []) as { pilot_id: string; next_due_date: string | null }[],
  );
  for (const [pilotId, record] of latestStaneval) {
    if (!record.next_due_date) continue;
    const daysLeft = daysUntil(record.next_due_date);
    if (daysLeft < 0) {
      pushAlert(pilotId, "staneval", "StanEval overdue", record.next_due_date, "expired");
    } else if (daysLeft <= EXPIRING_SOON_THRESHOLD_DAYS) {
      pushAlert(pilotId, "staneval", "StanEval check ride due", record.next_due_date, "expiring_soon");
    }
  }

  alerts.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  // --- qualification summary, by aircraft type -----------------------------
  const aircraftTypes = (aircraftTypesRes.data ?? []) as { code: string; label: string }[];
  const qualificationSummary: QualSummaryRow[] = aircraftTypes.map((type) => {
    const rowsForType = quals.filter((q) => q.aircraft_type_code === type.code);
    return {
      aircraftTypeCode: type.code,
      aircraftTypeLabel: type.label,
      current: rowsForType.filter((q) => q.status === "current").length,
      expiringSoon: rowsForType.filter((q) => q.status === "expiring_soon").length,
      expired: rowsForType.filter((q) => q.status === "expired").length,
      inTraining: rowsForType.filter((q) => q.status === "in_training").length,
    };
  });

  // --- currency summary, by requirement type -------------------------------
  const currencyItemTypes = Object.keys(CURRENCY_ITEM_LABELS) as CurrencyItemType[];
  const currencySummary: CurrencySummaryRow[] = currencyItemTypes.map((itemType) => {
    const rowsForType = currencyItems.filter((c) => c.item_type === itemType);
    const statuses = rowsForType.map((c) => currencyStatus(c, EXPIRING_SOON_THRESHOLD_DAYS));
    return {
      itemType,
      current: statuses.filter((s) => s === "current").length,
      expiringSoon: statuses.filter((s) => s === "expiring_soon").length,
      expired: statuses.filter((s) => s === "expired").length,
    };
  });

  return {
    totalPilots: pilots.length,
    fullyMissionReady: pilots.length - pilotsWithAlerts.size,
    alerts,
    qualificationSummary,
    currencySummary,
  };
}
