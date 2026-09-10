import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Patient } from "@prisma/client";

/** `values` (a resubmission after a validation error or duplicate warning) always wins over
 * `initial` (an existing patient record being edited), since it reflects what the user just typed. */
export function ClinicalFields({
  initial,
  values,
}: {
  initial?: Patient | null;
  values?: Record<string, string>;
}) {
  const get = (key: string, fallback?: string) => values?.[key] ?? fallback ?? "";

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="allergies">Allergies</Label>
        <Input
          id="allergies"
          name="allergies"
          placeholder="Penicillin, Peanuts (comma-separated)"
          defaultValue={get("allergies", initial?.allergies.join(", "))}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="previousDiagnoses">Previous diagnoses</Label>
        <Input
          id="previousDiagnoses"
          name="previousDiagnoses"
          placeholder="Type 2 Diabetes, Hypertension (comma-separated)"
          defaultValue={get("previousDiagnoses", initial?.previousDiagnoses.join(", "))}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="currentMedications">Current medications</Label>
        <Input
          id="currentMedications"
          name="currentMedications"
          placeholder="Metformin 500mg, Lisinopril 10mg (comma-separated)"
          defaultValue={get("currentMedications", initial?.currentMedications.join(", "))}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="medicalHistory">Medical history notes</Label>
        <Textarea
          id="medicalHistory"
          name="medicalHistory"
          rows={4}
          defaultValue={get("medicalHistory", initial?.medicalHistory ?? "")}
        />
      </div>
    </div>
  );
}
