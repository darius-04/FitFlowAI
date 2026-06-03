import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from "react-native";
import { useFocusEffect } from "expo-router";
import { Card } from "../components/ui";
import { COLORS } from "../lib/constants";
import { api } from "../lib/api";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react-native";

export default function WorkoutHistory() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const items = await api.get<any[]>("/workout/sessions?limit=100");
      setSessions(items);
    } finally {
      setLoading(false);
    }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onDelete = (id: string) => {
    Alert.alert("Delete?", "Delete this workout session?", [
      { text: "Cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try { await api.delete(`/workout/sessions/${id}`); load(); } catch {}
      } },
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.primary_workout} /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll} testID="history-screen">
      {!sessions.length && <Card><Text style={styles.subtle}>No sessions logged yet.</Text></Card>}
      {sessions.map((s) => (
        <Card key={s.id} style={{ marginBottom: 10 }} testID={`hist-session-${s.id}`}>
          <TouchableOpacity onPress={() => setOpen(open === s.id ? null : s.id)} testID={`expand-${s.id}`}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <Text style={styles.h3}>{new Date(s.date).toDateString()}</Text>
                <Text style={styles.subtle}>
                  {s.exercises.length} ex - {s.total_sets || 0} sets - vol {Math.round(s.total_volume || 0)}
                  {s.estimated_calories ? ` - ${s.estimated_calories} kcal` : ""}
                </Text>
                {s.notes ? <Text style={styles.notes}>{s.notes}</Text> : null}
              </View>
              {open === s.id ? <ChevronUp color={COLORS.text_secondary} /> : <ChevronDown color={COLORS.text_secondary} />}
            </View>
          </TouchableOpacity>

          {open === s.id && (
            <View style={{ marginTop: 12 }}>
              {s.exercises.map((ex: any) => {
                const exVol = ex.sets.reduce((a: number, st: any) => a + (st.reps || 0) * (st.weight || 0), 0);
                return (
                  <View key={ex.id} style={styles.exBlock}>
                    <Text style={styles.exName}>{ex.name}</Text>
                    <Text style={styles.subtle}>
                      {ex.primary_muscle_group} - vol {Math.round(exVol)}
                      {ex.estimated_calories ? ` - ${ex.estimated_calories} kcal` : ""}
                    </Text>
                    {ex.sets.map((st: any, j: number) => (
                      <Text key={j} style={styles.setLine}>
                        Set {st.set_number || j + 1}: {st.reps} reps x {st.weight} kg{st.rpe ? ` @ RPE ${st.rpe}` : ""}
                      </Text>
                    ))}
                  </View>
                );
              })}
              <TouchableOpacity onPress={() => onDelete(s.id)} style={styles.delBtn} testID={`delete-${s.id}`}>
                <Trash2 color={COLORS.danger} size={16} />
                <Text style={{ color: COLORS.danger, marginLeft: 6 }}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        </Card>
      ))}
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 20 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.background },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  h3: { color: "#fff", fontWeight: "800", fontSize: 14 },
  subtle: { color: COLORS.text_secondary, fontSize: 12, marginTop: 2 },
  notes: { color: COLORS.text_primary, fontSize: 12, marginTop: 4, fontStyle: "italic" },
  exBlock: { paddingVertical: 8, borderTopColor: COLORS.border, borderTopWidth: 1 },
  exName: { color: "#fff", fontWeight: "700", fontSize: 14 },
  setLine: { color: COLORS.text_secondary, fontSize: 12, marginTop: 4 },
  delBtn: { flexDirection: "row", alignItems: "center", marginTop: 12 },
});
