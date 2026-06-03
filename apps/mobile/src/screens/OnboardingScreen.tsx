import type { Session } from "@supabase/supabase-js";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { FormButton } from "../components/FormButton";
import { MessageBox } from "../components/MessageBox";
import { Screen } from "../components/Screen";
import { completeOnboarding, type ProfileRow, signOut } from "../services/bootstrap";
import { colors } from "../theme/colors";

interface OnboardingScreenProps {
  session: Session;
  profile: ProfileRow;
  onCompleted: () => void;
}

export function OnboardingScreen({ session, profile, onCompleted }: OnboardingScreenProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setPending(true);
    setError(null);

    try {
      await completeOnboarding(session.user.id);
      onCompleted();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось завершить onboarding");
    } finally {
      setPending(false);
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.kicker}>Профиль готов</Text>
        <Text style={styles.title}>{profile.display_name}</Text>
        <Text style={styles.subtitle}>Остался последний шаг перед лентой событий.</Text>
      </View>

      {error ? <MessageBox tone="error">{error}</MessageBox> : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Готовы начать</Text>
        <Text style={styles.cardText}>После завершения вы сможете смотреть события и подключаться к встречам.</Text>
      </View>

      <View style={styles.actions}>
        <FormButton disabled={pending} onPress={submit}>
          Завершить onboarding
        </FormButton>
        <FormButton disabled={pending} variant="secondary" onPress={() => void signOut()}>
          Выйти
        </FormButton>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 10,
    marginTop: 36,
  },
  kicker: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: "900",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 24,
  },
  card: {
    gap: 8,
    borderRadius: 8,
    padding: 18,
    backgroundColor: colors.surface,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  cardText: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    gap: 12,
  },
});
