import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions/policies";
import { listActiveDepartments } from "@/server/services/departments-service";
import { listActiveSpecializations } from "@/server/services/specializations-service";
import { listDoctors } from "@/server/services/doctors-service";
import { DoctorFilters } from "./_components/doctor-filters";

const PAGE_SIZE = 10;

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function DoctorsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const actor = await getCurrentUser();
  if (!actor || !can(actor.profile.role, "doctors:view")) {
    redirect("/dashboard");
  }
  const canManage = can(actor.profile.role, "doctors:manage");

  const params = await searchParams;
  const search = params.search ?? "";
  const departmentId = params.department || undefined;
  const specializationId = params.specialization || undefined;
  const status = (params.status as "ACTIVE" | "ARCHIVED" | undefined) || "ACTIVE";
  const page = Math.max(1, Number(params.page) || 1);

  const [{ items, total }, departments, specializations] = await Promise.all([
    listDoctors({ search, departmentId, specializationId, status, page, pageSize: PAGE_SIZE }),
    listActiveDepartments(),
    listActiveSpecializations(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-page-title text-foreground font-bold">Doctors</h1>
          <p className="text-muted-foreground text-body">
            Clinical staff directory, specializations and weekly availability.
          </p>
        </div>
        {canManage && (
          <Button asChild>
            <Link href="/doctors/new">
              <Plus className="size-4" />
              Register Doctor
            </Link>
          </Button>
        )}
      </div>

      <DoctorFilters
        search={search}
        departmentId={departmentId ?? ""}
        specializationId={specializationId ?? ""}
        status={status}
        departments={departments}
        specializations={specializations}
      />

      <Card className="gap-0 overflow-hidden p-0">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-muted text-table-header text-muted-foreground uppercase tracking-wider">
              <th className="px-4 py-2.5 font-semibold">Doctor</th>
              <th className="px-4 py-2.5 font-semibold">Specialization</th>
              <th className="px-4 py-2.5 font-semibold">Department</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-border text-body divide-y">
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="text-muted-foreground px-4 py-10 text-center">
                  No doctors match these filters.
                </td>
              </tr>
            )}
            {items.map((doctor) => (
              <tr key={doctor.id} className="hover:bg-muted/60 transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/doctors/${doctor.id}`} className="flex items-center gap-3">
                    <Avatar className="size-8">
                      <AvatarFallback className="text-caption">
                        {initialsOf(doctor.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <span className="text-foreground block leading-tight font-semibold">
                        {doctor.fullName}
                      </span>
                      <span className="text-caption text-muted-foreground">{doctor.email}</span>
                    </div>
                  </Link>
                </td>
                <td className="text-foreground px-4 py-3">{doctor.specialization.name}</td>
                <td className="text-foreground px-4 py-3">{doctor.department.name}</td>
                <td className="px-4 py-3">
                  <Badge variant={doctor.status === "ACTIVE" ? "success" : "secondary"}>
                    {doctor.status === "ACTIVE" ? "Active" : "Archived"}
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
