"use client";

import { useActionState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addReportAction, type ReportFormState } from "../../actions";

export function ReportUploadForm({ labOrderId }: { labOrderId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState<ReportFormState, FormData>(
    async (prev, formData) => {
      const result = await addReportAction(labOrderId, prev, formData);
      if (!result.error) formRef.current?.reset();
      return result;
    },
    { error: null },
  );

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-center gap-2">
      <Input type="file" name="file" accept=".pdf,.png,.jpg,.jpeg" required className="max-w-xs" />
      <Button type="submit" size="sm" variant="secondary" disabled={isPending}>
        {isPending ? "Uploading…" : "Add report"}
      </Button>
      {state.error && <p className="text-destructive text-caption w-full">{state.error}</p>}
    </form>
  );
}
