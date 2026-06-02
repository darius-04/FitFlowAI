import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions } from "react-native";
import { LineChart, BarChart } from "react-native-chart-kit";
import { Card } from "../components/ui";
import { COLORS } from "../lib/constants";
import { api } from "../lib/api";
import { SelectChips } from "../components/SelectChips";

const screenWidth = Dimensions.get("window").width;

const chartConfig = (color: string) => ({
  backgroundGradientFrom: COLORS.surface,
  backgroundGradientTo: COLORS.surface,
  color: (opacity = 1) => color,
  labelColor: () => COLORS.text_secondary,
  strokeWidth: 2,
  decimalPlaces: 0,
  propsForDots: { r: "4", strokeWidth: "2", stroke: color },
  propsForBackgroundLines: { stroke: COLORS.border },
});

export default function Progress() {
  const [weekly, setWeekly] = useState<any[]>([]);
  const [oneRm, setOneRm] = useState<any[]>([]);
  const [exerciseList, setExerciseList] = useState<string[]>([]);
  const [selectedEx, setSelectedEx] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProgress = useCallback(async (exName?: string | null) => {
    setLoading(true);
    try {
      const path = exName ? `/workout/progress?exercise_name=${encodeURIComponent(exName)}` : "/workout/progress";
      const data = await api.get(path);
      setWeekly(data.weekly || []);
      setOneRm(data.estimated_1rm || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    api.get<any[]>("/workout/sessions?limit=200").then((sessions) => {
      const set = new Set<string>();
      sessions.forEach((s: any) => s.exercises?.forEach((ex: any) => set.add(ex.name)));
      const list = Array.from(set);
      setExerciseList(list);
      setSelectedEx((current) => current || list[0] || null);
    }).catch(() => {});
    loadProgress();
  }, [loadProgress]);

  useEffect(() => {
    if (selectedEx) loadProgress(selectedEx);
  }, [loadProgress, selectedEx]);

  const w = weekly.slice(-8);
  const labels = w.map((x) => x.week_start.slice(5));
  const workouts = w.map((x) => x.workouts || 0);
  const volumes = w.map((x) => Math.round(x.volume || 0));

  if (loading && !weekly.length) return <View style={styles.center}><ActivityIndicator color={COLORS.primary_workout} /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll} testID="progress-screen">
      <Card>
        <Text style={styles.label}>WORKOUTS / WEEK</Text>
        {labels.length ? (
          <BarChart
            data={{ labels, datasets: [{ data: workouts }] }}
            width={screenWidth - 80}
            height={200}
            chartConfig={chartConfig(COLORS.primary_workout)}
            fromZero
            withInnerLines={false}
            yAxisLabel=""
            yAxisSuffix=""
            style={styles.chart}
            showValuesOnTopOfBars
          />
        ) : (
          <Text style={styles.subtle}>No workout data yet.</Text>
        )}
      </Card>

      <Card style={{ marginTop: 14 }}>
        <Text style={styles.label}>VOLUME / WEEK (KG·REPS)</Text>
        {labels.length ? (
          <LineChart
            data={{ labels, datasets: [{ data: volumes.length ? volumes : [0] }] }}
            width={screenWidth - 80}
            height={200}
            chartConfig={chartConfig(COLORS.primary_nutrition)}
            bezier
            fromZero
            style={styles.chart}
            withInnerLines={false}
          />
        ) : (
          <Text style={styles.subtle}>No volume data yet.</Text>
        )}
      </Card>

      <Card style={{ marginTop: 14 }}>
        <Text style={styles.label}>ESTIMATED 1RM PROGRESSION</Text>
        {exerciseList.length ? (
          <SelectChips
            value={selectedEx}
            options={exerciseList.map((n) => ({ value: n, label: n }))}
            onChange={setSelectedEx}
            testID="progress-exercise"
          />
        ) : (
          <Text style={styles.subtle}>Log workouts to see 1RM progression.</Text>
        )}
        {oneRm.length ? (
          <LineChart
            data={{
              labels: oneRm.slice(-8).map((x: any) => new Date(x.date).getDate().toString()),
              datasets: [{ data: oneRm.slice(-8).map((x: any) => x.estimated_1rm) }],
            }}
            width={screenWidth - 80}
            height={200}
            chartConfig={chartConfig(COLORS.success)}
            bezier
            fromZero
            style={styles.chart}
            withInnerLines={false}
          />
        ) : selectedEx ? (
          <Text style={styles.subtle}>No data for {selectedEx} yet.</Text>
        ) : null}
        <Text style={styles.formula}>1RM ≈ weight × (1 + reps / 30)</Text>
      </Card>
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 20 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.background },
  label: { color: COLORS.text_secondary, fontSize: 11, letterSpacing: 2, fontWeight: "600", marginBottom: 8 },
  subtle: { color: COLORS.text_secondary, marginTop: 6, fontSize: 13 },
  chart: { marginVertical: 8, borderRadius: 8 },
  formula: { color: COLORS.text_secondary, fontSize: 11, marginTop: 6 },
});
