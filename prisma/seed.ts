import { randomUUID } from "node:crypto";
import {
  AbnormalFlag,
  AppointmentStatus,
  ConsultationStatus,
  InvoiceStatus,
  LabOrderStatus,
  MealInstruction,
  PaymentMethod,
  Prisma,
  PrismaClient,
  Role,
} from "@prisma/client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import {
  buildDemoNurseAssignments,
  buildDemoNurses,
  buildDemoDoctors,
  buildDemoAppointments,
  buildDemoPatients,
  demoRecordId,
  DEMO_DEPARTMENTS,
  DEMO_DOCTOR_COUNT,
  DEMO_NURSE_COUNT,
  DEMO_PATIENT_COUNT,
  DEMO_SPECIALTIES,
  syntheticPersonName,
} from "./demo-seed-data";

const prisma = new PrismaClient();

// Fictional, de-identified seed data only. Never insert real patient or staff data here.
const DEMO_DOCTOR_FIXTURES = buildDemoDoctors();
const DEMO_NURSE_FIXTURES = buildDemoNurses();
const seededStaffName = (index: number) => {
  const person = syntheticPersonName(DEMO_DOCTOR_COUNT + index);
  return `${person.firstName} ${person.lastName}`;
};
const FICTIONAL_STAFF: Array<{ email: string; fullName: string; role: Role }> = [
  { email: "super.admin@example.test", fullName: seededStaffName(0), role: Role.SUPER_ADMIN },
  { email: "admin@example.test", fullName: seededStaffName(1), role: Role.ADMIN },
  { email: "doctor@example.test", fullName: DEMO_DOCTOR_FIXTURES[0]!.fullName, role: Role.DOCTOR },
  { email: "reception@example.test", fullName: seededStaffName(2), role: Role.RECEPTIONIST },
  { email: "nurse@example.test", fullName: DEMO_NURSE_FIXTURES[0]!.fullName, role: Role.NURSE },
  { email: "lab@example.test", fullName: seededStaffName(4), role: Role.LAB_TECHNICIAN },
  { email: "accounts@example.test", fullName: seededStaffName(5), role: Role.ACCOUNTANT },
];

// Shared password for every fictional account. Fine as a checked-in default: these are
// throwaway accounts, never real staff or patients.
const SEED_PASSWORD = process.env.E2E_SEED_PASSWORD ?? "ClinicOps-Dev-Seed-2026";
const DEMO_MEDICINES = [
  { name: "Demo medicine A", strength: "Test", form: "Demo tablet" },
  { name: "Demo medicine B", strength: "Test", form: "Demo capsule" },
  { name: "Demo medicine C", strength: "Test", form: "Demo liquid" },
];
const DEMO_LAB_TESTS = [
  { name: "Demo panel A", category: "Synthetic", priceCents: 2500, unit: "demo unit", referenceRangeText: "Synthetic reference range" },
  { name: "Demo panel B", category: "Synthetic", priceCents: 1800, unit: "demo unit", referenceRangeText: "Synthetic reference range" },
  { name: "Demo panel C", category: "Synthetic", priceCents: 3200, unit: "demo unit", referenceRangeText: "Synthetic reference range" },
];

const DEMO_BATCH_SIZE = 100;

async function transactionBatches<T>(
  rows: T[],
  write: (tx: Prisma.TransactionClient, row: T) => Promise<void>,
): Promise<void> {
  for (let offset = 0; offset < rows.length; offset += DEMO_BATCH_SIZE) {
    const batch = rows.slice(offset, offset + DEMO_BATCH_SIZE);
    await prisma.$transaction(async (tx) => {
      await Promise.all(batch.map((row) => write(tx, row)));
    }, { timeout: 120_000 });
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Seeding creates real Supabase Auth users and needs the project URL and service role key in .env.`,
    );
  }
  return value;
}

async function assertSeedSchemaReady(): Promise<void> {
  const [schemaReadiness] = await prisma.$queryRaw<Array<{
    hasNurseProfiles: boolean;
    hasNurseAssignments: boolean;
    hasVitalsRecorder: boolean;
  }>>`
    SELECT
      to_regclass('public.nurse_profiles') IS NOT NULL AS "hasNurseProfiles",
      to_regclass('public.nurse_appointment_assignments') IS NOT NULL AS "hasNurseAssignments",
      EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'consultations'
          AND column_name = 'vitalsRecordedById'
      ) AS "hasVitalsRecorder"
  `;

  if (!schemaReadiness?.hasNurseProfiles || !schemaReadiness.hasNurseAssignments || !schemaReadiness.hasVitalsRecorder) {
    throw new Error("The database is missing the nurse workflow schema. Run `npx prisma migrate deploy` before `npx prisma db seed`.");
  }
}

async function findAuthUserIdsByEmail(
  supabase: SupabaseClient,
  emails: string[],
): Promise<Map<string, string>> {
  const requested = new Set(emails);
  const found = new Map<string, string>();
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    for (const user of data.users) {
      if (user.email && requested.has(user.email)) found.set(user.email, user.id);
    }
    if (found.size === requested.size) break;
    if (data.users.length < 200) return found;
  }
  return found;
}

async function createAuthUser(supabase: SupabaseClient, email: string): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: SEED_PASSWORD,
      email_confirm: true,
    });
    if (!error) return data.user.id;

    const duplicate = error.status === 422 || /already been registered/i.test(error.message);
    if (duplicate) {
      const existing = await findAuthUserIdsByEmail(supabase, [email]);
      const existingId = existing.get(email);
      if (existingId) return existingId;
    }

    const retryable = error.status === 429 || (error.status ?? 0) >= 500;
    if (!retryable || attempt === 4) throw error;
    await new Promise<void>((resolve) => setTimeout(resolve, Math.min(8000, 500 * 2 ** attempt)));
  }
  throw new Error(`Unable to provision demo auth user ${email}.`);
}

async function seedStaffAccounts(selfhosted: boolean, supabase: SupabaseClient | null): Promise<void> {
  const passwordHash = selfhosted ? await bcrypt.hash(SEED_PASSWORD, 12) : null;
  const demoDoctors = DEMO_DOCTOR_FIXTURES;
  const staffToSeed = [
    ...FICTIONAL_STAFF,
    ...demoDoctors
      .filter((doctor) => !FICTIONAL_STAFF.some((staff) => staff.email === doctor.email))
      .map((doctor) => ({ email: doctor.email, fullName: doctor.fullName, role: Role.DOCTOR })),
    ...DEMO_NURSE_FIXTURES
      .filter((nurse) => !FICTIONAL_STAFF.some((staff) => staff.email === nurse.email))
      .map((nurse) => ({ email: nurse.email, fullName: nurse.fullName, role: Role.NURSE })),
  ];
  const emails = staffToSeed.map((staff) => staff.email);
  const existingProfiles = await prisma.staffProfile.findMany({
    where: { email: { in: emails } },
    select: { id: true, email: true, role: true, fullName: true },
  });
  const profilesByEmail = new Map(existingProfiles.map((profile) => [profile.email, profile]));
  const profilesToRename: Array<{ id: string; email: string; role: Role; fullName: string }> = [];
  const authIds = selfhosted
    ? new Map(existingProfiles.map((profile) => [profile.email, profile.id]))
    : await (async () => {
        if (!supabase) throw new Error("Supabase Auth is required to seed demo staff accounts.");
        return findAuthUserIdsByEmail(supabase, emails);
      })();

  if (selfhosted) {
    for (const staff of staffToSeed) {
      if (!authIds.has(staff.email)) authIds.set(staff.email, randomUUID());
    }
  } else {
    if (!supabase) throw new Error("Supabase Auth is required to seed demo staff accounts.");
    const missingEmails = emails.filter((email) => !authIds.has(email));
    const concurrency = 5;
    for (let offset = 0; offset < missingEmails.length; offset += concurrency) {
      const batch = missingEmails.slice(offset, offset + concurrency);
      const created = await Promise.all(batch.map(async (email) => [email, await createAuthUser(supabase, email)] as const));
      for (const [email, id] of created) authIds.set(email, id);
    }
  }

  const newProfiles = [];
  for (const staff of staffToSeed) {
    const authUserId = authIds.get(staff.email);
    if (!authUserId) throw new Error(`No auth identity was resolved for ${staff.email}.`);
    const existing = profilesByEmail.get(staff.email);
    if (existing && (existing.id !== authUserId || existing.role !== staff.role)) {
      throw new Error(`Seed staff identity mismatch for ${staff.email}; resolve it manually rather than replacing an identity.`);
    }
    if (!existing) {
      newProfiles.push({
        id: authUserId,
        ...staff,
        ...(selfhosted ? { passwordHash } : {}),
      });
    } else if (existing.fullName !== staff.fullName) {
      profilesToRename.push({ id: existing.id, email: existing.email, role: existing.role, fullName: staff.fullName });
    }
  }

  for (let offset = 0; offset < newProfiles.length; offset += 500) {
    await prisma.staffProfile.createMany({ data: newProfiles.slice(offset, offset + 500) });
  }
  await transactionBatches(profilesToRename, async (tx, profile) => {
    await tx.staffProfile.updateMany({
      where: { id: profile.id, email: profile.email, role: profile.role },
      data: { fullName: profile.fullName },
    });
  });
  console.log(`Seeded or verified ${staffToSeed.length} demo staff identities.`);
}

async function seedClinicMasters(): Promise<{
  departmentIds: Map<string, string>;
  specializationIds: Map<string, string>;
  labTestIds: string[];
  medicineIds: string[];
}> {
  await prisma.clinicSetting.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      name: "ClinicOps Demo Clinic",
      addressLine1: "100 Demo Way",
      city: "Testville",
      state: "ZZ",
      postalCode: "00000",
      country: "US",
      phone: "202-555-0100",
      email: "clinic@example.test",
      timezone: process.env.CLINIC_TIMEZONE ?? "America/New_York",
      currency: "USD",
    },
  });

  const [departments, specializations] = await Promise.all([
    Promise.all(DEMO_DEPARTMENTS.map((name) => prisma.department.upsert({
      where: { name },
      update: {},
      create: { name },
    }))),
    Promise.all(DEMO_SPECIALTIES.map(({ name }) => prisma.specialization.upsert({
      where: { name },
      update: {},
      create: { name },
    }))),
  ]);

  const medicines = await Promise.all(DEMO_MEDICINES.map((medicine) =>
    prisma.medicine.upsert({
      where: { name_strength_form: medicine },
      update: {},
      create: medicine,
    }),
  ));
  const labTests = await Promise.all(DEMO_LAB_TESTS.map((test) =>
    prisma.labTest.upsert({
      where: { name_category: { name: test.name, category: test.category } },
      update: {},
      create: test,
    }),
  ));

  return {
    departmentIds: new Map(departments.map((department) => [department.name, department.id])),
    specializationIds: new Map(specializations.map((specialization) => [specialization.name, specialization.id])),
    medicineIds: medicines.map((medicine) => medicine.id),
    labTestIds: labTests.map((test) => test.id),
  };
}

async function getSeedDoctors(
  allowDemoDoctorProfiles: boolean,
  masters: Awaited<ReturnType<typeof seedClinicMasters>>,
) {
  const doctorStaff = await prisma.staffProfile.findMany({
    where: { role: Role.DOCTOR, status: "ACTIVE" },
    orderBy: { email: "asc" },
  });

  if (allowDemoDoctorProfiles) {
    const demoDoctorByEmail = new Map(DEMO_DOCTOR_FIXTURES.map((doctor) => [doctor.email, doctor]));
    const defaultSpecialty = DEMO_SPECIALTIES[0]!;
    await transactionBatches(doctorStaff, async (tx, staff) => {
      const fixture = demoDoctorByEmail.get(staff.email);
      const departmentId = masters.departmentIds.get(fixture?.department ?? defaultSpecialty.department)!;
      const specializationId = masters.specializationIds.get(fixture?.specialization ?? defaultSpecialty.name)!;
      await tx.doctor.upsert({
        where: { staffProfileId: staff.id },
        update: fixture ? { fullName: fixture.fullName, email: fixture.email } : {},
        create: {
          staffProfileId: staff.id,
          fullName: staff.fullName,
          email: staff.email,
          phone: fixture?.phone ?? "202-555-0100",
          licenseNumber: fixture?.licenseNumber ?? `DEMO-LICENSE-EXTRA-${staff.id}`,
          departmentId,
          specializationId,
          qualifications: ["Synthetic demo qualification"],
          consultationFeeCents: fixture?.consultationFeeCents ?? 7500,
          slotDurationMinutes: fixture?.slotDurationMinutes ?? 30,
        },
      });
    });
  }

  const doctors = await prisma.doctor.findMany({
    where: { status: "ACTIVE", staffProfile: { status: "ACTIVE" } },
    select: { id: true, staffProfileId: true, email: true, fullName: true, slotDurationMinutes: true, consultationFeeCents: true },
    orderBy: { fullName: "asc" },
  });
  if (doctors.length === 0) {
    throw new Error("No active doctor profile found. Provision a doctor before seeding dashboard data.");
  }

  if (allowDemoDoctorProfiles) {
    const demoDoctors = DEMO_DOCTOR_FIXTURES;
    const activeEmails = new Set(doctors.map((doctor) => doctor.email));
    const missingDoctors = demoDoctors.filter((doctor) => !activeEmails.has(doctor.email));
    if (missingDoctors.length > 0) {
      throw new Error(`${missingDoctors.length} demo doctor profiles are inactive or missing; resolve their staff profiles before reseeding.`);
    }

    const seededDoctorEmails = new Set(demoDoctors.map((doctor) => doctor.email));
    const weekdays = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"] as const;
    const availabilityRows = doctors
      .filter((doctor) => seededDoctorEmails.has(doctor.email))
      .flatMap((doctor) => weekdays.map((weekday) => ({
        id: demoRecordId(`doctor-availability:${doctor.id}:${weekday}`),
        doctorId: doctor.id,
        weekday,
        startTime: new Date(Date.UTC(1970, 0, 1, 8)),
        endTime: new Date(Date.UTC(1970, 0, 1, 17)),
      })));
    for (let offset = 0; offset < availabilityRows.length; offset += 500) {
      await prisma.doctorAvailability.createMany({
        data: availabilityRows.slice(offset, offset + 500),
        skipDuplicates: true,
      });
    }
  }
  return doctors;
}

function timeOfDay(value: string): Date {
  const [hours, minutes] = value.split(":").map(Number);
  return new Date(Date.UTC(1970, 0, 1, hours, minutes));
}

async function seedNurseProfiles(
  allowDemoNurseProfiles: boolean,
  departmentIds: Map<string, string>,
) {
  const demoNurseEmails = DEMO_NURSE_FIXTURES.map((nurse) => nurse.email);
  const nurseStaff = await prisma.staffProfile.findMany({
    where: {
      role: Role.NURSE,
      status: "ACTIVE",
      ...(allowDemoNurseProfiles ? { email: { in: demoNurseEmails } } : {}),
    },
    orderBy: { email: "asc" },
  });
  if (allowDemoNurseProfiles) {
    const demoNursesByEmail = new Map(DEMO_NURSE_FIXTURES.map((nurse) => [nurse.email, nurse]));
    await transactionBatches(nurseStaff, async (tx, staff) => {
      const fixture = demoNursesByEmail.get(staff.email);
      const nurseProfileData = {
        staffProfileId: staff.id,
        employeeNumber: fixture?.employeeNumber ?? `DEMO-RN-EXTRA-${staff.id}`,
        departmentId: departmentIds.get(fixture?.department ?? DEMO_DEPARTMENTS[0])!,
        qualifications: fixture?.qualifications ?? ["Synthetic demo nursing credential"],
        shiftStartTime: timeOfDay(fixture?.shiftStartTime ?? "08:00"),
        shiftEndTime: timeOfDay(fixture?.shiftEndTime ?? "16:00"),
      };
      await tx.nurseProfile.upsert({
        where: { staffProfileId: staff.id },
        update: nurseProfileData,
        create: { id: demoRecordId(`nurse-profile:${staff.id}`), ...nurseProfileData },
      });
    });
  }

  const profiles = await prisma.nurseProfile.findMany({
    where: {
      status: "ACTIVE",
      staffProfile: {
        status: "ACTIVE",
        role: Role.NURSE,
        ...(allowDemoNurseProfiles ? { email: { in: demoNurseEmails } } : {}),
      },
    },
    select: { id: true, staffProfileId: true, employeeNumber: true },
    orderBy: { employeeNumber: "asc" },
  });
  if (profiles.length === 0) {
    throw new Error("No active nurse profile found. Enable demo staff seeding or provision nurses before seeding nurse workflow records.");
  }
  if (allowDemoNurseProfiles) {
    const seededNumbers = new Set(DEMO_NURSE_FIXTURES.map((nurse) => nurse.employeeNumber));
    const foundNumbers = new Set(profiles.map((profile) => profile.employeeNumber));
    const missing = [...seededNumbers].filter((employeeNumber) => !foundNumbers.has(employeeNumber));
    if (missing.length > 0) throw new Error(`${missing.length} seeded nurse profiles are missing or inactive.`);
    if (profiles.length !== DEMO_NURSE_COUNT) {
      throw new Error(`Expected ${DEMO_NURSE_COUNT} demo nurse profiles but found ${profiles.length}.`);
    }
  }
  return profiles;
}

async function seedPatientsAndAppointments(doctorRows: Awaited<ReturnType<typeof getSeedDoctors>>, receptionistId: string | null) {
  const patientRows = buildDemoPatients();
  await prisma.patient.createMany({ data: patientRows, skipDuplicates: true });

  const patientIds = patientRows.map((patient) => patient.patientId!);
  const patients = [];
  for (let offset = 0; offset < patientIds.length; offset += 500) {
    patients.push(...await prisma.patient.findMany({
      where: { patientId: { in: patientIds.slice(offset, offset + 500) } },
      select: { id: true, patientId: true, firstName: true },
    }));
  }
  const patientSeedByNumber = new Map(patientRows.map((patient) => [patient.patientId!, patient]));
  const oldPlaceholderPatients = patients.filter((patient) => patient.firstName === "Demo");
  await transactionBatches(oldPlaceholderPatients, async (tx, patient) => {
    const fixture = patientSeedByNumber.get(patient.patientId)!;
    await tx.patient.updateMany({
      where: { id: patient.id, firstName: "Demo" },
      data: {
        firstName: fixture.firstName,
        lastName: fixture.lastName,
        emergencyContactName: fixture.emergencyContactName,
      },
    });
  });
  const patientsByNumber = new Map(patients.map((patient) => [patient.patientId, patient]));
  const orderedPatients = patientIds.map((patientId) => {
    const patient = patientsByNumber.get(patientId);
    if (!patient) throw new Error(`Unable to load seeded patient ${patientId}.`);
    return patient;
  });

  const patientUuids = orderedPatients.map((patient) => patient.id);
  const demoDoctors = doctorRows.map(({ id, slotDurationMinutes }) => ({ id, slotDurationMinutes }));
  const initialSchedule = buildDemoAppointments(patientUuids, demoDoctors);
  const appointmentIds = initialSchedule.map((appointment) => appointment.id);
  const earliestDate = new Date(Math.min(...initialSchedule.map((appointment) => appointment.date.getTime())));
  const latestDate = new Date(Math.max(...initialSchedule.map((appointment) => appointment.date.getTime())));

  const existingSeedAppointments = [];
  for (let offset = 0; offset < appointmentIds.length; offset += 500) {
    existingSeedAppointments.push(...await prisma.appointment.findMany({
      where: { id: { in: appointmentIds.slice(offset, offset + 500) } },
      select: { id: true },
    }));
  }
  const existingAppointmentIds = new Set(existingSeedAppointments.map((appointment) => appointment.id));
  const reservations = await prisma.appointment.findMany({
    where: {
      date: { gte: earliestDate, lte: latestDate },
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
    },
    select: { doctorId: true, date: true, startTime: true, endTime: true, status: true },
  });
  const generatedAppointments = buildDemoAppointments(
    patientUuids,
    demoDoctors,
    new Date(),
    reservations,
  );
  const missingAppointments = generatedAppointments.filter((appointment) => !existingAppointmentIds.has(appointment.id));

  await transactionBatches(missingAppointments, async (tx, appointment) => {
    const appointmentData = {
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      date: appointment.date,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      reason: appointment.reason,
      status: appointment.status,
      source: appointment.source,
      createdAt: appointment.date,
    };
    await tx.appointment.create({ data: { id: appointment.id, ...appointmentData } });

    const historyId = demoRecordId(`appointment-history:${appointment.id}`);
    await tx.appointmentStatusHistory.create({
      data: {
        id: historyId,
        appointmentId: appointment.id,
        fromStatus: null,
        toStatus: appointment.status,
        changedById: receptionistId,
      },
    });
  });

  const persistedAppointments = [];
  for (let offset = 0; offset < appointmentIds.length; offset += 500) {
    persistedAppointments.push(...await prisma.appointment.findMany({
      where: { id: { in: appointmentIds.slice(offset, offset + 500) } },
      select: {
        id: true,
        patientId: true,
        doctorId: true,
        date: true,
        startTime: true,
        endTime: true,
        reason: true,
        status: true,
        source: true,
      },
    }));
  }
  const seedIndexByPatientId = new Map(patientUuids.map((patientId, index) => [patientId, index]));
  const appointments = persistedAppointments
    .map((appointment) => ({ ...appointment, seedIndex: seedIndexByPatientId.get(appointment.patientId)! }))
    .sort((left, right) => left.seedIndex - right.seedIndex);
  if (appointments.length !== patientUuids.length) {
    throw new Error(`Expected ${patientUuids.length} seeded appointments but found ${appointments.length}.`);
  }

  return { appointments, patients: orderedPatients };
}

async function seedNurseAssignments(
  appointments: Awaited<ReturnType<typeof seedPatientsAndAppointments>>["appointments"],
  nurseProfiles: Awaited<ReturnType<typeof seedNurseProfiles>>,
  assignedById: string,
) {
  const assignments = buildDemoNurseAssignments(
    appointments.map((appointment) => ({
      id: appointment.id,
      status: appointment.status,
      date: appointment.date,
    })),
    nurseProfiles.map((profile) => profile.id),
  );
  await transactionBatches(assignments, async (tx, assignment) => {
    const startedAt = assignment.status === "ASSIGNED" ? null : assignment.appointmentDate;
    const completedAt = assignment.status === "COMPLETED" ? assignment.appointmentDate : null;
    const assignmentData = {
      nurseProfileId: assignment.nurseProfileId,
      appointmentId: assignment.appointmentId,
      assignedById,
      status: assignment.status,
      assignedAt: assignment.appointmentDate,
      startedAt,
      completedAt,
    };
    await tx.nurseAppointmentAssignment.upsert({
      where: { nurseProfileId_appointmentId: {
        nurseProfileId: assignment.nurseProfileId,
        appointmentId: assignment.appointmentId,
      } },
      update: assignmentData,
      create: { id: assignment.id, ...assignmentData },
    });
  });

  const staffIdByNurseProfileId = new Map(nurseProfiles.map((profile) => [profile.id, profile.staffProfileId]));
  const vitalsRecorderByAppointmentId = new Map<string, string>();
  for (const assignment of assignments) {
    const staffId = staffIdByNurseProfileId.get(assignment.nurseProfileId);
    if (staffId && !vitalsRecorderByAppointmentId.has(assignment.appointmentId)) {
      vitalsRecorderByAppointmentId.set(assignment.appointmentId, staffId);
    }
  }
  return { assignments, vitalsRecorderByAppointmentId };
}

async function seedClinicalAndBillingRecords(
  appointments: Awaited<ReturnType<typeof seedPatientsAndAppointments>>["appointments"],
  doctorRows: Awaited<ReturnType<typeof getSeedDoctors>>,
  medicineIds: string[],
  labTestIds: string[],
  actorId: string,
  vitalsRecorderByAppointmentId: Map<string, string>,
) {
  const doctorsById = new Map(doctorRows.map((doctor) => [doctor.id, doctor]));
  const encounters = appointments.filter((appointment) =>
    appointment.status === AppointmentStatus.IN_CONSULTATION || appointment.status === AppointmentStatus.COMPLETED,
  );
  const consultations = encounters.map((appointment) => ({
    appointment,
    id: demoRecordId(`consultation:${appointment.id}`),
    status: appointment.status === AppointmentStatus.COMPLETED ? ConsultationStatus.COMPLETED : ConsultationStatus.DRAFT,
  }));

  await transactionBatches(consultations, async (tx, entry) => {
    const { appointment } = entry;
    const clinicalData = {
      appointmentId: appointment.id,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      status: entry.status,
      vitalsRecordedById: vitalsRecorderByAppointmentId.get(appointment.id) ?? null,
      vitalsRecordedAt: appointment.date,
      bloodPressureSystolic: 110 + (appointment.seedIndex % 25),
      bloodPressureDiastolic: 70 + (appointment.seedIndex % 15),
      pulseBpm: 60 + (appointment.seedIndex % 35),
      temperatureCelsius: 36.4 + (appointment.seedIndex % 8) / 10,
      respiratoryRate: 12 + (appointment.seedIndex % 7),
      oxygenSaturationPercent: 96 + (appointment.seedIndex % 5),
      symptoms: "Synthetic demo symptoms.",
      diagnosis: `Synthetic demo diagnosis ${String((appointment.seedIndex % 5) + 1).padStart(2, "0")}`,
      clinicalNotes: "Synthetic demo record; not real clinical information.",
      treatmentPlan: "Synthetic demo plan; not clinical guidance.",
      completedAt: entry.status === ConsultationStatus.COMPLETED ? appointment.date : null,
      createdAt: appointment.date,
    };
    await tx.consultation.upsert({
      where: { appointmentId: appointment.id },
      update: clinicalData,
      create: { id: entry.id, ...clinicalData },
    });
  });

  const prescriptions = consultations.filter(({ appointment }) => appointment.seedIndex % 4 === 0).map((entry) => ({
    ...entry,
    number: `DEMO-RX-${String(entry.appointment.seedIndex + 1).padStart(5, "0")}`,
    medicineId: medicineIds[entry.appointment.seedIndex % medicineIds.length]!,
  }));
  await transactionBatches(prescriptions, async (tx, entry) => {
    const prescriptionData = {
      prescriptionNumber: entry.number,
      patientId: entry.appointment.patientId,
      doctorId: entry.appointment.doctorId,
      consultationId: entry.id,
      status: "DRAFT" as const,
      notes: "Synthetic demo prescription; not a treatment recommendation.",
      createdAt: entry.appointment.date,
    };
    const prescription = await tx.prescription.upsert({
      where: { prescriptionNumber: entry.number },
      update: prescriptionData,
      create: { id: demoRecordId(`prescription:${entry.appointment.id}`), ...prescriptionData },
      select: { id: true },
    });
    const itemId = demoRecordId(`prescription-item:${entry.appointment.id}`);
    await tx.prescriptionItem.upsert({
      where: { id: itemId },
      update: {
        prescriptionId: prescription.id,
        medicineId: entry.medicineId,
        dosage: "Demo dosage",
        frequency: "Demo schedule",
        route: "Demo route",
        duration: "Demo duration",
        mealInstruction: MealInstruction.NOT_APPLICABLE,
        directions: "Synthetic demo directions only.",
        sortOrder: 0,
      },
      create: {
        id: itemId,
        prescriptionId: prescription.id,
        medicineId: entry.medicineId,
        dosage: "Demo dosage",
        frequency: "Demo schedule",
        route: "Demo route",
        duration: "Demo duration",
        mealInstruction: MealInstruction.NOT_APPLICABLE,
        directions: "Synthetic demo directions only.",
        sortOrder: 0,
      },
    });
  });

  const labOrders = consultations.filter(({ appointment }) => appointment.seedIndex % 5 === 0).map((entry) => ({
    ...entry,
    number: `DEMO-LAB-${String(entry.appointment.seedIndex + 1).padStart(5, "0")}`,
    labTestId: labTestIds[entry.appointment.seedIndex % labTestIds.length]!,
    status: ([LabOrderStatus.ORDERED, LabOrderStatus.SAMPLE_COLLECTED, LabOrderStatus.PROCESSING, LabOrderStatus.COMPLETED, LabOrderStatus.REVIEWED] as const)[entry.appointment.seedIndex % 5]!,
  }));
  await transactionBatches(labOrders, async (tx, entry) => {
    const test = DEMO_LAB_TESTS[entry.appointment.seedIndex % DEMO_LAB_TESTS.length]!;
    const historySteps: LabOrderStatus[] = [
      LabOrderStatus.ORDERED,
      ...(entry.status !== LabOrderStatus.ORDERED ? [LabOrderStatus.SAMPLE_COLLECTED] : []),
      ...(entry.status === LabOrderStatus.PROCESSING || entry.status === LabOrderStatus.COMPLETED || entry.status === LabOrderStatus.REVIEWED ? [LabOrderStatus.PROCESSING] : []),
      ...(entry.status === LabOrderStatus.COMPLETED || entry.status === LabOrderStatus.REVIEWED ? [LabOrderStatus.COMPLETED] : []),
      ...(entry.status === LabOrderStatus.REVIEWED ? [LabOrderStatus.REVIEWED] : []),
    ];
    const labData = {
      orderNumber: entry.number,
      patientId: entry.appointment.patientId,
      consultationId: entry.id,
      orderedById: doctorRows.find((doctor) => doctor.id === entry.appointment.doctorId)!.staffProfileId,
      status: entry.status,
      reviewedAt: entry.status === LabOrderStatus.REVIEWED ? entry.appointment.date : null,
      reviewedById: entry.status === LabOrderStatus.REVIEWED
        ? doctorRows.find((doctor) => doctor.id === entry.appointment.doctorId)!.staffProfileId
        : null,
      createdAt: entry.appointment.date,
    };
    const order = await tx.labOrder.upsert({
      where: { orderNumber: entry.number },
      update: labData,
      create: { id: demoRecordId(`lab-order:${entry.appointment.id}`), ...labData },
      select: { id: true },
    });
    const itemId = demoRecordId(`lab-item:${entry.appointment.id}`);
    const hasResult = entry.status === LabOrderStatus.COMPLETED || entry.status === LabOrderStatus.REVIEWED;
    await tx.labOrderItem.upsert({
      where: { id: itemId },
      update: {
        labOrderId: order.id,
        labTestId: entry.labTestId,
        priceCents: test.priceCents,
        unit: test.unit,
        referenceRange: test.referenceRangeText,
        resultValue: hasResult ? "Synthetic result" : null,
        abnormalFlag: AbnormalFlag.NORMAL,
        enteredAt: hasResult ? entry.appointment.date : null,
        enteredById: hasResult ? actorId : null,
      },
      create: {
        id: itemId,
        labOrderId: order.id,
        labTestId: entry.labTestId,
        priceCents: test.priceCents,
        unit: test.unit,
        referenceRange: test.referenceRangeText,
        resultValue: hasResult ? "Synthetic result" : null,
        abnormalFlag: AbnormalFlag.NORMAL,
        enteredAt: hasResult ? entry.appointment.date : null,
        enteredById: hasResult ? actorId : null,
      },
    });
    let fromStatus: LabOrderStatus | null = null;
    for (const toStatus of historySteps) {
      const historyId = demoRecordId(`lab-status:${entry.appointment.id}:${toStatus}`);
      await tx.labOrderStatusHistory.upsert({
        where: { id: historyId },
        update: { fromStatus, toStatus, changedById: actorId },
        create: { id: historyId, labOrderId: order.id, fromStatus, toStatus, changedById: actorId },
      });
      fromStatus = toStatus;
    }
  });

  const labOrdersByNumber = new Map(labOrders.map((entry) => [entry.appointment.id, entry]));
  const invoices = consultations.map((entry) => {
    const labOrder = labOrdersByNumber.get(entry.appointment.id);
    const labTest = labOrder ? DEMO_LAB_TESTS[entry.appointment.seedIndex % DEMO_LAB_TESTS.length]! : null;
    const consultationFeeCents = doctorsById.get(entry.appointment.doctorId)!.consultationFeeCents;
    const totalCents = consultationFeeCents + (labTest?.priceCents ?? 0);
    const paidCents = entry.appointment.seedIndex % 3 === 0
      ? totalCents
      : entry.appointment.seedIndex % 3 === 1
        ? Math.floor(totalCents / 2)
        : 0;
    return {
      ...entry,
      labOrder,
      labTest,
      number: `DEMO-INV-${String(entry.appointment.seedIndex + 1).padStart(5, "0")}`,
      consultationFeeCents,
      totalCents,
      paidCents,
      status: paidCents === 0 ? InvoiceStatus.UNPAID : paidCents === totalCents ? InvoiceStatus.PAID : InvoiceStatus.PARTIAL,
    };
  });

  await transactionBatches(invoices, async (tx, entry) => {
    const invoiceId = demoRecordId(`invoice:${entry.appointment.id}`);
    const invoiceData = {
      invoiceNumber: entry.number,
      patientId: entry.appointment.patientId,
      createdById: actorId,
      discountCents: 0,
      taxCents: 0,
      adjustmentCents: 0,
      subtotalCents: entry.totalCents,
      totalCents: entry.totalCents,
      paidCents: entry.paidCents,
      status: entry.status,
      notes: "Synthetic demo invoice.",
      createdAt: entry.appointment.date,
    };
    const invoice = await tx.invoice.upsert({
      where: { invoiceNumber: entry.number },
      update: invoiceData,
      create: { id: invoiceId, ...invoiceData },
      select: { id: true },
    });

    const consultationItemId = demoRecordId(`invoice-item:consultation:${entry.appointment.id}`);
    await tx.invoiceItem.upsert({
      where: { id: consultationItemId },
      update: {
        invoiceId: invoice.id,
        category: "CONSULTATION",
        description: "Synthetic demo consultation",
        quantity: 1,
        unitPriceCents: entry.consultationFeeCents,
        amountCents: entry.consultationFeeCents,
        consultationId: entry.id,
      },
      create: {
        id: consultationItemId,
        invoiceId: invoice.id,
        category: "CONSULTATION",
        description: "Synthetic demo consultation",
        quantity: 1,
        unitPriceCents: entry.consultationFeeCents,
        amountCents: entry.consultationFeeCents,
        consultationId: entry.id,
      },
    });

    if (entry.labOrder && entry.labTest) {
      const labItemId = demoRecordId(`invoice-item:lab:${entry.appointment.id}`);
      await tx.invoiceItem.upsert({
        where: { id: labItemId },
        update: {
          invoiceId: invoice.id,
          category: "LAB",
          description: "Synthetic demo laboratory panel",
          quantity: 1,
          unitPriceCents: entry.labTest.priceCents,
          amountCents: entry.labTest.priceCents,
          labOrderId: demoRecordId(`lab-order:${entry.appointment.id}`),
        },
        create: {
          id: labItemId,
          invoiceId: invoice.id,
          category: "LAB",
          description: "Synthetic demo laboratory panel",
          quantity: 1,
          unitPriceCents: entry.labTest.priceCents,
          amountCents: entry.labTest.priceCents,
          labOrderId: demoRecordId(`lab-order:${entry.appointment.id}`),
        },
      });
    }

    if (entry.paidCents > 0) {
      const paymentId = demoRecordId(`payment:${entry.appointment.id}`);
      await tx.payment.upsert({
        where: { id: paymentId },
        update: {
          invoiceId: invoice.id,
          amountCents: entry.paidCents,
          method: PaymentMethod.CASH,
          reference: "Synthetic demo payment",
          idempotencyKey: `demo-payment-${String(entry.appointment.seedIndex + 1).padStart(5, "0")}`,
          recordedById: actorId,
          createdAt: entry.appointment.date,
        },
        create: {
          id: paymentId,
          invoiceId: invoice.id,
          amountCents: entry.paidCents,
          method: PaymentMethod.CASH,
          reference: "Synthetic demo payment",
          idempotencyKey: `demo-payment-${String(entry.appointment.seedIndex + 1).padStart(5, "0")}`,
          recordedById: actorId,
          createdAt: entry.appointment.date,
        },
      });
    }
  });

  return { consultations, prescriptions, labOrders, invoices };
}

async function main() {
  const production = process.env.NODE_ENV === "production";
  if (process.env.SEED_DRY_RUN === "true") {
    const patients = buildDemoPatients();
    const demoDoctors = buildDemoDoctors();
    const demoNurses = buildDemoNurses();
    const appointments = buildDemoAppointments(
      patients.map((_, index) => `demo-patient-${index + 1}`),
      demoDoctors.map((_, index) => ({ id: `demo-doctor-${index + 1}`, slotDurationMinutes: 30 })),
    );
    const encounterCount = appointments.filter((appointment) =>
      appointment.status === AppointmentStatus.COMPLETED || appointment.status === AppointmentStatus.IN_CONSULTATION,
    ).length;
    console.log(`Dry run: patients=${patients.length}, doctors=${demoDoctors.length}, nurses=${demoNurses.length}, specialties=${new Set(demoDoctors.map((doctor) => doctor.specialization)).size}, emailDomains=${new Set([...demoDoctors, ...demoNurses].map((person) => person.email.split("@")[1])).size}, appointments=${appointments.length}, nurseAssignments=${demoNurses.length}, consultations=${encounterCount}. No database writes performed.`);
    return;
  }
  if (process.env.ALLOW_DEMO_SEED !== "true") {
    throw new Error("Demo seeding is opt-in. Set ALLOW_DEMO_SEED=true to continue.");
  }
  if (production && (process.env.ALLOW_PRODUCTION_DEMO_SEED !== "true" || process.env.DEMO_SEED_TARGET !== "isolated-staging")) {
    throw new Error("Production-mode demo seeding requires ALLOW_PRODUCTION_DEMO_SEED=true and DEMO_SEED_TARGET=isolated-staging. Never seed a live clinic database.");
  }

  const seedStaff = !production || process.env.SEED_DEMO_STAFF === "true";
  if (production && seedStaff && (!process.env.E2E_SEED_PASSWORD || process.env.E2E_SEED_PASSWORD.length < 32)) {
    throw new Error("When explicitly seeding demo staff in production mode, set E2E_SEED_PASSWORD to a unique secret of at least 32 characters.");
  }

  await assertSeedSchemaReady();

  const selfhosted = process.env.AUTH_PROVIDER === "selfhosted";
  // Deliberately not imported from src/lib/auth/providers: that module is guarded by
  // "server-only", which throws when required outside Next's server bundler (this script runs
  // as a plain tsx process). Inlining the same two primitives (bcrypt hash, random uuid) keeps
  // the script standalone while still producing rows the self-hosted auth provider can log into.
  const supabase = !seedStaff || selfhosted
    ? null
    : createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
        auth: { autoRefreshToken: false, persistSession: false },
      });

  if (seedStaff) await seedStaffAccounts(selfhosted, supabase);

  const masters = await seedClinicMasters();
  const doctorRows = await getSeedDoctors(seedStaff, masters);
  const nurseProfiles = await seedNurseProfiles(seedStaff, masters.departmentIds);
  const staffActor = await prisma.staffProfile.findFirst({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!staffActor) throw new Error("An active staff account is required to own seeded invoices and lab results.");
  const receptionist = await prisma.staffProfile.findFirst({
    where: { role: Role.RECEPTIONIST, status: "ACTIVE" },
    select: { id: true },
  });

  const { appointments } = await seedPatientsAndAppointments(doctorRows, receptionist?.id ?? null);
  const nurseWork = await seedNurseAssignments(appointments, nurseProfiles, staffActor.id);
  const records = await seedClinicalAndBillingRecords(
    appointments,
    doctorRows,
    masters.medicineIds,
    masters.labTestIds,
    staffActor.id,
    nurseWork.vitalsRecorderByAppointmentId,
  );
  const demoDoctorEmails = new Set(DEMO_DOCTOR_FIXTURES.map((doctor) => doctor.email));
  const demoDoctorProfiles = doctorRows.filter((doctor) => demoDoctorEmails.has(doctor.email)).length;
  const demoNurseEmployeeNumbers = new Set(DEMO_NURSE_FIXTURES.map((nurse) => nurse.employeeNumber));
  const demoNurseProfiles = nurseProfiles.filter((profile) => demoNurseEmployeeNumbers.has(profile.employeeNumber)).length;

  console.log(
    `Seeded synthetic dashboard data: patients=${DEMO_PATIENT_COUNT}, doctors=${demoDoctorProfiles}, nurses=${demoNurseProfiles}, appointments=${appointments.length}, nurseAssignments=${nurseWork.assignments.length}, consultations=${records.consultations.length}, prescriptions=${records.prescriptions.length}, labOrders=${records.labOrders.length}, invoices=${records.invoices.length}.`,
  );

}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Seed failed. Check staging configuration; sensitive provider errors are suppressed.");
    console.error(error instanceof Error ? error.message : error);
    await prisma.$disconnect();
    process.exit(1);
  });
