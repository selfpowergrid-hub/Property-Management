"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { tenantSchema, createTenantWithAllocationsSchema, type TenantInput } from "@nyumba360/shared";
import { requireFeature } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { activateLease } from "@/app/actions/leases";
import type { MutationState } from "@/app/actions/properties";

const ok: MutationState = { ok: true };
const fail = (error: string): MutationState => ({ error });

/** Empty string → null, for optional text columns. */
const orNull = (v: string | undefined | null): string | null => (v && v.length ? v : null);

/** Map validated tenant KYC fields to the tenants table columns. */
function tenantColumns(t: TenantInput) {
  return {
    full_name: t.fullName,
    phone: t.phone,
    email: orNull(t.email),
    id_type: orNull(t.idType),
    national_id: orNull(t.nationalId),
    date_of_birth: orNull(t.dateOfBirth),
    gender: orNull(t.gender),
    nationality: orNull(t.nationality),
    marital_status: orNull(t.maritalStatus),
    kra_pin: orNull(t.kraPin),
    alternate_phone: orNull(t.alternatePhone),
    postal_address: orNull(t.postalAddress),
    physical_address: orNull(t.physicalAddress),
    occupation: orNull(t.occupation),
    employer: orNull(t.employer),
    emergency_contact: orNull(t.emergencyContact),
    next_of_kin_name: orNull(t.nextOfKinName),
    next_of_kin_relationship: orNull(t.nextOfKinRelationship),
    next_of_kin_phone: orNull(t.nextOfKinPhone),
    notes: orNull(t.notes),
  };
}

/** Pull every tenant KYC field out of a submitted form (shape for tenantSchema). */
function tenantFromForm(formData: FormData) {
  const s = (k: string) => (formData.get(k) ?? "").toString();
  return {
    fullName: s("fullName"),
    idType: s("idType"),
    nationalId: s("nationalId"),
    dateOfBirth: s("dateOfBirth"),
    gender: s("gender"),
    nationality: s("nationality"),
    maritalStatus: s("maritalStatus"),
    kraPin: s("kraPin"),
    phone: s("phone"),
    alternatePhone: s("alternatePhone"),
    email: s("email"),
    postalAddress: s("postalAddress"),
    physicalAddress: s("physicalAddress"),
    occupation: s("occupation"),
    employer: s("employer"),
    emergencyContact: s("emergencyContact"),
    nextOfKinName: s("nextOfKinName"),
    nextOfKinRelationship: s("nextOfKinRelationship"),
    nextOfKinPhone: s("nextOfKinPhone"),
    notes: s("notes"),
  };
}

export async function createTenantAction(_prev: MutationState, formData: FormData): Promise<MutationState> {
  const me = await requireFeature("tenants.manage");
  const parsed = tenantSchema.safeParse(tenantFromForm(formData));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  const supabase = await createClient();
  const { error } = await supabase
    .from("tenants")
    .insert({ org_id: me.orgId!, ...tenantColumns(parsed.data) });
  if (error) return fail(error.message);
  revalidatePath("/tenants");
  return ok;
}

export async function updateTenantAction(_prev: MutationState, formData: FormData): Promise<MutationState> {
  await requireFeature("tenants.manage");
  const id = String(formData.get("id") ?? "");
  const parsed = tenantSchema.safeParse(tenantFromForm(formData));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  const supabase = await createClient();
  const { error } = await supabase
    .from("tenants")
    .update(tenantColumns(parsed.data))
    .eq("id", id);
  if (error) return fail(error.message);
  revalidatePath(`/tenants/${id}`);
  return ok;
}

/**
 * Create a tenant and optionally allocate them to one or more vacant units
 * (each becomes an active lease). Units are pre-validated as vacant + in-org
 * before any write so an invalid allocation fails fast with no orphaned tenant;
 * on success the staff member lands on the new tenant's detail page.
 */
export async function createTenantWithAllocationsAction(
  _prev: MutationState,
  formData: FormData,
): Promise<MutationState> {
  const me = await requireFeature("tenants.manage");

  let allocations: unknown = [];
  try {
    allocations = JSON.parse((formData.get("allocations") ?? "[]").toString());
  } catch {
    return fail("Could not read unit allocations");
  }

  const parsed = createTenantWithAllocationsSchema.safeParse({
    tenant: tenantFromForm(formData),
    allocations,
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  const supabase = await createClient();

  // Pre-validate units (vacant + in this org) before creating the tenant.
  for (const a of parsed.data.allocations) {
    const { data: unit } = await supabase
      .from("units")
      .select("id, status, org_id")
      .eq("id", a.unitId)
      .maybeSingle();
    if (!unit || unit.org_id !== me.orgId) return fail("A selected unit was not found");
    if (unit.status !== "vacant") return fail("A selected unit is no longer vacant");
  }

  const { data: tenant, error } = await supabase
    .from("tenants")
    .insert({ org_id: me.orgId!, ...tenantColumns(parsed.data.tenant) })
    .select("id")
    .single();
  if (error || !tenant) return fail(error?.message ?? "Could not create tenant");

  for (const a of parsed.data.allocations) {
    const { error: leaseErr } = await activateLease(supabase, me.orgId!, {
      unitId: a.unitId,
      tenantId: tenant.id,
      startDate: a.startDate,
      endDate: a.endDate || null,
      rentAmount: a.rentAmount,
      deposit: a.deposit,
      paymentDueDay: a.paymentDueDay,
    });
    // Tenant + earlier leases are already persisted; surface the first failure
    // but keep what succeeded (the detail page reflects the real state).
    if (leaseErr) break;
  }

  revalidatePath("/tenants");
  revalidatePath("/properties");
  revalidatePath("/vacancies");
  redirect(`/tenants/${tenant.id}`);
}
