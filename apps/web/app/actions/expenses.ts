"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { expenseSchema } from "@nyumba360/shared";
import { requireFeature } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { MutationState } from "@/app/actions/properties";

const ok: MutationState = { ok: true };
const fail = (error: string): MutationState => ({ error });

export async function createExpenseAction(_prev: MutationState, formData: FormData): Promise<MutationState> {
  const me = await requireFeature("expenses.record");
  const parsed = expenseSchema.safeParse({
    propertyId: formData.get("propertyId"),
    unitId: formData.get("unitId") || "",
    category: formData.get("category"),
    amount: formData.get("amount"),
    date: formData.get("date"),
    description: formData.get("description"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  const supabase = await createClient();

  // Optional receipt upload (EXP-01) — stored in the lease-documents bucket.
  let receiptPath: string | null = null;
  const file = formData.get("file") as File | null;
  if (file && file.size > 0) {
    receiptPath = `${me.orgId}/expense/${randomUUID()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("lease-documents").upload(receiptPath, file, {
      contentType: file.type || undefined,
    });
    if (upErr) receiptPath = null;
  }

  const { error } = await supabase.from("expenses").insert({
    org_id: me.orgId!,
    property_id: parsed.data.propertyId,
    unit_id: parsed.data.unitId || null,
    category: parsed.data.category,
    amount: parsed.data.amount,
    date: parsed.data.date,
    description: parsed.data.description ?? null,
    receipt_url: receiptPath,
  });
  if (error) return fail(error.message);

  revalidatePath("/expenses");
  return ok;
}

export async function deleteExpenseAction(formData: FormData): Promise<void> {
  await requireFeature("expenses.record");
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  await supabase.from("expenses").delete().eq("id", id);
  revalidatePath("/expenses");
}
