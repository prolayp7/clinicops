"use client";

import { useActionState } from "react";
import Link from "next/link";
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
import { createStaffAction, type StaffFormState } from "../actions";

export function CreateStaffForm({ allowSuperAdminRole = false }: { allowSuperAdminRole?: boolean }) {
  const [state, formAction, isPending] = useActionState<StaffFormState, FormData>(
    createStaffAction,
    { error: null },
  );

  if (state.temporaryPassword) {
    return (
      <div className="space-y-4">
        <TemporaryPasswordNotice password={state.temporaryPassword} />
        <Button asChild>
          <Link href="/users">Back to Users</Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="fullName">Full name</Label>
        <Input id="fullName" name="fullName" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Work email</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="role">Role</Label>
        <Select name="role" required>
          <SelectTrigger id="role" className="w-full">
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent>
            {STAFF_ROLES.filter((role) => allowSuperAdminRole || role !== "SUPER_ADMIN").map((role) => (
              <SelectItem key={role} value={role}>
                {roleLabel(role)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {state.error && <p className="text-destructive text-body">{state.error}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Creating…" : "Create Staff Account"}
      </Button>
    </form>
  );
}
