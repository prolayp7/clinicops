/** Pure, dependency-free consultation helpers — kept out of the service layer so they're
 * trivially unit-testable without a database. */

const CLINICAL_FIELD_KEYS = [
  "bloodPressureSystolic",
  "bloodPressureDiastolic",
  "pulseBpm",
  "temperatureCelsius",
  "respiratoryRate",
  "oxygenSaturationPercent",
  "heightCm",
  "weightKg",
  "symptoms",
  "diagnosis",
  "clinicalNotes",
  "treatmentPlan",
  "followUpDate",
] as const;

export type ClinicalFieldKey = (typeof CLINICAL_FIELD_KEYS)[number];

export { CLINICAL_FIELD_KEYS };

/** Returns the subset of `keys` whose value differs between `before` and `after`, comparing
 * by string form so `Date` vs ISO-string and `null` vs `undefined` don't produce false positives. */
export function computeChangedFields<K extends string>(
  before: Partial<Record<K, unknown>>,
  after: Partial<Record<K, unknown>>,
  keys: readonly K[],
): K[] {
  return keys.filter((key) => normalize(before[key]) !== normalize(after[key]));
}

function normalize(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value);
}
