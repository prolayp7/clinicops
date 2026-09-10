import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions/policies";
import { ABNORMAL_FLAG_LABELS } from "@/lib/laboratory";
import { getLabOrderById } from "@/server/services/lab-orders-service";
import { LabOrderStatusBadge } from "../_components/lab-order-status-badge";
import { StatusActions } from "./_components/status-actions";
import { ResultsForm } from "./_components/results-form";
import { ReportUploadForm } from "./_components/report-upload-form";
import type { LabOrderStatus } from "@prisma/client";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function LabOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentUser();
  if (!actor || !can(actor.profile.role, "laboratory:view")) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const order = await getLabOrderById(actor, id);
  if (!order) notFound();

  const canManageSamples = can(actor.profile.role, "laboratory:manage-samples");
  const canReview = can(actor.profile.role, "laboratory:review");
  const canManageOrders = can(actor.profile.role, "laboratory:manage-orders");
  const isBlockedDoctor = actor.profile.role === "DOCTOR" && order.orderedById !== actor.profile.id;
  const canCancel = canManageOrders && !isBlockedDoctor;

  const allowedTargets: LabOrderStatus[] = [
    ...(canManageSamples ? (["SAMPLE_COLLECTED", "PROCESSING", "COMPLETED"] as const) : []),
    ...(canReview ? (["REVIEWED"] as const) : []),
    ...(canCancel ? (["CANCELLED"] as const) : []),
  ];

  return (
    <div className="space-y-4">
      <Card className="space-y-1 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-page-title text-foreground font-bold">{order.orderNumber}</h1>
          <div className="flex items-center gap-2">
            <LabOrderStatusBadge status={order.status} />
            <Button asChild size="sm" variant="secondary">
              <a href={`/api/lab-orders/${order.id}/pdf`} target="_blank" rel="noreferrer">
                <Download className="size-4" />
                Print / PDF
              </a>
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground text-body">
          <Link href={`/patients/${order.patient.id}`} className="hover:underline">
            {order.patient.firstName} {order.patient.lastName}
          </Link>{" "}
          · #{order.patient.patientId} · ordered by {order.orderedBy.fullName}
        </p>
        <p className="text-caption text-muted-foreground">
          Created {order.createdAt.toISOString().slice(0, 10)}
          {order.reviewedAt
            ? ` • Reviewed by ${order.reviewedBy?.fullName} on ${order.reviewedAt.toISOString().slice(0, 10)}`
            : ""}
        </p>
      </Card>

      <Card className="space-y-3 p-6">
        <h2 className="text-section-title text-foreground font-semibold">Tests &amp; Results</h2>
        {order.status === "PROCESSING" && canManageSamples ? (
          <ResultsForm labOrderId={order.id} items={order.items} />
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="text-table-header text-muted-foreground uppercase tracking-wider">
                <th className="py-2 pr-4 font-semibold">Test</th>
                <th className="py-2 pr-4 font-semibold">Result</th>
                <th className="py-2 pr-4 font-semibold">Unit</th>
                <th className="py-2 pr-4 font-semibold">Reference range</th>
                <th className="py-2 pr-4 font-semibold">Flag</th>
              </tr>
            </thead>
            <tbody className="divide-border text-body divide-y">
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td className="py-2 pr-4">
                    {item.labTest.name} ({item.labTest.category})
                  </td>
                  <td className="py-2 pr-4">{item.resultValue || "—"}</td>
                  <td className="py-2 pr-4">{item.unit}</td>
                  <td className="text-muted-foreground py-2 pr-4">{item.referenceRange}</td>
                  <td className="py-2 pr-4">
                    <Badge variant={item.abnormalFlag === "NORMAL" ? "secondary" : "destructive"}>
                      {ABNORMAL_FLAG_LABELS[item.abnormalFlag]}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {allowedTargets.length > 0 && (
        <Card className="p-6">
          <h2 className="text-section-title text-foreground mb-3 font-semibold">Update status</h2>
          <StatusActions labOrderId={order.id} currentStatus={order.status} allowedTargets={allowedTargets} />
        </Card>
      )}

      <Card className="space-y-3 p-6">
        <h2 className="text-section-title text-foreground font-semibold">Reports</h2>
        {order.reports.length === 0 ? (
          <p className="text-muted-foreground text-body">No reports uploaded yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {order.reports.map((r) => (
              <li key={r.id} className="text-body flex items-center justify-between">
                {r.signedUrl ? (
                  <a href={r.signedUrl} target="_blank" rel="noreferrer" className="text-foreground hover:underline">
                    {r.fileName}
                  </a>
                ) : (
                  <span>{r.fileName}</span>
                )}
                <span className="text-caption text-muted-foreground">
                  {formatBytes(r.sizeBytes)} • {r.uploadedBy.fullName}
                </span>
              </li>
            ))}
          </ul>
        )}
        {canManageSamples && order.status !== "CANCELLED" && <ReportUploadForm labOrderId={order.id} />}
      </Card>

      <Card className="space-y-3 p-6">
        <h2 className="text-section-title text-foreground font-semibold">Status history</h2>
        <ol className="border-border relative space-y-4 border-l pl-6">
          {order.statusHistory.map((event) => (
            <li key={event.id} className="relative">
              <span className="bg-primary ring-card absolute top-1 -left-[27px] size-3 rounded-full ring-4" />
              <div className="flex items-center justify-between">
                <span className="text-body text-foreground font-semibold">
                  {event.fromStatus ? `${event.fromStatus.replace("_", " ")} → ` : ""}
                  {event.toStatus.replace("_", " ")}
                </span>
                <span className="text-caption text-muted-foreground">
                  {event.createdAt.toISOString().replace("T", " ").slice(0, 16)} UTC
                </span>
              </div>
              <span className="text-caption text-muted-foreground block">
                {event.changedBy ? `${event.changedBy.fullName} (${event.changedBy.role})` : "System"}
              </span>
              {event.reason && <span className="text-caption text-foreground block">{event.reason}</span>}
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
