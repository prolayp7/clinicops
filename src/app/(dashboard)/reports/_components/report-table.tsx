import { Card } from "@/components/ui/card";
import type { ReportResult } from "@/server/services/reports-service";

function Table({
  columns,
  rows,
}: {
  columns: { key: string; label: string }[];
  rows: Record<string, string | number>[];
}) {
  return (
    <table className="w-full text-left">
      <thead>
        <tr className="bg-muted text-table-header text-muted-foreground uppercase tracking-wider print:bg-transparent">
          {columns.map((c) => (
            <th key={c.key} className="px-4 py-2.5 font-semibold">
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-border text-body divide-y">
        {rows.length === 0 && (
          <tr>
            <td colSpan={columns.length} className="text-muted-foreground px-4 py-8 text-center">
              No data in this date range.
            </td>
          </tr>
        )}
        {rows.map((row, i) => (
          <tr key={i}>
            {columns.map((c) => (
              <td key={c.key} className="text-foreground px-4 py-3">
                {row[c.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ReportTable({ report }: { report: ReportResult }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-section-title text-foreground mb-2 font-semibold">{report.title}</h2>
        <Card className="gap-0 overflow-hidden p-0 print:border-none print:shadow-none">
          <Table columns={report.columns} rows={report.rows} />
        </Card>
      </div>
      {report.secondaryColumns && report.secondaryRows && (
        <div>
          <h2 className="text-section-title text-foreground mb-2 font-semibold">{report.secondaryTitle}</h2>
          <Card className="gap-0 overflow-hidden p-0 print:border-none print:shadow-none">
            <Table columns={report.secondaryColumns} rows={report.secondaryRows} />
          </Card>
        </div>
      )}
    </div>
  );
}
