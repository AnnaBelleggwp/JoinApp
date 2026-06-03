import { ActivityIndicator, StyleSheet, Text } from "react-native";
import { Screen } from "../components/Screen";
import { colors } from "../theme/colors";

export function LoadingScreen() {
  return (
    <Screen scroll={false}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={styles.text}>Загружаем приложение</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  text: {
    color: colors.textMuted,
    textAlign: "center",
    fontSize: 16,
  },
});

