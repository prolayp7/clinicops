import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions/policies";
import { prisma } from "@/lib/db/prisma";
import { listPrescriptions } from "@/server/services/prescriptions-service";
import { PrescriptionFilters } from "./_components/prescription-filters";
import type { PrescriptionStatus } from "@prisma/client";

export default async function PrescriptionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const actor = await getCurrentUser();
  if (!actor || !can(actor.profile.role, "prescriptions:view")) {
    redirect("/dashboard");
  }
  const canManage = can(actor.profile.role, "prescriptions:manage");

  const params = await searchParams;
  const doctorId = params.doctorId || "";
  const status = params.status as PrescriptionStatus | undefined;

  const doctors = await prisma.doctor.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, fullName: true },
    orderBy: { fullName: "asc" },
  });

  const { items } = await listPrescriptions(actor, {
    doctorId: doctorId || undefined,
    status,
    pageSize: 100,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-page-title text-foreground font-bold">Prescriptions</h1>
          <p className="text-muted-foreground text-body">History across all patients and doctors.</p>
        </div>
        {canManage && (
          <Button asChild>
            <Link href="/prescriptions/new">
              <Plus className="size-4" />
              New Prescription
            </Link>
          </Button>
        )}
      </div>

      <PrescriptionFilters doctorId={doctorId} status={status ?? ""} doctors={doctors} />

      <Card className="gap-0 overflow-hidden p-0">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-muted text-table-header text-muted-foreground uppercase tracking-wider">
              <th className="px-4 py-2.5 font-semibold">Rx #</th>
              <th className="px-4 py-2.5 font-semibold">Patient</th>
              <th className="px-4 py-2.5 font-semibold">Doctor</th>
              <th className="px-4 py-2.5 font-semibold">Medicines</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
              <th className="px-4 py-2.5 font-semibold">Date</th>
            </tr>
          </thead>
          <tbody className="divide-border text-body divide-y">
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="text-muted-foreground px-4 py-8 text-center">
                  No prescriptions found.
                </td>
              </tr>
            )}
            {items.map((rx) => (
              <tr key={rx.id}>
                <td className="px-4 py-3">
                  <Link href={`/prescriptions/${rx.id}`} className="text-foreground hover:underline">
                    {rx.prescriptionNumber}
                  </Link>
                </td>
                <td className="text-foreground px-4 py-3">
                  {rx.patient.firstName} {rx.patient.lastName}
                  <span className="text-muted-foreground"> · {rx.patient.patientId}</span>
                </td>
                <td className="text-foreground px-4 py-3">{rx.doctor.fullName}</td>
                <td className="text-muted-foreground max-w-xs truncate px-4 py-3">
                  {rx.items.map((i) => i.medicine.name).join(", ") || "—"}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={rx.status === "ISSUED" ? "success" : "secondary"}>{rx.status}</Badge>
                </td>
                <td className="text-muted-foreground px-4 py-3">
                  {rx.createdAt.toISOString().slice(0, 10)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
