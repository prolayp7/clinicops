/** Pure, client-safe report metadata — kept out of reports-service.ts (which is "server-only")
 * so the report-type select in the UI doesn't drag the whole service (and its Prisma/DB chain)
 * into the client bundle. */
export const REPORT_TYPES = [
  "patient-registrations",
  "doctor-appointments",
  "appointment-status",
  "consultation-volume",
  "lab-test-activity",
  "payments-outstanding",
  "revenue-summary",
] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const REPORT_LABELS: Record<ReportType, string> = {
  "patient-registrations": "Patient Registrations",
  "doctor-appointments": "Doctor Appointments",
  "appointment-status": "Appointment Status",
  "consultation-volume": "Consultation Volume",
  "lab-test-activity": "Lab-Test Activity",
  "payments-outstanding": "Payments & Outstanding Balances",
  "revenue-summary": "Revenue Summary",
};
