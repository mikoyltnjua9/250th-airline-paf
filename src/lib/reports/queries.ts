import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getDashboardOverview } from "@/lib/dashboard/queries";
import {
  currencyStatus,
  CURRENCY_ITEM_LABELS,
  type CurrencyItemType,
  type LicenseStatus,
  type QualificationStatus,
} from "@/lib/types/pilot";

/**
 * Every report is shaped into flat rows up front, at the query layer — the
 * same values feed both the on-screen/print table and the CSV export, so
 * formatting (dates, status labels) only happens in one place.
 */
export type ReportRow = Record<string, string | number>;
export type ReportColumn = { key: string; header: string; numeric?: boolean };
export type ReportDefinition = {
  slug: string;
  title: string;
  description: string;
  columns: ReportColumn[];
  getRows: () => Promise<ReportRow[]>;
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replaceAll("_", " ");
}

const LICENSE_STATUS_LABELS: Record<LicenseStatus, string> = {
  valid: "Valid",
  expired: "Expired",
  revoked: "Revoked",
  suspended: "Suspended",
};

const QUAL_STATUS_LABELS: Record<QualificationStatus, string> = {
  current: "Current",
  expiring_soon: "Expiring Soon",
  expired: "Expired",
  in_training: "In Training",
};

/** Keeps only the most recent row per pilot_id from a list already ordered
 * newest-first. Mirrors the same helper in dashboard/queries.ts. */
function latestPerPilot<T extends { pilot_id: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of rows) {
    if (seen.has(row.pilot_id)) continue;
    seen.add(row.pilot_id);
    out.push(row);
  }
  return out;
}

// --- Personnel Roster --------------------------------------------------

async function rosterRows(): Promise<ReportRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pilots")
    .select(
      "full_name, afsn, unit_section, position, rank_code, ranks(label), licenses(license_no, status, date_expires)",
    )
    .order("full_name");
  if (error) throw error;

  return ((data ?? []) as unknown as {
    full_name: string;
    afsn: string;
    unit_section: string | null;
    position: string;
    rank_code: string;
    ranks: { label: string } | null;
    licenses: { license_no: string; status: LicenseStatus; date_expires: string }[];
  }[]).map((p) => {
    const license = p.licenses?.[0];
    return {
      Rank: p.ranks?.label ?? p.rank_code,
      "Full Name": p.full_name,
      AFSN: p.afsn,
      "Unit/Section": p.unit_section ?? "—",
      Position: p.position,
      "License No.": license?.license_no ?? "—",
      "License Status": license ? LICENSE_STATUS_LABELS[license.status] : "No license on file",
      "License Expires": license ? formatDate(license.date_expires) : "—",
    };
  });
}

// --- Qualifications -----------------------------------------------------

async function qualificationsRows(): Promise<ReportRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("qualifications")
    .select(
      "status, date_earned, expiry_date, pilots(full_name, rank_code, ranks(label)), aircraft_types(label)",
    )
    .order("pilot_id");
  if (error) throw error;

  const rows = (data ?? []) as unknown as {
    status: QualificationStatus;
    date_earned: string | null;
    expiry_date: string | null;
    pilots: { full_name: string; rank_code: string; ranks: { label: string } | null } | null;
    aircraft_types: { label: string } | null;
  }[];

  return rows
    .map((q) => ({
      Rank: q.pilots?.ranks?.label ?? q.pilots?.rank_code ?? "—",
      "Full Name": q.pilots?.full_name ?? "Unknown pilot",
      "Aircraft Type": q.aircraft_types?.label ?? "—",
      Status: QUAL_STATUS_LABELS[q.status],
      "Date Earned": formatDate(q.date_earned),
      "Expiry Date": formatDate(q.expiry_date),
    }))
    .sort((a, b) => String(a["Full Name"]).localeCompare(String(b["Full Name"])));
}

// --- Currency Status ------------------------------------------------------

async function currencyRows(): Promise<ReportRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("currency_items")
    .select(
      "item_type, last_date, validity_days, pilots(full_name, rank_code, ranks(label))",
    )
    .order("pilot_id");
  if (error) throw error;

  const rows = (data ?? []) as unknown as {
    item_type: CurrencyItemType;
    last_date: string;
    validity_days: number;
    pilots: { full_name: string; rank_code: string; ranks: { label: string } | null } | null;
  }[];

  return rows
    .map((c) => {
      const expiresAt = new Date(c.last_date);
      expiresAt.setDate(expiresAt.getDate() + c.validity_days);
      const status = currencyStatus(c);
      return {
        Rank: c.pilots?.ranks?.label ?? c.pilots?.rank_code ?? "—",
        "Full Name": c.pilots?.full_name ?? "Unknown pilot",
        Requirement: CURRENCY_ITEM_LABELS[c.item_type],
        "Last Date": formatDate(c.last_date),
        Expires: formatDate(expiresAt.toISOString().slice(0, 10)),
        Status: QUAL_STATUS_LABELS[status],
      };
    })
    .sort((a, b) => String(a["Full Name"]).localeCompare(String(b["Full Name"])));
}

// --- APE Status -----------------------------------------------------------

async function apeRows(): Promise<ReportRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ape_records")
    .select(
      "pilot_id, last_ape_date, next_due_date, fit_to_fly, classification, pilots(full_name, rank_code, ranks(label))",
    )
    .order("last_ape_date", { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as unknown as {
    pilot_id: string;
    last_ape_date: string;
    next_due_date: string;
    fit_to_fly: boolean;
    classification: string | null;
    pilots: { full_name: string; rank_code: string; ranks: { label: string } | null } | null;
  }[];

  return latestPerPilot(rows)
    .map((a) => ({
      Rank: a.pilots?.ranks?.label ?? a.pilots?.rank_code ?? "—",
      "Full Name": a.pilots?.full_name ?? "Unknown pilot",
      "Last APE Date": formatDate(a.last_ape_date),
      "Next Due Date": formatDate(a.next_due_date),
      "Fit to Fly": a.fit_to_fly ? "Yes" : "No",
      Classification: a.classification ?? "—",
    }))
    .sort((a, b) => String(a["Full Name"]).localeCompare(String(b["Full Name"])));
}

// --- Active Safety Alerts ---------------------------------------------------

const ALERT_CATEGORY_LABELS: Record<string, string> = {
  license: "License",
  qualification: "Qualification",
  currency: "Currency",
  ape: "APE",
  staneval: "StanEval",
};

async function alertsRows(): Promise<ReportRow[]> {
  const overview = await getDashboardOverview();
  return overview.alerts.map((a) => ({
    Pilot: a.pilotName,
    Category: ALERT_CATEGORY_LABELS[a.category] ?? capitalize(a.category),
    Detail: a.detail,
    "Due Date": formatDate(a.dueDate),
    Severity: a.status === "expired" ? "Expired" : "Expiring Soon",
  }));
}

// --- Flying Hours Summary ---------------------------------------------------

async function flyingHoursRows(): Promise<ReportRow[]> {
  const supabase = await createClient();
  const [pilotsRes, flightsRes] = await Promise.all([
    supabase
      .from("pilots")
      .select("id, full_name, rank_code, unit_section, ranks(label)")
      .order("full_name"),
    supabase.from("flights").select("pilot_id, flying_time_hours, block_time_hours"),
  ]);
  if (pilotsRes.error) throw pilotsRes.error;
  if (flightsRes.error) throw flightsRes.error;

  const byPilot = new Map<string, { flying: number; block: number; count: number }>();
  for (const f of flightsRes.data ?? []) {
    const entry = byPilot.get(f.pilot_id) ?? { flying: 0, block: 0, count: 0 };
    entry.flying += f.flying_time_hours ?? 0;
    entry.block += f.block_time_hours ?? 0;
    entry.count += 1;
    byPilot.set(f.pilot_id, entry);
  }

  return (pilotsRes.data ?? []).map((p) => {
    const agg = byPilot.get(p.id) ?? { flying: 0, block: 0, count: 0 };
    const rankLabel = (p as unknown as { ranks: { label: string } | null }).ranks?.label ?? p.rank_code;
    return {
      Rank: rankLabel,
      "Full Name": p.full_name,
      "Unit/Section": p.unit_section ?? "—",
      "All-Time Flying Hours": Number(agg.flying.toFixed(1)),
      "All-Time Block Hours": Number(agg.block.toFixed(1)),
      "Flight Count": agg.count,
    };
  });
}

// --- Registry ---------------------------------------------------------------

export const REPORTS: ReportDefinition[] = [
  {
    slug: "roster",
    title: "Personnel Roster",
    description: "Every pilot on record with rank, unit, and current license status.",
    columns: [
      { key: "Rank", header: "Rank" },
      { key: "Full Name", header: "Full Name" },
      { key: "AFSN", header: "AFSN" },
      { key: "Unit/Section", header: "Unit/Section" },
      { key: "Position", header: "Position" },
      { key: "License No.", header: "License No." },
      { key: "License Status", header: "License Status" },
      { key: "License Expires", header: "License Expires" },
    ],
    getRows: rosterRows,
  },
  {
    slug: "qualifications",
    title: "Qualifications",
    description: "Every pilot's aircraft type qualifications, wing-wide.",
    columns: [
      { key: "Rank", header: "Rank" },
      { key: "Full Name", header: "Full Name" },
      { key: "Aircraft Type", header: "Aircraft Type" },
      { key: "Status", header: "Status" },
      { key: "Date Earned", header: "Date Earned" },
      { key: "Expiry Date", header: "Expiry Date" },
    ],
    getRows: qualificationsRows,
  },
  {
    slug: "currency",
    title: "Currency Status",
    description: "Last flight, IFR, night proficiency, and peculiar runways currency, wing-wide.",
    columns: [
      { key: "Rank", header: "Rank" },
      { key: "Full Name", header: "Full Name" },
      { key: "Requirement", header: "Requirement" },
      { key: "Last Date", header: "Last Date" },
      { key: "Expires", header: "Expires" },
      { key: "Status", header: "Status" },
    ],
    getRows: currencyRows,
  },
  {
    slug: "ape",
    title: "APE Status",
    description: "Most recent Annual Physical Examination on file for every pilot.",
    columns: [
      { key: "Rank", header: "Rank" },
      { key: "Full Name", header: "Full Name" },
      { key: "Last APE Date", header: "Last APE Date" },
      { key: "Next Due Date", header: "Next Due Date" },
      { key: "Fit to Fly", header: "Fit to Fly" },
      { key: "Classification", header: "Classification" },
    ],
    getRows: apeRows,
  },
  {
    slug: "alerts",
    title: "Active Safety Alerts",
    description: "Everything expired or expiring soon, right now, across licenses, quals, currency, APE, and StanEval.",
    columns: [
      { key: "Pilot", header: "Pilot" },
      { key: "Category", header: "Category" },
      { key: "Detail", header: "Detail" },
      { key: "Due Date", header: "Due Date" },
      { key: "Severity", header: "Severity" },
    ],
    getRows: alertsRows,
  },
  {
    slug: "flying-hours",
    title: "Flying Hours Summary",
    description: "All-time flying and block hours per pilot.",
    columns: [
      { key: "Rank", header: "Rank" },
      { key: "Full Name", header: "Full Name" },
      { key: "Unit/Section", header: "Unit/Section" },
      { key: "All-Time Flying Hours", header: "All-Time Flying Hours", numeric: true },
      { key: "All-Time Block Hours", header: "All-Time Block Hours", numeric: true },
      { key: "Flight Count", header: "Flight Count", numeric: true },
    ],
    getRows: flyingHoursRows,
  },
];

export function getReportDefinition(slug: string): ReportDefinition | undefined {
  return REPORTS.find((r) => r.slug === slug);
}
