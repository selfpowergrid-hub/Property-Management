"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import {
  propertySchema,
  unitSchema,
  UNIT_STATUSES,
  type UnitStatus,
} from "@nyumba360/shared";
import { requireFeature } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export interface MutationState {
  error?: string;
  ok?: boolean;
}

const ok: MutationState = { ok: true };
const fail = (error: string): MutationState => ({ error });

/**
 * Upload an optional property photo to the (private) property-photos bucket and
 * record it in `documents` (PROP-05). Best-effort: a failed upload never blocks
 * the property create/edit — the photo can be added later from the detail page.
 */
async function savePropertyPhoto(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  propertyId: string,
  file: File | null,
  userId: string,
): Promise<void> {
  if (!file || file.size === 0) return;
  const path = `${orgId}/property/${propertyId}/${randomUUID()}-${file.name}`;
  const { error: upErr } = await supabase.storage
    .from("property-photos")
    .upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (upErr) return;
  await supabase.from("documents").insert({
    org_id: orgId,
    owner_type: "property",
    owner_id: propertyId,
    bucket: "property-photos",
    path,
    name: file.name,
    content_type: file.type || null,
    uploaded_by: userId,
  });
}

// ── Properties (PROP-01) ────────────────────────────────────────────────────
export async function createPropertyAction(_prev: MutationState, formData: FormData): Promise<MutationState> {
  const me = await requireFeature("properties.manage");
  const parsed = propertySchema.safeParse({
    name: formData.get("name"),
    address: formData.get("address"),
    county: formData.get("county"),
    type: formData.get("type"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  const supabase = await createClient();
  const { data: property, error } = await supabase
    .from("properties")
    .insert({
      org_id: me.orgId!,
      name: parsed.data.name,
      address: parsed.data.address ?? null,
      county: parsed.data.county ?? null,
      type: parsed.data.type,
    })
    .select("id")
    .single();
  if (error || !property) return fail(error?.message ?? "Could not create property");

  await savePropertyPhoto(supabase, me.orgId!, property.id, formData.get("photo") as File | null, me.id);
  revalidatePath("/properties");
  return ok;
}

export async function updatePropertyAction(_prev: MutationState, formData: FormData): Promise<MutationState> {
  const me = await requireFeature("properties.manage");
  const id = String(formData.get("id") ?? "");
  const parsed = propertySchema.safeParse({
    name: formData.get("name"),
    address: formData.get("address"),
    county: formData.get("county"),
    type: formData.get("type"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  const supabase = await createClient();
  const { error } = await supabase
    .from("properties")
    .update({
      name: parsed.data.name,
      address: parsed.data.address ?? null,
      county: parsed.data.county ?? null,
      type: parsed.data.type,
    })
    .eq("id", id);
  if (error) return fail(error.message);

  await savePropertyPhoto(supabase, me.orgId!, id, formData.get("photo") as File | null, me.id);
  revalidatePath("/properties");
  revalidatePath(`/properties/${id}`);
  return ok;
}

export async function deletePropertyAction(formData: FormData): Promise<void> {
  await requireFeature("properties.manage");
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  await supabase.from("properties").delete().eq("id", id);
  revalidatePath("/properties");
}

// ── Units (PROP-02/03) ──────────────────────────────────────────────────────
export async function createUnitAction(_prev: MutationState, formData: FormData): Promise<MutationState> {
  const me = await requireFeature("properties.manage");
  const parsed = unitSchema.safeParse({
    propertyId: formData.get("propertyId"),
    unitNumber: formData.get("unitNumber"),
    floor: formData.get("floor"),
    type: formData.get("type"),
    sizeSqft: formData.get("sizeSqft") || undefined,
    monthlyRent: formData.get("monthlyRent"),
    status: formData.get("status") || "vacant",
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  const supabase = await createClient();
  const { error } = await supabase.from("units").insert({
    org_id: me.orgId!,
    property_id: parsed.data.propertyId,
    unit_number: parsed.data.unitNumber,
    floor: parsed.data.floor ?? null,
    type: parsed.data.type ?? null,
    size_sqft: parsed.data.sizeSqft ?? null,
    monthly_rent: parsed.data.monthlyRent,
    status: parsed.data.status,
  });
  if (error) return fail(error.message);
  revalidatePath(`/properties/${parsed.data.propertyId}`);
  return ok;
}

export async function setUnitStatusAction(formData: FormData): Promise<void> {
  await requireFeature("properties.manage");
  const unitId = String(formData.get("unitId") ?? "");
  const propertyId = String(formData.get("propertyId") ?? "");
  const status = String(formData.get("status") ?? "") as UnitStatus;
  if (!UNIT_STATUSES.includes(status)) return;
  const supabase = await createClient();
  await supabase.from("units").update({ status }).eq("id", unitId);
  revalidatePath(`/properties/${propertyId}`);
  revalidatePath("/vacancies");
}

// ── Documents / Storage (PROP-05) ───────────────────────────────────────────
export async function uploadDocumentAction(_prev: MutationState, formData: FormData): Promise<MutationState> {
  const me = await requireFeature("properties.manage");
  const file = formData.get("file") as File | null;
  const ownerType = String(formData.get("ownerType") ?? "");
  const ownerId = String(formData.get("ownerId") ?? "");
  const bucket = String(formData.get("bucket") ?? "lease-documents");
  if (!file || file.size === 0) return fail("Choose a file to upload");

  const supabase = await createClient();
  const path = `${me.orgId}/${ownerType}/${ownerId}/${randomUUID()}-${file.name}`;
  const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (upErr) return fail(upErr.message);

  const { error: docErr } = await supabase.from("documents").insert({
    org_id: me.orgId!,
    owner_type: ownerType as "property" | "unit" | "lease",
    owner_id: ownerId,
    bucket,
    path,
    name: file.name,
    content_type: file.type || null,
    uploaded_by: me.id,
  });
  if (docErr) return fail(docErr.message);

  revalidatePath(`/properties/${ownerId}`);
  revalidatePath("/tenants");
  return ok;
}
