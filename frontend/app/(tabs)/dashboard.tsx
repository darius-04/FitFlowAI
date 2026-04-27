import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Card, ProgressBar, Badge, Disclaimer } from "../../components/ui";
import { Button } from "../../components/Button";
import { COLORS } from "../../lib/constants";
import { api } from "../../lib/api";
import { Flame, Apple, Camera, Dumbbell, Calendar, TrendingUp } from "lucide-react-native";
import { useAuth } from "../../contexts/AuthContext";

export default function Dashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [streak, targets, plan, nutToday, sessions] = await Promise.all([
        api.get("/streak").catch(() => null),
        api.get("/nutrition/targets").catch(() => null),
        api.get("/workout/plan").catch(() => null),
        api.get("/nutrition/today").catch(() => null),
        api.get<any[]>("/workout/sessions?limit=1").catch(() => []),
      ]);
      setData({ streak, targets, plan, nutToday, lastSession: sessions[0] || null });
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(); };

  if (!data && loading) {
    return (
      <View style={styles.center}><ActivityIndicator color={COLORS.primary_workout} /></View>
    );
  }

  const cons = data?.nutToday?.consumed || { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const target = data?.targets || { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const streak = data?.streak;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.text_secondary} />}
      testID="dashboard-screen"
    >
      <Text style={styles.hello}>HELLO, {(user?.name || "ATHLETE").toUpperCase()}</Text>
      <Text style={styles.headline}>READY TO TRAIN?</Text>

      {/* Streak / Weekly */}
      <Card style={{ marginTop: 16 }} testID="dashboard-streak-card">
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.label}>WEEKLY STREAK</Text>
            <Text style={styles.bigNumber}>{streak?.current_streak ?? 0}</Text>
            <Text style={styles.subtle}>weeks</Text>
          </View>
          <Flame color={COLORS.primary_workout} size={36} />
        </View>
        <View style={{ height: 12 }} />
        <Text style={styles.label}>
          THIS WEEK · {streak?.week_workouts_completed ?? 0} / {streak?.workouts_per_week ?? 3}
        </Text>
        <View style={{ height: 6 }} />
        <ProgressBar
          value={streak?.week_workouts_completed ?? 0}
          max={streak?.workouts_per_week ?? 3}
          color={COLORS.primary_workout}
          height={10}
        />
        <View style={{ height: 8 }} />
        <Badge
          label={
            streak?.status === "completed"
              ? "Completed"
              : streak?.status === "at_risk"
              ? "At Risk"
              : "On Track"
          }
          color={
            streak?.status === "completed"
              ? COLORS.success
              : streak?.status === "at_risk"
              ? COLORS.warning
              : COLORS.primary_nutrition
          }
          testID="dashboard-streak-badge"
        />
      </Card>

      {/* Nutrition target */}
      <Card style={{ marginTop: 16 }} testID="dashboard-nutrition-card">
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>TODAY'S NUTRITION</Text>
          <Apple color={COLORS.primary_nutrition} size={22} />
        </View>
        <View style={{ height: 12 }} />
        <View style={styles.rowBetween}>
          <Text style={styles.label}>CALORIES</Text>
          <Text style={styles.value}>{Math.round(cons.calories)} / {target.calories}</Text>
        </View>
        <View style={{ height: 6 }} />
        <ProgressBar value={cons.calories} max={target.calories} color={COLORS.primary_nutrition} />
        <View style={{ height: 14 }} />
        <View style={styles.macroRow}>
          <MacroBar label="P" value={cons.protein} max={target.protein} color="#FF3B30" />
          <MacroBar label="C" value={cons.carbs} max={target.carbs} color="#FF9F0A" />
          <MacroBar label="F" value={cons.fat} max={target.fat} color="#34C759" />
        </View>
      </Card>

      {/* Workout plan */}
      <Card style={{ marginTop: 16 }} testID="dashboard-plan-card">
        <View style={styles.rowBetween}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>CURRENT PLAN</Text>
            <Text style={styles.cardTitle}>{data?.plan?.name || "No plan"}</Text>
            <Text style={styles.subtle}>{data?.plan?.days_per_week ?? 0} days / week</Text>
          </View>
          <Dumbbell color={COLORS.primary_workout} size={22} />
        </View>
        <View style={{ height: 12 }} />
        <Button title="View Plan" variant="outline" small onPress={() => router.push("/workout-plan")} testID="dashboard-view-plan-btn" />
      </Card>

      {/* Last workout */}
      <Card style={{ marginTop: 16 }} testID="dashboard-last-card">
        <View style={styles.rowBetween}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>LAST WORKOUT</Text>
            {data?.lastSession ? (
              <>
                <Text style={styles.cardTitle}>
                  {new Date(data.lastSession.date).toDateString()}
                </Text>
                <Text style={styles.subtle}>
                  {data.lastSession.exercises.length} exercises · vol {Math.round(data.lastSession.total_volume)}
                </Text>
              </>
            ) : (
              <Text style={styles.subtle}>No workouts logged yet.</Text>
            )}
          </View>
          <Calendar color={COLORS.text_secondary} size={20} />
        </View>
      </Card>

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>QUICK ACTIONS</Text>
      <View style={styles.actionsGrid}>
        <ActionButton icon={<Dumbbell color="#fff" size={18} />} label="Start Workout" onPress={() => router.push("/workout-session")} testID="action-start-workout" />
        <ActionButton icon={<Camera color="#fff" size={18} />} label="Scan Meal" onPress={() => router.push("/meal-scan")} testID="action-scan-meal" />
        <ActionButton icon={<Camera color="#fff" size={18} />} label="Scan Fridge" onPress={() => router.push("/fridge-scan")} testID="action-scan-fridge" />
        <ActionButton icon={<TrendingUp color="#fff" size={18} />} label="Progress" onPress={() => router.push("/progress")} testID="action-progress" />
      </View>

      <View style={{ height: 16 }} />
      <Disclaimer>
        Calorie and macronutrient targets are estimates based on your profile and are not medical advice.
      </Disclaimer>
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const MacroBar = ({ label, value, max, color }: any) => (
  <View style={{ flex: 1 }}>
    <View style={styles.rowBetween}>
      <Text style={styles.macroLabel}>{label}</Text>
      <Text style={styles.macroVal}>{Math.round(value)}/{max}g</Text>
    </View>
    <View style={{ height: 4 }} />
    <ProgressBar value={value} max={max || 1} color={color} height={6} />
  </View>
);

const ActionButton = ({ icon, label, onPress, testID }: any) => (
  <TouchableOpacity onPress={onPress} style={styles.action} testID={testID}>
    <View style={styles.actionIcon}>{icon}</View>
    <Text style={styles.actionLabel}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.background },
  hello: { color: COLORS.primary_workout, letterSpacing: 3, fontSize: 11, fontWeight: "700" },
  headline: { color: "#fff", fontSize: 28, fontWeight: "900", marginTop: 4, letterSpacing: 1 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  label: { color: COLORS.text_secondary, fontSize: 11, letterSpacing: 2, fontWeight: "600" },
  cardTitle: { color: "#fff", fontSize: 18, fontWeight: "800", letterSpacing: 0.5, marginTop: 4 },
  bigNumber: { color: "#fff", fontSize: 40, fontWeight: "900", marginTop: 4 },
  subtle: { color: COLORS.text_secondary, fontSize: 12 },
  value: { color: "#fff", fontWeight: "700" },
  macroRow: { flexDirection: "row", gap: 12 },
  macroLabel: { color: COLORS.text_secondary, fontSize: 12, fontWeight: "700" },
  macroVal: { color: "#fff", fontSize: 11 },
  sectionTitle: { color: "#fff", fontSize: 14, fontWeight: "800", letterSpacing: 2 },
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  action: {
    backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1,
    borderRadius: 8, padding: 14, flexBasis: "48%", flexGrow: 1,
    flexDirection: "row", alignItems: "center", gap: 10,
  },
  actionIcon: {
    width: 32, height: 32, borderRadius: 6,
    backgroundColor: COLORS.primary_workout, alignItems: "center", justifyContent: "center",
  },
  actionLabel: { color: "#fff", fontWeight: "700", fontSize: 13 },
});
