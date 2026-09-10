import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Patient } from "@prisma/client";

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} required={required} defaultValue={defaultValue ?? ""} />
    </div>
  );
}

/** `values` (a resubmission after a validation error or duplicate warning) always wins over
 * `initial` (an existing patient record being edited), since it reflects what the user just typed. */
export function DemographicsFields({
  initial,
  values,
}: {
  initial?: Patient | null;
  values?: Record<string, string>;
}) {
  const get = (key: string, fallback?: string | null) => values?.[key] ?? fallback ?? "";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="First name" name="firstName" defaultValue={get("firstName", initial?.firstName)} required />
        <Field label="Last name" name="lastName" defaultValue={get("lastName", initial?.lastName)} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Date of birth"
          name="dateOfBirth"
          type="date"
          defaultValue={get("dateOfBirth", initial?.dateOfBirth.toISOString().slice(0, 10))}
          required
        />
        <div className="space-y-1.5">
          <Label htmlFor="sex">Sex</Label>
          <Select name="sex" defaultValue={values?.sex || initial?.sex || undefined} required>
            <SelectTrigger id="sex" className="w-full">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MALE">Male</SelectItem>
              <SelectItem value="FEMALE">Female</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
              <SelectItem value="UNKNOWN">Unknown</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Phone" name="phone" defaultValue={get("phone", initial?.phone)} required />
        <Field label="Email" name="email" type="email" defaultValue={get("email", initial?.email)} />
      </div>

      <div className="border-border border-t pt-4">
        <h3 className="text-section-title text-foreground mb-3 font-semibold">Address</h3>
        <div className="space-y-4">
          <Field label="Address line 1" name="addressLine1" defaultValue={get("addressLine1", initial?.addressLine1)} />
          <Field label="Address line 2" name="addressLine2" defaultValue={get("addressLine2", initial?.addressLine2)} />
          <div className="grid grid-cols-3 gap-4">
            <Field label="City" name="city" defaultValue={get("city", initial?.city)} />
            <Field label="State" name="state" defaultValue={get("state", initial?.state)} />
            <Field label="Postal code" name="postalCode" defaultValue={get("postalCode", initial?.postalCode)} />
          </div>
          <Field label="Country" name="country" defaultValue={get("country", initial?.country)} />
        </div>
      </div>

      <div className="border-border border-t pt-4">
        <h3 className="text-section-title text-foreground mb-3 font-semibold">Emergency contact</h3>
        <div className="grid grid-cols-3 gap-4">
          <Field
            label="Name"
            name="emergencyContactName"
            defaultValue={get("emergencyContactName", initial?.emergencyContactName)}
          />
          <Field
            label="Phone"
            name="emergencyContactPhone"
            defaultValue={get("emergencyContactPhone", initial?.emergencyContactPhone)}
          />
          <Field
            label="Relationship"
            name="emergencyContactRelationship"
            defaultValue={get("emergencyContactRelationship", initial?.emergencyContactRelationship)}
          />
        </div>
      </div>
    </div>
  );
}
