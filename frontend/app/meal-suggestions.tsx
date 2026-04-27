import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Card, Disclaimer } from "../components/ui";
import { Button } from "../components/Button";
import { COLORS } from "../lib/constants";
import { api } from "../lib/api";

export default function MealSuggestions() {
  const params = useLocalSearchParams<{ ingredients?: string }>();
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const ingredients = params.ingredients ? String(params.ingredients).split(",").filter(Boolean) : undefined;
      const res = await api.post("/ai/meal-suggestions", { ingredients });
      const items = (res.suggestions || []) as any[];
      if (!items.length) setError("Could not generate suggestions. Please try again.");
      setSuggestions(items);
    } catch (e: any) {
      setError(e.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll} testID="suggestions-screen">
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={COLORS.primary_workout} /></View>
      ) : (
        <>
          {suggestions.map((s, i) => (
            <Card key={i} style={{ marginBottom: 12 }} testID={`sugg-${i}`}>
              <Text style={styles.h2}>{s.name}</Text>
              <Text style={styles.kcal}>
                {s.estimatedCalories} kcal · P {s.protein} · C {s.carbs} · F {s.fat}
              </Text>
              <Text style={styles.label}>INGREDIENTS</Text>
              <Text style={styles.body}>{(s.ingredients || []).join(" · ")}</Text>
              <Text style={styles.label}>PREPARATION</Text>
              <Text style={styles.body}>{s.preparation}</Text>
            </Card>
          ))}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button title="Refresh Suggestions" variant="outline" onPress={fetch} testID="refresh-sugg-btn" />
          <View style={{ height: 16 }} />
          <Disclaimer>
            Meal suggestions are general wellness suggestions and do not replace advice from a doctor or dietitian.
          </Disclaimer>
        </>
      )}
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 20 },
  center: { padding: 40, alignItems: "center" },
  h2: { color: "#fff", fontSize: 18, fontWeight: "900", letterSpacing: 0.5 },
  kcal: { color: COLORS.primary_nutrition, fontWeight: "700", marginTop: 4, fontSize: 13 },
  label: { color: COLORS.text_secondary, fontSize: 11, letterSpacing: 2, fontWeight: "600", marginTop: 12, marginBottom: 4 },
  body: { color: "#fff", fontSize: 13, lineHeight: 20 },
  error: { color: COLORS.danger, marginVertical: 8 },
});
