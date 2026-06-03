import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Modal, FlatList, Linking } from "react-native";
import { useRouter } from "expo-router";
import { Card, Disclaimer } from "../components/ui";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { COLORS } from "../lib/constants";
import { api } from "../lib/api";
import { Trash2, X } from "lucide-react-native";

type SetRow = { reps: string; weight: string; rpe: string };
type ExercisePick = {
  id: string;
  name: string;
  primary_muscle_group: string;
  secondary_muscle_groups: string[];
  met_value: number;
  met_code?: string | null;
  met_category?: string | null;
  estimated_kcal_per_set?: number | null;
  sets: SetRow[];
};

const SECONDS_PER_REP = 3;
const REST_BETWEEN_SETS_SEC = 60;

const roundOne = (value: number) => Math.round(value * 10) / 10;

const parsePositive = (value: string | number | null | undefined) => {
  const parsed = typeof value === "number" ? value : parseFloat(value || "0");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const estimateExerciseCalories = (exercise: ExercisePick, weightKg: number | null) => {
  if (!weightKg || weightKg <= 0) return null;
  const durationMinutes = exercise.sets.reduce((total, set) => {
    const reps = parsePositive(set.reps);
    return total + ((reps * SECONDS_PER_REP) + REST_BETWEEN_SETS_SEC) / 60;
  }, 0);
  return roundOne(((exercise.met_value || 3.5) * 3.5 * weightKg * durationMinutes) / 200);
};

const formatExerciseCalories = (exercise: ExercisePick, weightKg: number | null) => {
  const calories = estimateExerciseCalories(exercise, weightKg);
  return calories == null ? "" : ` - ${calories} kcal est.`;
};

const estimateWorkoutCalories = (exercises: ExercisePick[], weightKg: number | null) => {
  if (!weightKg || weightKg <= 0) return null;
  return roundOne(exercises.reduce((total, exercise) => {
    return total + (estimateExerciseCalories(exercise, weightKg) || 0);
  }, 0));
};

const MET_PAPER_URL = "https://doi.org/10.1249/MSS.0b013e31821ece12";

export default function WorkoutSession() {
  const router = useRouter();
  const [exercises, setExercises] = useState<ExercisePick[]>([]);
  const [notes, setNotes] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [allExercises, setAllExercises] = useState<any[]>([]);
  const [weightKg, setWeightKg] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const profile = await api.get<{ weight: number }>("/profile");
        const weight = Number(profile.weight);
        const hasWeight = Number.isFinite(weight) && weight > 0;
        setWeightKg(hasWeight ? weight : null);
        const query = hasWeight ? `?weight_kg=${weight}` : "";
        const items = await api.get<any[]>(`/exercises${query}`);
        setAllExercises(items);
      } catch {
        api.get<any[]>("/exercises").then(setAllExercises).catch(() => {});
      }
    };
    load();
  }, []);

  const addExercise = (ex: any) => {
    setExercises((p) => [
      ...p,
      {
        id: ex.id,
        name: ex.name,
        primary_muscle_group: ex.primary_muscle_group,
        secondary_muscle_groups: ex.secondary_muscle_groups || [],
        met_value: ex.met_value || 3.5,
        met_code: ex.met_code,
        met_category: ex.met_category,
        estimated_kcal_per_set: ex.estimated_kcal_per_set,
        sets: [{ reps: "8", weight: "20", rpe: "" }],
      },
    ]);
    setPickerOpen(false);
    setSearch("");
  };

  const addSet = (i: number) => {
    setExercises((p) => p.map((e, idx) => idx === i ? { ...e, sets: [...e.sets, { reps: "8", weight: "20", rpe: "" }] } : e));
  };
  const removeSet = (i: number, j: number) => {
    setExercises((p) => p.map((e, idx) => idx === i ? { ...e, sets: e.sets.filter((_, k) => k !== j) } : e));
  };
  const updateSet = (i: number, j: number, field: keyof SetRow, value: string) => {
    setExercises((p) => p.map((e, idx) => idx === i ? {
      ...e,
      sets: e.sets.map((s, k) => k === j ? { ...s, [field]: value } : s),
    } : e));
  };
  const removeExercise = (i: number) => setExercises((p) => p.filter((_, idx) => idx !== i));

  const onSave = async () => {
    setError(null);
    if (!exercises.length) return setError("Add at least one exercise.");
    for (const ex of exercises) {
      if (!ex.sets.length) return setError(`${ex.name} needs at least one set.`);
    }
    setSaving(true);
    try {
      const payload = {
        notes: notes || null,
        exercises: exercises.map((ex) => ({
          name: ex.name,
          exercise_id: ex.id,
          primary_muscle_group: ex.primary_muscle_group,
          secondary_muscle_groups: ex.secondary_muscle_groups,
          sets: ex.sets.map((s, idx) => ({
            set_number: idx + 1,
            reps: parseInt(s.reps || "0", 10),
            weight: parseFloat(s.weight || "0"),
            rpe: s.rpe ? parseFloat(s.rpe) : null,
          })),
        })),
      };
      await api.post("/workout/session", payload);
      router.replace("/workout-history");
    } catch (e: any) {
      setError(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const filtered = allExercises.filter((e) =>
    !search || e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.primary_muscle_group.toLowerCase().includes(search.toLowerCase())
  );
  const totalCalories = estimateWorkoutCalories(exercises, weightKg);

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" testID="session-screen">
        <Input label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="How did it go?" testID="session-notes" />

        {exercises.map((ex, i) => (
          <Card key={`${ex.id}-${i}`} style={{ marginBottom: 12 }} testID={`session-ex-${i}`}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <Text style={styles.exName}>{ex.name}</Text>
                <Text style={styles.subtle}>
                  {ex.primary_muscle_group}{formatExerciseCalories(ex, weightKg)}
                </Text>
              </View>
              <TouchableOpacity onPress={() => removeExercise(i)} testID={`del-ex-${i}`}>
                <Trash2 color={COLORS.danger} size={18} />
              </TouchableOpacity>
            </View>
            <View style={{ height: 8 }} />
            <View style={styles.setHeader}>
              <Text style={styles.setHead}>SET</Text>
              <Text style={styles.setHead}>REPS</Text>
              <Text style={styles.setHead}>WEIGHT (KG)</Text>
              <Text style={styles.setHead}>RPE</Text>
              <Text style={styles.setHead}> </Text>
            </View>
            {ex.sets.map((s, j) => (
              <View key={j} style={styles.setRow}>
                <Text style={styles.setNum}>{j + 1}</Text>
                <SmallInput value={s.reps} onChange={(v) => updateSet(i, j, "reps", v)} testID={`reps-${i}-${j}`} />
                <SmallInput value={s.weight} onChange={(v) => updateSet(i, j, "weight", v)} testID={`weight-${i}-${j}`} />
                <SmallInput value={s.rpe} onChange={(v) => updateSet(i, j, "rpe", v)} testID={`rpe-${i}-${j}`} />
                <TouchableOpacity onPress={() => removeSet(i, j)} testID={`del-set-${i}-${j}`}>
                  <X color={COLORS.text_secondary} size={16} />
                </TouchableOpacity>
              </View>
            ))}
            <View style={{ height: 8 }} />
            <Button title="+ Add Set" variant="outline" small onPress={() => addSet(i)} testID={`add-set-${i}`} />
          </Card>
        ))}

        <Button title="+ Add Exercise" variant="outline" onPress={() => setPickerOpen(true)} testID="add-exercise-btn" />

        {exercises.length > 0 && totalCalories != null ? (
          <Card style={{ marginTop: 12 }} testID="session-calorie-summary">
            <Text style={styles.summaryLabel}>ESTIMATED BURN</Text>
            <Text style={styles.summaryValue}>{totalCalories} kcal</Text>
          </Card>
        ) : null}

        {exercises.length > 0 ? (
          <View style={{ marginTop: 12 }}>
            <Disclaimer testID="session-calorie-disclaimer">
              Calorie estimates are approximate and use MET values from the Compendium of Physical Activities (Ainsworth et al., 2011). They are not medical advice.{" "}
              <Text style={styles.disclaimerLink} onPress={() => Linking.openURL(MET_PAPER_URL)}>
                Read the paper
              </Text>
            </Disclaimer>
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={{ height: 16 }} />
        <Button title="Save Workout" onPress={onSave} loading={saving} testID="save-session-btn" />
        <View style={{ height: 30 }} />
      </ScrollView>

      <Modal visible={pickerOpen} animationType="slide" transparent onRequestClose={() => setPickerOpen(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalSheet}>
            <View style={styles.rowBetween}>
              <Text style={styles.h2}>PICK EXERCISE</Text>
              <TouchableOpacity onPress={() => setPickerOpen(false)} testID="close-picker">
                <X color="#fff" size={20} />
              </TouchableOpacity>
            </View>
            <Input value={search} onChangeText={setSearch} placeholder="Search by name or muscle..." testID="picker-search" />
            <FlatList
              data={filtered}
              keyExtractor={(it) => it.id}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => addExercise(item)} style={styles.pickerItem} testID={`pick-${item.id}`}>
                  <Text style={styles.exName}>{item.name}</Text>
                  <Text style={styles.subtle}>
                    {item.primary_muscle_group} - {item.equipment}
                    {item.estimated_kcal_per_set ? ` - ~${item.estimated_kcal_per_set} kcal/set` : ""}
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={[styles.subtle, { textAlign: "center", marginTop: 20 }]}>No exercises.</Text>
              }
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

type SmallInputProps = {
  value: string;
  onChange: (value: string) => void;
  testID: string;
};

const SmallInput = ({ value, onChange, testID }: SmallInputProps) => (
  <TouchableOpacity activeOpacity={1} style={{ flex: 1, marginHorizontal: 4 }}>
    <Input
      value={value}
      onChangeText={onChange}
      keyboardType="decimal-pad"
      containerStyle={{ marginBottom: 0 }}
      style={{ paddingVertical: 8, fontSize: 13, textAlign: "center" }}
      testID={testID}
    />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 20 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  exName: { color: "#fff", fontWeight: "700", fontSize: 15 },
  subtle: { color: COLORS.text_secondary, fontSize: 12, marginTop: 2 },
  setHeader: { flexDirection: "row", paddingVertical: 6, borderBottomColor: COLORS.border, borderBottomWidth: 1 },
  setHead: { color: COLORS.text_secondary, fontSize: 10, letterSpacing: 1.5, fontWeight: "700", flex: 1, textAlign: "center" },
  setRow: { flexDirection: "row", alignItems: "center", marginVertical: 4 },
  setNum: { color: "#fff", fontWeight: "700", flex: 0.5, textAlign: "center" },
  summaryLabel: { color: COLORS.text_secondary, fontSize: 11, letterSpacing: 2, fontWeight: "700" },
  summaryValue: { color: COLORS.primary_workout, fontSize: 28, fontWeight: "900", marginTop: 4 },
  disclaimerLink: { color: COLORS.text_primary, fontWeight: "800", textDecorationLine: "underline" },
  error: { color: COLORS.danger, marginTop: 12 },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: COLORS.surface, padding: 20, height: "80%", borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  h2: { color: "#fff", fontWeight: "900", letterSpacing: 1, fontSize: 16, marginBottom: 10 },
  pickerItem: { paddingVertical: 12, borderBottomColor: COLORS.border, borderBottomWidth: 1 },
});
