/**
 * Phase 2 mock data for the Dashboard Overview.
 *
 * The real pilots/licenses/qualifications/currency_items/etc. tables don't
 * exist yet (they land in Phase 3+). This module stands in for those
 * queries with hand-authored sample data shaped the same way the real
 * aggregation queries will eventually return it, so the Overview
 * components below only need their data *source* swapped later, not
 * rebuilt.
 *
 * "Expiring soon" threshold used throughout: 30 days.
 */

export const EXPIRING_SOON_THRESHOLD_DAYS = 30;

export type QualStatus = "current" | "expiring_soon" | "expired" | "in_training";
export type CurrencyStatus = "current" | "expiring_soon" | "expired";
export type AlertCategory = "license" | "qualification" | "currency" | "ape" | "staneval";

export type MockPilot = {
  id: string;
  fullName: string;
  rank: string;
  unit: string;
};

export const MOCK_PILOTS: MockPilot[] = [
  { id: "p1", fullName: "Ramon Bautista", rank: "Capt", unit: "250th PAW / 1st Air Div" },
  { id: "p2", fullName: "Andrea Villanueva", rank: "1Lt", unit: "250th PAW / 1st Air Div" },
  { id: "p3", fullName: "Ferdinand Cruz", rank: "Maj", unit: "250th PAW / 2nd Air Div" },
  { id: "p4", fullName: "Miguel Santos", rank: "Capt", unit: "250th PAW / 2nd Air Div" },
  { id: "p5", fullName: "Kristine Aquino", rank: "1Lt", unit: "250th PAW / 1st Air Div" },
  { id: "p6", fullName: "Roberto Mendoza", rank: "LtCol", unit: "250th PAW / Wing HQ" },
  { id: "p7", fullName: "Bianca Reyes", rank: "Capt", unit: "250th PAW / 2nd Air Div" },
  { id: "p8", fullName: "Joshua Tan", rank: "2Lt", unit: "250th PAW / 1st Air Div" },
  { id: "p9", fullName: "Patricia Lim", rank: "Maj", unit: "250th PAW / Wing HQ" },
  { id: "p10", fullName: "Daniel Garcia", rank: "Capt", unit: "250th PAW / 2nd Air Div" },
];

export type QualificationSummary = {
  aircraftType: string;
  current: number;
  expiringSoon: number;
  expired: number;
  inTraining: number;
};

export const MOCK_QUALIFICATION_SUMMARY: QualificationSummary[] = [
  { aircraftType: "Fokker F28", current: 5, expiringSoon: 1, expired: 0, inTraining: 1 },
  { aircraftType: "N-22B Nomad", current: 4, expiringSoon: 0, expired: 1, inTraining: 0 },
  { aircraftType: "S-70i Black Hawk", current: 3, expiringSoon: 2, expired: 0, inTraining: 2 },
  { aircraftType: "Bell 412", current: 6, expiringSoon: 1, expired: 1, inTraining: 0 },
];

export type CurrencyItemType = "last_flight" | "ifr" | "night_proficiency" | "peculiar_runways";

export const CURRENCY_ITEM_LABELS: Record<CurrencyItemType, string> = {
  last_flight: "Last Flight",
  ifr: "IFR",
  night_proficiency: "Night Proficiency",
  peculiar_runways: "Peculiar Runways",
};

export type CurrencySummary = {
  itemType: CurrencyItemType;
  current: number;
  expiringSoon: number;
  expired: number;
};

export const MOCK_CURRENCY_SUMMARY: CurrencySummary[] = [
  { itemType: "last_flight", current: 8, expiringSoon: 1, expired: 1 },
  { itemType: "ifr", current: 7, expiringSoon: 2, expired: 1 },
  { itemType: "night_proficiency", current: 6, expiringSoon: 2, expired: 2 },
  { itemType: "peculiar_runways", current: 9, expiringSoon: 1, expired: 0 },
];

export type WorkloadEntry = {
  pilotId: string;
  hoursLast30Days: number;
};

export const MOCK_WORKLOAD: WorkloadEntry[] = [
  { pilotId: "p6", hoursLast30Days: 42.5 },
  { pilotId: "p3", hoursLast30Days: 38.0 },
  { pilotId: "p1", hoursLast30Days: 31.5 },
  { pilotId: "p9", hoursLast30Days: 27.0 },
  { pilotId: "p7", hoursLast30Days: 24.5 },
  { pilotId: "p4", hoursLast30Days: 19.0 },
  { pilotId: "p10", hoursLast30Days: 16.5 },
  { pilotId: "p5", hoursLast30Days: 12.0 },
  { pilotId: "p2", hoursLast30Days: 8.5 },
  { pilotId: "p8", hoursLast30Days: 4.0 },
];

export type AlertItem = {
  id: string;
  pilotId: string;
  category: AlertCategory;
  detail: string;
  dueDate: string; // ISO date
  status: "expired" | "expiring_soon";
};

// Dates are relative to "today" (2026-08-19) so the demo always reads as
// current regardless of when it's actually viewed.
export const MOCK_ALERTS: AlertItem[] = [
  {
    id: "a1",
    pilotId: "p2",
    category: "license",
    detail: "Pilot license expired",
    dueDate: "2026-08-05",
    status: "expired",
  },
  {
    id: "a2",
    pilotId: "p4",
    category: "qualification",
    detail: "N-22B Nomad qualification expired",
    dueDate: "2026-08-10",
    status: "expired",
  },
  {
    id: "a3",
    pilotId: "p5",
    category: "currency",
    detail: "Night proficiency lapsed",
    dueDate: "2026-08-12",
    status: "expired",
  },
  {
    id: "a4",
    pilotId: "p8",
    category: "ape",
    detail: "APE (physical exam) overdue",
    dueDate: "2026-08-15",
    status: "expired",
  },
  {
    id: "a5",
    pilotId: "p1",
    category: "qualification",
    detail: "Fokker F28 qualification expiring",
    dueDate: "2026-09-02",
    status: "expiring_soon",
  },
  {
    id: "a6",
    pilotId: "p7",
    category: "currency",
    detail: "IFR currency expiring",
    dueDate: "2026-09-05",
    status: "expiring_soon",
  },
  {
    id: "a7",
    pilotId: "p9",
    category: "staneval",
    detail: "StanEval check ride due",
    dueDate: "2026-09-08",
    status: "expiring_soon",
  },
  {
    id: "a8",
    pilotId: "p3",
    category: "currency",
    detail: "Last-flight currency expiring",
    dueDate: "2026-09-11",
    status: "expiring_soon",
  },
];

export function findPilot(pilotId: string): MockPilot | undefined {
  return MOCK_PILOTS.find((p) => p.id === pilotId);
}

export function getOverviewStats() {
  const pilotsWithAlerts = new Set(MOCK_ALERTS.map((a) => a.pilotId));
  const expiredAlerts = MOCK_ALERTS.filter((a) => a.status === "expired").length;
  const expiringAlerts = MOCK_ALERTS.filter((a) => a.status === "expiring_soon").length;
  const totalHours30Days = MOCK_WORKLOAD.reduce((sum, w) => sum + w.hoursLast30Days, 0);

  return {
    totalPilots: MOCK_PILOTS.length,
    fullyMissionReady: MOCK_PILOTS.length - pilotsWithAlerts.size,
    expiredAlerts,
    expiringAlerts,
    totalAlerts: expiredAlerts + expiringAlerts,
    totalHours30Days,
  };
}
