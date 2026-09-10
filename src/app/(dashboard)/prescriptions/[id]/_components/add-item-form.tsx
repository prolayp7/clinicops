"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MEAL_INSTRUCTION_LABELS } from "@/lib/prescriptions";
import { addItemAction, type FormState } from "../../actions";
import type { MealInstruction } from "@prisma/client";

const MEAL_INSTRUCTIONS = Object.keys(MEAL_INSTRUCTION_LABELS) as MealInstruction[];

type MedicineOption = { id: string; name: string; strength: string; form: string };

export function AddItemForm({
  prescriptionId,
  medicines,
}: {
  prescriptionId: string;
  medicines: MedicineOption[];
}) {
  const [state, formAction, isPending] = useActionState(addItemAction.bind(null, prescriptionId), {
    error: null,
  } as FormState);
  const v = state.values;

  return (
    <form action={formAction} key={JSON.stringify(v)} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="medicineId">Medicine</Label>
        <Select name="medicineId" defaultValue={v?.medicineId} required>
          <SelectTrigger id="medicineId" className="w-full">
            <SelectValue placeholder="Select a medicine" />
          </SelectTrigger>
          <SelectContent>
            {medicines.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name} {m.strength} ({m.form})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="dosage">Dosage</Label>
          <Input id="dosage" name="dosage" placeholder="1 tablet" required defaultValue={v?.dosage} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="frequency">Frequency</Label>
          <Input
            id="frequency"
            name="frequency"
            placeholder="Twice daily"
            required
            defaultValue={v?.frequency}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="route">Route</Label>
          <Input id="route" name="route" placeholder="Oral" required defaultValue={v?.route} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="duration">Duration</Label>
          <Input id="duration" name="duration" placeholder="7 days" required defaultValue={v?.duration} />
        </div>
      </div>

      <div className="max-w-xs space-y-1.5">
        <Label htmlFor="mealInstruction">Meal instruction</Label>
        <Select name="mealInstruction" defaultValue={v?.mealInstruction ?? "NOT_APPLICABLE"}>
          <SelectTrigger id="mealInstruction" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MEAL_INSTRUCTIONS.map((m) => (
              <SelectItem key={m} value={m}>
                {MEAL_INSTRUCTION_LABELS[m]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="directions">Directions (optional free text)</Label>
        <Textarea id="directions" name="directions" rows={2} defaultValue={v?.directions} />
      </div>

      {state.error && <p className="text-destructive text-body">{state.error}</p>}

      <Button type="submit" variant="secondary" disabled={isPending}>
        {isPending ? "Adding…" : "Add Medicine"}
      </Button>
    </form>
  );
}
