import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { calculateAge } from "@/lib/patients";
import { MEAL_INSTRUCTION_LABELS } from "@/lib/prescriptions";
import type { ClinicSetting, MealInstruction, Sex } from "@prisma/client";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  logo: { width: 40, height: 40, marginRight: 10 },
  clinicBlock: { flexDirection: "row" },
  clinicName: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  clinicDetail: { fontSize: 8, color: "#555555" },
  rxNumber: { fontSize: 11, fontFamily: "Helvetica-Bold", textAlign: "right" },
  hr: { borderBottomWidth: 1, borderBottomColor: "#cccccc", marginVertical: 10 },
  patientRow: { flexDirection: "row", flexWrap: "wrap", gap: 16, marginBottom: 8 },
  patientField: { minWidth: 120 },
  label: { fontSize: 7, color: "#777777", textTransform: "uppercase", letterSpacing: 0.5 },
  value: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  allergyBox: {
    backgroundColor: "#fdecec",
    borderColor: "#e6a3a3",
    borderWidth: 1,
    padding: 6,
    marginBottom: 10,
  },
  allergyText: { color: "#a02020", fontFamily: "Helvetica-Bold", fontSize: 9 },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
    paddingBottom: 2,
  },
  item: { marginBottom: 10, paddingBottom: 8, borderBottomWidth: 0.5, borderBottomColor: "#e0e0e0" },
  itemHeaderRow: { flexDirection: "row", justifyContent: "space-between" },
  medicineName: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  itemGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: 3 },
  itemField: { minWidth: 90 },
  itemFieldLabel: { fontSize: 7, color: "#777777" },
  itemFieldValue: { fontSize: 9 },
  directions: { fontSize: 9, marginTop: 3, fontStyle: "italic" },
  notesBox: { marginTop: 10, padding: 8, backgroundColor: "#f5f5f5" },
  footerRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 24 },
  signatureImage: { width: 120, height: 40, marginBottom: 4 },
  signatureLine: { borderTopWidth: 1, borderTopColor: "#1a1a1a", width: 160, paddingTop: 3 },
  disclaimer: { marginTop: 24, fontSize: 7, color: "#999999", textAlign: "center" },
});

type PrescriptionForPdf = {
  prescriptionNumber: string;
  issuedAt: Date | null;
  notes: string | null;
  patient: {
    firstName: string;
    lastName: string;
    patientId: string;
    dateOfBirth: Date;
    sex: Sex;
    phone: string;
    allergies: string[];
  };
  doctor: {
    fullName: string;
    licenseNumber: string;
    qualifications: string[];
  };
  items: {
    dosage: string;
    frequency: string;
    route: string;
    duration: string;
    mealInstruction: MealInstruction;
    directions: string | null;
    medicine: { name: string; strength: string; form: string };
  }[];
};

async function readLogoDataUri(): Promise<string | null> {
  try {
    const bytes = await readFile(path.join(process.cwd(), "public", "images", "logo.png"));
    return `data:image/png;base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

function PrescriptionDocument({
  prescription,
  clinic,
  logoDataUri,
  signatureDataUri,
}: {
  prescription: PrescriptionForPdf;
  clinic: ClinicSetting;
  logoDataUri: string | null;
  signatureDataUri: string | null;
}) {
  const { patient, doctor } = prescription;
  const age = calculateAge(patient.dateOfBirth);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={styles.clinicBlock}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image, not an HTML <img> */}
            {logoDataUri && <Image src={logoDataUri} style={styles.logo} />}
            <View>
              <Text style={styles.clinicName}>{clinic.name}</Text>
              <Text style={styles.clinicDetail}>
                {clinic.addressLine1}
                {clinic.addressLine2 ? `, ${clinic.addressLine2}` : ""}, {clinic.city}, {clinic.state}{" "}
                {clinic.postalCode}
              </Text>
              <Text style={styles.clinicDetail}>
                {clinic.phone} • {clinic.email}
              </Text>
            </View>
          </View>
          <View>
            <Text style={styles.rxNumber}>{prescription.prescriptionNumber}</Text>
            <Text style={styles.clinicDetail}>
              Issued: {prescription.issuedAt ? prescription.issuedAt.toISOString().slice(0, 10) : "—"}
            </Text>
          </View>
        </View>

        <View style={styles.hr} />

        <View style={styles.patientRow}>
          <View style={styles.patientField}>
            <Text style={styles.label}>Patient</Text>
            <Text style={styles.value}>
              {patient.firstName} {patient.lastName}
            </Text>
          </View>
          <View style={styles.patientField}>
            <Text style={styles.label}>Patient ID</Text>
            <Text style={styles.value}>{patient.patientId}</Text>
          </View>
          <View style={styles.patientField}>
            <Text style={styles.label}>DOB / Age / Sex</Text>
            <Text style={styles.value}>
              {patient.dateOfBirth.toISOString().slice(0, 10)} ({age}y / {patient.sex})
            </Text>
          </View>
          <View style={styles.patientField}>
            <Text style={styles.label}>Contact</Text>
            <Text style={styles.value}>{patient.phone}</Text>
          </View>
        </View>

        {patient.allergies.length > 0 && (
          <View style={styles.allergyBox}>
            <Text style={styles.allergyText}>ALLERGIES: {patient.allergies.join(", ")}</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Rx — Prescribed Medicines</Text>
        {prescription.items.map((item, index) => (
          <View key={index} style={styles.item} wrap={false}>
            <View style={styles.itemHeaderRow}>
              <Text style={styles.medicineName}>
                {index + 1}. {item.medicine.name} {item.medicine.strength} ({item.medicine.form})
              </Text>
            </View>
            <View style={styles.itemGrid}>
              <View style={styles.itemField}>
                <Text style={styles.itemFieldLabel}>Dosage</Text>
                <Text style={styles.itemFieldValue}>{item.dosage}</Text>
              </View>
              <View style={styles.itemField}>
                <Text style={styles.itemFieldLabel}>Frequency</Text>
                <Text style={styles.itemFieldValue}>{item.frequency}</Text>
              </View>
              <View style={styles.itemField}>
                <Text style={styles.itemFieldLabel}>Route</Text>
                <Text style={styles.itemFieldValue}>{item.route}</Text>
              </View>
              <View style={styles.itemField}>
                <Text style={styles.itemFieldLabel}>Duration</Text>
                <Text style={styles.itemFieldValue}>{item.duration}</Text>
              </View>
              <View style={styles.itemField}>
                <Text style={styles.itemFieldLabel}>Meal instruction</Text>
                <Text style={styles.itemFieldValue}>{MEAL_INSTRUCTION_LABELS[item.mealInstruction]}</Text>
              </View>
            </View>
            {item.directions && <Text style={styles.directions}>Directions: {item.directions}</Text>}
          </View>
        ))}

        {prescription.notes && (
          <View style={styles.notesBox}>
            <Text style={styles.itemFieldLabel}>Instructions to patient / pharmacist</Text>
            <Text style={styles.itemFieldValue}>{prescription.notes}</Text>
          </View>
        )}

        <View style={styles.footerRow}>
          <View />
          <View>
            {signatureDataUri ? (
              // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image, not an HTML <img>
              <Image src={signatureDataUri} style={styles.signatureImage} />
            ) : (
              <View style={{ height: 40 }} />
            )}
            <View style={styles.signatureLine}>
              <Text style={styles.value}>{doctor.fullName}</Text>
              <Text style={styles.clinicDetail}>
                {doctor.qualifications.join(", ")} • License #{doctor.licenseNumber}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.disclaimer}>
          This is an internal clinic prescription record generated by {clinic.name}. It is not a
          certified electronic prescription (EPCS) and is not transmitted to any pharmacy system.
        </Text>
      </Page>
    </Document>
  );
}

export async function renderPrescriptionPdf(
  prescription: PrescriptionForPdf,
  clinic: ClinicSetting,
  signatureDataUri: string | null,
): Promise<Buffer> {
  const { renderToBuffer } = await import("@react-pdf/renderer");
  const logoDataUri = await readLogoDataUri();
  return renderToBuffer(
    <PrescriptionDocument
      prescription={prescription}
      clinic={clinic}
      logoDataUri={logoDataUri}
      signatureDataUri={signatureDataUri}
    />,
  );
}
