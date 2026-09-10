"use server";

import { publicError } from "@/lib/public-error";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import {
  patientClinicalSchema,
  patientDemographicsSchema,
  patientRegistrationSchema,
} from "@/lib/validation/patients";
import {
  createPatient,
  DuplicateWarningError,
  setPatientStatus,
  updatePatientClinical,
  updatePatientDemographics,
  type DuplicateCandidate,
} from "@/server/services/patients-service";
import {
  enablePortalAccess,
  resetPortalPassword,
  setPortalAccountStatus,
} from "@/server/services/patient-accounts-service";
import { enablePortalAccessSchema } from "@/lib/validation/portal";

export type FormState = {
  error: string | null;
  duplicates?: DuplicateCandidate[];
  values?: Record<string, string>;
};

const REGISTRATION_FIELD_NAMES = [
  "firstName",
  "lastName",
  "dateOfBirth",
  "sex",
  "phone",
  "email",
  "addressLine1",
  "addressLine2",
  "city",
  "state",
  "postalCode",
  "country",
  "emergencyContactName",
  "emergencyContactPhone",
  "emergencyContactRelationship",
  "allergies",
  "previousDiagnoses",
  "currentMedications",
  "medicalHistory",
] as const;

/** React resets uncontrolled form fields once a `useActionState` action completes, so any
 * state we return that keeps the form on-screen (a validation error or a duplicate warning)
 * must carry the submitted values back, or the user's input is silently wiped. */
function captureSubmittedValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const name of REGISTRATION_FIELD_NAMES) {
    values[name] = String(formData.get(name) ?? "");
  }
  return values;
}

async function requireActor() {
  const actor = await getCurrentUser();
  if (!actor) throw new Error("Not authenticated.");
  return actor;
}

function parseListField(formData: FormData, name: string): string[] {
  return String(formData.get(name) ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function parseRegistrationForm(formData: FormData) {
  return patientRegistrationSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    dateOfBirth: formData.get("dateOfBirth"),
    sex: formData.get("sex"),
    phone: formData.get("phone"),
    email: formData.get("email") || "",
    addressLine1: formData.get("addressLine1") || "",
    addressLine2: formData.get("addressLine2") || "",
    city: formData.get("city") || "",
    state: formData.get("state") || "",
    postalCode: formData.get("postalCode") || "",
    country: formData.get("country") || "",
    emergencyContactName: formData.get("emergencyContactName") || "",
    emergencyContactPhone: formData.get("emergencyContactPhone") || "",
    emergencyContactRelationship: formData.get("emergencyContactRelationship") || "",
    allergies: parseListField(formData, "allergies"),
    medicalHistory: formData.get("medicalHistory") || "",
    previousDiagnoses: parseListField(formData, "previousDiagnoses"),
    currentMedications: parseListField(formData, "currentMedications"),
  });
}

export async function createPatientAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = captureSubmittedValues(formData);
  const parsed = parseRegistrationForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the highlighted fields.", values };
  }

  const force = formData.get("force") === "true";
  let patientId: string;
  try {
    const patient = await createPatient(await requireActor(), parsed.data, { force });
    patientId = patient.id;
  } catch (error) {
    if (error instanceof DuplicateWarningError) {
      return { error: null, duplicates: error.duplicates, values };
    }
    return {
      error: publicError(error, "Could not register patient."),
      values,
    };
  }

  revalidatePath("/patients");
  redirect(`/patients/${patientId}`);
}

function parseDemographicsForm(formData: FormData) {
  return {
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    dateOfBirth: formData.get("dateOfBirth"),
    sex: formData.get("sex"),
    phone: formData.get("phone"),
    email: formData.get("email") || "",
    addressLine1: formData.get("addressLine1") || "",
    addressLine2: formData.get("addressLine2") || "",
    city: formData.get("city") || "",
    state: formData.get("state") || "",
    postalCode: formData.get("postalCode") || "",
    country: formData.get("country") || "",
    emergencyContactName: formData.get("emergencyContactName") || "",
    emergencyContactPhone: formData.get("emergencyContactPhone") || "",
    emergencyContactRelationship: formData.get("emergencyContactRelationship") || "",
  };
}

export async function updateDemographicsAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = patientDemographicsSchema.safeParse(parseDemographicsForm(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the highlighted fields." };
  }

  try {
    await updatePatientDemographics(await requireActor(), id, parsed.data);
  } catch (error) {
    return { error: publicError(error, "Could not update patient.") };
  }

  revalidatePath("/patients");
  revalidatePath(`/patients/${id}`);
  redirect(`/patients/${id}`);
}

export async function updateClinicalAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = patientClinicalSchema.safeParse({
    allergies: parseListField(formData, "allergies"),
    medicalHistory: formData.get("medicalHistory") || "",
    previousDiagnoses: parseListField(formData, "previousDiagnoses"),
    currentMedications: parseListField(formData, "currentMedications"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the highlighted fields." };
  }

  try {
    await updatePatientClinical(await requireActor(), id, parsed.data);
  } catch (error) {
    return { error: publicError(error, "Could not update medical history.") };
  }

  revalidatePath(`/patients/${id}`);
  return { error: null };
}

export async function togglePatientStatusAction(id: string, nextStatus: "ACTIVE" | "ARCHIVED") {
  await setPatientStatus(await requireActor(), id, nextStatus);
  revalidatePath("/patients");
  revalidatePath(`/patients/${id}`);
}

export type PortalAccessFormState = { error: string | null; temporaryPassword?: string };

export async function enablePortalAccessAction(
  patientId: string,
  _prev: PortalAccessFormState,
  formData: FormData,
): Promise<PortalAccessFormState> {
  const parsed = enablePortalAccessSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter a valid email address." };
  }

  try {
    const { temporaryPassword } = await enablePortalAccess(await requireActor(), patientId, parsed.data);
    revalidatePath(`/patients/${patientId}`);
    return { error: null, temporaryPassword };
  } catch (error) {
    return { error: publicError(error, "Could not enable portal access.") };
  }
}

export async function resetPortalPasswordAction(
  patientId: string,
  _prev: PortalAccessFormState,
): Promise<PortalAccessFormState> {
  try {
    const { temporaryPassword } = await resetPortalPassword(await requireActor(), patientId);
    return { error: null, temporaryPassword };
  } catch (error) {
    return { error: publicError(error, "Could not reset the password.") };
  }
}

export async function togglePortalAccountStatusAction(patientId: string, nextStatus: "ACTIVE" | "ARCHIVED") {
  await setPortalAccountStatus(await requireActor(), patientId, nextStatus);
  revalidatePath(`/patients/${patientId}`);
}
