"use server";

import { revalidatePath } from "next/cache";
import { unitListingSchema, inquirySchema } from "@nyumba360/shared";
import { requireFeature } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { MutationState } from "@/app/actions/properties";

const ok: MutationState = { ok: true };
const fail = (error: string): MutationState => ({ error });

// VAC-02: flag a unit as available for listing with a description.
export async function setUnitListingAction(_prev: MutationState, formData: FormData): Promise<MutationState> {
  await requireFeature("properties.manage");
  const parsed = unitListingSchema.safeParse({
    unitId: formData.get("unitId"),
    listed: formData.get("listed") ? "true" : "",
    listingDescription: formData.get("listingDescription"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  const supabase = await createClient();
  const { error } = await supabase
    .from("units")
    .update({ listed: parsed.data.listed, listing_description: parsed.data.listingDescription ?? null })
    .eq("id", parsed.data.unitId);
  if (error) return fail(error.message);

  revalidatePath("/vacancies");
  return ok;
}

// VAC-03: capture a prospective-tenant inquiry.
export async function createInquiryAction(_prev: MutationState, formData: FormData): Promise<MutationState> {
  const me = await requireFeature("properties.manage");
  const parsed = inquirySchema.safeParse({
    unitId: formData.get("unitId") || "",
    name: formData.get("name"),
    phone: formData.get("phone"),
    preferredMoveIn: formData.get("preferredMoveIn") || "",
    message: formData.get("message"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  const supabase = await createClient();
  const { error } = await supabase.from("inquiries").insert({
    org_id: me.orgId!,
    unit_id: parsed.data.unitId || null,
    name: parsed.data.name,
    phone: parsed.data.phone,
    preferred_move_in: parsed.data.preferredMoveIn || null,
    message: parsed.data.message ?? null,
  });
  if (error) return fail(error.message);

  revalidatePath("/vacancies");
  return ok;
}
