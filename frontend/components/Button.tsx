import React from "react";
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle } from "react-native";
import { COLORS } from "../lib/constants";

type Props = {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  testID?: string;
  fullWidth?: boolean;
  small?: boolean;
};

export const Button: React.FC<Props> = ({
  title,
  onPress,
  variant = "primary",
  loading,
  disabled,
  style,
  testID,
  fullWidth = true,
  small,
}) => {
  const colors = getVariantStyle(variant);
  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[
        styles.btn,
        small ? styles.btnSmall : null,
        fullWidth ? styles.full : null,
        { backgroundColor: colors.bg, borderColor: colors.border },
        (disabled || loading) ? styles.disabled : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <Text style={[styles.text, small ? styles.textSmall : null, { color: colors.text }]}>{title.toUpperCase()}</Text>
      )}
    </TouchableOpacity>
  );
};

function getVariantStyle(v: Props["variant"]) {
  switch (v) {
    case "secondary":
      return { bg: COLORS.primary_nutrition, border: COLORS.primary_nutrition, text: "#fff" };
    case "outline":
      return { bg: "transparent", border: COLORS.border, text: COLORS.text_primary };
    case "ghost":
      return { bg: "transparent", border: "transparent", text: COLORS.text_primary };
    case "danger":
      return { bg: COLORS.danger, border: COLORS.danger, text: "#fff" };
    case "primary":
    default:
      return { bg: COLORS.primary_workout, border: COLORS.primary_workout, text: "#fff" };
  }
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  btnSmall: { paddingVertical: 8, paddingHorizontal: 12 },
  full: { width: "100%" },
  text: { fontWeight: "700", fontSize: 14, letterSpacing: 1 },
  textSmall: { fontSize: 12 },
  disabled: { opacity: 0.5 },
});
