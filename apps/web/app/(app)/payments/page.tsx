import Link from "next/link";
import { PAYMENT_METHODS, enumLabel, formatKES, formatDate } from "@nyumba360/shared";
import { requireFeature } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { recordPaymentAction } from "@/app/actions/payments";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FormDialog, Field } from "@/components/form-dialog";
import { EmptyState } from "@/components/empty-state";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  await requireFeature("payments.record");
  const supabase = await createClient();

  const [{ data: leases }, { data: payments }] = await Promise.all([
    supabase
      .from("leases")
      .select("id, rent_amount, tenants(full_name), units(unit_number)")
      .eq("status", "active"),
    supabase
      .from("payments")
      .select("id, amount, payment_date, method, receipt_number, leases(tenants(full_name), units(unit_number))")
      .order("payment_date", { ascending: false })
      .limit(100),
  ]);

  const today = new Date().toISOString().slice(0, 10);

  const recordDialog = (
    <FormDialog
      trigger={<Button>Record payment</Button>}
      title="Record payment"
      description="Manual entry for M-Pesa Paybill, bank transfer, or cash (PAY-01/02)."
      action={recordPaymentAction}
      submitLabel="Record payment"
    >
      <Field label="Lease" htmlFor="leaseId">
        <Select id="leaseId" name="leaseId" required defaultValue="">
          <option value="" disabled>
            Select an active lease
          </option>
          {(leases ?? []).map((l) => {
            const tenant = l.tenants as { full_name?: string } | null;
            const unit = l.units as { unit_number?: string } | null;
            return (
              <option key={l.id} value={l.id}>
                {tenant?.full_name ?? "—"} · Unit {unit?.unit_number ?? "—"} ({formatKES(l.rent_amount)})
              </option>
            );
          })}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Amount (KES)" htmlFor="amount">
          <Input id="amount" name="amount" type="number" min="1" step="0.01" required />
        </Field>
        <Field label="Date" htmlFor="paymentDate">
          <Input id="paymentDate" name="paymentDate" type="date" defaultValue={today} required />
        </Field>
        <Field label="Method" htmlFor="method">
          <Select id="method" name="method" defaultValue="mpesa_paybill">
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {enumLabel(m)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Payer name" htmlFor="payerName">
          <Input id="payerName" name="payerName" />
        </Field>
        <Field label="M-Pesa code" htmlFor="mpesaCode" hint="Required for M-Pesa Paybill">
          <Input id="mpesaCode" name="mpesaCode" placeholder="e.g. SLJ7XK21AB" />
        </Field>
        <Field label="Bank reference" htmlFor="bankRef" hint="Required for bank transfer">
          <Input id="bankRef" name="bankRef" />
        </Field>
      </div>
    </FormDialog>
  );

  return (
    <>
      <PageHeader
        title="Rent Collection"
        description="Record payments and issue receipts (PRD §6.4)."
        action={recordDialog}
      />

      {payments && payments.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Receipt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => {
                  const lease = p.leases as
                    | { tenants?: { full_name?: string }; units?: { unit_number?: string } }
                    | null;
                  return (
                    <TableRow key={p.id}>
                      <TableCell>{formatDate(p.payment_date)}</TableCell>
                      <TableCell className="font-medium">{lease?.tenants?.full_name ?? "—"}</TableCell>
                      <TableCell>{lease?.units?.unit_number ?? "—"}</TableCell>
                      <TableCell>{formatKES(p.amount)}</TableCell>
                      <TableCell>{enumLabel(p.method)}</TableCell>
                      <TableCell>
                        <Link href={`/payments/${p.id}/receipt`} className="text-primary hover:underline">
                          {p.receipt_number ?? "—"}
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          icon="Receipt"
          title="No payments recorded"
          description="Record a payment against an active lease. It auto-allocates to the oldest unpaid invoice and generates a receipt."
        />
      )}
    </>
  );
}
