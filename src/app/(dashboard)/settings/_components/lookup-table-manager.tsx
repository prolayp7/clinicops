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

type Item = { id: string; name: string; status: RecordStatus };

export function LookupTableManager({
  label,
  items,
  total,
  page,
  pageSize,
  search,
  searchParamKey,
  canManage,
  onCreate,
  onUpdate,
  onToggleStatus,
}: {
  label: string;
  items: Item[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
  searchParamKey: string;
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
    if (key !== `${searchParamKey}Page`) next.delete(`${searchParamKey}Page`);
    router.push(`/settings?${next.toString()}`);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Input
          placeholder={`Search ${label.toLowerCase()}s...`}
          defaultValue={search}
          onChange={(e) => updateParam(searchParamKey, e.target.value)}
          className="max-w-xs"
        />
        {canManage && (
          <CreateDialog label={label} onCreate={onCreate} />
        )}
      </div>

      <div className="border-border overflow-hidden rounded-lg border">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-muted text-table-header text-muted-foreground uppercase tracking-wider">
              <th className="px-4 py-2.5 font-semibold">Name</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
              {canManage && <th className="px-4 py-2.5 text-right font-semibold">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-border text-body divide-y">
            {items.length === 0 && (
              <tr>
                <td colSpan={canManage ? 3 : 2} className="text-muted-foreground px-4 py-6 text-center">
                  No {label.toLowerCase()}s found.
                </td>
              </tr>
            )}
            {items.map((item) => (
              <tr key={item.id}>
                <td className="text-foreground px-4 py-3">{item.name}</td>
                <td className="px-4 py-3">
                  <Badge variant={item.status === "ACTIVE" ? "success" : "secondary"}>
                    {item.status === "ACTIVE" ? "Active" : "Archived"}
                  </Badge>
                </td>
                {canManage && (
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <EditDialog label={label} item={item} onUpdate={onUpdate} />
                      <form
                        action={async () => {
                          await onToggleStatus(
                            item.id,
                            item.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE",
                          );
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
              onClick={() => updateParam(`${searchParamKey}Page`, String(page - 1))}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={page >= totalPages}
              onClick={() => updateParam(`${searchParamKey}Page`, String(page + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function CreateDialog({
  label,
  onCreate,
}: {
  label: string;
  onCreate: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
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
          Add {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add {label}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={`new-${label}-name`}>Name</Label>
            <Input id={`new-${label}-name`} name="name" required autoFocus />
          </div>
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
  label,
  item,
  onUpdate,
}: {
  label: string;
  item: Item;
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
          <DialogTitle>Edit {label}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={`edit-${item.id}-name`}>Name</Label>
            <Input id={`edit-${item.id}-name`} name="name" required defaultValue={item.name} />
          </div>
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
