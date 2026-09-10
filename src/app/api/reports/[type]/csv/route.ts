import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { toCsv } from "@/lib/csv";
import { getReport } from "@/server/services/reports-service";
import { REPORT_TYPES, type ReportType } from "@/lib/reports";

export async function GET(request: Request, { params }: { params: Promise<{ type: string }> }) {
  const actor = await getCurrentUser();
  if (!actor) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { type } = await params;
  if (!REPORT_TYPES.includes(type as ReportType)) {
    return NextResponse.json({ error: "Unknown report type." }, { status: 404 });
  }

  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (!from || !to) {
    return NextResponse.json({ error: "from and to query params are required." }, { status: 400 });
  }

  let report;
  try {
    report = await getReport(actor, type as ReportType, {
      from: new Date(`${from}T00:00:00.000Z`),
      to: new Date(`${to}T23:59:59.999Z`),
    });
  } catch {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let csv = toCsv(report.columns, report.rows);
  if (report.secondaryColumns && report.secondaryRows) {
    csv += `\r\n\r\n${report.secondaryTitle ?? ""}\r\n${toCsv(report.secondaryColumns, report.secondaryRows)}`;
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${type}-${from}-to-${to}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
