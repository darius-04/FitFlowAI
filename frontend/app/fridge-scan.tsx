import React, { useState } from 'react';
import { View, Image, ActivityIndicator, Alert, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { api } from '../lib/api';
import { Button } from '../components/Button';
import { Card, Disclaimer } from '../components/ui';
import { COLORS } from '../lib/constants';
import { Camera, ChefHat, Flame } from 'lucide-react-native';

type Recipe = {
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export default function FridgeScan() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
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
      setRecipes([]); // Resetăm rețetele vechi la o poză nouă
      if (base64) handleUpload(base64);
    }
  };

 const handleUpload = async (base64Data: string) => {
     setLoading(true);
     try {
       const response = await api.post("/ai/scan-fridge", { image_base64: base64Data });

       // Verificăm dacă există `suggestedRecipes` (așa cum o trimite backend-ul tău acum)
       if (response.suggestedRecipes && response.suggestedRecipes.length > 0) {

         // Transformăm datele din backend în formatul de care are nevoie ecranul nostru
         const formattedRecipes = response.suggestedRecipes.map((r: any) => ({
           name: r.title || "Unknown Recipe",
           description: `Ingredients: ${r.ingredientsUsed?.join(", ")} \nDifficulty: ${r.difficulty}`,
           // Punem 0 pentru că backend-ul nu a returnat încă macronutrienții
           calories: r.calories || 0,
           protein: r.protein || 0,
           carbs: r.carbs || 0,
           fat: r.fat || 0
         }));

         setRecipes(formattedRecipes);
       } else {
         Alert.alert("No recipes found", "Gemini couldn't find any clear ingredients to make a recipe.");
       }
       setHasScanned(true);

     } catch (error: any) {
       const msg = error.status === 401
         ? "Session Expired. Please log in again."
         : (error.message || "Could not contact server.");
       Alert.alert("Scan Error", msg);
     } finally {
       setLoading(false);
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
            <Text style={styles.subtle}>Take a photo of your fridge ingredients</Text>
          </View>
        )}

        {/* Butoanele puse pe verticală (column) ca să arate perfect */}
        <View style={{ flexDirection: "column", gap: 12, padding: 16 }}>
          <Button title="Camera" variant="outline" onPress={() => pickImage(true)} disabled={loading} />
          <Button title="Gallery" variant="outline" onPress={() => pickImage(false)} disabled={loading} />
        </View>
      </Card>

      {loading && (
        <View style={styles.loadingArea}>
          <ActivityIndicator size="large" color={COLORS.primary_workout} />
          <Text style={styles.loadingText}>Chef Gemini is brainstorming recipes...</Text>
        </View>
      )}

      {hasScanned && !loading && recipes.length > 0 && (
        <View style={{ marginTop: 24 }}>
          <Text style={styles.sectionTitle}>
            SUGGESTED RECIPES <ChefHat size={16} color="#fff" />
          </Text>
          <Disclaimer>Macros are approximate based on standard portions.</Disclaimer>

          {recipes.map((recipe, idx) => (
            <Card key={idx} style={styles.recipeCard}>
              <View style={styles.recipeHeader}>
                <Text style={styles.recipeTitle}>{recipe.name}</Text>
                <Flame color={COLORS.primary_nutrition} size={20} />
              </View>

              <Text style={styles.recipeDesc}>{recipe.description}</Text>

              <View style={styles.macrosContainer}>
                <View style={styles.macroBox}>
                  <Text style={styles.macroValue}>{recipe.calories}</Text>
                  <Text style={styles.macroLabel}>KCAL</Text>
                </View>
                <View style={styles.macroBox}>
                  <Text style={styles.macroValue}>{recipe.protein}g</Text>
                  <Text style={styles.macroLabel}>PRO</Text>
                </View>
                <View style={styles.macroBox}>
                  <Text style={styles.macroValue}>{recipe.carbs}g</Text>
                  <Text style={styles.macroLabel}>CARB</Text>
                </View>
                <View style={styles.macroBox}>
                  <Text style={styles.macroValue}>{recipe.fat}g</Text>
                  <Text style={styles.macroLabel}>FAT</Text>
                </View>
              </View>
            </Card>
          ))}

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

  sectionTitle: { color: "#fff", fontSize: 14, fontWeight: "800", letterSpacing: 1, marginBottom: 4, flexDirection: 'row', alignItems: 'center' },

  recipeCard: {
    marginTop: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card_bg
  },
  recipeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  recipeTitle: { color: "#fff", fontSize: 18, fontWeight: "bold", flex: 1, paddingRight: 10 },
  recipeDesc: { color: COLORS.text_secondary, fontSize: 13, lineHeight: 18, marginBottom: 16 },

  macrosContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface_highlight,
    borderRadius: 8,
    padding: 12
  },
  macroBox: { alignItems: 'center' },
  macroValue: { color: "#fff", fontSize: 16, fontWeight: "800" },
  macroLabel: { color: COLORS.text_secondary, fontSize: 10, marginTop: 2, fontWeight: "600" }
});