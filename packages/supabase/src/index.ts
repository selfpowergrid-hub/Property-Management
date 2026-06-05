import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export * from "./types";

export type TypedSupabaseClient = SupabaseClient<Database>;

/**
 * Framework-agnostic Supabase client (used by scripts and the mobile app).
 * The Next.js web app uses cookie-aware SSR clients in apps/web/lib/supabase
 * instead, so this package stays free of any `next` dependency.
 */
export function createSupabaseClient(
  url: string,
  anonKey: string,
  options?: Parameters<typeof createClient>[2],
): TypedSupabaseClient {
  return createClient<Database>(url, anonKey, options);
}
