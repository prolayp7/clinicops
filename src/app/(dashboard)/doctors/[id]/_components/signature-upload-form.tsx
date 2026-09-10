"use client";

import { useActionState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadSignatureAction, type FormState } from "../../actions";

export function SignatureUploadForm({ doctorId }: { doctorId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    async (prev, formData) => {
      const result = await uploadSignatureAction(doctorId, prev, formData);
      if (!result.error) formRef.current?.reset();
      return result;
    },
    { error: null },
  );

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-center gap-2">
      <Input type="file" name="file" accept="image/png,image/jpeg" required className="max-w-xs" />
      <Button type="submit" size="sm" variant="secondary" disabled={isPending}>
        {isPending ? "Uploading…" : "Upload signature"}
      </Button>
      {state.error && <p className="text-destructive text-caption w-full">{state.error}</p>}
    </form>
  );
}
