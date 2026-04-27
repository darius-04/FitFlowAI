import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Card } from "../../components/ui";
import { Button } from "../../components/Button";
import { COLORS } from "../../lib/constants";
import { Dumbbell, Calendar, TrendingUp, Flame, Plus } from "lucide-react-native";

export default function WorkoutsHub() {
  const router = useRouter();
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll} testID="workouts-hub">
      <Text style={styles.h1}>WORKOUTS</Text>
      <Text style={styles.sub}>Plan, log, and review your training.</Text>

      <Button title="+ Log a Workout" onPress={() => router.push("/workout-session")} testID="hub-new-session-btn" />

      <View style={{ height: 16 }} />
      <Tile icon={<Dumbbell color={COLORS.primary_workout} size={22} />} title="My Plan" desc="View your generated workout plan" onPress={() => router.push("/workout-plan")} testID="hub-plan" />
      <Tile icon={<Calendar color={COLORS.primary_nutrition} size={22} />} title="History" desc="Review past sessions and volume" onPress={() => router.push("/workout-history")} testID="hub-history" />
      <Tile icon={<TrendingUp color={COLORS.success} size={22} />} title="Progress" desc="Charts: workouts/week, volume, 1RM" onPress={() => router.push("/progress")} testID="hub-progress" />
      <Tile icon={<Flame color={COLORS.warning} size={22} />} title="Streak & Goal" desc="Set weekly target and check status" onPress={() => router.push("/streak")} testID="hub-streak" />
    </ScrollView>
  );
}

const Tile = ({ icon, title, desc, onPress, testID }: any) => (
  <TouchableOpacity onPress={onPress} testID={testID}>
    <Card style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={styles.iconBox}>{icon}</View>
        <View style={{ flex: 1 }}>
          <Text style={styles.tileTitle}>{title}</Text>
          <Text style={styles.sub}>{desc}</Text>
        </View>
        <Plus color={COLORS.text_secondary} size={18} />
      </View>
    </Card>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 20 },
  h1: { color: "#fff", fontSize: 28, fontWeight: "900", letterSpacing: 1 },
  sub: { color: COLORS.text_secondary, marginTop: 4, marginBottom: 18 },
  iconBox: {
    width: 44, height: 44, borderRadius: 8,
    backgroundColor: COLORS.surface_highlight, alignItems: "center", justifyContent: "center",
  },
  tileTitle: { color: "#fff", fontWeight: "700", fontSize: 16, letterSpacing: 0.5 },
});
