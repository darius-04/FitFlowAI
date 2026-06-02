import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { SelectChips } from "../components/SelectChips";
import { Disclaimer } from "../components/ui";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";
import { ACTIVITY_LEVELS, FITNESS_GOALS, EXPERIENCE_LEVELS, COLORS } from "../lib/constants";

const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Prefer not to say" },
];

export default function Onboarding() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [gender, setGender] = useState<string | null>("male");
  const [activity, setActivity] = useState<string | null>("moderately_active");
  const [goal, setGoal] = useState<string | null>("gain_muscle");
  const [experience, setExperience] = useState<string | null>("beginner");
  const [days, setDays] = useState("3");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    const ageN = parseInt(age, 10);
    const weightN = parseFloat(weight);
    const heightN = parseFloat(height);
    const daysN = parseInt(days, 10);
    if (!ageN || ageN < 13 || ageN > 100) return setError("Enter a valid age (13-100).");
    if (!weightN || weightN <= 0) return setError("Enter a valid weight in kg.");
    if (!heightN || heightN <= 0) return setError("Enter a valid height in cm.");
    if (!activity || !goal || !experience) return setError("Please pick all options.");
    if (!daysN || daysN < 1 || daysN > 6) return setError("Training days must be 1-6.");

    setLoading(true);
    try {
      await api.post("/profile", {
        age: ageN,
        gender: gender === "other" ? null : gender,
        weight: weightN,
        height: heightN,
        activity_level: activity,
        fitness_goal: goal,
        experience_level: experience,
        training_days_per_week: daysN,
      });
      await refreshUser();
      router.replace("/(tabs)/dashboard");
    } catch (e: any) {
      setError(e.message || "Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]} testID="onboarding-screen">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.h1}>TELL US ABOUT YOU</Text>
          <Text style={styles.sub}>We&apos;ll personalize your plan and nutrition targets.</Text>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <Input label="Age" value={age} onChangeText={setAge} keyboardType="number-pad" containerStyle={{ flex: 1 }} testID="onb-age-input" />
            <Input label="Weight (kg)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" containerStyle={{ flex: 1 }} testID="onb-weight-input" />
            <Input label="Height (cm)" value={height} onChangeText={setHeight} keyboardType="decimal-pad" containerStyle={{ flex: 1 }} testID="onb-height-input" />
          </View>

          <SelectChips label="Gender" value={gender} options={GENDERS} onChange={setGender} testID="onb-gender" />
          <SelectChips label="Activity Level" value={activity} options={ACTIVITY_LEVELS} onChange={setActivity} testID="onb-activity" />
          <SelectChips label="Fitness Goal" value={goal} options={FITNESS_GOALS} onChange={setGoal} testID="onb-goal" />
          <SelectChips label="Experience" value={experience} options={EXPERIENCE_LEVELS} onChange={setExperience} testID="onb-experience" />

          <Input
            label="Training Days per Week (1-6)"
            value={days}
            onChangeText={setDays}
            keyboardType="number-pad"
            testID="onb-days-input"
          />

          {error ? <Text style={styles.error} testID="onb-error">{error}</Text> : null}

          <Button title="Save & Continue" onPress={onSubmit} loading={loading} testID="onb-submit-btn" />

          <View style={{ height: 16 }} />
          <Disclaimer>
            Calorie and macro targets are estimates based on your profile and are not medical advice.
          </Disclaimer>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 24, paddingBottom: 60 },
  h1: { color: "#fff", fontSize: 24, fontWeight: "900", letterSpacing: 1 },
  sub: { color: COLORS.text_secondary, marginTop: 6, marginBottom: 20 },
  error: { color: COLORS.danger, marginBottom: 12 },
});
