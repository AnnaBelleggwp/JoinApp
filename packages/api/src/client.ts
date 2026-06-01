import { createClient, type SupabaseClient, type SupabaseClientOptions } from "@supabase/supabase-js";
import type { Database } from "@join/db";

export type JoinSupabaseClient = SupabaseClient<Database>;

export interface JoinSupabaseConfig {
  url: string;
  anonKey: string;
}

export function createJoinSupabaseClient(
  config: JoinSupabaseConfig,
  options?: SupabaseClientOptions<"public">,
): JoinSupabaseClient {
  if (!config.url) {
    throw new Error("Supabase URL is required");
  }

  if (!config.anonKey) {
    throw new Error("Supabase anon key is required");
  }

  return createClient<Database>(config.url, config.anonKey, options);
}

export function readSupabaseConfig(env: Record<string, string | undefined>): JoinSupabaseConfig {
  const url = env.VITE_SUPABASE_URL || env.EXPO_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anonKey =
    env.VITE_SUPABASE_ANON_KEY || env.EXPO_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  return { url, anonKey };
}
