"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { inviteUserSchema, type UserRole } from "@nyumba360/shared";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionState } from "@/app/actions/auth";

/**
 * Landlord invites a manager/caretaker/accountant (PRD §6.1 AUTH-04). Inserts a
 * pending invitation row scoped to the landlord's org. The invitee receives a
 * link to /accept-invite?token=… (delivery is logged for now; SMS/email send is
 * Phase 3). RLS allows the landlord to insert this row directly.
 */
export async function createInvitationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState & { ok?: boolean; link?: string }> {
  const me = await requireStaff();
  if (me.role !== "landlord") return { error: "Only the landlord can invite users." };

  const parsed = inviteUserSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const token = randomUUID();
  const supabase = await createClient();
  const { error } = await supabase.from("user_invitations").insert({
    org_id: me.orgId!,
    email: parsed.data.email,
    role: parsed.data.role as UserRole,
    invited_by: me.id,
    token,
  });
  if (error) return { error: error.message };

  revalidatePath("/users");
  return { ok: true, link: `/accept-invite?token=${token}` };
}

/**
 * Accept an invitation: provisions the staff auth user bound to the inviting
 * org + role (service-role, since RLS can't permit cross-account provisioning),
 * then marks the invite accepted. The on_auth_user_created trigger creates the
 * profile row from the app_metadata we pass.
 */
export async function acceptInvitationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  if (!token) return { error: "Missing invitation token." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (fullName.length < 2) return { error: "Enter your full name." };

  const admin = createAdminClient();

  const { data: invite } = await admin
    .from("user_invitations")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (!invite || invite.status !== "pending") {
    return { error: "This invitation is invalid or has already been used." };
  }
  if (new Date(invite.expires_at) < new Date()) {
    return { error: "This invitation has expired." };
  }

  const { error: createError } = await admin.auth.admin.createUser({
    email: invite.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
    app_metadata: { org_id: invite.org_id, user_role: invite.role },
  });
  if (createError) return { error: createError.message };

  await admin
    .from("user_invitations")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  redirect("/login?invited=1");
}
