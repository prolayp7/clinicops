"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  enablePortalAccessAction,
  resetPortalPasswordAction,
  togglePortalAccountStatusAction,
  type PortalAccessFormState,
} from "../../actions";
import type { PatientAccount } from "@prisma/client";

export function PortalAccessCard({
  patientId,
  patientEmail,
  account,
}: {
  patientId: string;
  patientEmail: string | null;
  account: PatientAccount | null;
}) {
  return (
    <Card className="mt-4 space-y-3 p-6">
      <h2 className="text-section-title text-foreground font-semibold">Patient Portal Access</h2>
      {account ? (
        <ExistingAccount patientId={patientId} account={account} />
      ) : (
        <EnableAccessForm patientId={patientId} defaultEmail={patientEmail} />
      )}
    </Card>
  );
}

function TemporaryPasswordNotice({ password }: { password: string }) {
  return (
    <div className="border-warning bg-warning/5 rounded-lg border p-3">
      <p className="text-body text-foreground font-semibold">
        Temporary password: <span className="font-mono">{password}</span>
      </p>
      <p className="text-caption text-muted-foreground mt-1">
        Share this with the patient now — it will not be shown again.
      </p>
    </div>
  );
}

function EnableAccessForm({ patientId, defaultEmail }: { patientId: string; defaultEmail: string | null }) {
  const [state, formAction, isPending] = useActionState<PortalAccessFormState, FormData>(
    enablePortalAccessAction.bind(null, patientId),
    { error: null },
  );

  if (state.temporaryPassword) {
    return <TemporaryPasswordNotice password={state.temporaryPassword} />;
  }

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <div className="space-y-1.5">
        <Label htmlFor="portal-email">Patient&apos;s email</Label>
        <Input id="portal-email" name="email" type="email" required defaultValue={defaultEmail ?? ""} className="w-64" />
      </div>
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? "Enabling…" : "Enable Portal Access"}
      </Button>
      {state.error && <p className="text-destructive text-caption w-full">{state.error}</p>}
    </form>
  );
}

function ExistingAccount({ patientId, account }: { patientId: string; account: PatientAccount }) {
  const [resetState, resetAction, isResetting] = useActionState<PortalAccessFormState, FormData>(
    resetPortalPasswordAction.bind(null, patientId),
    { error: null },
  );
  const [confirmingReset, setConfirmingReset] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-body text-foreground font-semibold">{account.email}</p>
          <p className="text-caption text-muted-foreground">
            {account.status === "ACTIVE" ? "Active" : "Disabled"}
            {account.lastLoginAt ? ` • last login ${account.lastLoginAt.toISOString().slice(0, 10)}` : ""}
          </p>
        </div>
        <form
          action={togglePortalAccountStatusAction.bind(
            null,
            patientId,
            account.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE",
          )}
        >
          <Button type="submit" size="sm" variant={account.status === "ACTIVE" ? "destructive" : "secondary"}>
            {account.status === "ACTIVE" ? "Disable Access" : "Re-enable Access"}
          </Button>
        </form>
      </div>

      {resetState.temporaryPassword ? (
        <TemporaryPasswordNotice password={resetState.temporaryPassword} />
      ) : confirmingReset ? (
        <form action={resetAction} className="flex items-center gap-2">
          <p className="text-caption text-muted-foreground">Generate a new temporary password?</p>
          <Button type="submit" size="sm" variant="secondary" disabled={isResetting}>
            {isResetting ? "Resetting…" : "Confirm Reset"}
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
      {resetState.error && <p className="text-destructive text-caption">{resetState.error}</p>}
    </div>
  );
}
