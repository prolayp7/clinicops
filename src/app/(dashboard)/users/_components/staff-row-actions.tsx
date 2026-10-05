"use client";

import { useActionState, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  updateStaffProfileAction,
  updateStaffRoleAction,
  type StaffFormState,
} from "../actions";
import type { Role, StaffStatus } from "@prisma/client";

export function StaffRowActions({
  staffId,
  fullName,
  email,
  role,
  status,
  isSelf,
  canManageProtectedAccounts = false,
}: {
  staffId: string;
  fullName: string;
  email: string;
  role: Role;
  status: StaffStatus;
  isSelf: boolean;
  canManageProtectedAccounts?: boolean;
}) {
  const [roleState, roleAction, isRolePending] = useActionState<StaffFormState, FormData>(
    updateStaffRoleAction.bind(null, staffId),
    { error: null },
  );
  const [resetState, resetAction, isResetting] = useActionState<StaffFormState, FormData>(
    resetStaffPasswordAction.bind(null, staffId),
    { error: null },
  );
  const [profileState, profileAction, isProfilePending] = useActionState<StaffFormState, FormData>(
    updateStaffProfileAction.bind(null, staffId),
    { error: null },
  );
  const [confirmingReset, setConfirmingReset] = useState(false);
  const roleFormRef = useRef<HTMLFormElement>(null);

  const protectedAccount = role === "SUPER_ADMIN" && !canManageProtectedAccounts;

  return (
    <div className="flex flex-col gap-2">
      {protectedAccount ? (
        <span className="text-caption text-muted-foreground">Protected account</span>
      ) : (
        <>
          {isSelf ? (
            <span className="text-caption text-muted-foreground">Your account</span>
          ) : (
            <>
              <form ref={roleFormRef} action={roleAction} className="flex items-center gap-1.5">
                <Select name="role" defaultValue={role} onValueChange={() => roleFormRef.current?.requestSubmit()}>
                  <SelectTrigger id={`role-${staffId}`} className="h-8 w-40 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAFF_ROLES.filter((r) => canManageProtectedAccounts || r !== "SUPER_ADMIN").map((r) => (
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
            </>
          )}

          <details className="text-caption">
            <summary className="cursor-pointer text-primary">Edit profile</summary>
            <form action={profileAction} className="mt-2 flex min-w-52 flex-col gap-2">
              <div className="space-y-1">
                <Label htmlFor={`full-name-${staffId}`}>Full name</Label>
                <Input id={`full-name-${staffId}`} name="fullName" defaultValue={fullName} required minLength={2} maxLength={150} />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`email-${staffId}`}>Work email</Label>
                <Input id={`email-${staffId}`} name="email" type="email" defaultValue={email} required />
              </div>
              <Button type="submit" size="sm" disabled={isProfilePending}>
                {isProfilePending ? "Saving…" : "Save profile"}
              </Button>
              {profileState.saved && <span className="text-success">Profile saved.</span>}
              {profileState.error && <p className="text-destructive">{profileState.error}</p>}
            </form>
          </details>
        </>
      )}
    </div>
  );
}
