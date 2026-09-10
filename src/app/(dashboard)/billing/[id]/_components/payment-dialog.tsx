"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCents } from "@/lib/billing";
import { recordPaymentAction, type FormState } from "../../actions";

export function PaymentDialog({ invoiceId, balanceCents }: { invoiceId: string; balanceCents: number }) {
  const [open, setOpen] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    async (prev, formData) => {
      const result = await recordPaymentAction(invoiceId, prev, formData);
      if (!result.error) {
        setOpen(false);
        setIdempotencyKey(crypto.randomUUID());
      }
      return result;
    },
    { error: null },
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Record Payment</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <p className="text-body text-muted-foreground">
          Outstanding balance: <span className="text-foreground font-semibold">{formatCents(balanceCents)}</span>
        </p>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
          <div className="space-y-1.5">
            <Label htmlFor="amountDollars">Amount (USD)</Label>
            <Input
              id="amountDollars"
              name="amountDollars"
              type="number"
              step="0.01"
              min="0.01"
              max={(balanceCents / 100).toFixed(2)}
              required
              defaultValue={(balanceCents / 100).toFixed(2)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="method">Method</Label>
            <Select name="method" defaultValue="CASH">
              <SelectTrigger id="method" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="CARD">Card</SelectItem>
                <SelectItem value="BANK_TRANSFER">Bank transfer</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reference">Reference (optional)</Label>
            <Input id="reference" name="reference" placeholder="e.g. terminal transaction #" />
          </div>
          {state.error && <p className="text-destructive text-body">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
