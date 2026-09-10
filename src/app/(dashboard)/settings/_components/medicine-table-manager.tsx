"use client";

import { useActionState, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import type { RecordStatus } from "@prisma/client";
import type { FormState } from "../actions";

type Medicine = { id: string; name: string; strength: string; form: string; status: RecordStatus };

export function MedicineTableManager({
  items,
  total,
  page,
  pageSize,
  search,
  canManage,
  onCreate,
  onUpdate,
  onToggleStatus,
}: {
  items: Medicine[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
  canManage: boolean;
  onCreate: (prev: FormState, formData: FormData) => Promise<FormState>;
  onUpdate: (id: string, prev: FormState, formData: FormData) => Promise<FormState>;
  onToggleStatus: (id: string, nextStatus: RecordStatus) => Promise<void>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "medPage") next.delete("medPage");
    router.push(`/settings?${next.toString()}`);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Input
          placeholder="Search medicines..."
          defaultValue={search}
          onChange={(e) => updateParam("medSearch", e.target.value)}
          className="max-w-xs"
        />
        {canManage && <CreateDialog onCreate={onCreate} />}
      </div>

      <div className="border-border overflow-hidden rounded-lg border">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-muted text-table-header text-muted-foreground uppercase tracking-wider">
              <th className="px-4 py-2.5 font-semibold">Name</th>
              <th className="px-4 py-2.5 font-semibold">Strength</th>
              <th className="px-4 py-2.5 font-semibold">Form</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
              {canManage && <th className="px-4 py-2.5 text-right font-semibold">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-border text-body divide-y">
            {items.length === 0 && (
              <tr>
                <td colSpan={canManage ? 5 : 4} className="text-muted-foreground px-4 py-6 text-center">
                  No medicines found.
                </td>
              </tr>
            )}
            {items.map((item) => (
              <tr key={item.id}>
                <td className="text-foreground px-4 py-3">{item.name}</td>
                <td className="text-foreground px-4 py-3">{item.strength}</td>
                <td className="text-foreground px-4 py-3">{item.form}</td>
                <td className="px-4 py-3">
                  <Badge variant={item.status === "ACTIVE" ? "success" : "secondary"}>
                    {item.status === "ACTIVE" ? "Active" : "Archived"}
                  </Badge>
                </td>
                {canManage && (
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <EditDialog item={item} onUpdate={onUpdate} />
                      <form
                        action={async () => {
                          await onToggleStatus(item.id, item.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE");
                        }}
                      >
                        <Button type="submit" size="sm" variant="secondary">
                          {item.status === "ACTIVE" ? "Archive" : "Unarchive"}
                        </Button>
                      </form>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="text-caption text-muted-foreground flex items-center justify-between">
          <span>
            Page {page} of {totalPages} ({total} total)
          </span>
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="secondary"
              disabled={page <= 1}
              onClick={() => updateParam("medPage", String(page - 1))}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={page >= totalPages}
              onClick={() => updateParam("medPage", String(page + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function MedicineFields({ defaultValues }: { defaultValues?: Omit<Medicine, "id" | "status"> }) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required autoFocus defaultValue={defaultValues?.name} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="strength">Strength</Label>
        <Input
          id="strength"
          name="strength"
          placeholder="e.g. 500mg"
          required
          defaultValue={defaultValues?.strength}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="form">Form</Label>
        <Input id="form" name="form" placeholder="e.g. Tablet" required defaultValue={defaultValues?.form} />
      </div>
    </>
  );
}

function CreateDialog({ onCreate }: { onCreate: (prev: FormState, formData: FormData) => Promise<FormState> }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    async (prev, formData) => {
      const result = await onCreate(prev, formData);
      if (!result.error) setOpen(false);
      return result;
    },
    { error: null },
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          Add Medicine
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Medicine</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          <MedicineFields />
          {state.error && <p className="text-destructive text-body">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditDialog({
  item,
  onUpdate,
}: {
  item: Medicine;
  onUpdate: (id: string, prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    async (prev, formData) => {
      const result = await onUpdate(item.id, prev, formData);
      if (!result.error) setOpen(false);
      return result;
    },
    { error: null },
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon-sm" variant="ghost" aria-label={`Edit ${item.name}`}>
          <Pencil className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Medicine</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          <MedicineFields defaultValues={item} />
          {state.error && <p className="text-destructive text-body">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
