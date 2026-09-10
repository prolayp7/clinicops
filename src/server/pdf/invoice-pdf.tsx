import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatCents } from "@/lib/billing";
import type { ClinicSetting, InvoiceItemCategory, InvoiceStatus } from "@prisma/client";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  logo: { width: 40, height: 40, marginRight: 10 },
  clinicBlock: { flexDirection: "row" },
  clinicName: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  clinicDetail: { fontSize: 8, color: "#555555" },
  invoiceNumber: { fontSize: 11, fontFamily: "Helvetica-Bold", textAlign: "right" },
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
  tableHeaderRow: { flexDirection: "row", backgroundColor: "#f0f0f0", paddingVertical: 4, paddingHorizontal: 4 },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e0e0e0",
  },
  colDesc: { width: "46%", fontSize: 9 },
  colQty: { width: "12%", fontSize: 9, textAlign: "right" },
  colPrice: { width: "18%", fontSize: 9, textAlign: "right" },
  colAmount: { width: "24%", fontSize: 9, textAlign: "right" },
  headerCell: { fontSize: 7, color: "#777777", textTransform: "uppercase" },
  totalsBlock: { marginTop: 12, alignItems: "flex-end" },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", width: 220, paddingVertical: 2 },
  totalsLabel: { fontSize: 9, color: "#555555" },
  totalsValue: { fontSize: 9 },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 220,
    paddingVertical: 4,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#1a1a1a",
  },
  grandTotalLabel: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  grandTotalValue: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  balanceRow: { flexDirection: "row", justifyContent: "space-between", width: 220, paddingVertical: 2 },
  balanceLabel: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#a02020" },
  balanceValue: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#a02020" },
  disclaimer: { marginTop: 24, fontSize: 7, color: "#999999", textAlign: "center" },
});

type InvoiceForPdf = {
  invoiceNumber: string;
  createdAt: Date;
  dueDate: Date | null;
  status: InvoiceStatus;
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  adjustmentCents: number;
  totalCents: number;
  paidCents: number;
  notes: string | null;
  patient: { firstName: string; lastName: string; patientId: string; phone: string };
  items: {
    category: InvoiceItemCategory;
    description: string;
    quantity: number;
    unitPriceCents: number;
    amountCents: number;
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

function InvoiceDocument({
  invoice,
  clinic,
  logoDataUri,
}: {
  invoice: InvoiceForPdf;
  clinic: ClinicSetting;
  logoDataUri: string | null;
}) {
  const balanceCents = invoice.totalCents - invoice.paidCents;

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
            <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
            <Text style={styles.clinicDetail}>Date: {invoice.createdAt.toISOString().slice(0, 10)}</Text>
            {invoice.dueDate && (
              <Text style={styles.clinicDetail}>Due: {invoice.dueDate.toISOString().slice(0, 10)}</Text>
            )}
            <Text style={styles.clinicDetail}>Status: {invoice.status}</Text>
          </View>
        </View>

        <View style={styles.hr} />

        <View style={styles.patientRow}>
          <View style={styles.patientField}>
            <Text style={styles.label}>Bill to</Text>
            <Text style={styles.value}>
              {invoice.patient.firstName} {invoice.patient.lastName}
            </Text>
          </View>
          <View style={styles.patientField}>
            <Text style={styles.label}>Patient ID</Text>
            <Text style={styles.value}>{invoice.patient.patientId}</Text>
          </View>
          <View style={styles.patientField}>
            <Text style={styles.label}>Contact</Text>
            <Text style={styles.value}>{invoice.patient.phone}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Charges</Text>
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.colDesc, styles.headerCell]}>Description</Text>
          <Text style={[styles.colQty, styles.headerCell]}>Qty</Text>
          <Text style={[styles.colPrice, styles.headerCell]}>Unit Price</Text>
          <Text style={[styles.colAmount, styles.headerCell]}>Amount</Text>
        </View>
        {invoice.items.map((item, index) => (
          <View key={index} style={styles.tableRow} wrap={false}>
            <Text style={styles.colDesc}>{item.description}</Text>
            <Text style={styles.colQty}>{item.quantity}</Text>
            <Text style={styles.colPrice}>{formatCents(item.unitPriceCents)}</Text>
            <Text style={styles.colAmount}>{formatCents(item.amountCents)}</Text>
          </View>
        ))}

        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal</Text>
            <Text style={styles.totalsValue}>{formatCents(invoice.subtotalCents)}</Text>
          </View>
          {invoice.discountCents > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Discount</Text>
              <Text style={styles.totalsValue}>-{formatCents(invoice.discountCents)}</Text>
            </View>
          )}
          {invoice.taxCents > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Tax</Text>
              <Text style={styles.totalsValue}>{formatCents(invoice.taxCents)}</Text>
            </View>
          )}
          {invoice.adjustmentCents !== 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Adjustment</Text>
              <Text style={styles.totalsValue}>{formatCents(invoice.adjustmentCents)}</Text>
            </View>
          )}
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{formatCents(invoice.totalCents)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Paid</Text>
            <Text style={styles.totalsValue}>{formatCents(invoice.paidCents)}</Text>
          </View>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>Balance due</Text>
            <Text style={styles.balanceValue}>{formatCents(balanceCents)}</Text>
          </View>
        </View>

        {invoice.notes && (
          <View style={{ marginTop: 16 }}>
            <Text style={styles.label}>Notes</Text>
            <Text style={styles.totalsValue}>{invoice.notes}</Text>
          </View>
        )}

        <Text style={styles.disclaimer}>
          This is a self-pay invoice from {clinic.name}. It does not represent an insurance claim
          or eligibility determination.
        </Text>
      </Page>
    </Document>
  );
}

export async function renderInvoicePdf(invoice: InvoiceForPdf, clinic: ClinicSetting): Promise<Buffer> {
  const { renderToBuffer } = await import("@react-pdf/renderer");
  const logoDataUri = await readLogoDataUri();
  return renderToBuffer(<InvoiceDocument invoice={invoice} clinic={clinic} logoDataUri={logoDataUri} />);
}
