import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { COLORS } from "../lib/constants";

type Option = { label: string; value: string };
type Props = {
  label?: string;
  value: string | null;
  options: Option[];
  onChange: (v: string) => void;
  testID?: string;
};

export const SelectChips: React.FC<Props> = ({ label, value, options, onChange, testID }) => (
  <View style={styles.wrap}>
    {label ? <Text style={styles.label}>{label.toUpperCase()}</Text> : null}
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {options.map((o) => {
        const active = value === o.value;
        return (
          <TouchableOpacity
            key={o.value}
            testID={`${testID || "select"}-${o.value}`}
            onPress={() => onChange(o.value)}
            style={[styles.chip, active ? styles.chipActive : null]}
          >
            <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  </View>
);

const styles = StyleSheet.create({
  wrap: { width: "100%", marginBottom: 14 },
  label: {
    color: COLORS.text_secondary,
    fontSize: 11,
    letterSpacing: 2,
    marginBottom: 8,
    fontWeight: "600",
  },
  row: { gap: 8, paddingRight: 16 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: COLORS.primary_workout,
    borderColor: COLORS.primary_workout,
  },
  chipText: { color: COLORS.text_secondary, fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
});
