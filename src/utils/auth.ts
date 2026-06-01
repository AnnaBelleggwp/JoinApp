import { getJoinDataSource } from "./dataSource";

const USER_ID_KEY = "current_user_id";
const REGISTERED_KEY = "user_registered";
const ONBOARDING_KEY = "onboarding_completed";

export interface AppBootstrapStatus {
  authenticated: boolean;
  registered: boolean;
  onboarded: boolean;
  currentUserId: string | null;
}

export interface EmailPasswordCredentials {
  email: string;
  password: string;
}

export function getCurrentUserId(): string {
  if (getJoinDataSource() === "supabase") {
    const userId = localStorage.getItem(USER_ID_KEY);
    if (!userId) {
      throw new Error("Supabase current user id is not cached yet");
    }
    return userId;
  }

  let userId = localStorage.getItem(USER_ID_KEY);

  if (!userId) {
    // Генерируем уникальный ID для этого пользователя
    userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(USER_ID_KEY, userId);
  }

  return userId;
}

export function clearCurrentUser(): void {
  localStorage.removeItem(USER_ID_KEY);
}

function cacheCurrentUserId(userId: string): void {
  localStorage.setItem(USER_ID_KEY, userId);
}

export function markLocalRegistrationComplete(): void {
  localStorage.setItem(REGISTERED_KEY, "true");
}

export function markLocalOnboardingComplete(): void {
  localStorage.setItem(ONBOARDING_KEY, "true");
}

export async function markRegistrationComplete(): Promise<void> {
  if (getJoinDataSource() !== "supabase") {
    markLocalRegistrationComplete();
  }
}

export async function markOnboardingComplete(): Promise<void> {
  if (getJoinDataSource() !== "supabase") {
    markLocalOnboardingComplete();
    return;
  }

  const { getSupabaseClient } = await import("./supabaseClient");
  const supabase = getSupabaseClient();
  const { data, error: userError } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!data.user) throw new Error("Supabase auth session is required to complete onboarding");

  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_completed: true })
    .eq("id", data.user.id);

  if (error) throw error;
}

export function clearLocalAppSession(): void {
  localStorage.removeItem(REGISTERED_KEY);
  localStorage.removeItem(ONBOARDING_KEY);
  clearCurrentUser();
}

export async function getAppBootstrapStatus(): Promise<AppBootstrapStatus> {
  if (getJoinDataSource() !== "supabase") {
    const onboarded = localStorage.getItem(ONBOARDING_KEY) === "true";
    const registered = localStorage.getItem(REGISTERED_KEY) === "true";
    return {
      authenticated: registered,
      registered,
      onboarded,
      currentUserId: registered ? getCurrentUserId() : null,
    };
  }

  const { getSupabaseClient } = await import("./supabaseClient");
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    clearCurrentUser();
    return { authenticated: false, registered: false, onboarded: false, currentUserId: null };
  }

  cacheCurrentUserId(data.user.id);

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,onboarding_completed")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return { authenticated: true, registered: false, onboarded: false, currentUserId: data.user.id };
  }

  return {
    authenticated: true,
    registered: true,
    onboarded: profile.onboarding_completed,
    currentUserId: data.user.id,
  };
}

export async function signUpWithEmail({ email, password }: EmailPasswordCredentials): Promise<void> {
  const { getSupabaseClient } = await import("./supabaseClient");
  const { data, error } = await getSupabaseClient().auth.signUp({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) throw error;

  if (!data.session && data.user) {
    throw new Error("Аккаунт создан. Подтвердите email перед входом.");
  }

  if (!data.session || !data.user) {
    throw new Error("Аккаунт не был создан");
  }

  cacheCurrentUserId(data.user.id);
}

export async function signInWithEmail({ email, password }: EmailPasswordCredentials): Promise<void> {
  const { getSupabaseClient } = await import("./supabaseClient");
  const { data, error } = await getSupabaseClient().auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) throw error;
  if (!data.user) throw new Error("Вход не вернул пользователя");

  cacheCurrentUserId(data.user.id);
}

export async function ensureCurrentUserId(): Promise<string> {
  if (getJoinDataSource() !== "supabase") {
    return getCurrentUserId();
  }

  const { getSupabaseClient } = await import("./supabaseClient");
  const supabase = getSupabaseClient();
  const existing = await supabase.auth.getUser();

  if (existing.error) {
    throw existing.error;
  }

  if (existing.data.user) {
    cacheCurrentUserId(existing.data.user.id);
    return existing.data.user.id;
  }

  throw new Error("Supabase auth session is required");
}

export async function signOutCurrentUser(): Promise<void> {
  if (getJoinDataSource() === "supabase") {
    const { getSupabaseClient } = await import("./supabaseClient");
    const { error } = await getSupabaseClient().auth.signOut();
    if (error) throw error;
  }

  clearLocalAppSession();
}
