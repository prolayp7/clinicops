import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions/policies";
import { listDocuments } from "@/server/services/documents-service";
import { listActiveDocumentCategories } from "@/server/services/document-categories-service";
import { DocumentFilters } from "./_components/document-filters";
import { toggleDocumentStatusAction } from "./actions";
import type { RecordStatus } from "@prisma/client";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const actor = await getCurrentUser();
  if (!actor || !can(actor.profile.role, "documents:view")) {
    redirect("/dashboard");
  }
  const canManage = can(actor.profile.role, "documents:manage");

  const params = await searchParams;
  const categoryId = params.categoryId || "";
  const status = (params.status as RecordStatus) || "ACTIVE";

  const [{ items }, categories] = await Promise.all([
    listDocuments(actor, { categoryId: categoryId || undefined, status, pageSize: 100 }),
    listActiveDocumentCategories(),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-page-title text-foreground font-bold">Documents</h1>
        <p className="text-muted-foreground text-body">
          Private patient files — upload from a patient&apos;s profile.
        </p>
      </div>

      <DocumentFilters categoryId={categoryId} status={status} categories={categories} />

      <Card className="gap-0 overflow-hidden p-0">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-muted text-table-header text-muted-foreground uppercase tracking-wider">
              <th className="px-4 py-2.5 font-semibold">File</th>
              <th className="px-4 py-2.5 font-semibold">Patient</th>
              <th className="px-4 py-2.5 font-semibold">Category</th>
              <th className="px-4 py-2.5 font-semibold">Size</th>
              <th className="px-4 py-2.5 font-semibold">Uploaded</th>
              {canManage && <th className="px-4 py-2.5 font-semibold" />}
            </tr>
          </thead>
          <tbody className="divide-border text-body divide-y">
            {items.length === 0 && (
              <tr>
                <td colSpan={canManage ? 6 : 5} className="text-muted-foreground px-4 py-8 text-center">
                  No documents found.
                </td>
              </tr>
            )}
            {items.map((doc) => (
              <tr key={doc.id}>
                <td className="px-4 py-3">
                  {doc.signedUrl ? (
                    <a href={doc.signedUrl} target="_blank" rel="noreferrer" className="text-foreground hover:underline">
                      {doc.fileName}
                    </a>
                  ) : (
                    doc.fileName
                  )}
                </td>
                <td className="text-foreground px-4 py-3">
                  <Link href={`/patients/${doc.patient.id}`} className="hover:underline">
                    {doc.patient.firstName} {doc.patient.lastName}
                  </Link>
                  <span className="text-muted-foreground"> · {doc.patient.patientId}</span>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="secondary">{doc.category.name}</Badge>
                </td>
                <td className="text-muted-foreground px-4 py-3">{formatBytes(doc.sizeBytes)}</td>
                <td className="text-muted-foreground px-4 py-3">
                  {doc.createdAt.toISOString().slice(0, 10)} by {doc.uploadedBy.fullName}
                </td>
                {canManage && (
                  <td className="px-4 py-3 text-right">
                    <form
                      action={toggleDocumentStatusAction.bind(
                        null,
                        doc.id,
                        doc.patient.id,
                        doc.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE",
                      )}
                    >
                      <Button type="submit" size="sm" variant="secondary">
                        {doc.status === "ACTIVE" ? "Archive" : "Unarchive"}
                      </Button>
                    </form>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
