import type { RecordStatus } from "@prisma/client";

/** The patient-portal access rule for documents: ownership, and not soft-deleted. Documents have
 * no draft/release concept — visibility depends only on who it belongs to and whether it's
 * archived. */
export function canPatientAccessDocument(status: RecordStatus, isOwnRecord: boolean): boolean {
  return isOwnRecord && status === "ACTIVE";
}
