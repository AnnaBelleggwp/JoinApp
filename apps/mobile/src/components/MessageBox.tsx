import { StyleSheet, Text } from "react-native";
import { colors } from "../theme/colors";

interface MessageBoxProps {
  children: string;
  tone?: "info" | "error";
}

export function MessageBox({ children, tone = "info" }: MessageBoxProps) {
  return <Text style={[styles.box, tone === "error" && styles.error]}>{children}</Text>;
}

const styles = StyleSheet.create({
  box: {
    borderRadius: 8,
    padding: 12,
    color: colors.text,
    backgroundColor: colors.surfaceMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  error: {
    color: colors.danger,
    backgroundColor: "#fee2e2",
  },
});

