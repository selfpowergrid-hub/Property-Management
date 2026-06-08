"use server";

import { revalidatePath } from "next/cache";
import { STAFF_ROLES, type UserRole } from "@nyumba360/shared";
import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Change a staff member's role (PRD §6.1 AUTH-04). Landlord-only. Runs through
 * the service-role admin client because the privileged-columns guard (migration
 * 0007) blocks role changes for non-service callers. Updates both the profile
 * (source of truth for the access-token hook / RLS) and auth app_metadata (read
 * by middleware before the next token refresh). Guards against self-change so a
 * landlord can never lock themselves out.
 */
export async function updateUserRoleAction(formData: FormData): Promise<void> {
  const me = await requireStaff();
  if (me.role !== "landlord") return;

  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "") as UserRole;
  if (!userId || userId === me.id) return; // no self-demotion
  if (!STAFF_ROLES.includes(role)) return; // staff roles only

  const admin = createAdminClient();
  const { data: target } = await admin
    .from("users")
    .select("id, org_id")
    .eq("id", userId)
    .maybeSingle();
  if (!target || target.org_id !== me.orgId) return; // same-org only

  await admin.from("users").update({ role }).eq("id", userId);
  await admin.auth.admin.updateUserById(userId, {
    app_metadata: { org_id: me.orgId, user_role: role },
  });
  revalidatePath("/users");
}

/**
 * Remove a staff member, revoking their access (AUTH-04). Landlord-only and
 * never the caller themselves. Deleting the auth user cascades to the profile
 * row; references elsewhere (recorded_by, assigned_to, invited_by) are nulled.
 */
export async function removeUserAction(formData: FormData): Promise<void> {
  const me = await requireStaff();
  if (me.role !== "landlord") return;

  const userId = String(formData.get("userId") ?? "");
  if (!userId || userId === me.id) return; // can't remove yourself

  const admin = createAdminClient();
  const { data: target } = await admin
    .from("users")
    .select("id, org_id")
    .eq("id", userId)
    .maybeSingle();
  if (!target || target.org_id !== me.orgId) return;

  await admin.auth.admin.deleteUser(userId);
  revalidatePath("/users");
}
