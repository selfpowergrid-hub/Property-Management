"use server";

import { revalidatePath } from "next/cache";
import { requireFeature } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { sendSms } from "@/lib/sms";
import { smsTemplates } from "@/lib/sms-templates";
import { loadArrears } from "@/lib/arrears";

/** Send a rent reminder SMS to one late tenant (by lease). */
export async function sendRentReminderAction(formData: FormData): Promise<void> {
  const me = await requireFeature("payments.record");
  const leaseId = String(formData.get("leaseId") ?? "");
  if (!leaseId) return;

  const supabase = await createClient();
  const [{ data: org }, arrears] = await Promise.all([
    supabase.from("organisations").select("mpesa_paybill_number").maybeSingle(),
    loadArrears(supabase),
  ]);

  const row = arrears.find((a) => a.leaseId === leaseId);
  if (row?.phone) {
    await sendSms(supabase, {
      orgId: me.orgId!,
      phone: row.phone,
      message: smsTemplates.rentReminder(
        row.tenantName,
        row.balance,
        row.oldestDue,
        org?.mpesa_paybill_number ?? null,
      ),
    });
  }
  revalidatePath("/reminders");
}

/** Send a rent reminder to every late tenant who has a phone number. */
export async function sendAllRemindersAction(_formData: FormData): Promise<void> {
  const me = await requireFeature("payments.record");
  const supabase = await createClient();
  const [{ data: org }, arrears] = await Promise.all([
    supabase.from("organisations").select("mpesa_paybill_number").maybeSingle(),
    loadArrears(supabase),
  ]);

  const paybill = org?.mpesa_paybill_number ?? null;
  for (const row of arrears) {
    if (!row.phone) continue;
    await sendSms(supabase, {
      orgId: me.orgId!,
      phone: row.phone,
      message: smsTemplates.rentReminder(row.tenantName, row.balance, row.oldestDue, paybill),
    });
  }
  revalidatePath("/reminders");
}
