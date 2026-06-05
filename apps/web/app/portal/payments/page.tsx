import Link from "next/link";
import { enumLabel, formatKES, formatDate } from "@nyumba360/shared";
import { requireTenant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";

export const dynamic = "force-dynamic";

export default async function PortalPaymentsPage() {
  await requireTenant();
  const supabase = await createClient();

  // RLS scopes payments to the tenant's own leases.
  const { data: payments } = await supabase
    .from("payments")
    .select("id, amount, payment_date, method, receipt_number")
    .order("payment_date", { ascending: false });

  return (
    <>
      <PageHeader title="Payments" description="Your payment history and receipts (PRD §7.1)." />

      {payments && payments.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Receipt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatDate(p.payment_date)}</TableCell>
                    <TableCell className="font-medium">{formatKES(p.amount)}</TableCell>
                    <TableCell>{enumLabel(p.method)}</TableCell>
                    <TableCell>
                      <Link
                        href={`/portal/payments/${p.id}/receipt`}
                        target="_blank"
                        className="text-primary hover:underline"
                      >
                        {p.receipt_number ?? "Download"}
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          icon="Receipt"
          title="No payments yet"
          description="Once your landlord records a payment, it will appear here with a downloadable receipt."
        />
      )}
    </>
  );
}
