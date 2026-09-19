export interface StorageProvider {
  uploadConsultationAttachment(consultationId: string, file: File): Promise<{ storagePath: string }>;
  getAttachmentSignedUrl(storagePath: string): Promise<string | null>;
  uploadDoctorSignature(doctorId: string, file: File): Promise<string>;
  getSignatureSignedUrl(storagePath: string): Promise<string | null>;
  getSignatureDataUri(storagePath: string): Promise<string | null>;
  uploadLabReport(labOrderId: string, file: File): Promise<string>;
  getLabReportSignedUrl(storagePath: string): Promise<string | null>;
  uploadDocument(patientId: string, file: File): Promise<string>;
  getDocumentSignedUrl(storagePath: string): Promise<string | null>;
}
