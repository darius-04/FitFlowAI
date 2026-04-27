import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Card, Disclaimer } from "../../components/ui";
import { Button } from "../../components/Button";
import { COLORS, ACTIVITY_LEVELS, FITNESS_GOALS, EXPERIENCE_LEVELS } from "../../lib/constants";
import { api } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";

export default function Profile() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [targets, setTargets] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, t] = await Promise.all([
        api.get("/profile").catch(() => null),
        api.get("/nutrition/targets").catch(() => null),
      ]);
      setProfile(p);
      setTargets(t);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const lookup = (arr: any[], v: any) => arr.find((x) => x.value === v)?.label || v;

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.primary_workout} /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll} testID="profile-screen">
      <Card>
        <Text style={styles.label}>ACCOUNT</Text>
        <Text style={styles.h2}>{user?.name}</Text>
        <Text style={styles.subtle}>{user?.email}</Text>
      </Card>

      {profile && (
        <Card style={{ marginTop: 14 }}>
          <Text style={styles.label}>YOUR PROFILE</Text>
          <Row k="Age" v={`${profile.age}`} />
          <Row k="Weight" v={`${profile.weight} kg`} />
          <Row k="Height" v={`${profile.height} cm`} />
          <Row k="Gender" v={profile.gender || "—"} />
          <Row k="Activity" v={lookup(ACTIVITY_LEVELS, profile.activity_level)} />
          <Row k="Goal" v={lookup(FITNESS_GOALS, profile.fitness_goal)} />
          <Row k="Experience" v={lookup(EXPERIENCE_LEVELS, profile.experience_level)} />
          <Row k="Days / week" v={`${profile.training_days_per_week}`} />
          <View style={{ height: 12 }} />
          <Button title="Edit Profile" variant="outline" small onPress={() => router.push("/onboarding")} testID="profile-edit-btn" />
        </Card>
      )}

      {targets && (
        <Card style={{ marginTop: 14 }}>
          <Text style={styles.label}>NUTRITION TARGETS</Text>
          <Row k="Calories" v={`${targets.calories} kcal`} />
          <Row k="Protein" v={`${targets.protein} g`} />
          <Row k="Carbs" v={`${targets.carbs} g`} />
          <Row k="Fat" v={`${targets.fat} g`} />
        </Card>
      )}

      <View style={{ height: 16 }} />
      <Disclaimer>
        Calorie and macronutrient targets are estimates based on your profile and are not medical advice.
      </Disclaimer>

      <View style={{ height: 24 }} />
      <Button title="Log Out" variant="danger" onPress={signOut} testID="profile-logout-btn" />
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const Row = ({ k, v }: any) => (
  <View style={styles.row}>
    <Text style={styles.k}>{k}</Text>
    <Text style={styles.v}>{v}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 20 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.background },
  label: { color: COLORS.text_secondary, fontSize: 11, letterSpacing: 2, fontWeight: "600", marginBottom: 6 },
  h2: { color: "#fff", fontSize: 22, fontWeight: "900" },
  subtle: { color: COLORS.text_secondary, marginTop: 4 },
  row: {
    flexDirection: "row", justifyContent: "space-between", paddingVertical: 8,
    borderBottomColor: COLORS.border, borderBottomWidth: 1,
  },
  k: { color: COLORS.text_secondary, fontSize: 13 },
  v: { color: "#fff", fontWeight: "700", fontSize: 13 },
});
