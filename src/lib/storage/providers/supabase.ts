import "server-only";
import { randomUUID } from "node:crypto";
import { adminClient } from "@/lib/supabase/admin";
import { validatePrivateFile } from "@/lib/validation/private-file";
import type { StorageProvider } from "./types";

const ATTACHMENTS_BUCKET = "consultation-attachments";
const SIGNATURES_BUCKET = "doctor-signatures";
const LAB_REPORTS_BUCKET = "lab-reports";
const DOCUMENTS_BUCKET = "patient-documents";
const SIGNED_URL_TTL_SECONDS = 60 * 10;

async function ensureBucket(bucket: string) {
  const supabase = adminClient();
  const { data, error } = await supabase.storage.getBucket(bucket);
  if (error || !data || data.public) throw new Error("Private storage is not configured.");
}

async function uploadPrivateFile(bucket: string, keyPrefix: string, file: File): Promise<string> {
  const extension = await validatePrivateFile(file, bucket === SIGNATURES_BUCKET);
  await ensureBucket(bucket);
  const supabase = adminClient();
  const storagePath = `${keyPrefix}/${randomUUID()}${extension ? `.${extension}` : ""}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(storagePath, await file.arrayBuffer(), { contentType: file.type });
  if (error) throw new Error("Upload failed. Please retry.");

  return storagePath;
}

export const supabaseStorageProvider: StorageProvider = {
  async uploadConsultationAttachment(consultationId, file) {
    const storagePath = await uploadPrivateFile(ATTACHMENTS_BUCKET, consultationId, file);
    return { storagePath };
  },

  async getAttachmentSignedUrl(storagePath) {
    const supabase = adminClient();
    await ensureBucket(ATTACHMENTS_BUCKET);
    const { data } = await supabase.storage
      .from(ATTACHMENTS_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
    return data?.signedUrl ?? null;
  },

  async uploadDoctorSignature(doctorId, file) {
    return uploadPrivateFile(SIGNATURES_BUCKET, doctorId, file);
  },

  async getSignatureSignedUrl(storagePath) {
    const supabase = adminClient();
    await ensureBucket(SIGNATURES_BUCKET);
    const { data } = await supabase.storage
      .from(SIGNATURES_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
    return data?.signedUrl ?? null;
  },

  async getSignatureDataUri(storagePath) {
    const supabase = adminClient();
    const { data, error } = await supabase.storage.from(SIGNATURES_BUCKET).download(storagePath);
    if (error || !data) return null;
    const buffer = Buffer.from(await data.arrayBuffer());
    return `data:${data.type};base64,${buffer.toString("base64")}`;
  },

  async uploadLabReport(labOrderId, file) {
    return uploadPrivateFile(LAB_REPORTS_BUCKET, labOrderId, file);
  },

  async getLabReportSignedUrl(storagePath) {
    const supabase = adminClient();
    await ensureBucket(LAB_REPORTS_BUCKET);
    const { data } = await supabase.storage
      .from(LAB_REPORTS_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
    return data?.signedUrl ?? null;
  },

  async uploadDocument(patientId, file) {
    return uploadPrivateFile(DOCUMENTS_BUCKET, patientId, file);
  },

  async getDocumentSignedUrl(storagePath) {
    const supabase = adminClient();
    await ensureBucket(DOCUMENTS_BUCKET);
    const { data } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
    return data?.signedUrl ?? null;
  },
};
