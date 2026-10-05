import { beforeEach, describe, expect, it, vi } from "vitest";
import { Role } from "@prisma/client";
import type { CurrentUser } from "@/lib/auth/session";

vi.mock("server-only", () => ({}));
const db = vi.hoisted(() => ({
  doctor: { findUnique: vi.fn() },
  doctorAvailability: { findMany: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
  doctorLeave: { findMany: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
}));
vi.mock("@/lib/db/prisma", () => ({ prisma: db }));

const recordAuditEvent = vi.hoisted(() => vi.fn());
vi.mock("@/server/services/audit-service", () => ({ recordAuditEvent }));

import {
  addAvailabilitySlot,
  addLeave,
  removeAvailabilitySlot,
  removeLeave,
} from "@/server/services/doctor-schedule-service";

const actor = (role: Role, id = "doctor-1") => ({ profile: { id, role } }) as CurrentUser;
const doctor = (staffProfileId = "doctor-1") => ({ id: "doctor-1-record", staffProfileId });

beforeEach(() => {
  vi.clearAllMocks();
  db.doctor.findUnique.mockResolvedValue(doctor());
  db.doctorAvailability.findMany.mockResolvedValue([]);
  db.doctorAvailability.deleteMany.mockResolvedValue({ count: 1 });
  db.doctorLeave.findMany.mockResolvedValue([]);
  db.doctorLeave.deleteMany.mockResolvedValue({ count: 1 });
});

describe("doctor schedule ownership", () => {
  it("allows a doctor to add availability to their linked profile and audits it", async () => {
    await addAvailabilitySlot(actor(Role.DOCTOR), "doctor-1-record", {
      weekday: "MONDAY",
      startTime: "09:00",
      endTime: "12:00",
    });

    expect(db.doctorAvailability.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ doctorId: "doctor-1-record", weekday: "MONDAY" }),
    });
    expect(recordAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      action: "doctor_availability.added",
      entityId: "doctor-1-record",
    }));
  });

  it("scopes availability deletion to the requested doctor", async () => {
    await removeAvailabilitySlot(actor(Role.DOCTOR), "doctor-1-record", "slot-1");

    expect(db.doctorAvailability.deleteMany).toHaveBeenCalledWith({
      where: { id: "slot-1", doctorId: "doctor-1-record" },
    });
  });

  it("does not delete another doctor's availability by substituting a slot id", async () => {
    db.doctorAvailability.deleteMany.mockResolvedValue({ count: 0 });

    await expect(
      removeAvailabilitySlot(actor(Role.DOCTOR), "doctor-1-record", "slot-owned-by-doctor-2"),
    ).rejects.toThrow("Availability block not found for this doctor");
    expect(recordAuditEvent).not.toHaveBeenCalled();
  });

  it("denies a doctor before attempting to remove another doctor's schedule", async () => {
    db.doctor.findUnique.mockResolvedValue(doctor("doctor-2"));

    await expect(
      removeAvailabilitySlot(actor(Role.DOCTOR, "doctor-1"), "doctor-2-record", "slot-2"),
    ).rejects.toThrow();
    expect(db.doctorAvailability.deleteMany).not.toHaveBeenCalled();
  });

  it("scopes leave deletion to the requested doctor", async () => {
    await removeLeave(actor(Role.ADMIN), "doctor-1-record", "leave-1");

    expect(db.doctorLeave.deleteMany).toHaveBeenCalledWith({
      where: { id: "leave-1", doctorId: "doctor-1-record" },
    });
  });

  it("does not audit a leave deletion when the id belongs to another doctor", async () => {
    db.doctorLeave.deleteMany.mockResolvedValue({ count: 0 });

    await expect(removeLeave(actor(Role.ADMIN), "doctor-1-record", "leave-owned-by-doctor-2")).rejects.toThrow(
      "Leave entry not found for this doctor",
    );
    expect(recordAuditEvent).not.toHaveBeenCalled();
  });

  it("denies schedule writes to roles without schedule permission", async () => {
    await expect(
      addAvailabilitySlot(actor(Role.RECEPTIONIST), "doctor-1-record", {
        weekday: "MONDAY",
        startTime: "09:00",
        endTime: "12:00",
      }),
    ).rejects.toThrow();
    expect(db.doctorAvailability.create).not.toHaveBeenCalled();
  });
});

describe("doctor schedule conflict validation", () => {
  it("rejects overlapping weekly availability without creating a block", async () => {
    db.doctorAvailability.findMany.mockResolvedValue([
      { weekday: "MONDAY", startTime: new Date("1970-01-01T09:00:00.000Z"), endTime: new Date("1970-01-01T12:00:00.000Z") },
    ]);

    await expect(
      addAvailabilitySlot(actor(Role.ADMIN), "doctor-1-record", {
        weekday: "MONDAY",
        startTime: "11:00",
        endTime: "13:00",
      }),
    ).rejects.toThrow("overlaps an existing availability block");
    expect(db.doctorAvailability.create).not.toHaveBeenCalled();
  });

  it("rejects overlapping leave dates without creating a leave entry", async () => {
    db.doctorLeave.findMany.mockResolvedValue([
      { startDate: new Date("2026-10-10T00:00:00.000Z"), endDate: new Date("2026-10-12T00:00:00.000Z") },
    ]);

    await expect(
      addLeave(actor(Role.ADMIN), "doctor-1-record", {
        startDate: "2026-10-12",
        endDate: "2026-10-15",
        reason: "Leave",
      }),
    ).rejects.toThrow("overlaps an existing leave/blocked date range");
    expect(db.doctorLeave.create).not.toHaveBeenCalled();
  });

  it("allows a valid leave range and records an audit event", async () => {
    await addLeave(actor(Role.ADMIN), "doctor-1-record", {
      startDate: "2026-10-10",
      endDate: "2026-10-12",
      reason: "Annual leave",
    });

    expect(db.doctorLeave.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ doctorId: "doctor-1-record", reason: "Annual leave" }),
    });
    expect(recordAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      action: "doctor_leave.added",
      entityId: "doctor-1-record",
    }));
  });
});