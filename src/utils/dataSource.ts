export type JoinDataSource = "local" | "supabase";

type ClientEnv = Record<string, string | undefined>;

export function getClientEnv(): ClientEnv {
  return ((import.meta as ImportMeta & { env?: ClientEnv }).env ?? {}) as ClientEnv;
}

export function getJoinDataSource(env: ClientEnv = getClientEnv()): JoinDataSource {
  return env.VITE_JOIN_DATA_SOURCE === "supabase" ? "supabase" : "local";
}

export function isSupabaseDataSource(): boolean {
  return getJoinDataSource() === "supabase";
}
