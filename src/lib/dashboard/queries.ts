import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getAlerts, EXPIRING_SOON_THRESHOLD_DAYS, type Alert, type AlertCategory } from "@/lib/alerts/queries";
import {
  currencyStatus,
  CURRENCY_ITEM_LABELS,
  type CurrencyItemType,
  type QualificationStatus,
} from "@/lib/types/pilot";

export { EXPIRING_SOON_THRESHOLD_DAYS };

// Kept as aliases (rather than moving every consumer's import) — the alert
// computation itself now lives in src/lib/alerts/queries.ts, shared with
// the Alerts & Notifications page and the Reports "Active Safety Alerts"
// export.
export type DashboardAlertCategory = AlertCategory;
export type DashboardAlert = Alert;

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

export async function getDashboardOverview(): Promise<DashboardOverview> {
  const supabase = await createClient();

  const [pilotsRes, qualsRes, aircraftTypesRes, currencyRes, alerts] = await Promise.all([
    supabase.from("pilots").select("id"),
    supabase.from("qualifications").select("pilot_id, status, aircraft_type_code"),
    supabase.from("aircraft_types").select("code, label").order("sort_order"),
    supabase.from("currency_items").select("pilot_id, item_type, last_date, validity_days"),
    getAlerts(),
  ]);

  if (pilotsRes.error) throw pilotsRes.error;
  if (qualsRes.error) throw qualsRes.error;
  if (aircraftTypesRes.error) throw aircraftTypesRes.error;
  if (currencyRes.error) throw currencyRes.error;

  const pilots = pilotsRes.data ?? [];
  const pilotsWithAlerts = new Set(alerts.map((a) => a.pilotId));

  // --- qualification summary, by aircraft type -----------------------------
  const quals = (qualsRes.data ?? []) as {
    pilot_id: string;
    status: QualificationStatus;
    aircraft_type_code: string;
  }[];
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
  const currencyItems = (currencyRes.data ?? []) as {
    pilot_id: string;
    item_type: CurrencyItemType;
    last_date: string;
    validity_days: number;
  }[];
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
