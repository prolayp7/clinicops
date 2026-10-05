import { describe, expect, it } from "vitest";
import {
  buildDemoAppointments,
  buildDemoDoctors,
  buildDemoNurseAssignments,
  buildDemoNurses,
  buildDemoPatients,
  demoRecordId,
  DEMO_DOCTOR_COUNT,
  DEMO_NURSE_COUNT,
  DEMO_OTHER_STAFF_COUNT,
  DEMO_PATIENT_COUNT,
  syntheticPersonName,
} from "../../prisma/demo-seed-data";

describe("demo seed data", () => {
  const today = new Date("2026-10-05T12:00:00.000Z");

  it("generates exactly 2,000 synthetic patients with stable identifiers", () => {
    const firstRun = buildDemoPatients(DEMO_PATIENT_COUNT, today);
    const secondRun = buildDemoPatients(DEMO_PATIENT_COUNT, today);

    expect(firstRun).toHaveLength(2000);
    expect(new Set(firstRun.map((patient) => patient.patientId)).size).toBe(2000);
    expect(new Set(firstRun.map((patient) => patient.normalizedPhone)).size).toBe(2000);
    expect(firstRun[0]?.email).toBe("demo-patient-0001@example.test");
    expect(firstRun[0]?.patientId).toBe("DEMO-CLINICOPS-00001");
    expect(firstRun[0]?.phone).toBe("202-555-0100");
    expect(firstRun[0]?.firstName).not.toBe("Demo");
    expect(new Set(firstRun.map((patient) => `${patient.firstName} ${patient.lastName}`)).size).toBe(2000);
    expect(firstRun).toEqual(secondRun);
  });

  it("creates stable appointment ids and a varied dashboard-ready schedule", () => {
    const patients = buildDemoPatients(2000, today);
    const patientIds = patients.map((patient) => patient.patientId);
    const appointments = buildDemoAppointments(
      patientIds,
      [{ id: "doctor-a", slotDurationMinutes: 30 }, { id: "doctor-b", slotDurationMinutes: 30 }],
      today,
    );
    const todayAppointments = appointments.filter((appointment) => appointment.date.getTime() === Date.UTC(2026, 9, 5));

    expect(appointments).toHaveLength(2000);
    expect(todayAppointments).toHaveLength(8);
    expect(new Set(appointments.map((appointment) => appointment.id)).size).toBe(2000);
    expect(todayAppointments.map((appointment) => appointment.status)).toContain("CHECKED_IN");
    expect(appointments.some((appointment) => appointment.status === "COMPLETED")).toBe(true);
    expect(appointments.some((appointment) => appointment.status === "REQUESTED")).toBe(true);
    expect(demoRecordId("appointment:DEMO-CLINICOPS-00001")).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("generates 1,500 fictional doctors across multiple specialties and email domains", () => {
    const doctors = buildDemoDoctors();

    expect(doctors).toHaveLength(DEMO_DOCTOR_COUNT);
    expect(new Set(doctors.map((doctor) => doctor.email)).size).toBe(DEMO_DOCTOR_COUNT);
    expect(new Set(doctors.map((doctor) => doctor.licenseNumber)).size).toBe(DEMO_DOCTOR_COUNT);
    expect(new Set(doctors.map((doctor) => doctor.specialization)).size).toBeGreaterThan(1);
    expect(new Set(doctors.map((doctor) => doctor.email.split("@")[1])).size).toBe(3);
    expect(doctors[0]?.email).toBe("doctor@example.test");
    expect(doctors[0]?.fullName).not.toContain("Demo Doctor");
    expect(new Set(doctors.map((doctor) => doctor.fullName)).size).toBe(DEMO_DOCTOR_COUNT);
  });

  it("generates 3,500 nurses with unique profiles, varied shifts and departments", () => {
    const nurses = buildDemoNurses();

    expect(nurses).toHaveLength(DEMO_NURSE_COUNT);
    expect(new Set(nurses.map((nurse) => nurse.email)).size).toBe(DEMO_NURSE_COUNT);
    expect(new Set(nurses.map((nurse) => nurse.fullName)).size).toBe(DEMO_NURSE_COUNT);
    expect(new Set(nurses.map((nurse) => nurse.employeeNumber)).size).toBe(DEMO_NURSE_COUNT);
    expect(new Set(nurses.map((nurse) => nurse.department)).size).toBeGreaterThan(1);
    expect(new Set(nurses.map((nurse) => nurse.shiftStartTime)).size).toBeGreaterThan(1);
    expect(nurses[0]?.email).toBe("nurse@example.test");
  });

  it("assigns every seeded nurse to a synthetic visit with matching workflow status", () => {
    const nurses = buildDemoNurses();
    const assignments = buildDemoNurseAssignments(
      [
        { id: "appt-today", status: "SCHEDULED", date: today },
        { id: "appt-waiting", status: "WAITING", date: today },
        { id: "appt-done", status: "COMPLETED", date: today },
        { id: "appt-cancelled", status: "CANCELLED", date: today },
      ],
      nurses.map((nurse, index) => `nurse-profile-${index}`),
    );

    expect(assignments).toHaveLength(DEMO_NURSE_COUNT);
    expect(new Set(assignments.map((assignment) => assignment.nurseProfileId)).size).toBe(DEMO_NURSE_COUNT);
    expect(assignments[0]?.status).toBe("ASSIGNED");
    expect(assignments[1]?.status).toBe("IN_PROGRESS");
    expect(assignments[2]?.status).toBe("COMPLETED");
    expect(assignments.every((assignment) => assignment.appointmentId !== "appt-cancelled")).toBe(true);
  });

  it("generates stable, varied names for the non-doctor staff accounts", () => {
    const staffNames = Array.from({ length: DEMO_OTHER_STAFF_COUNT }, (_, index) => {
      const person = syntheticPersonName(DEMO_DOCTOR_COUNT + index);
      return `${person.firstName} ${person.lastName}`;
    });

    expect(new Set(staffNames).size).toBe(DEMO_OTHER_STAFF_COUNT);
    expect(staffNames.every((name) => !name.includes("Demo"))).toBe(true);
    expect(staffNames).toEqual(Array.from({ length: DEMO_OTHER_STAFF_COUNT }, (_, index) => {
      const person = syntheticPersonName(DEMO_DOCTOR_COUNT + index);
      return `${person.firstName} ${person.lastName}`;
    }));
  });

  it("distributes appointments across the seeded doctor roster", () => {
    const doctors = buildDemoDoctors();
    const patients = buildDemoPatients(DEMO_DOCTOR_COUNT, today);
    const appointments = buildDemoAppointments(
      patients.map((patient) => patient.patientId!),
      doctors.map((doctor, index) => ({ id: `doctor-${index}`, slotDurationMinutes: doctor.slotDurationMinutes })),
      today,
    );

    expect(new Set(appointments.map((appointment) => appointment.doctorId)).size).toBe(DEMO_DOCTOR_COUNT);
  });

  it("moves generated appointments around active reserved slots", () => {
    const patientId = "patient-1";
    const appointment = buildDemoAppointments(
      [patientId],
      [{ id: "doctor-1", slotDurationMinutes: 30 }],
      today,
      [{
        doctorId: "doctor-1",
        date: today,
        startTime: new Date(Date.UTC(1970, 0, 1, 8)),
        endTime: new Date(Date.UTC(1970, 0, 1, 8, 30)),
        status: "COMPLETED",
      }],
    )[0]!;

    expect(appointment.startTime).toEqual(new Date(Date.UTC(1970, 0, 1, 8, 30)));
  });

  it("allows a slot occupied only by a cancelled appointment", () => {
    const appointment = buildDemoAppointments(
      ["patient-1"],
      [{ id: "doctor-1", slotDurationMinutes: 30 }],
      today,
      [{
        doctorId: "doctor-1",
        date: today,
        startTime: new Date(Date.UTC(1970, 0, 1, 8)),
        endTime: new Date(Date.UTC(1970, 0, 1, 8, 30)),
        status: "CANCELLED",
      }],
    )[0]!;

    expect(appointment.startTime).toEqual(new Date(Date.UTC(1970, 0, 1, 8)));
  });
});