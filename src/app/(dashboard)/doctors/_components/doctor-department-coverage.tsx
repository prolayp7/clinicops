import { Card } from "@/components/ui/card";

export type DepartmentCoverage = { name: string; onShift: number; total: number };

export function DoctorDepartmentCoverage({ coverage }: { coverage: DepartmentCoverage[] }) {
  return (
    <Card className="gap-3 p-4">
      <h2 className="text-section-title text-foreground font-semibold">
        Today&apos;s department coverage
      </h2>
      {coverage.length === 0 ? (
        <p className="text-muted-foreground text-body">No active departments yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {coverage.map((dept) => (
            <div key={dept.name} className="border-border rounded-lg border p-3">
              <div className="text-caption text-muted-foreground truncate">{dept.name}</div>
              <div className="text-foreground text-body font-semibold">
                {dept.onShift} on shift
              </div>
              <div className="text-caption text-muted-foreground">of {dept.total} doctors</div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
