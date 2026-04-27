import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from "react-native";
import { useFocusEffect } from "expo-router";
import { Card, ProgressBar, Badge, Disclaimer } from "../../components/ui";
import { COLORS } from "../../lib/constants";
import { api } from "../../lib/api";

const LEVEL_COLOR: Record<string, string> = {
  Beginner: "#A3A3A3",
  Intermediate: COLORS.primary_nutrition,
  Advanced: COLORS.warning,
  Elite: COLORS.primary_workout,
};

export default function Ranking() {
  const [items, setItems] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get<any[]>("/ranking");
      setItems(r);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading && !items) return <View style={styles.center}><ActivityIndicator color={COLORS.primary_workout} /></View>;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      testID="ranking-screen"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.text_secondary} />}
    >
      <Text style={styles.h1}>MUSCLE RANKING</Text>
      <Text style={styles.sub}>Based on volume in the last 30 days.</Text>

      {items?.map((it) => (
        <Card key={it.muscle_group} style={{ marginBottom: 12 }} testID={`ranking-${it.muscle_group}`}>
          <View style={styles.rowBetween}>
            <Text style={styles.muscle}>{it.muscle_group.toUpperCase()}</Text>
            <Badge label={it.level} color={LEVEL_COLOR[it.level] || COLORS.primary_workout} />
          </View>
          <Text style={styles.score}>{Math.round(it.score)}<Text style={styles.unit}> pts</Text></Text>
          {it.next_level ? (
            <Text style={styles.subtle}>
              Next: {it.next_level} at {it.next_level_threshold}
            </Text>
          ) : (
            <Text style={styles.subtle}>Maxed level — Elite</Text>
          )}
          <View style={{ height: 6 }} />
          <ProgressBar value={it.progress_pct} max={100} color={LEVEL_COLOR[it.level] || COLORS.primary_workout} />
          {it.top_exercises.length ? (
            <Text style={[styles.subtle, { marginTop: 10 }]}>
              Top: {it.top_exercises.join(" · ")}
            </Text>
          ) : (
            <Text style={[styles.subtle, { marginTop: 10 }]}>Log workouts to build up score.</Text>
          )}
        </Card>
      ))}

      <Disclaimer>
        Rankings reflect total weighted volume only and are not a measure of strength or health.
      </Disclaimer>
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 20 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.background },
  h1: { color: "#fff", fontSize: 26, fontWeight: "900", letterSpacing: 1 },
  sub: { color: COLORS.text_secondary, marginTop: 4, marginBottom: 16 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  muscle: { color: "#fff", fontWeight: "800", letterSpacing: 1, fontSize: 16 },
  score: { color: "#fff", fontSize: 30, fontWeight: "900", marginTop: 6 },
  unit: { fontSize: 14, color: COLORS.text_secondary, fontWeight: "600" },
  subtle: { color: COLORS.text_secondary, fontSize: 12 },
});
