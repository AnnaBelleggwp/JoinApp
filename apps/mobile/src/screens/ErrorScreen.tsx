import { StyleSheet, Text } from "react-native";
import { MessageBox } from "../components/MessageBox";
import { Screen } from "../components/Screen";
import { colors } from "../theme/colors";

interface ErrorScreenProps {
  message: string;
}

export function ErrorScreen({ message }: ErrorScreenProps) {
  return (
    <Screen>
      <Text style={styles.title}>Ошибка запуска</Text>
      <MessageBox tone="error">{message}</MessageBox>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    marginTop: 36,
    color: colors.text,
    fontSize: 32,
    fontWeight: "900",
  },
});

