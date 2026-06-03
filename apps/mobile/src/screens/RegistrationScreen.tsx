import type { Session } from "@supabase/supabase-js";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { FormButton } from "../components/FormButton";
import { FormTextInput } from "../components/FormTextInput";
import { MessageBox } from "../components/MessageBox";
import { Screen } from "../components/Screen";
import { createProfile, signOut } from "../services/bootstrap";
import { colors } from "../theme/colors";

interface RegistrationScreenProps {
  session: Session;
  onProfileCreated: () => void;
}

export function RegistrationScreen({ session, onProfileCreated }: RegistrationScreenProps) {
  const emailName = session.user.email?.split("@")[0] ?? "";
  const [displayName, setDisplayName] = useState(emailName);
  const [username, setUsername] = useState(emailName.toLowerCase().replace(/[^a-z0-9_]/g, ""));
  const [birthYear, setBirthYear] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedUsername = useMemo(() => username.trim().toLowerCase().replace(/[^a-z0-9_]/g, ""), [username]);

  async function submit() {
    setPending(true);
    setError(null);

    try {
      await createProfile({
        userId: session.user.id,
        username: normalizedUsername,
        displayName: displayName.trim(),
        birthYear: birthYear.trim() ? Number(birthYear) : null,
      });
      onProfileCreated();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось создать профиль");
    } finally {
      setPending(false);
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Создание профиля</Text>
        <Text style={styles.subtitle}>Укажите имя и username, которые будут видны другим участникам.</Text>
      </View>

      {error ? <MessageBox tone="error">{error}</MessageBox> : null}

      <View style={styles.form}>
        <FormTextInput
          label="Имя"
          value={displayName}
          onChangeText={setDisplayName}
          autoCapitalize="words"
          placeholder="Как вас показывать"
        />
        <FormTextInput
          label="Username"
          value={username}
          onChangeText={setUsername}
          placeholder="username"
        />
        <FormTextInput
          label="Год рождения"
          value={birthYear}
          onChangeText={setBirthYear}
          keyboardType="number-pad"
          placeholder="Например 1995"
        />
        <FormButton disabled={pending || !displayName.trim() || normalizedUsername.length < 3} onPress={submit}>
          Создать профиль
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
  form: {
    gap: 14,
  },
});
