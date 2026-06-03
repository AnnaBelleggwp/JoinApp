import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { FormButton } from "../components/FormButton";
import { FormTextInput } from "../components/FormTextInput";
import { MessageBox } from "../components/MessageBox";
import { Screen } from "../components/Screen";
import { signInWithPassword, signUpWithPassword } from "../services/bootstrap";
import { colors } from "../theme/colors";

interface AuthScreenProps {
  onAuthenticated: () => void;
}

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setPending(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === "signIn") {
        await signInWithPassword(email.trim(), password);
      } else {
        await signUpWithPassword(email.trim(), password);
        setMessage("Аккаунт создан. Если подтверждение почты включено, проверьте письмо.");
      }

      onAuthenticated();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось выполнить вход");
    } finally {
      setPending(false);
    }
  }

  const isSignIn = mode === "signIn";

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.kicker}>Join</Text>
        <Text style={styles.title}>{isSignIn ? "Вход" : "Регистрация"}</Text>
        <Text style={styles.subtitle}>Войдите, чтобы находить события, общаться и управлять своими встречами.</Text>
      </View>

      {error ? <MessageBox tone="error">{error}</MessageBox> : null}
      {message ? <MessageBox>{message}</MessageBox> : null}

      <View style={styles.form}>
        <FormTextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          textContentType="emailAddress"
          placeholder="name@example.com"
        />
        <FormTextInput
          label="Пароль"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType={isSignIn ? "password" : "newPassword"}
          placeholder="Минимум 6 символов"
        />
        <FormButton disabled={pending || !email.trim() || password.length < 6} onPress={submit}>
          {isSignIn ? "Войти" : "Создать аккаунт"}
        </FormButton>
        <FormButton disabled={pending} variant="secondary" onPress={() => setMode(isSignIn ? "signUp" : "signIn")}>
          {isSignIn ? "Нужен аккаунт" : "Уже есть аккаунт"}
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
    fontSize: 36,
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
