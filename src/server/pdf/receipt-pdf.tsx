import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatCents } from "@/lib/billing";
import type { ClinicSetting, PaymentMethod } from "@prisma/client";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  logo: { width: 40, height: 40, marginRight: 10 },
  clinicBlock: { flexDirection: "row" },
  clinicName: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  clinicDetail: { fontSize: 8, color: "#555555" },
  receiptTitle: { fontSize: 13, fontFamily: "Helvetica-Bold", textAlign: "right" },
  hr: { borderBottomWidth: 1, borderBottomColor: "#cccccc", marginVertical: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  label: { fontSize: 9, color: "#777777" },
  value: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  amountBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#f0f7f4",
    alignItems: "center",
  },
  amountLabel: { fontSize: 8, color: "#555555", textTransform: "uppercase" },
  amountValue: { fontSize: 20, fontFamily: "Helvetica-Bold", color: "#16865c" },
  disclaimer: { marginTop: 32, fontSize: 7, color: "#999999", textAlign: "center" },
});

type ReceiptForPdf = {
  amountCents: number;
  method: PaymentMethod;
  reference: string | null;
  createdAt: Date;
  recordedBy: { fullName: string };
  invoice: {
    invoiceNumber: string;
    totalCents: number;
    paidCents: number;
    patient: { firstName: string; lastName: string; patientId: string };
  };
};

async function readLogoDataUri(): Promise<string | null> {
  try {
    const bytes = await readFile(path.join(process.cwd(), "public", "images", "logo.png"));
    return `data:image/png;base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

function ReceiptDocument({
  payment,
  clinic,
  logoDataUri,
}: {
  payment: ReceiptForPdf;
  clinic: ClinicSetting;
  logoDataUri: string | null;
}) {
  const balanceCents = payment.invoice.totalCents - payment.invoice.paidCents;

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
          <Text style={styles.receiptTitle}>Payment Receipt</Text>
        </View>

        <View style={styles.hr} />

        <View style={styles.row}>
          <Text style={styles.label}>Patient</Text>
          <Text style={styles.value}>
            {payment.invoice.patient.firstName} {payment.invoice.patient.lastName} (#
            {payment.invoice.patient.patientId})
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Invoice</Text>
          <Text style={styles.value}>{payment.invoice.invoiceNumber}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Date</Text>
          <Text style={styles.value}>{payment.createdAt.toISOString().slice(0, 10)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Method</Text>
          <Text style={styles.value}>{payment.method.replace("_", " ")}</Text>
        </View>
        {payment.reference && (
          <View style={styles.row}>
            <Text style={styles.label}>Reference</Text>
            <Text style={styles.value}>{payment.reference}</Text>
          </View>
        )}
        <View style={styles.row}>
          <Text style={styles.label}>Recorded by</Text>
          <Text style={styles.value}>{payment.recordedBy.fullName}</Text>
        </View>

        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>Amount Paid</Text>
          <Text style={styles.amountValue}>{formatCents(payment.amountCents)}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Remaining invoice balance</Text>
          <Text style={styles.value}>{formatCents(balanceCents)}</Text>
        </View>

        <Text style={styles.disclaimer}>
          This receipt confirms a self-pay payment recorded by {clinic.name}. No card details are
          stored by this system.
        </Text>
      </Page>
    </Document>
  );
}

export async function renderReceiptPdf(payment: ReceiptForPdf, clinic: ClinicSetting): Promise<Buffer> {
  const { renderToBuffer } = await import("@react-pdf/renderer");
  const logoDataUri = await readLogoDataUri();
  return renderToBuffer(<ReceiptDocument payment={payment} clinic={clinic} logoDataUri={logoDataUri} />);
}
