import React, { useState, useMemo } from 'react';
import { View, Image, ActivityIndicator, Alert, Text, StyleSheet, TextInput, TouchableOpacity, Platform, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { api } from '../lib/api';
import { Button } from '../components/Button';
import { Card, Disclaimer } from '../components/ui';
import { COLORS } from '../lib/constants';
import { Camera, Trash2, Edit3 } from 'lucide-react-native';

export default function MealScan() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);

  // New state to hold editable foods
  const [editableFoods, setEditableFoods] = useState<any[]>([]);
  const [hasScanned, setHasScanned] = useState(false);

  const pickImage = async (useCamera: boolean) => {
    if (useCamera && Platform.OS !== "web") {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { Alert.alert("Permission Denied", "Camera access is required."); return; }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission Denied', 'Gallery access is required.'); return; }
    }

    const result = useCamera && Platform.OS !== "web"
      ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.5 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.5 });

    if (!result.canceled) {
      const base64 = result.assets[0].base64;
      setImage(result.assets[0].uri);
      setHasScanned(false);
      if (base64) handleUpload(base64);
    }
  };

  const handleUpload = async (base64Data: string) => {
    setLoading(true);
    try {
      const response = await api.post("/ai/scan-meal", { image_base64: base64Data });

      // Populate the editable state with AI results
      setEditableFoods(response.detectedFoods || []);
      setHasScanned(true);

    } catch (error: any) {
      const msg = error.status === 401 ? "Session Expired. Please log in again." : (error.message || "Could not contact server.");
      Alert.alert("Scan Error", msg);
    } finally {
      setLoading(false);
    }
  };

  // Dynamic calculations based on user edits
  const totals = useMemo(() => {
    return editableFoods.reduce((acc, curr) => ({
      calories: acc.calories + (Number(curr.estimatedCalories) || 0),
      protein: acc.protein + (Number(curr.protein) || 0),
      carbs: acc.carbs + (Number(curr.carbs) || 0),
      fat: acc.fat + (Number(curr.fat) || 0),
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  }, [editableFoods]);

  // Handlers for editing
  const updateFood = (index: number, field: string, value: string) => {
    const updated = [...editableFoods];
    updated[index] = { ...updated[index], [field]: value };
    setEditableFoods(updated);
  };

  const removeFood = (index: number) => {
    const updated = editableFoods.filter((_, i) => i !== index);
    setEditableFoods(updated);
  };

  const onSaveMeal = async () => {
    if (editableFoods.length === 0) {
      Alert.alert("Empty Meal", "There are no items to save.");
      return;
    }

    try {
      const payload = {
        name: editableFoods[0]?.name ? `Scan: ${editableFoods[0].name}` : "Scanned Meal",
        date: new Date().toISOString(),
        source: "ai_scan",
        items: editableFoods.map(food => ({
          name: food.name || "Unknown food",
          quantity: food.estimatedQuantity || "1 serving",
          calories: Number(food.estimatedCalories) || 0,
          protein: Number(food.protein) || 0,
          carbs: Number(food.carbs) || 0,
          fat: Number(food.fat) || 0,
        }))
      };

      await api.post("/meals", payload);
      router.back();
    } catch (e: any) {
      const details = e.response?.data?.detail;
      const errorMsg = Array.isArray(details) ? details.map(err => err.loc.join(" -> ")).join(", ") : JSON.stringify(details || e.message);
      Alert.alert("Server Error", `Validation failed: ${errorMsg}`);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {image ? (
          <Image source={{ uri: image }} style={styles.preview} />
        ) : (
          <View style={styles.placeholder}>
            <Camera color={COLORS.text_secondary} size={36} />
            <Text style={styles.subtle}>Take a photo or upload from gallery</Text>
          </View>
        )}

      <View style={{ flexDirection: "column", gap: 12, padding: 16 }}>
                <Button title="Camera" variant="outline" onPress={() => pickImage(true)} disabled={loading} />
                <Button title="Gallery" variant="outline" onPress={() => pickImage(false)} disabled={loading} />
      </View>
      </Card>

      {loading && (
        <View style={styles.loadingArea}>
          <ActivityIndicator size="large" color={COLORS.primary_workout} />
          <Text style={styles.loadingText}>Gemini is analyzing...</Text>
        </View>
      )}

      {hasScanned && !loading && (
        <View style={{ marginTop: 20 }}>
          <Card>
            <Text style={styles.label}>TOTAL ESTIMATE</Text>
            <Text style={styles.bigNumber}>{Math.round(totals.calories)} kcal</Text>
            <Text style={styles.macroText}>P: {Math.round(totals.protein)}g  |  C: {Math.round(totals.carbs)}g  |  F: {Math.round(totals.fat)}g</Text>
          </Card>

          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>REVIEW ITEMS <Edit3 size={14} color={COLORS.text_secondary} /></Text>
          <Disclaimer>You can edit names and calories, or remove incorrect items.</Disclaimer>

          {editableFoods.map((food, idx) => (
            <Card key={idx} style={styles.editCard}>
              <View style={styles.editRow}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={styles.inputLabel}>Food Name</Text>
                  <TextInput
                    style={styles.input}
                    value={food.name}
                    onChangeText={(val) => updateFood(idx, 'name', val)}
                    placeholderTextColor={COLORS.text_secondary}
                  />

                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Quantity</Text>
                      <TextInput
                        style={styles.input}
                        value={food.estimatedQuantity}
                        onChangeText={(val) => updateFood(idx, 'estimatedQuantity', val)}
                        placeholderTextColor={COLORS.text_secondary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Calories</Text>
                      <TextInput
                        style={styles.input}
                        value={String(food.estimatedCalories)}
                        onChangeText={(val) => updateFood(idx, 'estimatedCalories', val)}
                        keyboardType="numeric"
                        placeholderTextColor={COLORS.text_secondary}
                      />
                    </View>
                  </View>
                </View>

                <TouchableOpacity onPress={() => removeFood(idx)} style={styles.deleteBtn}>
                  <Trash2 color={COLORS.danger} size={20} />
                </TouchableOpacity>
              </View>
            </Card>
          ))}

          <Button title="Confirm & Save Meal" onPress={onSaveMeal} style={{ marginTop: 20 }} />
          <View style={{ height: 40 }} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  preview: { width: "100%", height: 220 },
  placeholder: { height: 220, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surface_highlight, gap: 8 },
  subtle: { color: COLORS.text_secondary, fontSize: 12 },
  loadingArea: { marginTop: 30, alignItems: 'center' },
  loadingText: { color: COLORS.text_secondary, marginTop: 10, fontSize: 14 },

  label: { color: COLORS.text_secondary, fontSize: 11, letterSpacing: 2, fontWeight: "600", marginBottom: 4 },
  bigNumber: { color: "#fff", fontSize: 28, fontWeight: "900" },
  macroText: { color: COLORS.text_secondary, fontSize: 13, fontWeight: "600", marginTop: 8 },
  sectionTitle: { color: "#fff", fontSize: 14, fontWeight: "800", letterSpacing: 1, marginBottom: 8 },

  editCard: { padding: 12, marginBottom: 10, borderColor: COLORS.border, borderWidth: 1 },
  editRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  inputLabel: { color: COLORS.text_secondary, fontSize: 10, textTransform: "uppercase", marginBottom: 4 },
  input: {
    backgroundColor: COLORS.surface_highlight,
    color: "#fff",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
  },
  deleteBtn: { padding: 10, backgroundColor: 'rgba(255, 59, 48, 0.1)', borderRadius: 8 }
});