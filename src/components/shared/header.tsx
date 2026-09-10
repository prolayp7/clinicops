"use client";

import { usePathname } from "next/navigation";
import { Bell, ChevronDown, Search, TriangleAlert } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { signOutAction } from "@/lib/auth/actions";
import { NAV_ITEMS } from "@/lib/permissions/roles";

export function Header({ fullName, role }: { fullName: string; role: string }) {
  const pathname = usePathname();
  const title = NAV_ITEMS.find((item) => pathname.startsWith(item.href))?.label ?? "Dashboard";
  const initials = fullName
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="border-border bg-card flex h-16 items-center justify-between gap-4 border-b px-6">
      <div className="flex flex-1 items-center gap-4">
        <div className="text-body flex items-center gap-1.5 whitespace-nowrap">
          <span className="text-foreground font-semibold">Harbor Health Clinic</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-muted-foreground">{title}</span>
        </div>
        <div className="relative hidden max-w-lg flex-1 md:block">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-[18px] -translate-y-1/2" />
          <Input
            disabled
            placeholder="Search patients by name, MRN, phone, DOB..."
            className="bg-background h-10 pl-10"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button
          variant="destructive"
          size="sm"
          className="hidden sm:inline-flex"
          disabled
          title="Available once Appointments/Consultations are built"
        >
          <TriangleAlert className="size-4" />
          Emergency Triage
        </Button>
        <Button variant="ghost" size="icon" className="relative" disabled>
          <Bell className="size-5" />
          <Badge className="absolute top-0.5 right-0.5 size-4 justify-center rounded-full p-0 text-[10px]">
            3
          </Badge>
        </Button>
        <div className="bg-border h-8 w-px" />
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg focus-visible:outline-none">
            <Avatar className="size-8">
              <AvatarFallback className="text-caption">{initials}</AvatarFallback>
            </Avatar>
            <div className="hidden text-left leading-tight sm:block">
              <div className="text-body text-foreground font-semibold">{fullName}</div>
              <div className="text-caption text-muted-foreground">{role.replace("_", " ")}</div>
            </div>
            <ChevronDown className="text-muted-foreground size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{fullName}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <form action={signOutAction} className="w-full">
                <button type="submit" className="w-full text-left">
                  Sign out
                </button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
