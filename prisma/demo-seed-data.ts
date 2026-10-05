import { createHash } from "node:crypto";
import type { AppointmentSource, AppointmentStatus, Prisma } from "@prisma/client";

export const DEMO_PATIENT_COUNT = 2000;
export const DEMO_DOCTOR_COUNT = 1500;
export const DEMO_NURSE_COUNT = 3500;
export const DEMO_OTHER_STAFF_COUNT = 6;
const DEMO_AREA_CODES = [
  "202", "203", "206", "212", "213", "214", "215", "216", "217", "218",
  "301", "302", "303", "305", "310", "312", "313", "315", "317", "323",
];
export const DEMO_DEPARTMENTS = [
  "Demo Primary Care",
  "Demo Surgical Services",
  "Demo Diagnostic Services",
  "Demo Women's and Children's Health",
  "Demo Behavioral Health",
] as const;
export const DEMO_SPECIALTIES = [
  { name: "Demo General Practice", department: DEMO_DEPARTMENTS[0] },
  { name: "Demo Cardiology", department: DEMO_DEPARTMENTS[0] },
  { name: "Demo Dermatology", department: DEMO_DEPARTMENTS[0] },
  { name: "Demo Endocrinology", department: DEMO_DEPARTMENTS[0] },
  { name: "Demo Gastroenterology", department: DEMO_DEPARTMENTS[0] },
  { name: "Demo Neurology", department: DEMO_DEPARTMENTS[0] },
  { name: "Demo Orthopedics", department: DEMO_DEPARTMENTS[1] },
  { name: "Demo Urology", department: DEMO_DEPARTMENTS[1] },
  { name: "Demo Radiology", department: DEMO_DEPARTMENTS[2] },
  { name: "Demo Pathology", department: DEMO_DEPARTMENTS[2] },
  { name: "Demo Pediatrics", department: DEMO_DEPARTMENTS[3] },
  { name: "Demo Obstetrics and Gynecology", department: DEMO_DEPARTMENTS[3] },
  { name: "Demo Psychiatry", department: DEMO_DEPARTMENTS[4] },
  { name: "Demo Psychology", department: DEMO_DEPARTMENTS[4] },
  { name: "Demo Pulmonology", department: DEMO_DEPARTMENTS[0] },
];
const DEMO_EMAIL_DOMAINS = ["example.test", "example.net", "example.org"] as const;
const FIRST_NAMES = [
  "Aiden", "Alex", "Amara", "Andre", "Anika", "Ari", "Avery", "Bailey", "Cameron", "Casey",
  "Chloe", "Daniel", "Devon", "Dylan", "Eden", "Elena", "Ellis", "Emery", "Farah", "Gabriel",
  "Hana", "Harper", "Imani", "Jamie", "Jordan", "Jules", "Kai", "Leila", "Luca", "Maya",
  "Micah", "Morgan", "Nia", "Noah", "Owen", "Quinn", "Riley", "Rowan", "Sage", "Talia",
  "Andrea", "Bianca", "Clara", "Elias", "Fiona", "Grace", "Hugo", "Iris", "Kieran", "Miles",
];
const LAST_NAMES = [
  "Adams", "Bennett", "Brooks", "Campbell", "Carter", "Chen", "Clark", "Cole", "Collins", "Cook",
  "Cooper", "Cruz", "Davis", "Edwards", "Ellis", "Evans", "Flores", "Foster", "Garcia", "Gray",
  "Green", "Hall", "Harris", "Hayes", "Hill", "Howard", "Jackson", "James", "Johnson", "Jones",
  "Kim", "King", "Lee", "Lewis", "Long", "Martin", "Mitchell", "Morgan", "Moore", "Nguyen",
];
const MIDDLE_INITIALS = ["A", "J", "R"] as const;
const NAME_COMBINATIONS = FIRST_NAMES.length * LAST_NAMES.length * MIDDLE_INITIALS.length;

export function syntheticPersonName(index: number): { firstName: string; lastName: string } {
  const shuffled = ((index * 1601 + 137) % NAME_COMBINATIONS + NAME_COMBINATIONS) % NAME_COMBINATIONS;
  const firstName = FIRST_NAMES[Math.floor(shuffled / (LAST_NAMES.length * MIDDLE_INITIALS.length))]!;
  const middleInitial = MIDDLE_INITIALS[Math.floor(shuffled / LAST_NAMES.length) % MIDDLE_INITIALS.length]!;
  const lastName = LAST_NAMES[shuffled % LAST_NAMES.length]!;
  return { firstName: `${firstName} ${middleInitial}.`, lastName };
}

export type DemoDoctorSeed = {
  email: string;
  fullName: string;
  licenseNumber: string;
  phone: string;
  department: string;
  specialization: string;
  consultationFeeCents: number;
  slotDurationMinutes: number;
};

export type DemoNurseSeed = {
  email: string;
  fullName: string;
  employeeNumber: string;
  department: string;
  qualifications: string[];
  shiftStartTime: string;
  shiftEndTime: string;
};

export function buildDemoNurses(count = DEMO_NURSE_COUNT): DemoNurseSeed[] {
  return Array.from({ length: count }, (_, index) => {
    const number = index + 1;
    const person = syntheticPersonName(DEMO_DOCTOR_COUNT + DEMO_OTHER_STAFF_COUNT + DEMO_PATIENT_COUNT + index);
    const domainIndex = Math.floor(index / Math.ceil(count / DEMO_EMAIL_DOMAINS.length));
    return {
      email: index === 0
        ? "nurse@example.test"
        : `demo-nurse-${String(number).padStart(4, "0")}@${DEMO_EMAIL_DOMAINS[domainIndex]!}`,
      fullName: `${person.firstName} ${person.lastName}`,
      employeeNumber: `DEMO-RN-${String(number).padStart(5, "0")}`,
      department: DEMO_DEPARTMENTS[index % DEMO_DEPARTMENTS.length]!,
      qualifications: [
        index % 2 === 0 ? "Synthetic Registered Nurse credential" : "Synthetic Licensed Practical Nurse credential",
        "Synthetic Basic Life Support credential",
      ],
      shiftStartTime: index % 3 === 0 ? "07:00" : "08:00",
      shiftEndTime: index % 3 === 0 ? "15:00" : "16:00",
    };
  });
}

export function buildDemoDoctors(count = DEMO_DOCTOR_COUNT): DemoDoctorSeed[] {
  return Array.from({ length: count }, (_, index) => {
    const number = index + 1;
    const person = syntheticPersonName(index);
    const specialty = DEMO_SPECIALTIES[index % DEMO_SPECIALTIES.length]!;
    const domainIndex = Math.floor(index / Math.ceil(count / DEMO_EMAIL_DOMAINS.length));
    const email = index === 0
      ? "doctor@example.test"
      : `demo-doctor-${String(number).padStart(4, "0")}@${DEMO_EMAIL_DOMAINS[domainIndex]!}`;

    return {
      email,
      fullName: `Dr. ${person.firstName} ${person.lastName}`,
      licenseNumber: `DEMO-LICENSE-${String(number).padStart(4, "0")}`,
      phone: `${DEMO_AREA_CODES[Math.floor(index / 100)]}-555-${String(100 + (index % 100)).padStart(4, "0")}`,
      department: specialty.department,
      specialization: specialty.name,
      consultationFeeCents: 6500 + (index % 9) * 500,
      slotDurationMinutes: 30,
    };
  });
}

export function demoRecordId(key: string): string {
  const bytes = createHash("sha256").update(`clinicops-demo:${key}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function utcStartOfDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

export function buildDemoPatients(
  count = DEMO_PATIENT_COUNT,
  today = new Date(),
): Prisma.PatientCreateManyInput[] {
  return Array.from({ length: count }, (_, index) => {
    const number = index + 1;
    const person = syntheticPersonName(DEMO_DOCTOR_COUNT + DEMO_OTHER_STAFF_COUNT + index);
    const year = today.getUTCFullYear() - 18 - (index % 58);
    const month = index % 12;
    const day = (index % 27) + 1;
    const phone = `${DEMO_AREA_CODES[Math.floor(index / 100)]}-555-${String(100 + (index % 100)).padStart(4, "0")}`;
    const contact = syntheticPersonName(DEMO_DOCTOR_COUNT + DEMO_OTHER_STAFF_COUNT + DEMO_PATIENT_COUNT + index);

    return {
      patientId: `DEMO-CLINICOPS-${String(number).padStart(5, "0")}`,
      firstName: person.firstName,
      lastName: person.lastName,
      dateOfBirth: new Date(Date.UTC(year, month, day)),
      sex: index % 3 === 0 ? "UNKNOWN" : index % 2 === 0 ? "FEMALE" : "MALE",
      phone,
      normalizedPhone: phone.replace(/\D/g, ""),
      email: `demo-patient-${String(number).padStart(4, "0")}@example.test`,
      normalizedEmail: `demo-patient-${String(number).padStart(4, "0")}@example.test`,
      addressLine1: `${100 + (index % 900)} Demo Way`,
      city: "Testville",
      state: "ZZ",
      postalCode: "00000",
      country: "US",
      emergencyContactName: `${contact.firstName} ${contact.lastName}`,
      emergencyContactPhone: phone,
      emergencyContactRelationship: "Demo contact",
      allergies: [],
      previousDiagnoses: [],
      currentMedications: [],
    };
  });
}

export type DemoDoctor = { id: string; slotDurationMinutes: number };

export type DemoAppointment = {
  id: string;
  patientId: string;
  doctorId: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  reason: string;
  status: AppointmentStatus;
  source: AppointmentSource;
  seedIndex: number;
};

export type DemoAppointmentReservation = Pick<DemoAppointment, "doctorId" | "date" | "startTime" | "endTime" | "status">;

export type DemoNurseAssignment = {
  id: string;
  nurseProfileId: string;
  appointmentId: string;
  status: "ASSIGNED" | "IN_PROGRESS" | "COMPLETED";
  appointmentDate: Date;
};

export function buildDemoNurseAssignments(
  appointments: Pick<DemoAppointment, "id" | "status" | "date">[],
  nurseProfileIds: string[],
): DemoNurseAssignment[] {
  if (nurseProfileIds.length === 0) return [];
  const activeAppointments = appointments.filter((appointment) =>
    appointment.status !== "CANCELLED" && appointment.status !== "NO_SHOW",
  );
  if (activeAppointments.length === 0) throw new Error("At least one active appointment is required for nurse assignments.");

  return nurseProfileIds.map((nurseProfileId, index) => {
    const appointment = activeAppointments[index % activeAppointments.length]!;
    const status = appointment.status === "COMPLETED"
      ? "COMPLETED"
      : appointment.status === "CHECKED_IN" || appointment.status === "WAITING" || appointment.status === "IN_CONSULTATION"
        ? "IN_PROGRESS"
        : "ASSIGNED";

    return {
      id: demoRecordId(`nurse-assignment:${nurseProfileId}:${appointment.id}`),
      nurseProfileId,
      appointmentId: appointment.id,
      status,
      appointmentDate: appointment.date,
    };
  });
}

const TODAY_STATUSES: AppointmentStatus[] = [
  "SCHEDULED",
  "CONFIRMED",
  "CHECKED_IN",
  "WAITING",
  "IN_CONSULTATION",
  "COMPLETED",
  "NO_SHOW",
  "CANCELLED",
];

function statusForSeedIndex(index: number): AppointmentStatus {
  if (index < TODAY_STATUSES.length) return TODAY_STATUSES[index]!;
  if (index < 1700) {
    if (index % 31 === 0) return "CANCELLED";
    if (index % 29 === 0) return "NO_SHOW";
    return "COMPLETED";
  }
  if (index % 17 === 0) return "CANCELLED";
  if (index % 13 === 0) return "REQUESTED";
  return index % 2 === 0 ? "CONFIRMED" : "SCHEDULED";
}

export function buildDemoAppointments(
  patientIds: string[],
  doctors: DemoDoctor[],
  today = new Date(),
  reservations: DemoAppointmentReservation[] = [],
): DemoAppointment[] {
  if (doctors.length === 0) throw new Error("At least one active doctor is required to seed appointments.");

  const startOfToday = utcStartOfDay(today);
  const ordinalByDoctorAndOffset = new Map<string, number>();
  const occupiedByDoctorAndDate = new Map<string, Array<{ start: number; end: number }>>();
  const makeScheduleKey = (doctorId: string, date: Date) => `${doctorId}:${date.toISOString().slice(0, 10)}`;
  const timeToMinutes = (time: Date) => time.getUTCHours() * 60 + time.getUTCMinutes();

  for (const reservation of reservations) {
    if (reservation.status === "CANCELLED" || reservation.status === "NO_SHOW") continue;
    const key = makeScheduleKey(reservation.doctorId, reservation.date);
    const intervals = occupiedByDoctorAndDate.get(key) ?? [];
    intervals.push({ start: timeToMinutes(reservation.startTime), end: timeToMinutes(reservation.endTime) });
    occupiedByDoctorAndDate.set(key, intervals);
  }

  return patientIds.map((patientId, index) => {
    const offsetDays = index < TODAY_STATUSES.length
      ? 0
      : index < 1700
        ? -1 - ((index - TODAY_STATUSES.length) % 180)
        : 1 + ((index - 1700) % 30);
    const doctor = doctors[index % doctors.length]!;
    const appointmentDate = new Date(startOfToday.getTime() + offsetDays * 86_400_000);
    const scheduleKey = makeScheduleKey(doctor.id, appointmentDate);
    let slotIndex = ordinalByDoctorAndOffset.get(scheduleKey) ?? 0;
    const status = statusForSeedIndex(index);
    let minuteOfDay = 8 * 60 + slotIndex * doctor.slotDurationMinutes;
    let intervals = occupiedByDoctorAndDate.get(scheduleKey) ?? [];
    while (
      status !== "CANCELLED" && status !== "NO_SHOW" &&
      intervals.some((interval) => minuteOfDay < interval.end && minuteOfDay + doctor.slotDurationMinutes > interval.start)
    ) {
      slotIndex += 1;
      minuteOfDay = 8 * 60 + slotIndex * doctor.slotDurationMinutes;
      if (minuteOfDay + doctor.slotDurationMinutes > 24 * 60) {
        throw new Error(`No open synthetic appointment slot remains for doctor ${doctor.id} on ${appointmentDate.toISOString().slice(0, 10)}.`);
      }
    }
    ordinalByDoctorAndOffset.set(scheduleKey, slotIndex + 1);
    const startTime = new Date(Date.UTC(1970, 0, 1, Math.floor(minuteOfDay / 60), minuteOfDay % 60));
    const endTime = new Date(startTime.getTime() + doctor.slotDurationMinutes * 60_000);
    if (status !== "CANCELLED" && status !== "NO_SHOW") {
      intervals.push({ start: minuteOfDay, end: minuteOfDay + doctor.slotDurationMinutes });
      occupiedByDoctorAndDate.set(scheduleKey, intervals);
    }

    return {
      id: demoRecordId(`appointment:${patientId}`),
      patientId,
      doctorId: doctor.id,
      date: appointmentDate,
      startTime,
      endTime,
      reason: `Synthetic demo visit ${String(index + 1).padStart(4, "0")}`,
      status,
      source: status === "REQUESTED"
        ? "ONLINE_REQUEST"
        : status === "CHECKED_IN" || status === "WAITING"
          ? "WALK_IN"
          : "STAFF_BOOKED",
      seedIndex: index,
    };
  });
}