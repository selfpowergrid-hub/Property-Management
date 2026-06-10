import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { enumLabel, formatKES, formatDate } from "@nyumba360/shared";
import type { ReceiptData } from "@/lib/receipt";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, color: "#16261f", fontFamily: "Helvetica" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  brand: { fontSize: 20, fontWeight: "bold", color: "#147a55" },
  org: { fontSize: 10, color: "#5b6b64", marginTop: 2 },
  title: { fontSize: 14, fontWeight: "bold", textAlign: "right" },
  receiptNo: { fontSize: 10, color: "#5b6b64", textAlign: "right", marginTop: 2 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottom: "1pt solid #e5eae7" },
  label: { color: "#5b6b64" },
  value: { fontWeight: "bold" },
  amountBox: { marginTop: 20, padding: 16, backgroundColor: "#f0f7f3", borderRadius: 6 },
  amountLabel: { fontSize: 10, color: "#5b6b64" },
  amount: { fontSize: 22, fontWeight: "bold", color: "#147a55", marginTop: 4 },
  lateNote: { fontSize: 9, color: "#b4541a", marginTop: 6 },
  footer: { marginTop: 36, fontSize: 9, color: "#8a9690", textAlign: "center" },
});

function Receipt({ data }: { data: ReceiptData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>LogiQ Estates Pro</Text>
            <Text style={styles.org}>{data.orgName}</Text>
          </View>
          <View>
            <Text style={styles.title}>RENT RECEIPT</Text>
            <Text style={styles.receiptNo}>{data.receiptNumber}</Text>
          </View>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Date</Text>
          <Text style={styles.value}>{formatDate(data.paymentDate)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Tenant</Text>
          <Text style={styles.value}>{data.tenantName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Property / Unit</Text>
          <Text style={styles.value}>
            {data.propertyName} · Unit {data.unitNumber}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Method</Text>
          <Text style={styles.value}>{enumLabel(data.method)}</Text>
        </View>
        {data.paybillNumber ? (
          <View style={styles.row}>
            <Text style={styles.label}>Paybill · Account ref</Text>
            <Text style={styles.value}>
              {data.paybillNumber} · {data.unitNumber}
            </Text>
          </View>
        ) : null}
        {data.reference ? (
          <View style={styles.row}>
            <Text style={styles.label}>Reference</Text>
            <Text style={styles.value}>{data.reference}</Text>
          </View>
        ) : null}
        {data.payerName ? (
          <View style={styles.row}>
            <Text style={styles.label}>Paid by</Text>
            <Text style={styles.value}>{data.payerName}</Text>
          </View>
        ) : null}

        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>Amount received</Text>
          <Text style={styles.amount}>{formatKES(data.amount)}</Text>
          {data.isLate ? <Text style={styles.lateNote}>Received after the due date (late payment)</Text> : null}
        </View>

        <View style={[styles.row, { marginTop: 16 }]}>
          <Text style={styles.label}>Outstanding balance</Text>
          <Text style={styles.value}>{formatKES(data.balanceAfter)}</Text>
        </View>

        <Text style={styles.footer}>
          This is a system-generated receipt from LogiQ Estates Pro. Thank you for your payment.
        </Text>
      </Page>
    </Document>
  );
}

/** Render a receipt to a PDF byte buffer. */
export async function renderReceipt(data: ReceiptData): Promise<Uint8Array> {
  return renderToBuffer(<Receipt data={data} />);
}
