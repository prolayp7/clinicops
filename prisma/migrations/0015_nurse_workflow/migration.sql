-- CreateEnum
CREATE TYPE "NurseAssignmentStatus" AS ENUM ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED');

-- AlterTable
ALTER TABLE "consultations"
ADD COLUMN "vitalsRecordedById" UUID,
ADD COLUMN "vitalsRecordedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "nurse_profiles" (
    "id" UUID NOT NULL,
    "staffProfileId" UUID NOT NULL,
    "employeeNumber" TEXT NOT NULL,
    "departmentId" UUID NOT NULL,
    "qualifications" TEXT[] NOT NULL,
    "shiftStartTime" TIME NOT NULL,
    "shiftEndTime" TIME NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "nurse_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nurse_appointment_assignments" (
    "id" UUID NOT NULL,
    "nurseProfileId" UUID NOT NULL,
    "appointmentId" UUID NOT NULL,
    "assignedById" UUID NOT NULL,
    "status" "NurseAssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nurse_appointment_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "nurse_profiles_staffProfileId_key" ON "nurse_profiles"("staffProfileId");
CREATE UNIQUE INDEX "nurse_profiles_employeeNumber_key" ON "nurse_profiles"("employeeNumber");
CREATE INDEX "nurse_profiles_departmentId_idx" ON "nurse_profiles"("departmentId");
CREATE INDEX "nurse_profiles_status_idx" ON "nurse_profiles"("status");
CREATE UNIQUE INDEX "nurse_appointment_assignments_nurseProfileId_appointmentId_key" ON "nurse_appointment_assignments"("nurseProfileId", "appointmentId");
CREATE INDEX "nurse_appointment_assignments_appointmentId_status_idx" ON "nurse_appointment_assignments"("appointmentId", "status");
CREATE INDEX "nurse_appointment_assignments_nurseProfileId_status_idx" ON "nurse_appointment_assignments"("nurseProfileId", "status");

-- AddForeignKey
ALTER TABLE "nurse_profiles" ADD CONSTRAINT "nurse_profiles_staffProfileId_fkey" FOREIGN KEY ("staffProfileId") REFERENCES "staff_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nurse_profiles" ADD CONSTRAINT "nurse_profiles_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nurse_appointment_assignments" ADD CONSTRAINT "nurse_appointment_assignments_nurseProfileId_fkey" FOREIGN KEY ("nurseProfileId") REFERENCES "nurse_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nurse_appointment_assignments" ADD CONSTRAINT "nurse_appointment_assignments_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nurse_appointment_assignments" ADD CONSTRAINT "nurse_appointment_assignments_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "staff_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_vitalsRecordedById_fkey" FOREIGN KEY ("vitalsRecordedById") REFERENCES "staff_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
