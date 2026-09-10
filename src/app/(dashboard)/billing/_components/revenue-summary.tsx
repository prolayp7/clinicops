import { Card } from "@/components/ui/card";
import { formatCents } from "@/lib/billing";

export function RevenueSummary({
  summary,
}: {
  summary: {
    totalInvoicedCents: number;
    invoiceCount: number;
    totalCollectedCents: number;
    totalRefundedCents: number;
    totalOutstandingCents: number;
  };
}) {
  const cards = [
    { label: "Invoiced (this month)", value: formatCents(summary.totalInvoicedCents), sub: `${summary.invoiceCount} invoices` },
    { label: "Collected (this month)", value: formatCents(summary.totalCollectedCents), sub: "net of refunds" },
    { label: "Refunded (this month)", value: formatCents(summary.totalRefundedCents), sub: "" },
    { label: "Outstanding (all time)", value: formatCents(summary.totalOutstandingCents), sub: "unpaid + partial" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label} className="p-4">
          <p className="text-caption text-muted-foreground uppercase tracking-wider">{card.label}</p>
          <p className="text-page-title text-foreground mt-1 font-bold">{card.value}</p>
          {card.sub && <p className="text-caption text-muted-foreground mt-0.5">{card.sub}</p>}
        </Card>
      ))}
    </div>
  );
}
