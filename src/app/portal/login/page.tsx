import Image from "next/image";
import { User } from "lucide-react";
import logo from "../../../../public/images/logo.png";
import { PortalLoginForm } from "./login-form";

export default function PortalLoginPage() {
  return (
    <main className="bg-canvas flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <Image src={logo} alt="Harbor Health" priority className="h-9 w-auto" />

      <div className="w-full max-w-[420px] rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-6">
          <div className="bg-accent border-primary/20 text-primary mb-4 flex size-10 items-center justify-center rounded-xl border">
            <User className="size-5" />
          </div>
          <h1 className="text-foreground text-page-title font-bold tracking-tight">Patient Portal</h1>
          <p className="text-muted-foreground mt-1 text-body">
            Sign in to view your appointments, prescriptions and more.
          </p>
        </div>

        <PortalLoginForm />
      </div>
    </main>
  );
}
