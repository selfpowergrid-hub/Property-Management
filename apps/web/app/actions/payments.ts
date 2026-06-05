"use server";

import { revalidatePath } from "next/cache";
import { paymentSchema } from "@nyumba360/shared";
import { requireFeature } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { sendSms } from "@/lib/sms";
import { sendPush } from "@/lib/push";
import { smsTemplates } from "@/lib/sms-templates";
import { formatKES } from "@nyumba360/shared";
import type { MutationState } from "@/app/actions/properties";

const ok: MutationState = { ok: true };
const fail = (error: string): MutationState => ({ error });

/**
 * Record a manual payment (PAY-01/02). The AFTER INSERT trigger
 * (allocate_payment) assigns the receipt number and FIFO-allocates the amount
 * across outstanding invoices. We also queue an SMS confirmation row (PAY-07)
 * as the Phase-3 send hook.
 */
export async function recordPaymentAction(_prev: MutationState, formData: FormData): Promise<MutationState> {
  const me = await requireFeature("payments.record");
  const parsed = paymentSchema.safeParse({
    leaseId: formData.get("leaseId"),
    amount: formData.get("amount"),
    paymentDate: formData.get("paymentDate"),
    method: formData.get("method"),
    mpesaCode: formData.get("mpesaCode"),
    bankRef: formData.get("bankRef"),
    payerName: formData.get("payerName"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  const supabase = await createClient();
  const { data: payment, error } = await supabase
    .from("payments")
    .insert({
      org_id: me.orgId!,
      lease_id: parsed.data.leaseId,
      amount: parsed.data.amount,
      payment_date: parsed.data.paymentDate,
      method: parsed.data.method,
      mpesa_code: parsed.data.mpesaCode || null,
      bank_ref: parsed.data.bankRef || null,
      payer_name: parsed.data.payerName || null,
      recorded_by: me.id,
    })
    .select("id")
    .single();
  if (error || !payment) return fail(error?.message ?? "Could not record payment");

  // PAY-07: SMS the tenant. The allocation trigger has already stamped the
  // receipt number and updated invoice balances, so read them back.
  const [{ data: receipt }, { data: lease }] = await Promise.all([
    supabase.from("payments").select("receipt_number").eq("id", payment.id).maybeSingle(),
    supabase.from("leases").select("tenants(phone, full_name, user_id)").eq("id", parsed.data.leaseId).maybeSingle(),
  ]);
  const { data: invoices } = await supabase
    .from("invoices")
    .select("amount, amount_paid")
    .eq("lease_id", parsed.data.leaseId);
  const balance = invoices?.reduce((s, i) => s + (Number(i.amount) - Number(i.amount_paid)), 0) ?? 0;
  const tenant = lease?.tenants as
    | { phone?: string | null; full_name?: string | null; user_id?: string | null }
    | undefined;

  if (tenant?.phone) {
    await sendSms(supabase, {
      orgId: me.orgId!,
      phone: tenant.phone,
      message: smsTemplates.paymentReceived(
        tenant.full_name ?? "tenant",
        parsed.data.amount,
        receipt?.receipt_number ?? "—",
        balance,
      ),
    });
  }
  await sendPush(
    tenant?.user_id,
    "Payment received",
    `We received ${formatKES(parsed.data.amount)}. Balance: ${formatKES(balance)}.`,
    { type: "payment" },
  );

  revalidatePath("/payments");
  revalidatePath("/dashboard");
  return ok;
}
