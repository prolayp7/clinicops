import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Card className="h-96 p-6">
        <Skeleton className="h-full w-full" />
      </Card>
    </div>
  );
}
