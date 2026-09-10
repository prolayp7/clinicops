/** Pure helpers for patient identity — normalization, ID formatting, age and duplicate
 * matching — kept dependency-free so they're trivially unit-testable without a database. */

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function formatPatientId(sequenceNumber: number): string {
  return `PT-${String(sequenceNumber).padStart(6, "0")}`;
}

export function calculateAge(dateOfBirth: Date, today: Date = new Date()): number {
  let age = today.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const monthDiff = today.getUTCMonth() - dateOfBirth.getUTCMonth();
  const dayDiff = today.getUTCDate() - dateOfBirth.getUTCDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) age -= 1;
  return age;
}

export type DuplicateCandidateInput = {
  firstName: string;
  lastName: string;
  dateOfBirth: string; // ISO date, e.g. "1990-01-01"
  normalizedPhone: string;
  normalizedEmail: string | null;
};

export type DuplicateCandidateRecord = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  normalizedPhone: string;
  normalizedEmail: string | null;
};

/** True when a candidate record is a likely duplicate of the input: same normalized phone,
 * same normalized email, or same name + date of birth. */
export function isLikelyDuplicate(
  input: DuplicateCandidateInput,
  candidate: DuplicateCandidateRecord,
): boolean {
  if (input.normalizedPhone && input.normalizedPhone === candidate.normalizedPhone) return true;
  if (input.normalizedEmail && input.normalizedEmail === candidate.normalizedEmail) return true;
  return (
    input.firstName.trim().toLowerCase() === candidate.firstName.trim().toLowerCase() &&
    input.lastName.trim().toLowerCase() === candidate.lastName.trim().toLowerCase() &&
    input.dateOfBirth === candidate.dateOfBirth
  );
}
