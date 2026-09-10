import Link from "next/link";
import Image from "next/image";
import logo from "../../../public/images/logo.png";
import { Button } from "@/components/ui/button";
import { signOutPortalAction } from "@/app/portal/(protected)/actions";

const NAV_LINKS = [
  { href: "/portal", label: "Home" },
  { href: "/portal/appointments", label: "Appointments" },
  { href: "/portal/prescriptions", label: "Prescriptions" },
  { href: "/portal/lab-reports", label: "Lab Reports" },
  { href: "/portal/documents", label: "Documents" },
  { href: "/portal/invoices", label: "Billing" },
  { href: "/portal/profile", label: "Profile" },
];

export function PortalShell({
  patientName,
  children,
}: {
  patientName: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background min-h-screen">
      <header className="border-border bg-card sticky top-0 z-10 border-b">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <Image src={logo} alt="Harbor Health" className="h-7 w-auto" />
            <span className="text-body text-foreground font-semibold">Patient Portal</span>
          </div>
          <nav className="flex flex-wrap items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Button key={link.href} asChild size="sm" variant="ghost">
                <Link href={link.href}>{link.label}</Link>
              </Button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <span className="text-caption text-muted-foreground">{patientName}</span>
            <form action={signOutPortalAction}>
              <Button type="submit" size="sm" variant="secondary">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-4 sm:p-6">{children}</main>
    </div>
  );
}
