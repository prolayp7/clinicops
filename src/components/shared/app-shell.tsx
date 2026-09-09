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
    <div className="grid min-h-screen grid-cols-[248px_1fr]">
      <aside className="row-span-2">
        <Sidebar role={role} />
      </aside>
      <Header fullName={fullName} role={role} />
      <main className="bg-background p-6">{children}</main>
    </div>
  );
}
