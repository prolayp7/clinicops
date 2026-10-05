import Link from "next/link";
import { Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { auditLogFiltersSchema, staffListFiltersSchema } from "@/lib/validation/users";
import { can } from "@/lib/permissions/policies";
import { roleLabel } from "@/lib/permissions/roles";
import { listStaff } from "@/server/services/users-service";
import { listAuditLogs } from "@/server/services/audit-logs-service";
import type { Role, StaffStatus } from "@prisma/client";
import { AuditLogFilters } from "./_components/audit-log-filters";
import { StaffRowActions } from "./_components/staff-row-actions";
import { UserFilters } from "./_components/user-filters";
import { UserTabs } from "./_components/user-tabs";

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

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const actor = await getCurrentUser();
  if (!actor || !can(actor.profile.role, "users:view")) {
    redirect("/dashboard");
  }
  const canManage = can(actor.profile.role, "users:manage");
  const canViewAuditLogs = can(actor.profile.role, "audit-logs:view");

  const params = await searchParams;
  const tab = params.tab === "activity" && canViewAuditLogs ? "activity" : "staff";
  const staffFilterResult = staffListFiltersSchema.safeParse(params);
  const staffFilters = staffFilterResult.success
    ? staffFilterResult.data
    : { search: "", role: undefined, status: "ACTIVE" as StaffStatus, page: 1 };
  const auditFilterResult = auditLogFiltersSchema.safeParse(params);
  const auditFilters = auditFilterResult.success
    ? auditFilterResult.data
    : { search: "", actorRole: undefined, from: undefined, to: undefined, page: 1 };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-page-title text-foreground font-bold">Users &amp; Activity</h1>
          <p className="text-muted-foreground text-body">
            Staff accounts, roles and the append-only system activity log.
          </p>
        </div>
        {tab === "staff" && canManage && (
          <Button asChild>
            <Link href="/users/new">
              <Plus className="size-4" />
              Add Staff
            </Link>
          </Button>
        )}
      </div>

      <UserTabs active={tab} showActivityLog={canViewAuditLogs} />

      {tab === "staff" ? (
        <StaffSection
          actor={actor}
          canManage={canManage}
          search={staffFilters.search}
          role={staffFilters.role}
          status={staffFilters.status}
          page={staffFilters.page}
        />
      ) : (
        <ActivityLogSection
          actor={actor}
          search={auditFilters.search}
          role={auditFilters.actorRole}
          from={auditFilters.from ?? ""}
          to={auditFilters.to ?? ""}
          page={auditFilters.page}
        />
      )}
    </div>
  );
}

async function StaffSection({
  actor,
  canManage,
  search,
  role,
  status,
  page,
}: {
  actor: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
  canManage: boolean;
  search: string;
  role: Role | undefined;
  status: StaffStatus;
  page: number;
}) {
  const { items, total } = await listStaff(actor, {
    search,
    role,
    status,
    page,
    pageSize: PAGE_SIZE,
  });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <UserFilters search={search} role={role ?? ""} status={status} />

      <Card className="gap-0 overflow-hidden p-0">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-muted text-table-header text-muted-foreground uppercase tracking-wider">
              <th className="px-4 py-2.5 font-semibold">Staff</th>
              <th className="px-4 py-2.5 font-semibold">Role</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
              {canManage && <th className="px-4 py-2.5 font-semibold">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-border text-body divide-y">
            {items.length === 0 && (
              <tr>
                <td colSpan={canManage ? 4 : 3} className="text-muted-foreground px-4 py-10 text-center">
                  No staff accounts match these filters.
                </td>
              </tr>
            )}
            {items.map((staff) => (
              <tr key={staff.id} className="hover:bg-muted/60 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-8">
                      <AvatarFallback className="text-caption">{initialsOf(staff.fullName)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <span className="text-foreground block leading-tight font-semibold">{staff.fullName}</span>
                      <span className="text-caption text-muted-foreground">{staff.email}</span>
                    </div>
                  </div>
                </td>
                <td className="text-foreground px-4 py-3">{roleLabel(staff.role)}</td>
                <td className="px-4 py-3">
                  <Badge variant={staff.status === "ACTIVE" ? "success" : "secondary"}>
                    {staff.status === "ACTIVE" ? "Active" : "Archived"}
                  </Badge>
                </td>
                {canManage && (
                  <td className="px-4 py-3">
                    <StaffRowActions
                      staffId={staff.id}
                      fullName={staff.fullName}
                      email={staff.email}
                      role={staff.role}
                      status={staff.status}
                      isSelf={staff.id === actor.profile.id}
                      canManageProtectedAccounts={actor.profile.role === "SUPER_ADMIN"}
                    />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <PaginationBar page={page} totalPages={totalPages} total={total} tab="staff" />
    </>
  );
}

async function ActivityLogSection({
  actor,
  search,
  role,
  from,
  to,
  page,
}: {
  actor: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
  search: string;
  role: Role | undefined;
  from: string;
  to: string;
  page: number;
}) {
  const { items, total } = await listAuditLogs(actor, {
    search,
    actorRole: role,
    from,
    to,
    page,
    pageSize: PAGE_SIZE,
  });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <AuditLogFilters search={search} actorRole={role ?? ""} from={from} to={to} />

      <Card className="gap-0 overflow-hidden p-0">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-muted text-table-header text-muted-foreground uppercase tracking-wider">
              <th className="px-4 py-2.5 font-semibold">When</th>
              <th className="px-4 py-2.5 font-semibold">Actor</th>
              <th className="px-4 py-2.5 font-semibold">Action</th>
              <th className="px-4 py-2.5 font-semibold">Record</th>
            </tr>
          </thead>
          <tbody className="divide-border text-body divide-y">
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="text-muted-foreground px-4 py-10 text-center">
                  No activity matches these filters.
                </td>
              </tr>
            )}
            {items.map((log) => (
              <tr key={log.id} className="hover:bg-muted/60 transition-colors">
                <td className="text-caption text-muted-foreground px-4 py-3 whitespace-nowrap">
                  {log.createdAt.toISOString().replace("T", " ").slice(0, 16)} UTC
                </td>
                <td className="text-foreground px-4 py-3">
                  {log.actor ? log.actor.fullName : log.actorRole === "PATIENT" ? "Patient portal" : "System"}
                  {log.actorRole && (
                    <span className="text-caption text-muted-foreground"> ({roleLabel(log.actorRole)})</span>
                  )}
                </td>
                <td className="text-foreground px-4 py-3 font-mono text-xs">{log.action}</td>
                <td className="text-caption text-muted-foreground px-4 py-3">
                  {log.entityType}
                  {log.entityId ? ` #${log.entityId.slice(0, 8)}` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <PaginationBar page={page} totalPages={totalPages} total={total} tab="activity" />
    </>
  );
}

function PaginationBar({
  page,
  totalPages,
  total,
  tab,
}: {
  page: number;
  totalPages: number;
  total: number;
  tab: "staff" | "activity";
}) {
  if (totalPages <= 1) return null;

  return (
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
            <Link href={`/users?tab=${tab}&page=${page - 1}`}>Previous</Link>
          </Button>
        )}
        {page >= totalPages ? (
          <Button size="sm" variant="secondary" disabled>
            Next
          </Button>
        ) : (
          <Button asChild size="sm" variant="secondary">
            <Link href={`/users?tab=${tab}&page=${page + 1}`}>Next</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
