import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const dept = await prisma.department.create({ data: { name: "General Medicine P5" } });
const spec = await prisma.specialization.create({ data: { name: "Family Medicine P5" } });

const staff = await prisma.staffProfile.findUnique({ where: { email: "doctor@example.test" } });
if (!staff) throw new Error("doctor@example.test staff profile not found");

const doctor = await prisma.doctor.create({
  data: {
    staffProfileId: staff.id,
    fullName: staff.fullName,
    email: staff.email,
    phone: "555-0100",
    licenseNumber: "LIC-P5-001",
    departmentId: dept.id,
    specializationId: spec.id,
    qualifications: ["MD"],
    consultationFeeCents: 10000,
    slotDurationMinutes: 30,
  },
});

const seq = await prisma.patient.count();
const patient = await prisma.patient.create({
  data: {
    patientId: `PT-${String(seq + 1).padStart(6, "0")}`,
    firstName: "Rx",
    lastName: "TestPatient",
    dateOfBirth: new Date("1990-03-15"),
    sex: "OTHER",
    phone: "555-444-3333",
    normalizedPhone: "5554443333",
    allergies: ["Sulfa drugs"],
    currentMedications: [],
  },
});

const med1 = await prisma.medicine.create({
  data: { name: "Amoxicillin", strength: "500mg", form: "Capsule" },
});
const med2 = await prisma.medicine.create({
  data: { name: "Ibuprofen", strength: "200mg", form: "Tablet" },
});

console.log(JSON.stringify({ deptId: dept.id, specId: spec.id, doctorId: doctor.id, patientId: patient.id, med1Id: med1.id, med2Id: med2.id }, null, 2));
await prisma.$disconnect();
