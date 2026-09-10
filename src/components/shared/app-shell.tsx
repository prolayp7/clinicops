import { Sidebar } from "./sidebar";
import { Header } from "./header";
import type { Role } from "@prisma/client";

export function AppShell({
  role,
  fullName,
  children,
}: {
  role: Role;
  fullName: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 w-[248px] print:hidden">
        <Sidebar role={role} />
      </aside>
      <div className="print:pl-0 pl-[248px]">
        <div className="fixed top-0 right-0 left-[248px] z-30 print:hidden">
          <Header fullName={fullName} role={role} />
        </div>
        <main className="bg-background min-h-screen pt-16 print:pt-0">
          <div className="mx-auto max-w-[1600px] p-6 print:max-w-none print:p-0">{children}</div>
        </main>
      </div>
    </div>
  );
}
