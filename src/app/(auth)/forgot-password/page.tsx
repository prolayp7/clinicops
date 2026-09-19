import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <main className="bg-canvas flex min-h-screen items-center justify-center p-6">
      <div className="border-border bg-card w-full max-w-[440px] rounded-2xl border p-8 shadow-sm">
        <h1 className="text-foreground text-page-title font-bold tracking-tight">Reset your password</h1>
        <p className="text-muted-foreground mt-1 mb-6 text-body">
          Enter your work email and we will send you a reset link.
        </p>
        <ForgotPasswordForm />
      </div>
    </main>
  );
}
