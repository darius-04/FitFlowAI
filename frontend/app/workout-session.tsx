import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Modal, FlatList } from "react-native";
import { useRouter } from "expo-router";
import { Card } from "../components/ui";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { COLORS } from "../lib/constants";
import { api } from "../lib/api";
import { Plus, Trash2, X } from "lucide-react-native";

type SetRow = { reps: string; weight: string; rpe: string };
type ExercisePick = {
  id: string;
  name: string;
  primary_muscle_group: string;
  secondary_muscle_groups: string[];
  sets: SetRow[];
};

export default function WorkoutSession() {
  const router = useRouter();
  const [exercises, setExercises] = useState<ExercisePick[]>([]);
  const [notes, setNotes] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [allExercises, setAllExercises] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<any[]>("/exercises").then(setAllExercises).catch(() => {});
  }, []);

  const addExercise = (ex: any) => {
    setExercises((p) => [
      ...p,
      {
        id: ex.id,
        name: ex.name,
        primary_muscle_group: ex.primary_muscle_group,
        secondary_muscle_groups: ex.secondary_muscle_groups || [],
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

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" testID="session-screen">
        <Input label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="How did it go?" testID="session-notes" />

        {exercises.map((ex, i) => (
          <Card key={`${ex.id}-${i}`} style={{ marginBottom: 12 }} testID={`session-ex-${i}`}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <Text style={styles.exName}>{ex.name}</Text>
                <Text style={styles.subtle}>{ex.primary_muscle_group}</Text>
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
                  <Text style={styles.subtle}>{item.primary_muscle_group} · {item.equipment}</Text>
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

const SmallInput = ({ value, onChange, testID }: any) => (
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
  error: { color: COLORS.danger, marginTop: 12 },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: COLORS.surface, padding: 20, height: "80%", borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  h2: { color: "#fff", fontWeight: "900", letterSpacing: 1, fontSize: 16, marginBottom: 10 },
  pickerItem: { paddingVertical: 12, borderBottomColor: COLORS.border, borderBottomWidth: 1 },
});
