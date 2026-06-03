import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";

interface PlaceholderScreenProps {
  title: string;
  description: string;
}

export function PlaceholderScreen({ title, description }: PlaceholderScreenProps) {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    gap: 12,
    padding: 24,
    backgroundColor: colors.background,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "900",
  },
  description: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 23,
  },
});

