"use client";

import { useActionState } from "react";
import { ArrowRight, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { portalLoginAction, type PortalLoginFormState } from "./actions";

const initialState: PortalLoginFormState = { error: null };

export function PortalLoginForm() {
  const [state, formAction, isPending] = useActionState(portalLoginAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input id="email" name="email" type="email" required autoComplete="email" className="pl-9" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Lock className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            minLength={8}
            className="pl-9"
          />
        </div>
      </div>

      {state.error ? <p className="text-destructive text-body">{state.error}</p> : null}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Signing in…" : "Sign in"}
        {!isPending && <ArrowRight className="size-4" />}
      </Button>

      <p className="text-center text-caption text-muted-foreground">
        Don&apos;t have portal access yet? Ask the clinic front desk to enable it for you.
      </p>
    </form>
  );
}
