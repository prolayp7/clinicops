import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DoctorClinicalStatusBadge } from "./doctor-clinical-status-badge";
import type { DoctorDayStatus } from "@/lib/doctor-directory";

export type GridDoctor = {
  id: string;
  fullName: string;
  status: "ACTIVE" | "ARCHIVED";
  department: { name: string };
  specialization: { name: string };
  consultationFeeCents: number;
  dayStatus: DoctorDayStatus;
};

function initialsOf(name: string) {
  return name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function formatCents(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function DoctorGridView({ doctors }: { doctors: GridDoctor[] }) {
  if (doctors.length === 0) {
    return (
      <Card className="text-muted-foreground p-10 text-center">
        No doctors match these filters.
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {doctors.map((doctor) => (
        <Card key={doctor.id} className="gap-3 p-4">
          <Link href={`/doctors/${doctor.id}`} className="flex items-center gap-3">
            <Avatar className="size-10">
              <AvatarFallback>{initialsOf(doctor.fullName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="text-foreground truncate font-semibold">{doctor.fullName}</div>
              <div className="text-caption text-muted-foreground truncate">
                {doctor.specialization.name}
              </div>
            </div>
          </Link>
          <div className="text-caption text-muted-foreground">{doctor.department.name}</div>
          <div className="flex items-center justify-between">
            <DoctorClinicalStatusBadge status={doctor.dayStatus.clinicalStatus} />
            <Badge variant={doctor.status === "ACTIVE" ? "outline" : "secondary"}>
              {doctor.status === "ACTIVE" ? "Active" : "Archived"}
            </Badge>
          </div>
          <div className="text-caption text-muted-foreground flex items-center justify-between">
            <span>{doctor.dayStatus.shiftLabel}</span>
            <span className="text-foreground font-semibold">{formatCents(doctor.consultationFeeCents)}</span>
          </div>
        </Card>
      ))}
    </div>
  );
}
