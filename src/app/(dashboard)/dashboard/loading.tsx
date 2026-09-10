import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="mt-2 h-5 w-40" />
      </Card>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="h-28 p-4">
            <Skeleton className="h-full w-full" />
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="h-80 p-4 lg:col-span-2">
          <Skeleton className="h-full w-full" />
        </Card>
        <Card className="h-80 p-4">
          <Skeleton className="h-full w-full" />
        </Card>
      </div>
    </div>
  );
}
