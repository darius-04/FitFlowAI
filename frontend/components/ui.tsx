import React from "react";
import { View, Text, StyleSheet, ViewStyle, TextStyle } from "react-native";
import { COLORS } from "../lib/constants";

export const Card: React.FC<{ style?: ViewStyle; children: React.ReactNode; testID?: string }> = ({
  style,
  children,
  testID,
}) => (
  <View testID={testID} style={[styles.card, style]}>
    {children}
  </View>
);

export const SectionTitle: React.FC<{ children: React.ReactNode; style?: TextStyle }> = ({
  children,
  style,
}) => <Text style={[styles.sectionTitle, style]}>{children}</Text>;

export const Overline: React.FC<{ children: React.ReactNode; color?: string }> = ({
  children,
  color,
}) => (
  <Text style={[styles.overline, color ? { color } : null]}>{children}</Text>
);

export const Badge: React.FC<{
  label: string;
  color?: string;
  testID?: string;
}> = ({ label, color = COLORS.primary_workout, testID }) => (
  <View
    testID={testID}
    style={[styles.badge, { borderColor: color, backgroundColor: `${color}1A` }]}
  >
    <Text style={[styles.badgeText, { color }]}>{label.toUpperCase()}</Text>
  </View>
);

export const ProgressBar: React.FC<{ value: number; max: number; color?: string; height?: number }> = ({
  value,
  max,
  color = COLORS.primary_nutrition,
  height = 8,
}) => {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <View style={[styles.progressTrack, { height, borderRadius: height / 2 }]}>
      <View
        style={{
          width: `${pct}%`,
          height: "100%",
          backgroundColor: color,
          borderRadius: height / 2,
        }}
      />
    </View>
  );
};

export const Disclaimer: React.FC<{ children: React.ReactNode; testID?: string }> = ({
  children,
  testID,
}) => (
  <View testID={testID} style={styles.disclaimer}>
    <Text style={styles.disclaimerText}>{children}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 20,
  },
  sectionTitle: {
    color: COLORS.text_primary,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  overline: {
    color: COLORS.text_secondary,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  progressTrack: {
    backgroundColor: COLORS.surface_highlight,
    overflow: "hidden",
  },
  disclaimer: {
    backgroundColor: `${COLORS.warning}1A`,
    borderColor: `${COLORS.warning}66`,
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
  },
  disclaimerText: {
    color: COLORS.warning,
    fontSize: 12,
    lineHeight: 18,
  },
});
