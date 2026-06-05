import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { createSupabaseClient } from "@nyumba360/supabase";

const extra = (Constants.expoConfig?.extra ?? {}) as {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

/**
 * Mobile Supabase client. Uses AsyncStorage for session persistence so the
 * tenant stays signed in (PRD §7.2). Offline caching (Expo SQLite) lands with
 * the full mobile build in Phase 4.
 */
export const supabase = createSupabaseClient(
  extra.supabaseUrl ?? "http://127.0.0.1:54321",
  extra.supabaseAnonKey ?? "",
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);
