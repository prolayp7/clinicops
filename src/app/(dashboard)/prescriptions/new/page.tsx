import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions/policies";
import { prisma } from "@/lib/db/prisma";
import { NewPrescriptionForm } from "../_components/new-prescription-form";

export default async function NewPrescriptionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const actor = await getCurrentUser();
  if (!actor || !can(actor.profile.role, "prescriptions:manage")) {
    redirect("/prescriptions");
  }

  const params = await searchParams;

  const [patients, doctors] = await Promise.all([
    prisma.patient.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, patientId: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
    prisma.doctor.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, fullName: true, staffProfileId: true, specialization: { select: { name: true } } },
      orderBy: { fullName: "asc" },
    }),
  ]);

  const defaultDoctorId =
    params.doctorId ?? (actor.profile.role === "DOCTOR"
      ? doctors.find((d) => d.staffProfileId === actor.profile.id)?.id
      : undefined);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-page-title text-foreground font-bold">New Prescription</h1>
        <p className="text-muted-foreground text-body">
          Create a draft, then add medicines before issuing.
        </p>
      </div>
      <Card className="max-w-2xl p-6">
        <NewPrescriptionForm
          patients={patients}
          doctors={doctors}
          defaultPatientId={params.patientId}
          defaultDoctorId={defaultDoctorId}
          consultationId={params.consultationId}
        />
      </Card>
    </div>
  );
}
