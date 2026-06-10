"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createOrganisationSchema,
  orgBillingSchema,
  orgTaxSchema,
  type CreateOrganisationInput,
} from "@nyumba360/shared";
import { requireFeature } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActionState } from "@/app/actions/auth";
import type { MutationState } from "@/app/actions/properties";

const orNull = (v: string | undefined | null): string | null => (v && v.length ? v : null);

/** Map validated company fields to organisation columns. */
function companyColumns(c: CreateOrganisationInput) {
  return {
    name: c.name,
    registration_number: orNull(c.registrationNumber),
    kra_pin: orNull(c.kraPin),
    phone: orNull(c.phone),
    email: orNull(c.email),
    county: orNull(c.county),
    address: orNull(c.address),
    postal_address: orNull(c.postalAddress),
  };
}

/** Read every company field out of a submitted form (shape for the schema). */
function companyFromForm(formData: FormData) {
  const s = (k: string) => (formData.get(k) ?? "").toString();
  return {
    name: s("name"),
    registrationNumber: s("registrationNumber"),
    kraPin: s("kraPin"),
    phone: s("phone"),
    email: s("email"),
    county: s("county"),
    address: s("address"),
    postalAddress: s("postalAddress"),
  };
}

/** Upload an optional company logo to the public org-logos bucket; returns the
 *  stored object path (or null). Best-effort — a failed logo never blocks the
 *  company create/edit. Any client with write access (admin or org-scoped) works. */
async function saveLogo(
  client: SupabaseClient,
  orgId: string,
  file: File | null,
): Promise<string | null> {
  if (!file || file.size === 0) return null;
  const path = `${orgId}/logo-${randomUUID()}-${file.name}`;
  const { error } = await client.storage
    .from("org-logos")
    .upload(path, file, { contentType: file.type || undefined, upsert: true });
  return error ? null : path;
}

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
  const parsed = createOrganisationSchema.safeParse(companyFromForm(formData));
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
    .insert(companyColumns(parsed.data))
    .select("id")
    .single();
  if (orgError || !org) return { error: orgError?.message ?? "Could not create organisation" };

  // Logo upload via the admin client (the caller has no org claim yet).
  const logoPath = await saveLogo(admin, org.id, formData.get("logo") as File | null);
  if (logoPath) await admin.from("organisations").update({ logo_path: logoPath }).eq("id", org.id);

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
 * Update the company profile + logo from Settings (landlord-only). Uses the
 * normal org-scoped client — RLS already restricts organisation updates to the
 * landlord of the org, and storage policies to the org folder.
 */
export async function updateOrgProfileAction(
  _prev: MutationState,
  formData: FormData,
): Promise<MutationState> {
  const me = await requireFeature("org.manage");
  const parsed = createOrganisationSchema.safeParse(companyFromForm(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const logoPath = await saveLogo(supabase, me.orgId!, formData.get("logo") as File | null);

  const { error } = await supabase
    .from("organisations")
    .update({ ...companyColumns(parsed.data), ...(logoPath ? { logo_path: logoPath } : {}) })
    .eq("id", me.orgId!);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true };
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

/**
 * Update the organisation's rental tax profile (Phase A — MRI). Landlord-only.
 * Rates are stored as fractions. The app computes estimates for filing; it does
 * not file to KRA.
 */
export async function updateOrgTaxAction(
  _prev: MutationState,
  formData: FormData,
): Promise<MutationState> {
  const me = await requireFeature("org.manage");
  // Rates are entered as percentages in the UI; store as fractions.
  const pct = (v: FormDataEntryValue | null) => {
    const n = Number(v);
    return Number.isFinite(n) ? n / 100 : NaN;
  };
  const parsed = orgTaxSchema.safeParse({
    kraPin: formData.get("kraPin") ?? "",
    mriRate: pct(formData.get("mriRatePercent")),
    vatRegistered: formData.get("vatRegistered") ?? "",
    vatRate: pct(formData.get("vatRatePercent")),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("organisations")
    .update({
      kra_pin: parsed.data.kraPin || null,
      mri_rate: parsed.data.mriRate,
      vat_registered: parsed.data.vatRegistered,
      vat_rate: parsed.data.vatRate,
    })
    .eq("id", me.orgId!);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/reports/mri-tax");
  return { ok: true };
}
