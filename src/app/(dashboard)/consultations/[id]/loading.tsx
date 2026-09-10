import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ConsultationWorkspaceLoading() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <Card className="h-24 p-4">
          <Skeleton className="h-full w-full" />
        </Card>
        <Card className="h-96 p-4">
          <Skeleton className="h-full w-full" />
        </Card>
      </div>
      <Card className="h-64 p-4">
        <Skeleton className="h-full w-full" />
      </Card>
    </div>
  );
}
