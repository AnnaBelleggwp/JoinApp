import { StyleSheet, Text, TextInput, type TextInputProps, View } from "react-native";
import { colors } from "../theme/colors";

interface FormTextInputProps extends TextInputProps {
  label: string;
}

export function FormTextInput({ label, style, ...props }: FormTextInputProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, style]}
        autoCapitalize={props.autoCapitalize ?? "none"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 8,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    color: colors.text,
    backgroundColor: colors.white,
    fontSize: 16,
  },
});

