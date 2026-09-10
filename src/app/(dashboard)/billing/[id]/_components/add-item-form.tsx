"use client";

import { useActionState, useState } from "react";
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
import { addItemAction, type FormState } from "../../actions";
import type { InvoiceItemCategory } from "@prisma/client";

const CATEGORIES: { value: InvoiceItemCategory; label: string }[] = [
  { value: "CONSULTATION", label: "Consultation" },
  { value: "LAB", label: "Laboratory" },
  { value: "TREATMENT", label: "Treatment" },
  { value: "OTHER", label: "Other" },
];

type ConsultationOption = { id: string; label: string; feeCents: number };
type LabOrderOption = { id: string; label: string; totalCents: number };

export function AddItemForm({
  invoiceId,
  consultations,
  labOrders,
}: {
  invoiceId: string;
  consultations: ConsultationOption[];
  labOrders: LabOrderOption[];
}) {
  const [state, formAction, isPending] = useActionState(addItemAction.bind(null, invoiceId), {
    error: null,
  } as FormState);
  const v = state.values;
  const [category, setCategory] = useState<InvoiceItemCategory>(
    (v?.category as InvoiceItemCategory) ?? "CONSULTATION",
  );

  return (
    <form action={formAction} key={JSON.stringify(v)} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="category">Category</Label>
          <Select
            name="category"
            defaultValue={v?.category ?? "CONSULTATION"}
            onValueChange={(val) => setCategory(val as InvoiceItemCategory)}
          >
            <SelectTrigger id="category" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {category === "CONSULTATION" && consultations.length > 0 && (
          <div className="space-y-1.5">
            <Label htmlFor="consultationId">Link to consultation (optional)</Label>
            <Select name="consultationId" defaultValue={v?.consultationId}>
              <SelectTrigger id="consultationId" className="w-full">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                {consultations.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {category === "LAB" && labOrders.length > 0 && (
          <div className="space-y-1.5">
            <Label htmlFor="labOrderId">Link to lab order (optional)</Label>
            <Select name="labOrderId" defaultValue={v?.labOrderId}>
              <SelectTrigger id="labOrderId" className="w-full">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                {labOrders.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Input id="description" name="description" required defaultValue={v?.description} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="quantity">Quantity</Label>
          <Input id="quantity" name="quantity" type="number" min="1" defaultValue={v?.quantity ?? "1"} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="unitPriceDollars">Unit price (USD)</Label>
          <Input
            id="unitPriceDollars"
            name="unitPriceDollars"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={v?.unitPriceCents ? (Number(v.unitPriceCents) / 100).toFixed(2) : undefined}
          />
        </div>
      </div>

      {state.error && <p className="text-destructive text-body">{state.error}</p>}

      <Button type="submit" variant="secondary" disabled={isPending}>
        {isPending ? "Adding…" : "Add Charge"}
      </Button>
    </form>
  );
}
