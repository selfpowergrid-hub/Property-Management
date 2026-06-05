"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@nyumba360/supabase";
import { supabaseAnonKey, supabaseUrl } from "@/lib/env";

/** Browser Supabase client for Client Components. */
export function createClient() {
  return createBrowserClient<Database>(supabaseUrl(), supabaseAnonKey());
}
