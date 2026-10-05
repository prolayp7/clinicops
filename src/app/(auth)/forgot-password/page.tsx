import { KeyRound } from "lucide-react";
import { AuthLayout } from "../auth-layout";
import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthLayout>
      <div className="w-full max-w-110 rounded-2xl border border-border bg-card p-8 shadow-sm sm:p-9">
        <div className="mb-6">
          <div className="bg-accent border-primary/20 text-primary mb-4 flex size-10 items-center justify-center rounded-xl border">
            <KeyRound className="size-5" />
          </div>
          <h1 className="text-foreground text-page-title font-bold tracking-tight">
            Reset your password
          </h1>
          <p className="text-muted-foreground mt-1 text-body">
            Enter your work email to receive secure reset instructions.
          </p>
        </div>

        <ForgotPasswordForm />

        <div className="mt-6 border-t border-border pt-5 text-center">
          <p className="text-caption text-muted-foreground/80 leading-relaxed">
            For authorized Harbor Health staff. Keep your sign-in credentials private.
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
