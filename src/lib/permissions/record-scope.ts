import { Role, type Prisma } from "@prisma/client";
import type { CurrentUser } from "@/lib/auth/session";

/** Assignment requires a non-cancelled appointment; a request alone grants no access. */
export function patientScope(actor: CurrentUser): Prisma.PatientWhereInput {
  return actor.profile.role === Role.DOCTOR
    ? { appointments: { some: { doctor: { staffProfileId: actor.profile.id }, status: { notIn: ["CANCELLED", "NO_SHOW", "REQUESTED"] } } } }
    : {};
}

export function doctorScope(actor: CurrentUser) {
  return actor.profile.role === Role.DOCTOR ? { doctor: { staffProfileId: actor.profile.id } } : {};
}

export function nurseAppointmentScope(actor: CurrentUser) {
  return actor.profile.role === Role.NURSE
    ? { nurseAssignments: { some: { nurseProfile: { staffProfileId: actor.profile.id, status: "ACTIVE" as const } } } }
    : {};
}
