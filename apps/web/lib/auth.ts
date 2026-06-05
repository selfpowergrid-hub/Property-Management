import { redirect } from "next/navigation";
import type { User, UserRole } from "@nyumba360/supabase";
import { can, type Feature } from "@nyumba360/shared";
import { createClient } from "@/lib/supabase/server";

export interface CurrentUser {
  id: string;
  email: string | null;
  role: UserRole | null;
  orgId: string | null;
  profile: User | null;
}

/**
 * Resolve the signed-in user plus their profile (org_id/role). Returns null
 * when unauthenticated. Role/org are read from the validated profile row,
 * which is the same source the JWT claims are derived from.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? null,
    role: (profile?.role ?? (user.app_metadata?.user_role as UserRole | undefined)) ?? null,
    orgId: profile?.org_id ?? null,
    profile: profile ?? null,
  };
}

/** Require a signed-in user with an organisation; redirect otherwise.
 *  A landlord who has signed up but not yet created an org goes to onboarding. */
export async function requireStaff(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.orgId || !user.role) redirect("/onboarding");
  if (user.role === "tenant") redirect("/portal");
  return user;
}

/** Require a staff user who holds a given feature permission (PRD §8);
 *  redirect to the dashboard otherwise. Guards direct-URL access to modules
 *  the role's nav hides. */
export async function requireFeature(feature: Feature): Promise<CurrentUser> {
  const user = await requireStaff();
  if (!can(user.role!, feature)) redirect("/dashboard");
  return user;
}

/** Require a signed-in tenant; redirect otherwise. */
export async function requireTenant(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "tenant") redirect("/dashboard");
  return user;
}
