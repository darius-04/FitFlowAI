import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Platform } from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Card, Disclaimer } from "../components/ui";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { COLORS } from "../lib/constants";
import { api } from "../lib/api";
import { Refrigerator, Trash2, Check } from "lucide-react-native";

type Ing = { name: string; checked: boolean; confidence?: number };

export default function FridgeScan() {
  const router = useRouter();
  const [imageB64, setImageB64] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [ings, setIngs] = useState<Ing[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [add, setAdd] = useState("");

  const pickImage = async (useCamera: boolean) => {
    setError(null);
    if (useCamera && Platform.OS !== "web") {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { setError("Camera permission denied."); return; }
    }
    const res = useCamera && Platform.OS !== "web"
      ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.6 })
      : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.6 });
    if (res.canceled || !res.assets?.length) return;
    const a = res.assets[0];
    if (!a.base64) return;
    setImageB64(`data:image/jpeg;base64,${a.base64}`);
    setPreview(a.uri || `data:image/jpeg;base64,${a.base64}`);
  };

  const onScan = async () => {
    if (!imageB64) return;
    setError(null);
    setScanning(true);
    try {
      const res = await api.post("/ai/scan-fridge", { image_base64: imageB64 });
      const detected = (res.detectedIngredients || []) as any[];
      if (!detected.length) setError("We could not analyze this image. Please try again with a clearer photo.");
      setIngs(detected.map((d: any) => ({ name: d.name || "", checked: true, confidence: d.confidence })));
    } catch (e: any) {
      setError(e.message || "Scan failed");
    } finally {
      setScanning(false);
    }
  };

  const toggle = (i: number) => setIngs((p) => p.map((x, idx) => idx === i ? { ...x, checked: !x.checked } : x));
  const removeIng = (i: number) => setIngs((p) => p.filter((_, idx) => idx !== i));
  const updateName = (i: number, v: string) => setIngs((p) => p.map((x, idx) => idx === i ? { ...x, name: v } : x));
  const addIng = () => {
    if (!add.trim()) return;
    setIngs((p) => [...p, { name: add.trim(), checked: true }]);
    setAdd("");
  };

  const onSuggest = async () => {
    const selected = ings.filter((x) => x.checked && x.name).map((x) => x.name);
    if (!selected.length) { setError("Pick at least one ingredient."); return; }
    router.push({ pathname: "/meal-suggestions", params: { ingredients: selected.join(",") } });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll} testID="fridge-scan-screen">
      <Card>
        {preview ? (
          <Image source={{ uri: preview }} style={styles.preview} />
        ) : (
          <View style={styles.placeholder}>
            <Refrigerator color={COLORS.text_secondary} size={36} />
            <Text style={styles.subtle}>Take or upload a fridge photo</Text>
          </View>
        )}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
          <Button title="Camera" variant="outline" small onPress={() => pickImage(true)} testID="fridge-camera-btn" />
          <Button title="Upload" variant="outline" small onPress={() => pickImage(false)} testID="fridge-upload-btn" />
        </View>
        {imageB64 ? (
          <View style={{ marginTop: 12 }}>
            <Button title={scanning ? "Analyzing..." : "Detect Ingredients"} loading={scanning} onPress={onScan} testID="fridge-analyze-btn" />
          </View>
        ) : null}
      </Card>

      {ings.length ? (
        <Card style={{ marginTop: 14 }} testID="fridge-ings-card">
          <Text style={styles.label}>INGREDIENTS</Text>
          {ings.map((x, i) => (
            <View key={i} style={styles.ingRow} testID={`ing-${i}`}>
              <TouchableOpacity onPress={() => toggle(i)} style={[styles.cb, x.checked && styles.cbOn]} testID={`toggle-${i}`}>
                {x.checked ? <Check color="#fff" size={14} /> : null}
              </TouchableOpacity>
              <Input
                value={x.name}
                onChangeText={(v) => updateName(i, v)}
                containerStyle={{ flex: 1, marginBottom: 0, marginHorizontal: 8 }}
                style={{ paddingVertical: 8 }}
              />
              <TouchableOpacity onPress={() => removeIng(i)} testID={`del-ing-${i}`}>
                <Trash2 color={COLORS.danger} size={18} />
              </TouchableOpacity>
            </View>
          ))}
          <View style={{ height: 8 }} />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Input value={add} onChangeText={setAdd} placeholder="Add ingredient..." containerStyle={{ flex: 1, marginBottom: 0 }} testID="add-ing-input" />
            <Button title="Add" variant="outline" small fullWidth={false} onPress={addIng} testID="add-ing-btn" />
          </View>
        </Card>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {ings.length ? (
        <View style={{ marginTop: 14 }}>
          <Button title="Get Meal Suggestions" onPress={onSuggest} testID="get-suggestions-btn" />
        </View>
      ) : null}

      <View style={{ height: 16 }} />
      <Disclaimer>
        Ingredient detection is approximate and should be confirmed by you.
      </Disclaimer>
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 20 },
  preview: { width: "100%", height: 220, borderRadius: 8 },
  placeholder: { height: 220, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surface_highlight, gap: 8 },
  subtle: { color: COLORS.text_secondary, fontSize: 12 },
  label: { color: COLORS.text_secondary, fontSize: 11, letterSpacing: 2, fontWeight: "600", marginBottom: 8 },
  ingRow: { flexDirection: "row", alignItems: "center", paddingVertical: 4, borderBottomColor: COLORS.border, borderBottomWidth: 1 },
  cb: { width: 22, height: 22, borderRadius: 4, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  cbOn: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  error: { color: COLORS.danger, marginTop: 12 },
});
