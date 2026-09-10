import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function PatientProfileLoading() {
  return (
    <div className="space-y-4">
      <Card className="h-28 p-6">
        <Skeleton className="h-full w-full" />
      </Card>
      <Card className="h-72 p-6">
        <Skeleton className="h-full w-full" />
      </Card>
    </div>
  );
}
