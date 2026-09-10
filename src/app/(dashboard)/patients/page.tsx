import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions/policies";
import { calculateAge } from "@/lib/patients";
import { listPatients } from "@/server/services/patients-service";
import { PatientFilters } from "./_components/patient-filters";

const PAGE_SIZE = 10;

function initialsOf(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const actor = await getCurrentUser();
  if (!actor || !can(actor.profile.role, "patients:view")) {
    redirect("/dashboard");
  }
  const canManage = can(actor.profile.role, "patients:manage");

  const params = await searchParams;
  const search = params.search ?? "";
  const status = (params.status as "ACTIVE" | "ARCHIVED" | undefined) || "ACTIVE";
  const page = Math.max(1, Number(params.page) || 1);

  const { items, total } = await listPatients(actor, { search, status, page, pageSize: PAGE_SIZE });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-page-title text-foreground font-bold">Patients</h1>
          <p className="text-muted-foreground text-body">
            Registration, demographics and medical history.
          </p>
        </div>
        {canManage && (
          <Button asChild>
            <Link href="/patients/new">
              <Plus className="size-4" />
              Register Patient
            </Link>
          </Button>
        )}
      </div>

      <PatientFilters search={search} status={status} />

      <Card className="gap-0 overflow-hidden p-0">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-muted text-table-header text-muted-foreground uppercase tracking-wider">
              <th className="px-4 py-2.5 font-semibold">Patient</th>
              <th className="px-4 py-2.5 font-semibold">Patient ID</th>
              <th className="px-4 py-2.5 font-semibold">Age / Sex</th>
              <th className="px-4 py-2.5 font-semibold">Contact</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-border text-body divide-y">
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="text-muted-foreground px-4 py-10 text-center">
                  No patients match these filters.
                </td>
              </tr>
            )}
            {items.map((patient) => (
              <tr key={patient.id} className="hover:bg-muted/60 transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/patients/${patient.id}`} className="flex items-center gap-3">
                    <Avatar className="size-8">
                      <AvatarFallback className="text-caption">
                        {initialsOf(patient.firstName, patient.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-foreground font-semibold">
                      {patient.firstName} {patient.lastName}
                    </span>
                  </Link>
                </td>
                <td className="text-foreground px-4 py-3">{patient.patientId}</td>
                <td className="text-foreground px-4 py-3">
                  {calculateAge(patient.dateOfBirth)}y {patient.sex}
                </td>
                <td className="text-foreground px-4 py-3">
                  <span className="block">{patient.phone}</span>
                  {patient.email && (
                    <span className="text-caption text-muted-foreground">{patient.email}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={patient.status === "ACTIVE" ? "success" : "secondary"}>
                    {patient.status === "ACTIVE" ? "Active" : "Archived"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {totalPages > 1 && (
        <div className="text-caption text-muted-foreground flex items-center justify-between">
          <span>
            Page {page} of {totalPages} ({total} total)
          </span>
          <div className="flex gap-1.5">
            {page <= 1 ? (
              <Button size="sm" variant="secondary" disabled>
                Previous
              </Button>
            ) : (
              <Button asChild size="sm" variant="secondary">
                <Link href={{ query: { ...params, page: String(page - 1) } }}>Previous</Link>
              </Button>
            )}
            {page >= totalPages ? (
              <Button size="sm" variant="secondary" disabled>
                Next
              </Button>
            ) : (
              <Button asChild size="sm" variant="secondary">
                <Link href={{ query: { ...params, page: String(page + 1) } }}>Next</Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
