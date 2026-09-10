import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { calculateAge } from "@/lib/patients";
import { ABNORMAL_FLAG_LABELS } from "@/lib/laboratory";
import type { AbnormalFlag, ClinicSetting, Sex } from "@prisma/client";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  logo: { width: 40, height: 40, marginRight: 10 },
  clinicBlock: { flexDirection: "row" },
  clinicName: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  clinicDetail: { fontSize: 8, color: "#555555" },
  orderNumber: { fontSize: 11, fontFamily: "Helvetica-Bold", textAlign: "right" },
  hr: { borderBottomWidth: 1, borderBottomColor: "#cccccc", marginVertical: 10 },
  patientRow: { flexDirection: "row", flexWrap: "wrap", gap: 16, marginBottom: 8 },
  patientField: { minWidth: 120 },
  label: { fontSize: 7, color: "#777777", textTransform: "uppercase", letterSpacing: 0.5 },
  value: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
    paddingBottom: 2,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e0e0e0",
  },
  colTest: { width: "28%", fontSize: 9 },
  colResult: { width: "18%", fontSize: 9 },
  colUnit: { width: "14%", fontSize: 9 },
  colRange: { width: "24%", fontSize: 9 },
  colFlag: { width: "16%", fontSize: 9 },
  headerCell: { fontSize: 7, color: "#777777", textTransform: "uppercase" },
  flagAbnormal: { color: "#a02020", fontFamily: "Helvetica-Bold" },
  footerRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 24 },
  signatureLine: { borderTopWidth: 1, borderTopColor: "#1a1a1a", width: 200, paddingTop: 3 },
  disclaimer: { marginTop: 24, fontSize: 7, color: "#999999", textAlign: "center" },
});

type LabOrderForPdf = {
  orderNumber: string;
  createdAt: Date;
  reviewedAt: Date | null;
  patient: {
    firstName: string;
    lastName: string;
    patientId: string;
    dateOfBirth: Date;
    sex: Sex;
  };
  orderedBy: { fullName: string };
  reviewedBy: { fullName: string } | null;
  items: {
    resultValue: string | null;
    unit: string;
    referenceRange: string;
    abnormalFlag: AbnormalFlag;
    labTest: { name: string; category: string };
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

function LabReportDocument({
  order,
  clinic,
  logoDataUri,
}: {
  order: LabOrderForPdf;
  clinic: ClinicSetting;
  logoDataUri: string | null;
}) {
  const { patient } = order;
  const age = calculateAge(patient.dateOfBirth);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={styles.clinicBlock}>
            {logoDataUri && (
              // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image, not an HTML <img>
              <Image src={logoDataUri} style={styles.logo} />
            )}
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
            <Text style={styles.orderNumber}>{order.orderNumber}</Text>
            <Text style={styles.clinicDetail}>Ordered: {order.createdAt.toISOString().slice(0, 10)}</Text>
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
            <Text style={styles.label}>Ordered by</Text>
            <Text style={styles.value}>{order.orderedBy.fullName}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Laboratory Results</Text>
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.colTest, styles.headerCell]}>Test</Text>
          <Text style={[styles.colResult, styles.headerCell]}>Result</Text>
          <Text style={[styles.colUnit, styles.headerCell]}>Unit</Text>
          <Text style={[styles.colRange, styles.headerCell]}>Reference Range</Text>
          <Text style={[styles.colFlag, styles.headerCell]}>Flag</Text>
        </View>
        {order.items.map((item, index) => (
          <View key={index} style={styles.tableRow} wrap={false}>
            <Text style={styles.colTest}>
              {item.labTest.name} ({item.labTest.category})
            </Text>
            <Text style={styles.colResult}>{item.resultValue || "—"}</Text>
            <Text style={styles.colUnit}>{item.unit}</Text>
            <Text style={styles.colRange}>{item.referenceRange}</Text>
            <Text style={[styles.colFlag, item.abnormalFlag !== "NORMAL" ? styles.flagAbnormal : {}]}>
              {ABNORMAL_FLAG_LABELS[item.abnormalFlag]}
            </Text>
          </View>
        ))}

        <View style={styles.footerRow}>
          <View />
          <View style={styles.signatureLine}>
            <Text style={styles.value}>{order.reviewedBy?.fullName ?? "Pending review"}</Text>
            <Text style={styles.clinicDetail}>
              {order.reviewedAt
                ? `Reviewed ${order.reviewedAt.toISOString().slice(0, 10)}`
                : "Not yet reviewed"}
            </Text>
          </View>
        </View>

        <Text style={styles.disclaimer}>
          This is an internal laboratory report generated by {clinic.name} from manually entered
          results. It is not produced by, or transmitted to, any external laboratory system.
        </Text>
      </Page>
    </Document>
  );
}

export async function renderLabReportPdf(
  order: LabOrderForPdf,
  clinic: ClinicSetting,
): Promise<Buffer> {
  const { renderToBuffer } = await import("@react-pdf/renderer");
  const logoDataUri = await readLogoDataUri();
  return renderToBuffer(<LabReportDocument order={order} clinic={clinic} logoDataUri={logoDataUri} />);
}
