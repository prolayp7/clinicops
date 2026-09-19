"use client";

import { useActionState, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TemporaryPasswordNotice } from "@/components/shared/temporary-password-notice";
import { roleLabel, STAFF_ROLES } from "@/lib/permissions/roles";
import {
  resetStaffPasswordAction,
  toggleStaffStatusAction,
  updateStaffRoleAction,
  type StaffFormState,
} from "../actions";
import type { Role, StaffStatus } from "@prisma/client";

export function StaffRowActions({
  staffId,
  role,
  status,
  isSelf,
}: {
  staffId: string;
  role: Role;
  status: StaffStatus;
  isSelf: boolean;
}) {
  const [roleState, roleAction, isRolePending] = useActionState<StaffFormState, FormData>(
    updateStaffRoleAction.bind(null, staffId),
    { error: null },
  );
  const [resetState, resetAction, isResetting] = useActionState<StaffFormState, FormData>(
    resetStaffPasswordAction.bind(null, staffId),
    { error: null },
  );
  const [confirmingReset, setConfirmingReset] = useState(false);
  const roleFormRef = useRef<HTMLFormElement>(null);

  if (isSelf) {
    return <span className="text-caption text-muted-foreground">You</span>;
  }

  return (
    <div className="flex flex-col gap-2">
      <form ref={roleFormRef} action={roleAction} className="flex items-center gap-1.5">
        <Select name="role" defaultValue={role} onValueChange={() => roleFormRef.current?.requestSubmit()}>
          <SelectTrigger id={`role-${staffId}`} className="h-8 w-40 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STAFF_ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {roleLabel(r)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </form>
      {roleState.error && <p className="text-destructive text-caption">{roleState.error}</p>}
      {isRolePending && <p className="text-caption text-muted-foreground">Saving…</p>}

      <div className="flex items-center gap-1.5">
        <form action={toggleStaffStatusAction.bind(null, staffId, status === "ACTIVE" ? "ARCHIVED" : "ACTIVE")}>
          <Button type="submit" size="sm" variant={status === "ACTIVE" ? "destructive" : "secondary"}>
            {status === "ACTIVE" ? "Archive" : "Reactivate"}
          </Button>
        </form>

        {resetState.temporaryPassword ? null : confirmingReset ? (
          <form action={resetAction} className="flex items-center gap-1.5">
            <Button type="submit" size="sm" variant="secondary" disabled={isResetting}>
              {isResetting ? "Resetting…" : "Confirm"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmingReset(false)}>
              Cancel
            </Button>
          </form>
        ) : (
          <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmingReset(true)}>
            Reset Password
          </Button>
        )}
      </div>
      {resetState.temporaryPassword && <TemporaryPasswordNotice password={resetState.temporaryPassword} />}
      {resetState.error && <p className="text-destructive text-caption">{resetState.error}</p>}
    </div>
  );
}
