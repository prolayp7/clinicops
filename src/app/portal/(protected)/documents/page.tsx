import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getCurrentPatient } from "@/lib/auth/patient-session";
import { listPortalDocuments } from "@/server/services/portal-service";

export default async function PortalDocumentsPage() {
  const patient = await getCurrentPatient();
  if (!patient) redirect("/portal/login");

  const documents = await listPortalDocuments(patient.patient.id);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-page-title text-foreground font-bold">Documents</h1>
        <p className="text-muted-foreground text-body">Files the clinic has shared with you.</p>
      </div>

      {documents.length === 0 ? (
        <Card className="text-muted-foreground p-8 text-center text-body">No documents yet.</Card>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <Card key={doc.id} className="flex items-center justify-between p-4">
              <div>
                {doc.signedUrl ? (
                  <a
                    href={doc.signedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-foreground text-body font-semibold hover:underline"
                  >
                    {doc.fileName}
                  </a>
                ) : (
                  <p className="text-body text-foreground font-semibold">{doc.fileName}</p>
                )}
                <p className="text-caption text-muted-foreground">
                  {doc.createdAt.toISOString().slice(0, 10)}
                </p>
              </div>
              <Badge variant="secondary">{doc.category.name}</Badge>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
