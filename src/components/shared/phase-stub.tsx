import { Card } from "@/components/ui/card";

export function PhaseStub({ title, phase }: { title: string; phase: string }) {
  return (
    <Card className="p-8 text-center">
      <h1 className="text-page-title text-foreground font-bold">{title}</h1>
      <p className="text-body text-muted-foreground mx-auto mt-2 max-w-md">
        This module is designed but not yet built — it arrives in {phase} per
        IMPLEMENTATION_PLAN.md.
      </p>
    </Card>
  );
}
