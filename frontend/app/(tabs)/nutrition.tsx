import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Card, ProgressBar, Disclaimer } from "../../components/ui";
import { COLORS } from "../../lib/constants";
import { api } from "../../lib/api";
import { Camera, Refrigerator, ChefHat, Trash2 } from "lucide-react-native";

export default function Nutrition() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [today, history] = await Promise.all([
        api.get("/nutrition/today"),
        api.get<any[]>("/meals?days=14"),
      ]);
      setData({ today, history });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const remove = async (id: string) => {
    try { await api.delete(`/meals/${id}`); load(); } catch {}
  };

  if (loading && !data) return <View style={styles.center}><ActivityIndicator color={COLORS.primary_workout} /></View>;
  const t = data?.today;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      testID="nutrition-screen"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.text_secondary} />}
    >
      <Card>
        <Text style={styles.label}>TODAY · CALORIES</Text>
        <Text style={styles.bigNumber}>{Math.round(t?.consumed?.calories || 0)} <Text style={styles.target}>/ {t?.target?.calories || 0}</Text></Text>
        <View style={{ height: 8 }} />
        <ProgressBar value={t?.consumed?.calories || 0} max={t?.target?.calories || 1} color={COLORS.primary_nutrition} />
        <View style={{ height: 16 }} />
        <View style={{ flexDirection: "row", gap: 12 }}>
          <MacroCol label="Protein" value={t?.consumed?.protein} max={t?.target?.protein} color="#FF3B30" />
          <MacroCol label="Carbs" value={t?.consumed?.carbs} max={t?.target?.carbs} color="#FF9F0A" />
          <MacroCol label="Fat" value={t?.consumed?.fat} max={t?.target?.fat} color="#34C759" />
        </View>
      </Card>

      <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
        <Action icon={<Camera color="#fff" size={18} />} label="Scan Meal" onPress={() => router.push("/meal-scan")} testID="nut-scan-meal" />
        <Action icon={<Refrigerator color="#fff" size={18} />} label="Scan Fridge" onPress={() => router.push("/fridge-scan")} testID="nut-scan-fridge" />
        <Action icon={<ChefHat color="#fff" size={18} />} label="Suggest" onPress={() => router.push("/meal-suggestions")} testID="nut-suggest" />
      </View>

      <Text style={styles.section}>MEALS TODAY</Text>
      {t?.meals?.length ? (
        t.meals.map((m: any) => (
          <Card key={m.id} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.mealName}>{m.name}</Text>
                <Text style={styles.subtle}>
                  {Math.round(m.calories)} kcal · P {Math.round(m.protein)} · C {Math.round(m.carbs)} · F {Math.round(m.fat)}
                </Text>
              </View>
              <TouchableOpacity onPress={() => remove(m.id)} testID={`del-meal-${m.id}`}>
                <Trash2 color={COLORS.danger} size={18} />
              </TouchableOpacity>
            </View>
          </Card>
        ))
      ) : (
        <Card><Text style={styles.subtle}>No meals logged today.</Text></Card>
      )}

      <Text style={styles.section}>RECENT MEALS</Text>
      {data?.history?.length ? (
        data.history.slice(0, 10).map((m: any) => (
          <Card key={m.id} style={{ marginBottom: 8 }}>
            <Text style={styles.mealName}>{m.name}</Text>
            <Text style={styles.subtle}>
              {new Date(m.date).toLocaleDateString()} · {Math.round(m.calories)} kcal
            </Text>
          </Card>
        ))
      ) : (
        <Card><Text style={styles.subtle}>No meal history yet.</Text></Card>
      )}

      <View style={{ height: 16 }} />
      <Disclaimer>
        Nutrition values are approximate visual estimates. Please confirm foods and quantities before saving.
      </Disclaimer>
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const MacroCol = ({ label, value, max, color }: any) => (
  <View style={{ flex: 1 }}>
    <Text style={styles.macroLabel}>{label.toUpperCase()}</Text>
    <Text style={styles.macroVal}>{Math.round(value || 0)}/{max || 0}g</Text>
    <View style={{ height: 4 }} />
    <ProgressBar value={value || 0} max={max || 1} color={color} height={6} />
  </View>
);

const Action = ({ icon, label, onPress, testID }: any) => (
  <TouchableOpacity style={styles.action} onPress={onPress} testID={testID}>
    <View style={styles.actionIcon}>{icon}</View>
    <Text style={styles.actionLabel}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 20 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.background },
  label: { color: COLORS.text_secondary, fontSize: 11, letterSpacing: 2, fontWeight: "600" },
  bigNumber: { color: "#fff", fontSize: 36, fontWeight: "900", marginTop: 4 },
  target: { color: COLORS.text_secondary, fontSize: 18, fontWeight: "600" },
  macroLabel: { color: COLORS.text_secondary, fontSize: 11, letterSpacing: 1.5, fontWeight: "600" },
  macroVal: { color: "#fff", fontWeight: "700", marginTop: 4 },
  section: { color: "#fff", fontWeight: "800", letterSpacing: 2, marginTop: 24, marginBottom: 10 },
  mealName: { color: "#fff", fontWeight: "700", fontSize: 14 },
  subtle: { color: COLORS.text_secondary, fontSize: 12, marginTop: 2 },
  action: {
    flex: 1, backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1,
    borderRadius: 8, padding: 12, alignItems: "center", gap: 6,
  },
  actionIcon: {
    width: 32, height: 32, borderRadius: 6, backgroundColor: COLORS.primary_nutrition,
    alignItems: "center", justifyContent: "center",
  },
  actionLabel: { color: "#fff", fontWeight: "700", fontSize: 11 },
});
