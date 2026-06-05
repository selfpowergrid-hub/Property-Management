import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@nyumba360/supabase";
import { supabaseServiceRoleKey, supabaseUrl } from "@/lib/env";

/**
 * Service-role client — bypasses RLS. Use ONLY in trusted server actions for
 * provisioning that the strict RLS policies deliberately disallow:
 *   - creating an organisation + linking the first landlord (onboarding)
 *   - accepting an invite (provisioning a staff auth user)
 *   - auto-creating a tenant login on lease activation (AUTH-05)
 * Never import this into client code.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(supabaseUrl(), supabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
