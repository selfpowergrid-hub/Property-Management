"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import {
  maintenanceStaffCreateSchema,
  maintenanceSubmitSchema,
  assignMaintenanceSchema,
  updateMaintenanceStatusSchema,
  resolveMaintenanceSchema,
} from "@nyumba360/shared";
import { requireFeature, requireTenant, getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { sendSms } from "@/lib/sms";
import { smsTemplates } from "@/lib/sms-templates";
import type { MutationState } from "@/app/actions/properties";

const ok: MutationState = { ok: true };
const fail = (error: string): MutationState => ({ error });

type Supa = Awaited<ReturnType<typeof createClient>>;

async function notifyManagers(supabase: Supa, orgId: string, unitNumber: string, category: string, priority: string) {
  const { data: managers } = await supabase
    .from("users")
    .select("phone")
    .eq("org_id", orgId)
    .in("role", ["manager", "landlord"]);
  const message = smsTemplates.maintenanceReceived(unitNumber, category, priority);
  for (const m of managers ?? []) {
    if (m.phone) await sendSms(supabase, { orgId, phone: m.phone, message });
  }
}

async function notifyTenant(supabase: Supa, orgId: string, requestId: string, status: string) {
  const { data: req } = await supabase
    .from("maintenance_requests")
    .select("category, tenants(phone, full_name)")
    .eq("id", requestId)
    .maybeSingle();
  const tenant = req?.tenants as { phone?: string | null; full_name?: string | null } | undefined;
  if (tenant?.phone) {
    await sendSms(supabase, {
      orgId,
      phone: tenant.phone,
      message: smsTemplates.maintenanceStatusUpdated(tenant.full_name ?? "tenant", req?.category ?? "request", status),
    });
  }
}

// ── Tenant submits from the portal (MNT-01) ─────────────────────────────────
export async function submitMaintenanceAction(_prev: MutationState, formData: FormData): Promise<MutationState> {
  const me = await requireTenant();
  const parsed = maintenanceSubmitSchema.safeParse({
    category: formData.get("category"),
    description: formData.get("description"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  const supabase = await createClient();
  // Resolve the tenant's active lease/unit.
  const { data: tenant } = await supabase.from("tenants").select("id").eq("user_id", me.id).maybeSingle();
  if (!tenant) return fail("No tenant profile found for your account.");
  const { data: lease } = await supabase
    .from("leases")
    .select("unit_id, units(unit_number)")
    .eq("tenant_id", tenant.id)
    .eq("status", "active")
    .maybeSingle();
  if (!lease) return fail("You have no active lease on a unit.");

  const { data: created, error } = await supabase
    .from("maintenance_requests")
    .insert({
      org_id: me.orgId!,
      unit_id: lease.unit_id,
      tenant_id: tenant.id,
      category: parsed.data.category,
      description: parsed.data.description,
      status: "new",
      priority: "medium",
    })
    .select("id")
    .single();
  if (error || !created) return fail(error?.message ?? "Could not submit request");

  const file = formData.get("file") as File | null;
  if (file && file.size > 0) {
    const path = `${me.orgId}/maintenance/${created.id}/${randomUUID()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("maintenance-photos").upload(path, file, {
      contentType: file.type || undefined,
    });
    if (!upErr) {
      await supabase.from("documents").insert({
        org_id: me.orgId!,
        owner_type: "maintenance",
        owner_id: created.id,
        bucket: "maintenance-photos",
        path,
        name: file.name,
        content_type: file.type || null,
        uploaded_by: me.id,
      });
    }
  }

  const unit = lease.units as { unit_number?: string } | null;
  await notifyManagers(supabase, me.orgId!, unit?.unit_number ?? "—", parsed.data.category, "medium");

  revalidatePath("/portal/maintenance");
  revalidatePath("/maintenance");
  return ok;
}

// ── Manager creates on behalf of a tenant (MNT-07) ──────────────────────────
export async function createMaintenanceStaffAction(_prev: MutationState, formData: FormData): Promise<MutationState> {
  const me = await requireFeature("maintenance.manage");
  const parsed = maintenanceStaffCreateSchema.safeParse({
    unitId: formData.get("unitId"),
    tenantId: formData.get("tenantId") || "",
    category: formData.get("category"),
    description: formData.get("description"),
    priority: formData.get("priority") || "medium",
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from("maintenance_requests")
    .insert({
      org_id: me.orgId!,
      unit_id: parsed.data.unitId,
      tenant_id: parsed.data.tenantId || null,
      category: parsed.data.category,
      description: parsed.data.description,
      status: "new",
      priority: parsed.data.priority,
    })
    .select("id")
    .single();
  if (error || !created) return fail(error?.message ?? "Could not create request");

  revalidatePath("/maintenance");
  return ok;
}

// ── Manager assigns to a caretaker + priority (MNT-03) ──────────────────────
export async function assignMaintenanceAction(_prev: MutationState, formData: FormData): Promise<MutationState> {
  const me = await requireFeature("maintenance.manage");
  if (me.role === "caretaker") return fail("Only a manager can assign requests.");
  const parsed = assignMaintenanceSchema.safeParse({
    requestId: formData.get("requestId"),
    assignedTo: formData.get("assignedTo"),
    priority: formData.get("priority"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  const supabase = await createClient();
  const { error } = await supabase
    .from("maintenance_requests")
    .update({ assigned_to: parsed.data.assignedTo, priority: parsed.data.priority, status: "assigned" })
    .eq("id", parsed.data.requestId);
  if (error) return fail(error.message);

  await notifyTenant(supabase, me.orgId!, parsed.data.requestId, "assigned");
  revalidatePath("/maintenance");
  return ok;
}

// ── Caretaker/manager step status (MNT-04/05) — inline, plain form action ────
export async function updateMaintenanceStatusAction(formData: FormData): Promise<void> {
  const me = await getCurrentUser();
  if (!me?.orgId) return;
  const parsed = updateMaintenanceStatusSchema.safeParse({
    requestId: formData.get("requestId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("maintenance_requests")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.requestId);
  if (error) return;

  await notifyTenant(supabase, me.orgId, parsed.data.requestId, parsed.data.status);
  revalidatePath("/maintenance");
  revalidatePath("/portal/maintenance");
}

// ── Resolve/close with notes + cost → expense (MNT-06, EXP-03) ───────────────
export async function resolveMaintenanceAction(_prev: MutationState, formData: FormData): Promise<MutationState> {
  const me = await requireFeature("maintenance.manage");
  const parsed = resolveMaintenanceSchema.safeParse({
    requestId: formData.get("requestId"),
    resolutionNotes: formData.get("resolutionNotes"),
    cost: formData.get("cost") || 0,
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  const supabase = await createClient();
  const { data: req } = await supabase
    .from("maintenance_requests")
    .select("unit_id, category, units(property_id)")
    .eq("id", parsed.data.requestId)
    .maybeSingle();

  const { error } = await supabase
    .from("maintenance_requests")
    .update({
      status: "resolved",
      resolution_notes: parsed.data.resolutionNotes ?? null,
      cost: parsed.data.cost,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.requestId);
  if (error) return fail(error.message);

  // EXP-03: log the resolution cost as an expense.
  const propertyId = (req?.units as { property_id?: string } | null)?.property_id;
  if (parsed.data.cost > 0 && propertyId) {
    await supabase.from("expenses").insert({
      org_id: me.orgId!,
      property_id: propertyId,
      unit_id: req?.unit_id ?? null,
      maintenance_request_id: parsed.data.requestId,
      category: "repairs",
      amount: parsed.data.cost,
      date: new Date().toISOString().slice(0, 10),
      description: `Maintenance: ${req?.category ?? "repair"}`,
    });
  }

  await notifyTenant(supabase, me.orgId!, parsed.data.requestId, "resolved");
  revalidatePath("/maintenance");
  revalidatePath("/expenses");
  return ok;
}
