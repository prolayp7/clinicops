// Fictional sample data for the UI-first Dashboard pass. Replace with real Appointment/
// Billing queries once those domain models land in their own IMPLEMENTATION_PLAN phases.

export const kpis = [
  {
    key: "appointments",
    label: "Today's Appointments",
    value: "42",
    icon: "calendar" as const,
    accent: "primary" as const,
    trend: { direction: "up" as const, text: "+6", tone: "success" as const },
    sub: "vs yesterday (36)",
  },
  {
    key: "waiting",
    label: "In Waiting Room",
    value: "7",
    icon: "hourglass" as const,
    accent: "warning" as const,
    trend: { text: "Active Wait", tone: "warning" as const },
    sub: "Avg wait 14 mins",
  },
  {
    key: "completed",
    label: "Completed Consults",
    value: "23",
    icon: "check" as const,
    accent: "success" as const,
    trend: { direction: "up" as const, text: "55%", tone: "success" as const },
    sub: "of total scheduled",
  },
  {
    key: "outstanding",
    label: "Outstanding Balance",
    value: "$4,820",
    icon: "alert" as const,
    accent: "destructive" as const,
    trend: { text: "8 Pending", tone: "destructive" as const },
    sub: "unpaid copays/bills",
  },
  {
    key: "revenue",
    label: "Monthly Gross Rev",
    value: "$158,400",
    icon: "payments" as const,
    accent: "primary" as const,
    trend: { direction: "up" as const, text: "+14.2%", tone: "success" as const },
    sub: "vs budget target",
  },
];

export const weeklyTrend = [
  { day: "Thu", inPerson: 24, telehealth: 10, walkIn: 4 },
  { day: "Fri", inPerson: 27, telehealth: 12, walkIn: 5 },
  { day: "Sat", inPerson: 12, telehealth: 5, walkIn: 4 },
  { day: "Sun", inPerson: 5, telehealth: 3, walkIn: 4 },
  { day: "Mon", inPerson: 28, telehealth: 12, walkIn: 6 },
  { day: "Tue", inPerson: 24, telehealth: 11, walkIn: 5 },
  { day: "Today", inPerson: 25, telehealth: 11, walkIn: 6 },
];

export const MAX_CAPACITY = 45;

export const statusBreakdown = [
  { key: "completed", label: "Completed", value: 23, percent: 55, color: "var(--success)" },
  { key: "inProgress", label: "In Progress / Roomed", value: 6, percent: 14, color: "var(--info)" },
  { key: "waiting", label: "Waiting Room", value: 7, percent: 17, color: "var(--warning)" },
  { key: "upcoming", label: "Upcoming / Scheduled", value: 5, percent: 12, color: "var(--muted-foreground)" },
  { key: "cancelled", label: "Cancelled / No Show", value: 1, percent: 2, color: "var(--destructive)" },
];

export type QueueStatus =
  | "in-consult"
  | "waiting"
  | "roomed"
  | "completed"
  | "scheduled";

export const patientQueue: Array<{
  id: string;
  name: string;
  initials: string;
  mrn: string;
  age: number;
  sex: "M" | "F";
  doctor: string;
  specialty: string;
  slot: string;
  location: string;
  reason: string;
  flag?: string;
  status: QueueStatus;
  statusLabel: string;
  action: string;
}> = [
  {
    id: "hhc-8921",
    name: "Marcus Vance",
    initials: "MV",
    mrn: "HHC-8921",
    age: 68,
    sex: "M",
    doctor: "Dr. Sarah Jenkins",
    specialty: "Cardiology / Internal",
    slot: "10:15 AM",
    location: "Room 03",
    reason: "Hypertension Follow-up",
    flag: "High BP Alert",
    status: "in-consult",
    statusLabel: "In Consult (18m)",
    action: "View Chart",
  },
  {
    id: "hhc-9042",
    name: "Eleanor Brooks",
    initials: "EB",
    mrn: "HHC-9042",
    age: 54,
    sex: "F",
    doctor: "Dr. Rajesh Patel",
    specialty: "Endocrinology",
    slot: "10:30 AM",
    location: "Waiting Area B",
    reason: "Diabetes Type II Check",
    status: "waiting",
    statusLabel: "Waiting (14m)",
    action: "Call In",
  },
  {
    id: "hhc-8749",
    name: "Robert Chen",
    initials: "RC",
    mrn: "HHC-8749",
    age: 42,
    sex: "M",
    doctor: "Dr. Sarah Jenkins",
    specialty: "Cardiology / Internal",
    slot: "10:45 AM",
    location: "Room 01",
    reason: "Acute Cough & Fatigue",
    flag: "STAT Lab: K+ 5.8",
    status: "roomed",
    statusLabel: "Roomed & Ready",
    action: "Start Visit",
  },
  {
    id: "hhc-8104",
    name: "David Miller",
    initials: "DM",
    mrn: "HHC-8104",
    age: 31,
    sex: "M",
    doctor: "Dr. Elena Rostova",
    specialty: "Family Medicine",
    slot: "09:30 AM",
    location: "Completed (Room 04)",
    reason: "Wound Dressing / Sutures",
    status: "completed",
    statusLabel: "Checked Out",
    action: "Summary",
  },
  {
    id: "hhc-9311",
    name: "Maya Lin",
    initials: "ML",
    mrn: "HHC-9311",
    age: 29,
    sex: "F",
    doctor: "Dr. Sarah Jenkins",
    specialty: "Cardiology / Internal",
    slot: "11:00 AM",
    location: "Virtual Booth 2",
    reason: "Holter Monitor Review",
    status: "scheduled",
    statusLabel: "Scheduled",
    action: "Test Link",
  },
];

export const activityFeed: Array<{
  id: string;
  time: string;
  category: string;
  message: string;
  meta: string;
  tone: "info" | "warning" | "critical" | "primary" | "success";
}> = [
  {
    id: "1",
    time: "10:12 AM",
    category: "Consultation",
    message: "Dr. Jenkins started consultation with Marcus Vance (#HHC-8921)",
    meta: "Room 03 • Routine Follow-up",
    tone: "info",
  },
  {
    id: "2",
    time: "10:04 AM",
    category: "Front Desk",
    message: "Eleanor Brooks arrived, checked in via Reception.",
    meta: "Vitals Normal • Sent to Waiting Area B",
    tone: "warning",
  },
  {
    id: "3",
    time: "09:51 AM",
    category: "STAT Lab — Critical",
    message: "Potassium 5.8 mEq/L flagged for Robert Chen",
    meta: "Dr. Sarah Jenkins urgently paged to Room 01",
    tone: "critical",
  },
  {
    id: "4",
    time: "09:40 AM",
    category: "e-Prescription",
    message: "Prescription for Amoxicillin 500mg sent to CVS Pharmacy for David Miller",
    meta: "Authorized by Dr. E. Rostova • Transmitted",
    tone: "primary",
  },
  {
    id: "5",
    time: "09:25 AM",
    category: "Billing",
    message: "Copay $35.00 collected from Liam Campbell",
    meta: "Receipt #INV-8812 • Terminal Visa **9011",
    tone: "success",
  },
];
