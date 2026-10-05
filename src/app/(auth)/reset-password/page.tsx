import Link from "next/link";
import { KeyRound } from "lucide-react";
import { AuthLayout } from "../auth-layout";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const missingToken = process.env.AUTH_PROVIDER === "selfhosted" && !token;

  return (
    <AuthLayout>
      <div className="w-full max-w-110 rounded-2xl border border-border bg-card p-8 shadow-sm sm:p-9">
        <div className="mb-6">
          <div className="bg-accent border-primary/20 text-primary mb-4 flex size-10 items-center justify-center rounded-xl border">
            <KeyRound className="size-5" />
          </div>
          <h1 className="text-foreground text-page-title font-bold tracking-tight">
            Set a new password
          </h1>
          <p className="text-muted-foreground mt-1 text-body">
            Choose a password with at least 8 characters for your staff account.
          </p>
        </div>

        {missingToken ? (
          <div className="space-y-4" role="alert">
            <p className="text-destructive text-body">This reset link is invalid or incomplete.</p>
            <Link href="/forgot-password" className="text-primary text-body underline">
              Request a new link
            </Link>
          </div>
        ) : (
          <ResetPasswordForm token={token ?? ""} />
        )}

        <div className="mt-6 border-t border-border pt-5 text-center">
          <p className="text-caption text-muted-foreground/80 leading-relaxed">
            For authorized Harbor Health staff. Keep your sign-in credentials private.
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
