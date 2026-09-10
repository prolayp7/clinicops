"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ABNORMAL_FLAG_LABELS } from "@/lib/laboratory";
import { saveResultsAction, type ResultsFormState } from "../../actions";
import type { AbnormalFlag } from "@prisma/client";

const ABNORMAL_FLAGS = Object.keys(ABNORMAL_FLAG_LABELS) as AbnormalFlag[];

type Item = {
  id: string;
  resultValue: string | null;
  unit: string;
  referenceRange: string;
  abnormalFlag: AbnormalFlag;
  labTest: { name: string; category: string };
};

export function ResultsForm({ labOrderId, items }: { labOrderId: string; items: Item[] }) {
  const itemIds = items.map((i) => i.id);
  const [state, formAction, isPending] = useActionState<ResultsFormState, FormData>(
    saveResultsAction.bind(null, labOrderId, itemIds),
    { error: null },
  );

  return (
    <form action={formAction} className="space-y-4">
      {items.map((item) => (
        <div key={item.id} className="border-border space-y-2 rounded-lg border p-3">
          <p className="text-body text-foreground font-semibold">
            {item.labTest.name} ({item.labTest.category})
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor={`item-${item.id}-resultValue`}>Result</Label>
              <Input
                id={`item-${item.id}-resultValue`}
                name={`item-${item.id}-resultValue`}
                defaultValue={item.resultValue ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`item-${item.id}-unit`}>Unit</Label>
              <Input
                id={`item-${item.id}-unit`}
                name={`item-${item.id}-unit`}
                required
                defaultValue={item.unit}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`item-${item.id}-referenceRange`}>Reference range</Label>
              <Input
                id={`item-${item.id}-referenceRange`}
                name={`item-${item.id}-referenceRange`}
                required
                defaultValue={item.referenceRange}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`item-${item.id}-abnormalFlag`}>Flag</Label>
              <Select name={`item-${item.id}-abnormalFlag`} defaultValue={item.abnormalFlag}>
                <SelectTrigger id={`item-${item.id}-abnormalFlag`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ABNORMAL_FLAGS.map((flag) => (
                    <SelectItem key={flag} value={flag}>
                      {ABNORMAL_FLAG_LABELS[flag]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      ))}

      {state.error && <p className="text-destructive text-body">{state.error}</p>}

      <Button type="submit" variant="secondary" disabled={isPending}>
        {isPending ? "Saving…" : "Save Results"}
      </Button>
    </form>
  );
}
