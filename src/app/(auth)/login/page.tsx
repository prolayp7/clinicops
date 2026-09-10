import Image from "next/image";
import { Lock, ShieldCheck, User } from "lucide-react";
import logo from "../../../../public/images/logo.png";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const year = new Date().getFullYear();

  return (
    <main className="bg-canvas flex min-h-screen">
      {/* Left: branded panel, hidden on small screens */}
      <div className="via-navy-900 relative hidden w-full max-w-[560px] flex-col justify-between overflow-hidden bg-gradient-to-br from-[#0c1622] to-[#0e484f] p-12 text-white lg:flex">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="bg-primary/20 pointer-events-none absolute -bottom-24 -left-24 size-96 rounded-full blur-3xl" />
        <div className="bg-primary/15 pointer-events-none absolute top-1/4 -right-20 size-80 rounded-full blur-3xl" />

        <div className="relative z-10 rounded-xl bg-white/95 p-3 w-fit">
          <Image src={logo} alt="Harbor Health" priority className="h-9 w-auto" />
        </div>

        <div className="relative z-10 max-w-md py-8">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-caption font-medium text-white/90 backdrop-blur-sm">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            Clinical Outpatient Portal v2.4
          </div>
          <h2 className="mb-4 text-3xl leading-tight font-bold tracking-tight text-white xl:text-4xl">
            Connected care.
            <br />
            Clearer workflows.
          </h2>
          <p className="mb-8 text-body leading-relaxed text-slate-300">
            Secure electronic health records, provider scheduling, and administrative
            operations engineered for modern outpatient care teams.
          </p>

          <div className="grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
            <div className="flex items-center gap-2.5 text-caption text-slate-300">
              <div className="flex size-6 shrink-0 items-center justify-center rounded bg-white/10">
                <ShieldCheck className="size-3.5 text-white/80" />
              </div>
              <span>HIPAA Tier-3 Compliant</span>
            </div>
            <div className="flex items-center gap-2.5 text-caption text-slate-300">
              <div className="flex size-6 shrink-0 items-center justify-center rounded bg-white/10">
                <Lock className="size-3.5 text-white/80" />
              </div>
              <span>FIPS 140-2 EPCS Ready</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-4 text-caption text-slate-400">
          <span>© {year} Harbor Health Systems LLC</span>
          <span>Support: (555) 234-8900</span>
        </div>
      </div>

      {/* Right: auth card */}
      <div className="flex w-full flex-1 flex-col items-center justify-center gap-6 p-6 sm:p-10">
        <div className="flex items-center gap-3 lg:hidden">
          <Image src={logo} alt="Harbor Health" priority className="h-8 w-auto" />
        </div>

        <div className="w-full max-w-[440px] rounded-2xl border border-border bg-card p-8 shadow-sm sm:p-9">
          <div className="mb-6">
            <div className="bg-accent border-primary/20 text-primary mb-4 flex size-10 items-center justify-center rounded-xl border">
              <User className="size-5" />
            </div>
            <h1 className="text-foreground text-page-title font-bold tracking-tight">
              Welcome back
            </h1>
            <p className="text-muted-foreground mt-1 text-body">
              Sign in to continue to the clinic workspace
            </p>
          </div>

          <LoginForm next={next} />

          <div className="mt-6 border-t border-border pt-5 text-center">
            <p className="text-caption text-muted-foreground/80 leading-relaxed">
              Authorized clinical personnel only. Access is monitored and audited in
              accordance with HIPAA §164.312 security safeguards.
            </p>
          </div>
        </div>

        <p className="text-center text-caption text-muted-foreground">
          Protected by Harbor Health Identity Access Management
          <br />
          NPI Verified • HIPAA §164.312 Compliant
        </p>
      </div>
    </main>
  );
}
