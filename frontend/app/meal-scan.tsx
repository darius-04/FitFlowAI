import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, TouchableOpacity, Platform } from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Card, Disclaimer } from "../components/ui";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { COLORS } from "../lib/constants";
import { api } from "../lib/api";
import { Camera, Upload, Trash2, Plus } from "lucide-react-native";

type Item = {
  name: string;
  quantity: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  confidence?: number;
};

export default function MealScan() {
  const router = useRouter();
  const [imageB64, setImageB64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const pickImage = async (useCamera: boolean) => {
    setError(null);
    if (useCamera && Platform.OS !== "web") {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { setError("Camera permission denied."); return; }
    }
    const res = useCamera && Platform.OS !== "web"
      ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.6, mediaTypes: ImagePicker.MediaTypeOptions.Images })
      : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.6, mediaTypes: ImagePicker.MediaTypeOptions.Images });
    if (res.canceled || !res.assets?.length) return;
    const a = res.assets[0];
    if (!a.base64) { setError("Could not read image."); return; }
    const dataUrl = `data:image/jpeg;base64,${a.base64}`;
    setImageB64(dataUrl);
    setImagePreview(a.uri || dataUrl);
  };

  const onScan = async () => {
    if (!imageB64) return;
    setError(null);
    setScanning(true);
    try {
      const res = await api.post("/ai/scan-meal", { image_base64: imageB64 });
      const detected = (res.detectedFoods || []) as any[];
      if (!detected.length) {
        setError("We could not analyze this image. Please try again with a clearer photo.");
      }
      setItems(detected.map((d: any) => ({
        name: d.name || "Item",
        quantity: d.estimatedQuantity || "",
        calories: String(d.estimatedCalories || 0),
        protein: String(d.protein || 0),
        carbs: String(d.carbs || 0),
        fat: String(d.fat || 0),
        confidence: d.confidence,
      })));
      if (!name) setName("Scanned meal");
    } catch (e: any) {
      setError(e.message || "Scan failed");
    } finally {
      setScanning(false);
    }
  };

  const updateItem = (i: number, field: keyof Item, value: string) => {
    setItems((p) => p.map((it, idx) => idx === i ? { ...it, [field]: value } : it));
  };
  const removeItem = (i: number) => setItems((p) => p.filter((_, idx) => idx !== i));
  const addItem = () => setItems((p) => [...p, { name: "", quantity: "", calories: "0", protein: "0", carbs: "0", fat: "0" }]);

  const totals = items.reduce(
    (a, it) => ({
      cal: a.cal + parseFloat(it.calories || "0"),
      p: a.p + parseFloat(it.protein || "0"),
      c: a.c + parseFloat(it.carbs || "0"),
      f: a.f + parseFloat(it.fat || "0"),
    }),
    { cal: 0, p: 0, c: 0, f: 0 }
  );

  const onSave = async () => {
    if (!items.length) { setError("Add at least one item."); return; }
    if (!name.trim()) { setError("Please name your meal."); return; }
    setSaving(true);
    try {
      await api.post("/meals", {
        name: name.trim(),
        image_b64: imageB64,
        source: "ai_scan",
        items: items.map((it) => ({
          name: it.name,
          quantity: it.quantity,
          calories: parseFloat(it.calories || "0"),
          protein: parseFloat(it.protein || "0"),
          carbs: parseFloat(it.carbs || "0"),
          fat: parseFloat(it.fat || "0"),
          confidence: it.confidence,
        })),
      });
      router.replace("/(tabs)/nutrition");
    } catch (e: any) {
      setError(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll} testID="meal-scan-screen">
      <Card>
        {imagePreview ? (
          <Image source={{ uri: imagePreview }} style={styles.preview} />
        ) : (
          <View style={styles.placeholder}>
            <Camera color={COLORS.text_secondary} size={36} />
            <Text style={styles.subtle}>Take or upload a meal photo</Text>
          </View>
        )}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
          <Button title="Camera" variant="outline" small onPress={() => pickImage(true)} testID="meal-camera-btn" />
          <Button title="Upload" variant="outline" small onPress={() => pickImage(false)} testID="meal-upload-btn" />
        </View>
        {imageB64 ? (
          <View style={{ marginTop: 12 }}>
            <Button title={scanning ? "Analyzing..." : "Analyze with AI"} loading={scanning} onPress={onScan} testID="meal-analyze-btn" />
          </View>
        ) : null}
      </Card>

      {items.length ? (
        <Card style={{ marginTop: 14 }} testID="meal-items-card">
          <Input label="Meal name" value={name} onChangeText={setName} placeholder="e.g., Lunch" testID="meal-name" />
          {items.map((it, i) => (
            <View key={i} style={styles.itemBlock} testID={`meal-item-${i}`}>
              <View style={styles.rowBetween}>
                <Input
                  value={it.name}
                  onChangeText={(v) => updateItem(i, "name", v)}
                  placeholder="Food name"
                  containerStyle={{ flex: 1, marginBottom: 4 }}
                  testID={`item-name-${i}`}
                />
                <TouchableOpacity onPress={() => removeItem(i)} style={{ marginLeft: 8 }} testID={`del-item-${i}`}>
                  <Trash2 color={COLORS.danger} size={18} />
                </TouchableOpacity>
              </View>
              <Input
                value={it.quantity}
                onChangeText={(v) => updateItem(i, "quantity", v)}
                placeholder="Quantity (e.g., 150g)"
                containerStyle={{ marginBottom: 6 }}
              />
              <View style={{ flexDirection: "row", gap: 6 }}>
                <SmallNum label="kcal" v={it.calories} on={(v) => updateItem(i, "calories", v)} />
                <SmallNum label="P" v={it.protein} on={(v) => updateItem(i, "protein", v)} />
                <SmallNum label="C" v={it.carbs} on={(v) => updateItem(i, "carbs", v)} />
                <SmallNum label="F" v={it.fat} on={(v) => updateItem(i, "fat", v)} />
              </View>
            </View>
          ))}
          <Button title="+ Add Item" variant="outline" small onPress={addItem} testID="add-item-btn" />
          <View style={{ height: 12 }} />
          <View style={styles.totals}>
            <Text style={styles.totalText}>TOTAL: {Math.round(totals.cal)} kcal · P {Math.round(totals.p)} · C {Math.round(totals.c)} · F {Math.round(totals.f)}</Text>
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={{ height: 8 }} />
          <Button title="Save Meal" onPress={onSave} loading={saving} testID="save-meal-btn" />
        </Card>
      ) : null}

      {error && !items.length ? <Text style={styles.error}>{error}</Text> : null}

      <View style={{ height: 16 }} />
      <Disclaimer testID="meal-disclaimer">
        Nutrition values are approximate visual estimates. Please confirm foods and quantities before saving.
      </Disclaimer>
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const SmallNum = ({ label, v, on }: any) => (
  <View style={{ flex: 1 }}>
    <Text style={styles.smallLbl}>{label}</Text>
    <Input value={v} onChangeText={on} keyboardType="decimal-pad" containerStyle={{ marginBottom: 0 }} style={{ paddingVertical: 8, fontSize: 13, textAlign: "center" }} />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 20 },
  rowBetween: { flexDirection: "row", alignItems: "center" },
  preview: { width: "100%", height: 220, borderRadius: 8, backgroundColor: COLORS.surface_highlight },
  placeholder: {
    height: 220, borderRadius: 8, alignItems: "center", justifyContent: "center",
    backgroundColor: COLORS.surface_highlight, gap: 8,
  },
  subtle: { color: COLORS.text_secondary, fontSize: 12 },
  itemBlock: { paddingVertical: 8, borderTopColor: COLORS.border, borderTopWidth: 1 },
  smallLbl: { color: COLORS.text_secondary, fontSize: 10, letterSpacing: 1, marginBottom: 4, textAlign: "center" },
  totals: { padding: 12, backgroundColor: COLORS.surface_highlight, borderRadius: 6 },
  totalText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  error: { color: COLORS.danger, marginTop: 10, fontSize: 13 },
});
