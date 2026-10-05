import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma, Role } from "@prisma/client";
import type { CurrentUser } from "@/lib/auth/session";

vi.mock("server-only", () => ({}));
const tx = vi.hoisted(() => ({
  labOrder: { update: vi.fn() },
  labOrderStatusHistory: { create: vi.fn() },
}));
const uploadLabReport = vi.hoisted(() => vi.fn());
const db = vi.hoisted(() => ({
  patient: { findFirst: vi.fn() },
  labOrder: { findFirst: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn(), update: vi.fn() },
  labTest: { findMany: vi.fn() },
  labOrderItem: { update: vi.fn() },
  labOrderStatusHistory: { create: vi.fn() },
  labReport: { create: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock("@/lib/db/prisma", () => ({ prisma: db }));
vi.mock("@/lib/storage", () => ({
  ALLOWED_LAB_REPORT_TYPES: new Set(["application/pdf"]),
  MAX_LAB_REPORT_BYTES: 10_000,
  getLabReportSignedUrl: vi.fn(),
  uploadLabReport,
}));
vi.mock("@/server/services/audit-service", () => ({ recordAuditEvent: vi.fn() }));

import { addLabReport, changeLabOrderStatus, listLabOrders } from "@/server/services/lab-orders-service";

const doctorActor = { profile: { id: "doctor-1", role: Role.DOCTOR } } as CurrentUser;
const labActor = { profile: { id: "lab-tech-1", role: Role.LAB_TECHNICIAN } } as CurrentUser;
const statusInput = { fromStatus: "COMPLETED" as const, toStatus: "REVIEWED" as const, reason: "" };

beforeEach(() => {
  vi.clearAllMocks();
  db.$transaction.mockImplementation((callback: unknown) => {
    if (typeof callback !== "function") return Promise.resolve(undefined);
    return (callback as (client: typeof tx) => Promise<unknown>)(tx);
  });
  tx.labOrder.update.mockResolvedValue({ id: "lab-order-1", status: "REVIEWED" });
  tx.labOrderStatusHistory.create.mockResolvedValue({ id: "history-1" });
  db.labOrder.findMany.mockResolvedValue([]);
  db.labOrder.count.mockResolvedValue(0);
  db.labOrder.findFirst.mockResolvedValue({ id: "lab-order-1", status: "PROCESSING", items: [] });
  db.labReport.create.mockResolvedValue({ id: "report-1" });
  uploadLabReport.mockResolvedValue("lab-reports/lab-order-1/synthetic.pdf");
});

describe("laboratory queue filtering", () => {
  it("searches order number and patient identifiers with bounded pagination", async () => {
    const adminActor = { profile: { id: "admin-1", role: Role.ADMIN } } as CurrentUser;

    await listLabOrders(adminActor, { search: "PT-000001", status: "REVIEWED", page: 2, pageSize: 10 });

    expect(db.labOrder.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        status: "REVIEWED",
        OR: expect.arrayContaining([
          { orderNumber: { contains: "PT-000001", mode: "insensitive" } },
          { patient: { is: { patientId: { contains: "PT-000001", mode: "insensitive" } } } },
        ]),
      }),
      skip: 10,
      take: 10,
    }));
  });

  it("keeps doctor assignment scope when search filters are supplied", async () => {
    await listLabOrders(doctorActor, { search: "LAB-", page: 1, pageSize: 10 });

    expect(db.labOrder.findMany.mock.calls[0]![0].where.patient.appointments.some.doctor.staffProfileId)
      .toBe("doctor-1");
  });
});

describe("lab order assignment and release authorization", () => {
  it("does not let a doctor review an order for an unassigned patient", async () => {
    db.labOrder.findFirst.mockResolvedValue(null);

    await expect(changeLabOrderStatus(doctorActor, "lab-order-other", statusInput)).rejects.toThrow("Lab order not found");
    expect(db.labOrder.findFirst).toHaveBeenCalledWith({
      where: {
        id: "lab-order-other",
        patient: {
          appointments: {
            some: {
              doctor: { staffProfileId: "doctor-1" },
              status: { notIn: ["CANCELLED", "NO_SHOW", "REQUESTED"] },
            },
          },
        },
      },
      include: { items: true },
    });
    expect(tx.labOrder.update).not.toHaveBeenCalled();
  });

  it("requires a lab technician to handle sample-state changes", async () => {
    db.labOrder.findFirst.mockResolvedValue({
      id: "lab-order-1",
      status: "ORDERED",
      orderedById: "doctor-1",
      items: [],
    });

    await expect(changeLabOrderStatus(doctorActor, "lab-order-1", {
      fromStatus: "ORDERED",
      toStatus: "SAMPLE_COLLECTED",
      reason: "",
    })).rejects.toThrow();
    expect(tx.labOrder.update).not.toHaveBeenCalled();
  });

  it("records reviewer and status history when a doctor releases completed results", async () => {
    db.labOrder.findFirst.mockResolvedValue({
      id: "lab-order-1",
      status: "COMPLETED",
      orderedById: "doctor-2",
      items: [{ resultValue: "5.2" }],
    });

    await changeLabOrderStatus(doctorActor, "lab-order-1", statusInput);

    expect(tx.labOrder.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "lab-order-1", status: "COMPLETED" },
      data: expect.objectContaining({ status: "REVIEWED", reviewedById: "doctor-1", reviewedAt: expect.any(Date) }),
    }));
    expect(tx.labOrderStatusHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ labOrderId: "lab-order-1", fromStatus: "COMPLETED", toStatus: "REVIEWED" }),
    });
  });

  it("refuses completion unless every test line has a result", async () => {
    db.labOrder.findFirst.mockResolvedValue({
      id: "lab-order-1",
      status: "PROCESSING",
      orderedById: "doctor-1",
      items: [{ resultValue: "5.2" }, { resultValue: null }],
    });

    await expect(changeLabOrderStatus(labActor, "lab-order-1", {
      fromStatus: "PROCESSING",
      toStatus: "COMPLETED",
      reason: "",
    })).rejects.toThrow("Enter a result for every test");
    expect(tx.labOrder.update).not.toHaveBeenCalled();
  });

  it("reports a refresh conflict when the status changed concurrently in the database", async () => {
    db.labOrder.findFirst.mockResolvedValue({
      id: "lab-order-1",
      status: "COMPLETED",
      orderedById: "doctor-2",
      items: [{ resultValue: "5.2" }],
    });
    const missingAtUpdate = new Prisma.PrismaClientKnownRequestError("Record was concurrently changed", {
      code: "P2025",
      clientVersion: "test",
    });
    tx.labOrder.update.mockRejectedValue(missingAtUpdate);

    await expect(changeLabOrderStatus(doctorActor, "lab-order-1", statusInput)).rejects.toThrow(
      "status changed since you loaded it",
    );
    expect(tx.labOrderStatusHistory.create).not.toHaveBeenCalled();
  });
});

describe("laboratory report uploads", () => {
  it("uploads an allowed report through private storage and records metadata", async () => {
    const file = new File(["synthetic PDF content"], "synthetic-result.pdf", { type: "application/pdf" });

    await addLabReport(labActor, "lab-order-1", file);

    expect(uploadLabReport).toHaveBeenCalledWith("lab-order-1", file);
    expect(db.labReport.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        labOrderId: "lab-order-1",
        fileName: "synthetic-result.pdf",
        storagePath: "lab-reports/lab-order-1/synthetic.pdf",
        uploadedById: "lab-tech-1",
      }),
    });
  });

  it("rejects unsupported report types before storage upload", async () => {
    const file = new File(["synthetic content"], "result.txt", { type: "text/plain" });

    await expect(addLabReport(labActor, "lab-order-1", file)).rejects.toThrow("Only PDF, PNG or JPEG");
    expect(uploadLabReport).not.toHaveBeenCalled();
    expect(db.labReport.create).not.toHaveBeenCalled();
  });
});
