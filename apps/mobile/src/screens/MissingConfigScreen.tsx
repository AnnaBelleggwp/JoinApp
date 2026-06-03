import { StyleSheet, Text } from "react-native";
import { MessageBox } from "../components/MessageBox";
import { Screen } from "../components/Screen";
import { colors } from "../theme/colors";

export function MissingConfigScreen() {
  return (
    <Screen>
      <Text style={styles.title}>Нет Supabase config</Text>
      <MessageBox tone="error">
        Укажите EXPO_PUBLIC_SUPABASE_URL и EXPO_PUBLIC_SUPABASE_ANON_KEY, затем перезапустите Expo.
      </MessageBox>
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

