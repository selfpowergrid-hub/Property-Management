import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@nyumba360/supabase";
import { supabaseAnonKey, supabaseUrl } from "@/lib/env";

/**
 * Cookie-aware Supabase client for Server Components, Route Handlers, and
 * Server Actions. Read the user via supabase.auth.getUser() (validated against
 * the auth server), never trust getSession() in server code.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component — safe to ignore; the middleware
          // refresh path persists the session cookie instead.
        }
      },
    },
  });
}
