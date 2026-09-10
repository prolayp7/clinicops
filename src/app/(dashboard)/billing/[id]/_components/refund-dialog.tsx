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
import { Textarea } from "@/components/ui/textarea";
import { formatCents } from "@/lib/billing";
import { recordRefundAction, type FormState } from "../../actions";

export function RefundDialog({
  invoiceId,
  paymentId,
  maxRefundableCents,
}: {
  invoiceId: string;
  paymentId: string;
  maxRefundableCents: number;
}) {
  const [open, setOpen] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    async (prev, formData) => {
      const result = await recordRefundAction(invoiceId, prev, formData);
      if (!result.error) {
        setOpen(false);
        setIdempotencyKey(crypto.randomUUID());
      }
      return result;
    },
    { error: null },
  );

  if (maxRefundableCents <= 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="destructive">
          Refund
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Refund Payment</DialogTitle>
        </DialogHeader>
        <p className="text-body text-muted-foreground">
          Refundable up to{" "}
          <span className="text-foreground font-semibold">{formatCents(maxRefundableCents)}</span>
        </p>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="paymentId" value={paymentId} />
          <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
          <div className="space-y-1.5">
            <Label htmlFor={`amountDollars-${paymentId}`}>Amount (USD)</Label>
            <Input
              id={`amountDollars-${paymentId}`}
              name="amountDollars"
              type="number"
              step="0.01"
              min="0.01"
              max={(maxRefundableCents / 100).toFixed(2)}
              required
              defaultValue={(maxRefundableCents / 100).toFixed(2)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`reason-${paymentId}`}>Reason</Label>
            <Textarea id={`reason-${paymentId}`} name="reason" rows={3} required />
          </div>
          {state.error && <p className="text-destructive text-body">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={isPending}>
              {isPending ? "Saving…" : "Confirm Refund"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
