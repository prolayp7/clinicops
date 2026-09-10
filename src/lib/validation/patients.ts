import { Sex } from "@prisma/client";
import { z } from "zod";

export const patientDemographicsSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  dateOfBirth: z.string().date(),
  sex: z.nativeEnum(Sex),
  phone: z.string().trim().min(7).max(30),
  email: z.string().trim().email().optional().or(z.literal("")),
  addressLine1: z.string().trim().max(200).optional().or(z.literal("")),
  addressLine2: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  state: z.string().trim().max(100).optional().or(z.literal("")),
  postalCode: z.string().trim().max(20).optional().or(z.literal("")),
  country: z.string().trim().max(100).optional().or(z.literal("")),
  emergencyContactName: z.string().trim().max(150).optional().or(z.literal("")),
  emergencyContactPhone: z.string().trim().max(30).optional().or(z.literal("")),
  emergencyContactRelationship: z.string().trim().max(50).optional().or(z.literal("")),
});
export type PatientDemographicsInput = z.infer<typeof patientDemographicsSchema>;

export const patientClinicalSchema = z.object({
  allergies: z.array(z.string().trim().min(1).max(100)),
  medicalHistory: z.string().trim().max(4000).optional().or(z.literal("")),
  previousDiagnoses: z.array(z.string().trim().min(1).max(150)),
  currentMedications: z.array(z.string().trim().min(1).max(150)),
});
export type PatientClinicalInput = z.infer<typeof patientClinicalSchema>;

export const patientRegistrationSchema = patientDemographicsSchema.merge(patientClinicalSchema);
export type PatientRegistrationInput = z.infer<typeof patientRegistrationSchema>;
