import Link from "next/link";
import { getNavItemsForRole } from "@/lib/permissions/roles";
import type { Role } from "@prisma/client";

export function Sidebar({ role }: { role: Role }) {
  const items = getNavItemsForRole(role);

  return (
    <nav aria-label="Primary" className="flex h-full w-full flex-col gap-1 bg-navy-900 p-4">
      <div className="mb-4 px-2 text-page-title text-white">ClinicOps</div>
      <ul className="flex flex-col gap-1">
        {items.map((item) => (
          <li key={item.key}>
            <Link
              href={item.href}
              className="block rounded-control px-3 py-2 text-body text-white/90 hover:bg-white/10"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
