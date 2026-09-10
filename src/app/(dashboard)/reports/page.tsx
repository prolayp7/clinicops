import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions/policies";
import { getReport } from "@/server/services/reports-service";
import { REPORT_TYPES, type ReportType } from "@/lib/reports";
import { ReportFilters } from "./_components/report-filters";
import { ReportTable } from "./_components/report-table";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function firstOfMonthIso() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const actor = await getCurrentUser();
  if (!actor || !can(actor.profile.role, "reports:view")) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const type = (REPORT_TYPES.includes(params.type as ReportType) ? params.type : "revenue-summary") as ReportType;
  const from = params.from || firstOfMonthIso();
  const to = params.to || todayIso();

  const report = await getReport(actor, type, {
    from: new Date(`${from}T00:00:00.000Z`),
    to: new Date(`${to}T23:59:59.999Z`),
  });

  return (
    <div className="space-y-4">
      <div className="print:hidden">
        <h1 className="text-page-title text-foreground font-bold">Reports</h1>
        <p className="text-muted-foreground text-body">Date-filtered operational and financial reports.</p>
      </div>

      <div className="hidden print:block">
        <h1 className="text-page-title font-bold">
          {report.title} — {from} to {to}
        </h1>
      </div>

      <ReportFilters type={type} from={from} to={to} />

      <ReportTable report={report} />
    </div>
  );
}
