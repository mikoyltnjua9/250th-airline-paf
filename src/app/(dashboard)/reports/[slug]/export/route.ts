import { NextResponse } from "next/server";
import { getReportDefinition } from "@/lib/reports/queries";
import { toCsv } from "@/lib/reports/csv";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const report = getReportDefinition(slug);
  if (!report) {
    return NextResponse.json({ error: "Unknown report" }, { status: 404 });
  }

  // No extra permission check here beyond this: proxy.ts already requires an
  // authenticated, 2FA-verified session for every route under this app
  // (this one included — the matcher excludes only static assets), and every
  // query behind getRows() runs through the same RLS-governed client as the
  // rest of the app. There's currently only one role (super_admin), so that
  // is the full authorization model.
  const rows = await report.getRows();
  const csv = toCsv(report.columns, rows);
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${report.slug}-${date}.csv"`,
    },
  });
}
