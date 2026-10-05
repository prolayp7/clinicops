/** Pure helpers for the doctor profile — kept dependency-free so they're trivially
 * unit-testable without a database. */

/** Appointment statuses that do not count as an active doctor/patient assignment;
 * mirrors record-scope.ts's `patientScope` definition of "assigned". */
const UNASSIGNED_STATUSES = new Set(["CANCELLED", "NO_SHOW", "REQUESTED"]);

export type AssignablePatient = {
  id: string;
  patientId: string;
  firstName: string;
  lastName: string;
  phone: string;
};

export type AppointmentForAssignment = {
  status: string;
  date: Date;
  patient: AssignablePatient;
};

/** Distinct patients assigned to a doctor, derived from that doctor's appointments,
 * each annotated with their most recent visit date (YYYY-MM-DD). */
export function deriveAssignedPatients<T extends AppointmentForAssignment>(
  appointments: T[],
): Array<AssignablePatient & { lastVisit: string }> {
  const byPatientId = new Map<string, AssignablePatient & { lastVisit: string }>();

  for (const appt of appointments) {
    if (UNASSIGNED_STATUSES.has(appt.status)) continue;
    const visitDate = appt.date.toISOString().slice(0, 10);
    const existing = byPatientId.get(appt.patient.id);
    if (!existing || visitDate > existing.lastVisit) {
      byPatientId.set(appt.patient.id, { ...appt.patient, lastVisit: visitDate });
    }
  }

  return Array.from(byPatientId.values());
}
