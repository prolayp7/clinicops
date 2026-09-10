import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function BillingLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="h-20 p-4">
            <Skeleton className="h-full w-full" />
          </Card>
        ))}
      </div>
      <Card className="h-64 p-4">
        <Skeleton className="h-full w-full" />
      </Card>
    </div>
  );
}
