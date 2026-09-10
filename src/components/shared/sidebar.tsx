"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  FlaskConical,
  FolderOpen,
  HelpCircle,
  LayoutGrid,
  Pill,
  Receipt,
  Settings,
  Stethoscope,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getNavItemsForRole, type NavIcon } from "@/lib/permissions/roles";
import type { Role } from "@prisma/client";

const ICONS: Record<NavIcon, LucideIcon> = {
  "layout-grid": LayoutGrid,
  users: Users,
  stethoscope: Stethoscope,
  "calendar-days": CalendarDays,
  "clipboard-list": ClipboardList,
  pill: Pill,
  "flask-conical": FlaskConical,
  receipt: Receipt,
  "folder-open": FolderOpen,
  "bar-chart-3": BarChart3,
  "user-cog": UserCog,
  settings: Settings,
};

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = getNavItemsForRole(role);

  return (
    <nav
      aria-label="Primary"
      className="bg-sidebar border-sidebar-border flex h-full w-full flex-col justify-between border-r"
    >
      <div className="flex min-h-0 flex-col">
        <div className="border-sidebar-border flex h-16 items-center gap-2 border-b px-4">
          <div className="bg-primary flex size-8 items-center justify-center rounded-lg text-white">
            <span className="text-body font-bold">H</span>
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-section-title text-foreground font-semibold">
              Harbor Health
            </span>
            <span className="text-caption text-muted-foreground">Clinical Systems</span>
          </div>
        </div>
        <ul className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {items.map((item) => {
            const Icon = ICONS[item.icon];
            const active = pathname.startsWith(item.href);
            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-control flex items-center gap-3 px-3 py-2 text-body transition-colors",
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-sm"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                >
                  <Icon className="size-[18px] shrink-0" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="border-sidebar-border flex flex-col gap-2 border-t p-4">
        <a
          href="#"
          className="text-sidebar-foreground hover:text-primary flex items-center gap-2 text-body transition-colors"
        >
          <HelpCircle className="size-[18px]" />
          Help &amp; Support
        </a>
        <div className="text-caption flex items-center justify-between">
          <span className="text-primary bg-accent rounded px-1.5 py-0.5 font-medium">
            v0.1.0 Dev
          </span>
          <span className="text-muted-foreground flex items-center gap-1.5">
            <span className="bg-success size-2 animate-pulse rounded-full" />
            Operational
          </span>
        </div>
      </div>
    </nav>
  );
}
