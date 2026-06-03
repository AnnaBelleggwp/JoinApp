import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createJoinSupabaseClient, readSupabaseConfig, type JoinSupabaseClient } from "@join/api";

const supabaseConfig = readSupabaseConfig({
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
});

export function hasSupabaseConfig() {
  return Boolean(supabaseConfig.url && supabaseConfig.anonKey);
}

let client: JoinSupabaseClient | null = null;

export function getSupabaseClient() {
  if (!hasSupabaseConfig()) {
    throw new Error("Supabase config is missing");
  }

  client ??= createJoinSupabaseClient(supabaseConfig, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });

  return client;
}
