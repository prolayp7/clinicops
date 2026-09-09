import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-card border border-border bg-card p-8 shadow-sm">
        <h1 className="text-page-title text-navy-900">ClinicOps</h1>
        <p className="mt-1 text-body text-muted-foreground">Sign in to your staff account</p>
        <LoginForm next={next} />
      </div>
    </main>
  );
}
