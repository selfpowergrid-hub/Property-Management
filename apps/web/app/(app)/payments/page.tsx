import Link from "next/link";
import { enumLabel, formatKES, formatDate } from "@nyumba360/shared";
import { requireFeature } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { recordPaymentAction } from "@/app/actions/payments";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FormDialog } from "@/components/form-dialog";
import { EmptyState } from "@/components/empty-state";
import { RecordPaymentFields, type LeaseOption } from "./record-payment-fields";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const me = await requireFeature("payments.record");
  const supabase = await createClient();

  const [{ data: leases }, { data: payments }, { data: org }] = await Promise.all([
    supabase
      .from("leases")
      .select("id, rent_amount, tenants(full_name), units(unit_number), invoices(amount, amount_paid)")
      .eq("status", "active"),
    supabase
      .from("payments")
      .select(
        "id, amount, payment_date, method, receipt_number, is_late, leases(tenants(full_name), units(unit_number))",
      )
      .order("payment_date", { ascending: false })
      .limit(100),
    supabase.from("organisations").select("mpesa_paybill_number").eq("id", me.orgId!).maybeSingle(),
  ]);

  // Outstanding balance per active lease (sum of unpaid invoice remainders).
  const leaseOptions: LeaseOption[] = (leases ?? []).map((l) => {
    const invoices = (l.invoices as { amount: number; amount_paid: number }[] | null) ?? [];
    const balance = invoices.reduce((s, i) => s + (Number(i.amount) - Number(i.amount_paid)), 0);
    return {
      id: l.id,
      tenantName: (l.tenants as { full_name?: string } | null)?.full_name ?? "—",
      unitNumber: (l.units as { unit_number?: string } | null)?.unit_number ?? "—",
      rent: Number(l.rent_amount),
      balance,
    };
  });

  const recordDialog = (
    <FormDialog
      trigger={<Button>Record payment</Button>}
      title="Record payment"
      description="Manual entry for M-Pesa Paybill, bank transfer, or cash (PAY-01/02)."
      action={recordPaymentAction}
      submitLabel="Record payment"
    >
      <RecordPaymentFields leases={leaseOptions} paybillNumber={org?.mpesa_paybill_number ?? null} />
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
                      <TableCell>
                        <span className="inline-flex items-center gap-2">
                          {formatKES(p.amount)}
                          {p.is_late ? <Badge variant="destructive">Late</Badge> : null}
                        </span>
                      </TableCell>
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
