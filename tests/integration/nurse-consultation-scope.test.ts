import { beforeEach, describe, expect, it, vi } from "vitest";
import { Role } from "@prisma/client";
import type { CurrentUser } from "@/lib/auth/session";
import { ForbiddenError } from "@/lib/permissions/policies";

vi.mock("server-only", () => ({}));

const db = vi.hoisted(() => ({
  consultation: { findUnique: vi.fn() },
  nurseAppointmentAssignment: { findFirst: vi.fn() },
}));
const storage = vi.hoisted(() => ({
  getAttachmentSignedUrl: vi.fn(),
  uploadConsultationAttachment: vi.fn(),
}));
vi.mock("@/lib/db/prisma", () => ({ prisma: db }));
vi.mock("@/server/services/audit-service", () => ({ recordAuditEvent: vi.fn() }));
vi.mock("@/lib/storage", () => ({
  ALLOWED_ATTACHMENT_TYPES: new Set(["application/pdf"]),
  MAX_ATTACHMENT_BYTES: 10 * 1024 * 1024,
  getAttachmentSignedUrl: storage.getAttachmentSignedUrl,
  uploadConsultationAttachment: storage.uploadConsultationAttachment,
}));

import { getConsultationById } from "@/server/services/consultations-service";

const nurse = { profile: { id: "nurse-staff-1", role: Role.NURSE } } as CurrentUser;
const consultation = {
  id: "consultation-1",
  appointment: { id: "appointment-1" },
  doctor: { staffProfileId: "doctor-staff-1" },
  attachments: [],
  amendments: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  db.consultation.findUnique.mockResolvedValue(consultation);
  db.nurseAppointmentAssignment.findFirst.mockResolvedValue(null);
});

describe("nurse consultation assignment scope", () => {
  it("rejects a nurse opening another nurse's consultation directly", async () => {
    await expect(getConsultationById(nurse, "consultation-1")).rejects.toBeInstanceOf(ForbiddenError);
    expect(db.nurseAppointmentAssignment.findFirst).toHaveBeenCalledWith({
      where: {
        appointmentId: "appointment-1",
        nurseProfile: { staffProfileId: "nurse-staff-1", status: "ACTIVE" },
      },
      select: { id: true },
    });
  });

  it("allows a nurse to open a consultation assigned to their active profile", async () => {
    db.nurseAppointmentAssignment.findFirst.mockResolvedValue({ id: "assignment-1" });

    await expect(getConsultationById(nurse, "consultation-1")).resolves.toMatchObject({
      id: "consultation-1",
      appointment: { id: "appointment-1" },
    });
  });
});
