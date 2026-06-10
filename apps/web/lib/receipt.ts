import type { TypedSupabaseClient } from "@nyumba360/supabase";

export interface ReceiptData {
  receiptNumber: string;
  paymentDate: string;
  amount: number;
  method: string;
  payerName: string | null;
  reference: string | null;
  orgName: string;
  tenantName: string;
  unitNumber: string;
  propertyName: string;
  balanceAfter: number;
  isLate: boolean;
  paybillNumber: string | null;
}

/**
 * Fetch everything a receipt PDF needs for one payment. RLS scopes this to the
 * caller, so a tenant can only ever resolve their own payments. Returns null if
 * the payment is not visible / not found.
 */
export async function getReceiptData(
  supabase: TypedSupabaseClient,
  paymentId: string,
): Promise<ReceiptData | null> {
  const { data: payment } = await supabase
    .from("payments")
    .select(
      "amount, payment_date, method, mpesa_code, bank_ref, payer_name, receipt_number, is_late, org_id, lease_id, leases(tenant_id, tenants(full_name), units(unit_number, properties(name)))",
    )
    .eq("id", paymentId)
    .maybeSingle();
  if (!payment) return null;

  const lease = payment.leases as
    | { tenant_id?: string; tenants?: { full_name?: string }; units?: { unit_number?: string; properties?: { name?: string } } }
    | null;

  const [{ data: org }, { data: invoices }] = await Promise.all([
    supabase
      .from("organisations")
      .select("name, mpesa_paybill_number")
      .eq("id", payment.org_id)
      .maybeSingle(),
    payment.lease_id
      ? supabase.from("invoices").select("amount, amount_paid").eq("lease_id", payment.lease_id)
      : Promise.resolve({ data: [] as { amount: number; amount_paid: number }[] }),
  ]);

  const balanceAfter =
    invoices?.reduce((s, i) => s + (Number(i.amount) - Number(i.amount_paid)), 0) ?? 0;

  return {
    receiptNumber: payment.receipt_number ?? "—",
    paymentDate: payment.payment_date,
    amount: Number(payment.amount),
    method: payment.method,
    payerName: payment.payer_name,
    reference: payment.mpesa_code ?? payment.bank_ref ?? null,
    orgName: org?.name ?? "LogiQ Estates Pro",
    tenantName: lease?.tenants?.full_name ?? "—",
    unitNumber: lease?.units?.unit_number ?? "—",
    propertyName: lease?.units?.properties?.name ?? "—",
    balanceAfter,
    isLate: Boolean(payment.is_late),
    paybillNumber: org?.mpesa_paybill_number ?? null,
  };
}
