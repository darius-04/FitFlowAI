import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useFocusEffect } from "expo-router";
import { Card, Badge, ProgressBar } from "../components/ui";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { COLORS } from "../lib/constants";
import { api } from "../lib/api";
import { Flame } from "lucide-react-native";

export default function Streak() {
  const [streak, setStreak] = useState<any>(null);
  const [target, setTarget] = useState("3");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await api.get("/streak");
      setStreak(s);
      setTarget(String(s.workouts_per_week));
    } finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onSave = async () => {
    const n = parseInt(target, 10);
    if (!n || n < 1 || n > 7) { setMsg("Target must be 1-7"); return; }
    setSaving(true);
    try {
      await api.post("/streak/goal", { workouts_per_week: n });
      setMsg("Goal updated.");
      load();
    } catch (e: any) {
      setMsg(e.message || "Failed");
    } finally { setSaving(false); }
  };

  if (loading || !streak) return <View style={styles.center}><ActivityIndicator color={COLORS.primary_workout} /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll} testID="streak-screen">
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <Text style={styles.label}>CURRENT STREAK</Text>
            <Text style={styles.bigNumber}>{streak.current_streak}</Text>
            <Text style={styles.subtle}>weeks · best {streak.best_streak}</Text>
          </View>
          <Flame color={COLORS.primary_workout} size={48} />
        </View>
      </Card>

      <Card style={{ marginTop: 14 }}>
        <Text style={styles.label}>THIS WEEK</Text>
        <Text style={styles.h2}>{streak.week_workouts_completed} / {streak.workouts_per_week} workouts</Text>
        <View style={{ height: 8 }} />
        <ProgressBar value={streak.week_workouts_completed} max={streak.workouts_per_week} color={COLORS.primary_workout} height={10} />
        <View style={{ height: 10 }} />
        <Badge
          label={
            streak.status === "completed" ? "Completed"
            : streak.status === "at_risk" ? "At Risk"
            : "On Track"
          }
          color={
            streak.status === "completed" ? COLORS.success
            : streak.status === "at_risk" ? COLORS.warning
            : COLORS.primary_nutrition
          }
        />
      </Card>

      <Card style={{ marginTop: 14 }}>
        <Text style={styles.label}>WEEKLY TARGET</Text>
        <Input
          value={target}
          onChangeText={setTarget}
          keyboardType="number-pad"
          placeholder="3"
          testID="streak-target-input"
        />
        <Button title="Update Goal" onPress={onSave} loading={saving} testID="streak-save-btn" />
        {msg ? <Text style={styles.subtle}>{msg}</Text> : null}
      </Card>
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 20 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.background },
  label: { color: COLORS.text_secondary, fontSize: 11, letterSpacing: 2, fontWeight: "600" },
  bigNumber: { color: "#fff", fontSize: 48, fontWeight: "900", marginTop: 4 },
  subtle: { color: COLORS.text_secondary, fontSize: 12, marginTop: 4 },
  h2: { color: "#fff", fontSize: 22, fontWeight: "900", marginTop: 6 },
});
