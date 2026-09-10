import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions/policies";
import { prisma } from "@/lib/db/prisma";
import { listActiveLabTests } from "@/server/services/lab-tests-service";
import { NewLabOrderForm } from "../_components/new-lab-order-form";

export default async function NewLabOrderPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const actor = await getCurrentUser();
  if (!actor || !can(actor.profile.role, "laboratory:manage-orders")) {
    redirect("/laboratory");
  }

  const params = await searchParams;

  const [patients, tests] = await Promise.all([
    prisma.patient.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, patientId: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
    listActiveLabTests(),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-page-title text-foreground font-bold">New Lab Order</h1>
        <p className="text-muted-foreground text-body">Select a patient and one or more tests.</p>
      </div>
      <Card className="max-w-2xl p-6">
        <NewLabOrderForm
          patients={patients}
          tests={tests}
          defaultPatientId={params.patientId}
          consultationId={params.consultationId}
        />
      </Card>
    </div>
  );
}
