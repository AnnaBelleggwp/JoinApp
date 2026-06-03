import type { Session } from "@supabase/supabase-js";
import type { Database } from "@join/db";
import { getSupabaseClient } from "./supabase";

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export type BootstrapStatus =
  | { kind: "signedOut" }
  | { kind: "needsProfile"; session: Session }
  | { kind: "needsOnboarding"; session: Session; profile: ProfileRow }
  | { kind: "ready"; session: Session; profile: ProfileRow };

export async function getBootstrapStatus(): Promise<BootstrapStatus> {
  const supabase = getSupabaseClient();
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;

  const session = sessionData.session;
  if (!session) return { kind: "signedOut" };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profile) return { kind: "needsProfile", session };
  if (!profile.onboarding_completed) return { kind: "needsOnboarding", session, profile };

  return { kind: "ready", session, profile };
}

export async function signInWithPassword(email: string, password: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUpWithPassword(email: string, password: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
}

export async function signOut() {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function createProfile(input: {
  userId: string;
  username: string;
  displayName: string;
  birthYear?: number | null;
}) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("profiles").insert({
    id: input.userId,
    username: input.username,
    display_name: input.displayName,
    birth_year: input.birthYear ?? null,
    available_for_invites: true,
  });

  if (error) throw error;
}

export async function completeOnboarding(userId: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_completed: true })
    .eq("id", userId);

  if (error) throw error;
}
