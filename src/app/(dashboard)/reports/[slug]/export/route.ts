import { NextResponse } from "next/server";
import { getReportDefinition } from "@/lib/reports/queries";
import { toCsv } from "@/lib/reports/csv";
import { todayInManila } from "@/lib/dates";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { hasPermission } from "@/lib/permissions";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  // Route handlers sit outside the dashboard layout's role redirect, so check
  // explicitly: examinees (and anyone else without report access) get nothing,
  // rather than relying on RLS quietly returning empty rows.
  const profile = await getCurrentProfile();
  if (!profile || !hasPermission(profile.role_code, "pilots:view")) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const { slug } = await params;
  const report = getReportDefinition(slug);
  if (!report) {
    return NextResponse.json({ error: "Unknown report" }, { status: 404 });
  }

  // proxy.ts also requires an authenticated, 2FA-verified session here, and
  // every query behind getRows() runs through the RLS-governed client.
  const rows = await report.getRows();
  const csv = toCsv(report.columns, rows);
  const date = todayInManila();

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${report.slug}-${date}.csv"`,
    },
  });
}
