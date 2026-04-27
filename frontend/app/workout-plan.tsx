import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useFocusEffect } from "expo-router";
import { Card, Badge } from "../components/ui";
import { Button } from "../components/Button";
import { COLORS } from "../lib/constants";
import { api } from "../lib/api";

export default function WorkoutPlan() {
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [regen, setRegen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = await api.get("/workout/plan");
      setPlan(p);
    } catch {
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRegenerate = async () => {
    setRegen(true);
    try {
      const p = await api.post("/workout/plan/regenerate");
      setPlan(p);
    } catch {} finally { setRegen(false); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.primary_workout} /></View>;
  if (!plan) return <View style={styles.center}><Text style={{ color: COLORS.text_secondary }}>No plan found.</Text></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll} testID="plan-screen">
      <Card>
        <Text style={styles.label}>YOUR PLAN</Text>
        <Text style={styles.h1}>{plan.name}</Text>
        <Text style={styles.subtle}>
          {plan.days_per_week} days · {plan.experience_level} · {plan.goal.replace("_", " ")}
        </Text>
      </Card>

      {plan.days.map((d: any) => (
        <Card key={d.id} style={{ marginTop: 12 }} testID={`plan-day-${d.day_index}`}>
          <View style={styles.rowBetween}>
            <Text style={styles.dayName}>DAY {d.day_index + 1} · {d.name.toUpperCase()}</Text>
            <Badge label={`${d.exercises.length} EX`} color={COLORS.primary_nutrition} />
          </View>
          <View style={{ height: 10 }} />
          {d.exercises.map((ex: any) => (
            <View key={ex.id} style={styles.exRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.exName}>{ex.name}</Text>
                <Text style={styles.subtle}>{ex.primary_muscle_group} · {ex.equipment}</Text>
              </View>
              <Text style={styles.exMeta}>{ex.sets} × {ex.reps}</Text>
            </View>
          ))}
        </Card>
      ))}

      <View style={{ height: 20 }} />
      <Button
        title={regen ? "Regenerating..." : "Regenerate Plan"}
        variant="outline"
        onPress={onRegenerate}
        loading={regen}
        testID="plan-regen-btn"
      />
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 20 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.background },
  label: { color: COLORS.text_secondary, fontSize: 11, letterSpacing: 2, fontWeight: "600" },
  h1: { color: "#fff", fontSize: 22, fontWeight: "900", marginTop: 4 },
  subtle: { color: COLORS.text_secondary, fontSize: 12, marginTop: 4 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dayName: { color: "#fff", fontSize: 13, fontWeight: "800", letterSpacing: 1.5 },
  exRow: {
    flexDirection: "row", alignItems: "center", paddingVertical: 10,
    borderBottomColor: COLORS.border, borderBottomWidth: 1,
  },
  exName: { color: "#fff", fontWeight: "700", fontSize: 14 },
  exMeta: { color: COLORS.primary_workout, fontWeight: "700", fontSize: 14 },
});
