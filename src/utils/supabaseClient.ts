import { createJoinApi, createJoinSupabaseClient, readSupabaseConfig } from "@join/api";
import { getClientEnv } from "./dataSource";

const supabase = createJoinSupabaseClient(readSupabaseConfig(getClientEnv()));
const joinApi = createJoinApi(supabase);

export function getSupabaseClient() {
  return supabase;
}

export function getJoinApi() {
  return joinApi;
}
