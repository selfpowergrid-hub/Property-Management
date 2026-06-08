"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { leaseSchema, renewLeaseSchema, moveOutSchema, formatDate } from "@nyumba360/shared";
import { requireFeature } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSms } from "@/lib/sms";
import { smsTemplates } from "@/lib/sms-templates";
import type { MutationState } from "@/app/actions/properties";

/** Provision a tenant portal login on lease activation (AUTH-05) and SMS the
 *  credentials. No-op if the tenant already has a linked account. */
async function provisionTenantLogin(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  tenantId: string,
): Promise<void> {
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, full_name, phone, email, user_id")
    .eq("id", tenantId)
    .maybeSingle();
  if (!tenant || tenant.user_id) return;

  const loginEmail =
    tenant.email && tenant.email.includes("@")
      ? tenant.email
      : `${(tenant.phone ?? randomUUID()).replace(/\D/g, "")}@tenant.nyumba360.app`;
  const tempPassword = `Ny-${randomUUID().slice(0, 8)}`;

  const admin = createAdminClient();
  const { data: created, error } = await admin.auth.admin.createUser({
    email: loginEmail,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: tenant.full_name },
    app_metadata: { org_id: orgId, user_role: "tenant" },
  });
  if (error || !created.user) return; // non-fatal; staff can retry later

  await admin.from("tenants").update({ user_id: created.user.id }).eq("id", tenantId);

  if (tenant.phone) {
    const portalUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    await sendSms(supabase, {
      orgId,
      phone: tenant.phone,
      message: smsTemplates.newTenantCredentials(
        tenant.full_name,
        loginEmail,
        tempPassword,
        `${portalUrl}/login`,
      ),
    });
  }
}

const ok: MutationState = { ok: true };
const fail = (error: string): MutationState => ({ error });

export interface LeaseTerms {
  unitId: string;
  tenantId: string;
  startDate: string;
  endDate?: string | null;
  rentAmount: number;
  deposit: number;
  paymentDueDay: number;
}

/**
 * Create + activate a single lease (TEN-02): verifies the unit is vacant in the
 * org, links the tenant, flips the unit to `occupied`, generates the first rent
 * invoice (TEN-03), provisions the tenant login (AUTH-05), and sends the
 * invoice SMS. Shared by createLeaseAction and the create-tenant-with-
 * allocations flow so the activation logic lives in one place.
 */
export async function activateLease(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  terms: LeaseTerms,
): Promise<{ error?: string }> {
  // Guard double-allocation / cross-org: the unit must be vacant and ours.
  const { data: unit } = await supabase
    .from("units")
    .select("id, status, org_id")
    .eq("id", terms.unitId)
    .maybeSingle();
  if (!unit || unit.org_id !== orgId) return { error: "Unit not found" };
  if (unit.status !== "vacant") return { error: "Unit is no longer vacant" };

  const { data: lease, error } = await supabase
    .from("leases")
    .insert({
      org_id: orgId,
      unit_id: terms.unitId,
      tenant_id: terms.tenantId,
      start_date: terms.startDate,
      end_date: terms.endDate || null,
      rent_amount: terms.rentAmount,
      deposit: terms.deposit,
      payment_due_day: terms.paymentDueDay,
      status: "active",
    })
    .select("id")
    .single();
  if (error || !lease) return { error: error?.message ?? "Could not create lease" };

  await supabase.from("units").update({ status: "occupied" }).eq("id", terms.unitId);
  await supabase.rpc("generate_first_invoice", { p_lease: lease.id });

  // AUTH-05: provision the tenant login + SMS credentials (no-op if linked).
  await provisionTenantLogin(supabase, orgId, terms.tenantId);

  // Invoice-generated SMS (first invoice; monthly notices are deferred).
  const { data: tenant } = await supabase
    .from("tenants")
    .select("full_name, phone")
    .eq("id", terms.tenantId)
    .maybeSingle();
  if (tenant?.phone) {
    const period = new Date(terms.startDate);
    const due = new Date(period.getFullYear(), period.getMonth(), terms.paymentDueDay);
    await sendSms(supabase, {
      orgId,
      phone: tenant.phone,
      message: smsTemplates.invoiceGenerated(tenant.full_name, terms.rentAmount, formatDate(due)),
    });
  }
  return {};
}

/**
 * Create + activate a lease from the tenant detail page form (TEN-02).
 */
export async function createLeaseAction(_prev: MutationState, formData: FormData): Promise<MutationState> {
  const me = await requireFeature("tenants.manage");
  const parsed = leaseSchema.safeParse({
    unitId: formData.get("unitId"),
    tenantId: formData.get("tenantId"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate") || "",
    rentAmount: formData.get("rentAmount"),
    deposit: formData.get("deposit") || 0,
    paymentDueDay: formData.get("paymentDueDay"),
    status: "active",
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  const supabase = await createClient();
  const { error } = await activateLease(supabase, me.orgId!, {
    unitId: parsed.data.unitId,
    tenantId: parsed.data.tenantId,
    startDate: parsed.data.startDate,
    endDate: parsed.data.endDate || null,
    rentAmount: parsed.data.rentAmount,
    deposit: parsed.data.deposit,
    paymentDueDay: parsed.data.paymentDueDay,
  });
  if (error) return fail(error);

  revalidatePath(`/tenants/${parsed.data.tenantId}`);
  revalidatePath("/properties");
  revalidatePath("/vacancies");
  return ok;
}

/** Extend a lease with updated terms (TEN-04). */
export async function renewLeaseAction(_prev: MutationState, formData: FormData): Promise<MutationState> {
  await requireFeature("tenants.manage");
  const parsed = renewLeaseSchema.safeParse({
    leaseId: formData.get("leaseId"),
    newEndDate: formData.get("newEndDate"),
    rentAmount: formData.get("rentAmount"),
    paymentDueDay: formData.get("paymentDueDay"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  const supabase = await createClient();
  const { error } = await supabase
    .from("leases")
    .update({
      end_date: parsed.data.newEndDate,
      rent_amount: parsed.data.rentAmount,
      payment_due_day: parsed.data.paymentDueDay,
      status: "active",
    })
    .eq("id", parsed.data.leaseId);
  if (error) return fail(error.message);
  revalidatePath("/tenants");
  return ok;
}

/**
 * Move-out (TEN-05): record notice/vacate dates, terminate the lease, and free
 * the unit. Deposit deductions are collected for the refund computation shown
 * to staff; a full deposit-refund ledger is a later enhancement.
 */
export async function moveOutLeaseAction(_prev: MutationState, formData: FormData): Promise<MutationState> {
  await requireFeature("tenants.manage");
  const parsed = moveOutSchema.safeParse({
    leaseId: formData.get("leaseId"),
    noticeDate: formData.get("noticeDate"),
    vacateDate: formData.get("vacateDate"),
    depositDeductions: formData.get("depositDeductions") || 0,
    notes: formData.get("notes"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  const supabase = await createClient();
  const { data: lease } = await supabase
    .from("leases")
    .select("unit_id, tenant_id")
    .eq("id", parsed.data.leaseId)
    .maybeSingle();

  const { error } = await supabase
    .from("leases")
    .update({
      notice_date: parsed.data.noticeDate,
      vacate_date: parsed.data.vacateDate,
      status: "terminated",
    })
    .eq("id", parsed.data.leaseId);
  if (error) return fail(error.message);

  if (lease?.unit_id) {
    await supabase.from("units").update({ status: "vacant" }).eq("id", lease.unit_id);
  }
  if (lease?.tenant_id) revalidatePath(`/tenants/${lease.tenant_id}`);
  revalidatePath("/vacancies");
  return ok;
}
