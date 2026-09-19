import Link from "next/link";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const missingToken = process.env.AUTH_PROVIDER === "selfhosted" && !token;

  return (
    <main className="bg-canvas flex min-h-screen items-center justify-center p-6">
      <div className="border-border bg-card w-full max-w-[440px] rounded-2xl border p-8 shadow-sm">
        <h1 className="text-foreground text-page-title font-bold tracking-tight">Choose a new password</h1>
        {missingToken ? (
          <div className="mt-4 space-y-4" role="alert">
            <p className="text-body">This reset link is invalid or incomplete.</p>
            <Link href="/forgot-password" className="text-primary text-body underline">
              Request a new link
            </Link>
          </div>
        ) : (
          <ResetPasswordForm token={token ?? ""} />
        )}
      </div>
    </main>
  );
}
