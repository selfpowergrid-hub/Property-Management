"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createOrganisationSchema, orgBillingSchema } from "@nyumba360/shared";
import { requireFeature } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionState } from "@/app/actions/auth";
import type { MutationState } from "@/app/actions/properties";

/**
 * Bootstrap a new landlord organisation (PRD §6.1). RLS forbids a user with no
 * org from inserting one, so this runs through the service-role admin client:
 *   1. create the organisation
 *   2. set the caller's profile org_id + role=landlord
 *   3. mirror org_id/user_role into auth app_metadata so the access-token hook
 *      and middleware see the claims on the next token refresh.
 */
export async function createOrganisationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = createOrganisationSchema.safeParse({
    name: formData.get("name"),
    county: formData.get("county"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  const { data: org, error: orgError } = await admin
    .from("organisations")
    .insert({ name: parsed.data.name, county: parsed.data.county ?? null })
    .select("id")
    .single();
  if (orgError || !org) return { error: orgError?.message ?? "Could not create organisation" };

  const { error: profileError } = await admin
    .from("users")
    .update({ org_id: org.id, role: "landlord" })
    .eq("id", user.id);
  if (profileError) return { error: profileError.message };

  const { error: claimError } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { org_id: org.id, user_role: "landlord" },
  });
  if (claimError) return { error: claimError.message };

  // Force a fresh token so the new claims take effect immediately.
  await supabase.auth.refreshSession();
  redirect("/dashboard");
}

/**
 * Update organisation billing settings (PAY-02 Paybill number, PAY-06 grace
 * period). Landlord-only; RLS already restricts organisation updates to the
 * landlord of the org, so the normal client is sufficient.
 */
export async function updateOrgBillingAction(
  _prev: MutationState,
  formData: FormData,
): Promise<MutationState> {
  const me = await requireFeature("org.manage");
  const parsed = orgBillingSchema.safeParse({
    mpesaPaybillNumber: formData.get("mpesaPaybillNumber") ?? "",
    graceDays: formData.get("graceDays"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("organisations")
    .update({
      mpesa_paybill_number: parsed.data.mpesaPaybillNumber || null,
      grace_days: parsed.data.graceDays,
    })
    .eq("id", me.orgId!);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/payments");
  return { ok: true };
}
