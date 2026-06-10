"use server";

import { inquirySchema } from "@nyumba360/shared";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSms } from "@/lib/sms";
import type { MutationState } from "@/app/actions/properties";

/**
 * Public "Book a viewing" submission. The insert goes through the anon-safe
 * SECURITY DEFINER RPC (verifies the unit is listed and derives org_id in the
 * DB). The company is then notified via the service-role client so the SMS can
 * be logged. No company data is exposed to the visitor.
 */
export async function submitPublicInquiryAction(
  _prev: MutationState,
  formData: FormData,
): Promise<MutationState> {
  const parsed = inquirySchema.safeParse({
    unitId: formData.get("unitId") || "",
    name: formData.get("name"),
    phone: formData.get("phone"),
    preferredMoveIn: formData.get("preferredMoveIn") || "",
    message: formData.get("message"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  if (!parsed.data.unitId) return { error: "This listing is no longer available." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_public_inquiry", {
    p_unit: parsed.data.unitId,
    p_name: parsed.data.name,
    p_phone: parsed.data.phone,
    p_move_in: parsed.data.preferredMoveIn || null,
    p_message: parsed.data.message || null,
  });
  if (error) return { error: "Could not send your inquiry. Please try again." };

  // Best-effort: notify the company of the new lead (service-role → can log SMS).
  try {
    const admin = createAdminClient();
    const { data: unit } = await admin
      .from("units")
      .select("org_id, unit_number")
      .eq("id", parsed.data.unitId)
      .maybeSingle();
    if (unit?.org_id) {
      const { data: org } = await admin
        .from("organisations")
        .select("phone")
        .eq("id", unit.org_id)
        .maybeSingle();
      if (org?.phone) {
        await sendSms(admin, {
          orgId: unit.org_id,
          phone: org.phone,
          message: `New rental inquiry for Unit ${unit.unit_number} from ${parsed.data.name} (${parsed.data.phone}). - LogiQ Estates Pro`,
        });
      }
    }
  } catch {
    /* notification is best-effort; the lead is already saved */
  }

  return { ok: true };
}
