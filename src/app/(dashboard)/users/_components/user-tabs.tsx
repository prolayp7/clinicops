"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function UserTabs({ active, showActivityLog }: { active: "staff" | "activity"; showActivityLog: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function goTo(tab: string) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("tab", tab);
    next.delete("page");
    router.push(`/users?${next.toString()}`);
  }

  return (
    <Tabs value={active} onValueChange={goTo}>
      <TabsList>
        <TabsTrigger value="staff">Staff</TabsTrigger>
        {showActivityLog && <TabsTrigger value="activity">Activity Log</TabsTrigger>}
      </TabsList>
    </Tabs>
  );
}
