import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function InvoiceDetailLoading() {
  return (
    <div className="space-y-4">
      <Card className="h-24 p-4">
        <Skeleton className="h-full w-full" />
      </Card>
      <Card className="h-64 p-4">
        <Skeleton className="h-full w-full" />
      </Card>
    </div>
  );
}
