"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowLeft, ArrowRight, Info, Mail } from "lucide-react";
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
        <Link href="/login" className="text-primary inline-flex items-center gap-2 text-body underline">
          <ArrowLeft className="size-4" />
          Back to secure sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-muted-foreground text-caption font-semibold tracking-wider uppercase">
          Work email
        </Label>
        <div className="relative">
          <Mail className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="name@clinic.org"
            className="pl-9"
          />
        </div>
        <p className="text-muted-foreground flex items-center gap-1.5 text-caption">
          <Info className="text-primary size-3.5 shrink-0" />
          Use the email address associated with your staff account.
        </p>
      </div>
      {state.error ? (
        <p role="alert" className="text-destructive text-body">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Sending…" : "Send reset link"}
        {!isPending && <ArrowRight className="size-4" />}
      </Button>
      <Link href="/login" className="text-primary flex items-center justify-center gap-2 text-body underline">
        <ArrowLeft className="size-4" />
        Back to secure sign in
      </Link>
    </form>
  );
}
