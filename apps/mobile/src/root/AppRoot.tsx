import { useCallback, useEffect, useState } from "react";
import { StatusBar } from "react-native";
import { AuthScreen } from "../screens/AuthScreen";
import { ErrorScreen } from "../screens/ErrorScreen";
import { LoadingScreen } from "../screens/LoadingScreen";
import { MainTabsScreen } from "../screens/MainTabsScreen";
import { MissingConfigScreen } from "../screens/MissingConfigScreen";
import { OnboardingScreen } from "../screens/OnboardingScreen";
import { RegistrationScreen } from "../screens/RegistrationScreen";
import { getBootstrapStatus, type BootstrapStatus } from "../services/bootstrap";
import { getSupabaseClient, hasSupabaseConfig } from "../services/supabase";

type RootState =
  | { kind: "loading" }
  | { kind: "missingConfig" }
  | { kind: "error"; message: string }
  | { kind: "loaded"; status: BootstrapStatus };

export function AppRoot() {
  const [state, setState] = useState<RootState>({ kind: "loading" });

  const load = useCallback(async () => {
    if (!hasSupabaseConfig()) {
      setState({ kind: "missingConfig" });
      return;
    }

    try {
      const status = await getBootstrapStatus();
      setState({ kind: "loaded", status });
    } catch (caught) {
      setState({ kind: "error", message: caught instanceof Error ? caught.message : "Не удалось загрузить приложение" });
    }
  }, []);

  useEffect(() => {
    void load();

    if (!hasSupabaseConfig()) return;

    const supabase = getSupabaseClient();
    const { data } = supabase.auth.onAuthStateChange(() => {
      void load();
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, [load]);

  return (
    <>
      <StatusBar barStyle="dark-content" />
      {renderState(state, load)}
    </>
  );
}

function renderState(state: RootState, reload: () => void) {
  if (state.kind === "loading") return <LoadingScreen />;
  if (state.kind === "missingConfig") return <MissingConfigScreen />;
  if (state.kind === "error") return <ErrorScreen message={state.message} />;

  switch (state.status.kind) {
    case "signedOut":
      return <AuthScreen onAuthenticated={reload} />;
    case "needsProfile":
      return <RegistrationScreen session={state.status.session} onProfileCreated={reload} />;
    case "needsOnboarding":
      return <OnboardingScreen session={state.status.session} profile={state.status.profile} onCompleted={reload} />;
    case "ready":
      return <MainTabsScreen profile={state.status.profile} />;
  }
}

