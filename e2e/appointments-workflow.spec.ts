import { randomUUID } from "node:crypto";
import { PrismaClient, Role, Sex, StaffStatus } from "@prisma/client";
import { expect, test } from "@playwright/test";
import { weekdayFromDateString } from "@/lib/appointments";

const prisma = new PrismaClient();
const appointmentTimeZone = process.env.CLINIC_TIMEZONE ?? "America/New_York";
const appointmentDateParts = new Intl.DateTimeFormat("en-US", {
  timeZone: appointmentTimeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).formatToParts(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000));
const appointmentDateValue = (type: string) => appointmentDateParts.find((part) => part.type === type)?.value ?? "";
const appointmentDate = `${appointmentDateValue("year")}-${appointmentDateValue("month")}-${appointmentDateValue("day")}`;
const syntheticSuffix = randomUUID().slice(0, 8);
const doctorName = `E2E Synthetic Doctor ${syntheticSuffix}`;
const patientFirstName = "Synthetic";
const patientLastName = `Appointment ${syntheticSuffix}`;
const patientIdLabel = `PT-E2E-${syntheticSuffix.toUpperCase()}`;
let staffProfileId: string | undefined;
let doctorId: string | undefined;
let patientId: string | undefined;
let departmentId: string | undefined;
let specializationId: string | undefined;

// Isolated, clearly fictional fixtures. The patient and linked staff profile are soft-archived
// after the browser workflow; the appointment remains as a cancelled synthetic audit record.
test.beforeAll(async () => {
  const staff = await prisma.staffProfile.create({
    data: {
      id: randomUUID(),
      email: `e2e.doctor.${syntheticSuffix}@example.test`,
      fullName: doctorName,
      role: Role.DOCTOR,
    },
  });
  staffProfileId = staff.id;

  const department = await prisma.department.upsert({
    where: { name: "E2E Synthetic Department" },
    create: { name: "E2E Synthetic Department" },
    update: { status: "ACTIVE", archivedAt: null },
  });
  const specialization = await prisma.specialization.upsert({
    where: { name: "E2E Synthetic Specialty" },
    create: { name: "E2E Synthetic Specialty" },
    update: { status: "ACTIVE", archivedAt: null },
  });
  departmentId = department.id;
  specializationId = specialization.id;

  const doctor = await prisma.doctor.create({
    data: {
      staffProfileId: staff.id,
      fullName: doctorName,
      email: staff.email,
      phone: "555-0100",
      licenseNumber: `E2E-${syntheticSuffix}`,
      departmentId: department.id,
      specializationId: specialization.id,
      qualifications: ["MD"],
      consultationFeeCents: 15000,
      slotDurationMinutes: 30,
    },
  });
  doctorId = doctor.id;

  await prisma.doctorAvailability.create({
    data: {
      doctorId: doctor.id,
      weekday: weekdayFromDateString(appointmentDate),
      startTime: new Date("1970-01-01T09:00:00.000Z"),
      endTime: new Date("1970-01-01T12:00:00.000Z"),
    },
  });

  const patient = await prisma.patient.create({
    data: {
      patientId: patientIdLabel,
      firstName: patientFirstName,
      lastName: patientLastName,
      dateOfBirth: new Date("1990-06-15T00:00:00.000Z"),
      sex: Sex.UNKNOWN,
      phone: `+1-555-${syntheticSuffix.slice(0, 4)}-${syntheticSuffix.slice(4)}`,
      normalizedPhone: `1555${syntheticSuffix}`,
      email: `e2e.patient.${syntheticSuffix}@example.test`,
      normalizedEmail: `e2e.patient.${syntheticSuffix}@example.test`,
      allergies: [],
      previousDiagnoses: [],
      currentMedications: [],
    },
  });
  patientId = patient.id;
});

test.afterAll(async () => {
  try {
    if (patientId) {
      const unfinished = await prisma.appointment.findMany({
        where: { patientId, status: { notIn: ["COMPLETED", "CANCELLED", "NO_SHOW"] } },
        select: { id: true, status: true },
      });
      for (const appointment of unfinished) {
        await prisma.$transaction(async (tx) => {
          const updated = await tx.appointment.updateMany({
            where: { id: appointment.id, status: appointment.status },
            data: { status: "CANCELLED" },
          });
          if (updated.count === 1) {
            await tx.appointmentStatusHistory.create({
              data: {
                appointmentId: appointment.id,
                fromStatus: appointment.status,
                toStatus: "CANCELLED",
                reason: "Automated synthetic test cleanup",
                changedById: null,
              },
            });
          }
        });
      }
      await prisma.patient.update({
        where: { id: patientId },
        data: { status: "ARCHIVED", archivedAt: new Date() },
      });
    }
    if (doctorId) {
      await prisma.doctorAvailability.deleteMany({ where: { doctorId } });
      await prisma.doctor.update({
        where: { id: doctorId },
        data: { status: "ARCHIVED", archivedAt: new Date() },
      });
    }
    if (staffProfileId) {
      await prisma.staffProfile.update({
        where: { id: staffProfileId },
        data: { status: StaffStatus.ARCHIVED, archivedAt: new Date() },
      });
    }
    if (departmentId) {
      await prisma.department.update({
        where: { id: departmentId },
        data: { status: "ARCHIVED", archivedAt: new Date() },
      });
    }
    if (specializationId) {
      await prisma.specialization.update({
        where: { id: specializationId },
        data: { status: "ARCHIVED", archivedAt: new Date() },
      });
    }
  } finally {
    await prisma.$disconnect();
  }
});

test("reception books a walk-in, checks in, moves to waiting, and cancels with history", async ({ page }) => {
  test.setTimeout(90_000);
  expect(process.env.E2E_SEED_PASSWORD, "Set E2E_SEED_PASSWORD for fictional staging accounts").toBeTruthy();
  expect(patientId).toBeTruthy();
  expect(doctorId).toBeTruthy();

  await page.goto("/login");
  await page.getByLabel("Work Email", { exact: true }).fill("reception@example.test");
  await page.getByLabel("Password", { exact: true }).fill(process.env.E2E_SEED_PASSWORD!);
  await page.getByRole("button", { name: "Sign in securely" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto(`/appointments/new?date=${appointmentDate}&doctorId=${doctorId}`);
  await page.getByLabel("Patient", { exact: true }).click();
  await page.getByRole("option", { name: new RegExp(patientIdLabel) }).click();
  await page.getByLabel("Doctor", { exact: true }).click();
  await page.getByRole("option", { name: doctorName }).click();
  await page.getByLabel("Date", { exact: true }).fill(appointmentDate);
  await page.getByLabel("Start time", { exact: true }).fill("09:00");
  await page.getByLabel("Booking source", { exact: true }).click();
  await page.getByRole("option", { name: "Walk-in" }).click();
  await page.getByLabel("Reason for visit", { exact: true }).fill("Synthetic E2E appointment workflow");
  await page.getByRole("button", { name: "Book appointment" }).click();

  await expect(page).toHaveURL(/\/appointments\/[^/]+$/);
  await expect(page.getByRole("heading", { name: `${patientFirstName} ${patientLastName}` })).toBeVisible();
  await expect(page.getByText("SCHEDULED", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "Check in" }).click();
  await expect(page.getByText("CHECKED IN", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Move to waiting" }).click();
  await expect(page.getByText("WAITING", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  const cancelDialog = page.getByRole("dialog");
  await cancelDialog.getByLabel("Reason", { exact: true }).fill("Synthetic E2E cleanup");
  await cancelDialog.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByText("CANCELLED", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Synthetic E2E cleanup", { exact: true })).toBeVisible();
});
