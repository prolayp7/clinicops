import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function UsersLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-9 w-64" />
      <Card className="h-96 p-0">
        <Skeleton className="h-full w-full" />
      </Card>
    </div>
  );
}
