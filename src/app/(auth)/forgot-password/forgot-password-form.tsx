"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPasswordAction, type ForgotPasswordState } from "./actions";

const initialState: ForgotPasswordState = { error: null, sent: false };

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(forgotPasswordAction, initialState);

  if (state.sent) {
    return (
      <div className="space-y-4" role="status">
        <p className="text-body">
          If an active account exists for that email, a reset link is on its way. The link expires in 1 hour.
        </p>
        <Link href="/login" className="text-primary text-body underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Work email</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      {state.error ? (
        <p role="alert" className="text-destructive text-body">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Sending…" : "Send reset link"}
      </Button>
      <Link href="/login" className="text-muted-foreground block text-center text-caption underline">
        Back to sign in
      </Link>
    </form>
  );
}
