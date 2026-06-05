"use server";

import { revalidatePath } from "next/cache";
import { tenantSchema } from "@nyumba360/shared";
import { requireFeature } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { MutationState } from "@/app/actions/properties";

const ok: MutationState = { ok: true };
const fail = (error: string): MutationState => ({ error });

export async function createTenantAction(_prev: MutationState, formData: FormData): Promise<MutationState> {
  const me = await requireFeature("tenants.manage");
  const parsed = tenantSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    email: formData.get("email") || "",
    nationalId: formData.get("nationalId"),
    emergencyContact: formData.get("emergencyContact"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  const supabase = await createClient();
  const { error } = await supabase.from("tenants").insert({
    org_id: me.orgId!,
    full_name: parsed.data.fullName,
    phone: parsed.data.phone,
    email: parsed.data.email || null,
    national_id: parsed.data.nationalId ?? null,
    emergency_contact: parsed.data.emergencyContact ?? null,
  });
  if (error) return fail(error.message);
  revalidatePath("/tenants");
  return ok;
}

export async function updateTenantAction(_prev: MutationState, formData: FormData): Promise<MutationState> {
  await requireFeature("tenants.manage");
  const id = String(formData.get("id") ?? "");
  const parsed = tenantSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    email: formData.get("email") || "",
    nationalId: formData.get("nationalId"),
    emergencyContact: formData.get("emergencyContact"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  const supabase = await createClient();
  const { error } = await supabase
    .from("tenants")
    .update({
      full_name: parsed.data.fullName,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      national_id: parsed.data.nationalId ?? null,
      emergency_contact: parsed.data.emergencyContact ?? null,
    })
    .eq("id", id);
  if (error) return fail(error.message);
  revalidatePath(`/tenants/${id}`);
  return ok;
}
