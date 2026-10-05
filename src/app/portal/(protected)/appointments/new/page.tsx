import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { getCurrentPatient } from "@/lib/auth/patient-session";
import { getEnv } from "@/lib/env";
import { dateToIsoDateInTimeZone } from "@/lib/scheduling";
import { prisma } from "@/lib/db/prisma";
import { getClinicSettings } from "@/server/services/clinic-settings-service";
import { RequestAppointmentForm } from "../_components/request-appointment-form";

export default async function NewPortalAppointmentPage() {
  const patient = await getCurrentPatient();
  if (!patient) redirect("/portal/login");

  const [doctors, clinicSettings] = await Promise.all([
    prisma.doctor.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, fullName: true, specialization: { select: { name: true } } },
      orderBy: { fullName: "asc" },
    }),
    getClinicSettings(),
  ]);
  const timeZone = clinicSettings?.timezone ?? getEnv().CLINIC_TIMEZONE;
  const defaultDate = dateToIsoDateInTimeZone(new Date(), timeZone);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-page-title text-foreground font-bold">Request an Appointment</h1>
        <p className="text-muted-foreground text-body">
          Our team will review your request and confirm a time.
        </p>
      </div>
      <Card className="max-w-xl p-6">
        <RequestAppointmentForm doctors={doctors} defaultDate={defaultDate} />
      </Card>
    </div>
  );
}
