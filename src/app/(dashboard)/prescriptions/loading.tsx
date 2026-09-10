import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function PrescriptionsLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-full max-w-2xl" />
      <Card className="h-64 p-4">
        <Skeleton className="h-full w-full" />
      </Card>
    </div>
  );
}
