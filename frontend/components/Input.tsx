import React from "react";
import { TextInput, View, Text, StyleSheet, TextInputProps, ViewStyle } from "react-native";
import { COLORS } from "../lib/constants";

type Props = TextInputProps & {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
};

export const Input: React.FC<Props> = ({ label, error, containerStyle, ...rest }) => (
  <View style={[styles.wrap, containerStyle]}>
    {label ? <Text style={styles.label}>{label.toUpperCase()}</Text> : null}
    <TextInput
      placeholderTextColor={COLORS.text_secondary}
      {...rest}
      style={[styles.input, error ? styles.inputError : null, rest.style]}
    />
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  wrap: { width: "100%", marginBottom: 12 },
  label: {
    color: COLORS.text_secondary,
    fontSize: 11,
    letterSpacing: 2,
    marginBottom: 6,
    fontWeight: "600",
  },
  input: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
    borderWidth: 1,
    color: COLORS.text_primary,
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  inputError: { borderColor: COLORS.danger },
  errorText: { color: COLORS.danger, fontSize: 12, marginTop: 4 },
});
