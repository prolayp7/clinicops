"use client";

import { useActionState, useRef } from "react";
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
import { uploadDocumentAction, type UploadFormState } from "../../../documents/actions";

type CategoryOption = { id: string; name: string };

export function DocumentUploadForm({
  patientId,
  categories,
}: {
  patientId: string;
  categories: CategoryOption[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState<UploadFormState, FormData>(
    async (prev, formData) => {
      const result = await uploadDocumentAction(patientId, prev, formData);
      if (!result.error) formRef.current?.reset();
      return result;
    },
    { error: null },
  );

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-2">
      <div className="space-y-1.5">
        <Label htmlFor="categoryId">Category</Label>
        <Select name="categoryId" required>
          <SelectTrigger id="categoryId" className="w-44">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Input type="file" name="file" accept=".pdf,.png,.jpg,.jpeg" required className="max-w-xs" />
      <Button type="submit" size="sm" variant="secondary" disabled={isPending}>
        {isPending ? "Uploading…" : "Upload"}
      </Button>
      {state.error && <p className="text-destructive text-caption w-full">{state.error}</p>}
    </form>
  );
}
