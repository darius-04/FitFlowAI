import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../lib/api';
import { Button } from '../components/Button';
import { Card, Disclaimer } from '../components/ui';
import { COLORS } from '../lib/constants';
import { Sparkles, PlusCircle } from 'lucide-react-native';

type Suggestion = {
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export default function MealSuggestions() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  // Apelăm AI-ul automat când se deschide ecranul
  useEffect(() => {
    fetchSuggestions();
  }, []);

const fetchSuggestions = async () => {
    setLoading(true);
    try {
      // Nu mai trimitem calorii, backend-ul le știe deja din DB!
      const payload = {
        ingredients: [] // Aici poți lăsa gol
      };

      const response = await api.post("/ai/meal-suggestions", payload);

      if (response.suggestions && response.suggestions.length > 0) {
        setSuggestions(response.suggestions);
      } else {
        Alert.alert("Eroare", "Nu am putut genera sugestiile în acest moment.");
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert("Eroare", "A apărut o problemă la conectarea cu serverul.");
    } finally {
      setLoading(false);
    }
  };

 const saveSuggestion = async (meal: Suggestion) => {
     try {
       const payload = {
         name: meal.name, // Am scos "Suggestion:" ca să arate mai curat în jurnal
         date: new Date().toISOString(),
         source: "suggestion",
         items: [{
           name: meal.name,
           quantity: "1 serving",
           calories: meal.calories,
           protein: meal.protein,
           carbs: meal.carbs,
           fat: meal.fat
         }]
       };

       await api.post("/meals", payload);

       // Afișăm doar mesajul de succes, dar NU mai dăm router.back()
       Alert.alert("Success", `${meal.name} added to your diary!`);

     } catch (e: any) {
       Alert.alert("Error", "Could not save the meal.");
     }
   };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <View style={styles.header}>
        <Sparkles color={COLORS.primary_nutrition} size={28} />
        <Text style={styles.title}>AI Suggestions</Text>
      </View>

      <Disclaimer>Based on your daily macro goals and what you've eaten today.</Disclaimer>

      {loading ? (
        <View style={styles.loadingArea}>
          <ActivityIndicator size="large" color={COLORS.primary_nutrition} />
          <Text style={styles.loadingText}>Crafting the perfect meals for your goals...</Text>
        </View>
      ) : (
        <View style={{ marginTop: 20 }}>
          {suggestions.map((meal, idx) => (
            <Card key={idx} style={styles.mealCard}>
              <Text style={styles.mealTitle}>{meal.name}</Text>
              <Text style={styles.mealDesc}>{meal.description}</Text>

              <View style={styles.macrosContainer}>
                <View style={styles.macroBox}>
                  <Text style={styles.macroValue}>{meal.calories}</Text>
                  <Text style={styles.macroLabel}>KCAL</Text>
                </View>
                <View style={styles.macroBox}>
                  <Text style={styles.macroValue}>{meal.protein}g</Text>
                  <Text style={styles.macroLabel}>PRO</Text>
                </View>
                <View style={styles.macroBox}>
                  <Text style={styles.macroValue}>{meal.carbs}g</Text>
                  <Text style={styles.macroLabel}>CARB</Text>
                </View>
                <View style={styles.macroBox}>
                  <Text style={styles.macroValue}>{meal.fat}g</Text>
                  <Text style={styles.macroLabel}>FAT</Text>
                </View>
              </View>

              <Button
                title="Log this meal"
                onPress={() => saveSuggestion(meal)}
                variant="outline"
                style={{ marginTop: 16 }}
              />
            </Card>
          ))}

          <Button
            title="Refresh Suggestions"
            onPress={fetchSuggestions}
            style={{ marginTop: 20 }}
            disabled={loading}
          />
          <View style={{ height: 40 }} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  title: { color: "#fff", fontSize: 24, fontWeight: "900" },
  loadingArea: { marginTop: 60, alignItems: 'center' },
  loadingText: { color: COLORS.text_secondary, marginTop: 16, fontSize: 14 },

  mealCard: {
    marginBottom: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card_bg
  },
  mealTitle: { color: "#fff", fontSize: 18, fontWeight: "bold", marginBottom: 6 },
  mealDesc: { color: COLORS.text_secondary, fontSize: 13, lineHeight: 18, marginBottom: 16 },

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