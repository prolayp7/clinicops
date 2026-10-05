import type { ReactNode } from "react";
import Image from "next/image";
import { Lock, ShieldCheck } from "lucide-react";
import logo from "../../../public/images/logo.png";

export function AuthLayout({ children }: { children: ReactNode }) {
  const year = new Date().getFullYear();

  return (
    <main className="bg-canvas flex min-h-screen">
      <section
        aria-label="Harbor Health staff workspace"
        className="via-navy-900 relative hidden w-[44%] max-w-160 min-w-105 flex-col justify-between overflow-hidden bg-linear-to-br from-[#0c1622] to-[#0e484f] p-12 text-white lg:flex"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.055]"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.75) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <svg
          aria-hidden="true"
          viewBox="0 0 640 900"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 size-full opacity-40"
          fill="none"
        >
          <g stroke="#9BE2D8" strokeOpacity="0.48" strokeWidth="1">
            <path d="M365 0v112l56 56v92l-76 76v88l92 92v96l-64 64v120" />
            <path d="M518 0v168l-72 72v84l92 92v72l-58 58v142l-76 76v136" />
            <path d="M640 116H548l-48 48h-78l-64 64h-74" />
            <path d="M640 356h-86l-54 54h-94l-53 53H266" />
            <path d="M640 640h-94l-48 48H382l-54 54H210" />
            <path d="M450 900v-98l-65-65v-82l-61-61v-94" />
          </g>
          <g fill="#0e484f" stroke="#9BE2D8" strokeOpacity="0.72" strokeWidth="1.25">
            <circle cx="365" cy="112" r="4" />
            <circle cx="421" cy="260" r="4" />
            <circle cx="345" cy="336" r="5" />
            <circle cx="437" cy="512" r="4" />
            <circle cx="446" cy="240" r="4" />
            <circle cx="500" cy="410" r="5" />
            <circle cx="446" cy="688" r="4" />
            <circle cx="328" cy="757" r="5" />
            <circle cx="328" cy="500" r="4" />
            <circle cx="474" cy="164" r="3" />
            <circle cx="500" cy="688" r="3" />
            <circle cx="385" cy="735" r="3" />
          </g>
        </svg>

        <div className="relative z-10 w-fit rounded-xl bg-white/95 p-3">
          <Image src={logo} alt="Harbor Health" priority className="h-9 w-auto" />
        </div>

        <div className="relative z-10 max-w-md py-8">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-caption font-medium text-white/90 backdrop-blur-sm">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            Clinical Outpatient Portal v2.4
          </div>
          <h2 className="mb-4 text-3xl leading-tight font-bold text-white xl:text-4xl">
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
              <span>Role-based staff access</span>
            </div>
            <div className="flex items-center gap-2.5 text-caption text-slate-300">
              <div className="flex size-6 shrink-0 items-center justify-center rounded bg-white/10">
                <Lock className="size-3.5 text-white/80" />
              </div>
              <span>Protected staff workspace</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-4 text-caption text-slate-400">
          <span>© {year} Harbor Health Systems LLC</span>
          <span>Support: (555) 234-8900</span>
        </div>
      </section>

      <section
        aria-label="Account access"
        className="flex w-full flex-1 flex-col items-center justify-center gap-6 p-6 sm:p-10"
      >
        <div className="flex items-center gap-3 lg:hidden">
          <Image src={logo} alt="Harbor Health" priority className="h-8 w-auto" />
        </div>

        {children}

        <p className="text-center text-caption text-muted-foreground">
          Protected by Harbor Health Identity Access Management
          <br />
          For authorized clinical personnel only
        </p>
      </section>
    </main>
  );
}