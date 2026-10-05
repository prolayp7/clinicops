"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPasswordAction, type ResetPasswordState } from "./actions";

const initialState: ResetPasswordState = { error: null, done: false };

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, isPending] = useActionState(resetPasswordAction, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  if (state.done) {
    return <div className="space-y-4" role="status">
        <p className="text-body">Your password has been updated. Sign in with the new password.</p>
        <Link href="/login" className="text-primary inline-flex items-center gap-2 text-body underline">
          <ArrowRight className="size-4" />
          Go to sign in
        </Link>
      </div>;
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-muted-foreground text-caption font-semibold tracking-wider uppercase">
          New password
        </Label>
        <div className="relative">
          <Lock className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
            className="px-9"
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? "Hide new password" : "Show new password"}
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        <p className="text-muted-foreground text-caption">At least 8 characters</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword" className="text-muted-foreground text-caption font-semibold tracking-wider uppercase">
          Confirm new password
        </Label>
        <div className="relative">
          <Lock className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            required
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
            className="px-9"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((visible) => !visible)}
            aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"}
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
          >
            {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>
      {state.error ? (
        <p role="alert" className="text-destructive text-body">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Saving…" : "Update password"}
        {!isPending && <ArrowRight className="size-4" />}
      </Button>
      <Link href="/login" className="text-primary flex items-center justify-center gap-2 text-body underline">
        <ArrowLeft className="size-4" />
        Cancel and return to sign in
      </Link>
    </form>
  );
}
