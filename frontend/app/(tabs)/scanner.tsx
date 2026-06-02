import React, { useState } from 'react';
import { View, Image, ActivityIndicator, Alert, Text, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../lib/api'; // Importă helper-ul tău pentru a avea token-ul inclus
import { Button } from '../../components/Button'; // Presupunând că folosești componenta ta de Button
import { COLORS } from '../../lib/constants';

export default function ScannerScreen() {
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permisiune refuzată', 'Avem nevoie de acces la galerie pentru a analiza mâncarea.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled) {
      const base64 = result.assets[0].base64;
      setImage(result.assets[0].uri);
      if (base64) {
        handleUpload(base64);
      }
    }
  };

  const handleUpload = async (base64Data: string) => {
    setLoading(true);
    try {
      // ✅ Folosim api.post în loc de axios.post
      // Acesta adaugă automat header-ul Authorization: Bearer <token>
      const response = await api.post("/ai/scan-meal", {
        image_base64: base64Data,
      });

      console.log("Rezultat AI:", response);

      const calories = response.totalEstimate?.calories || 0;
      Alert.alert(
        "Analiză Finalizată",
        `Am găsit: ${response.detectedFoods?.map((f: any) => f.name).join(", ")}\n\nCalorii totale: ${calories} kcal`
      );
    } catch (error: any) {
      console.error("Eroare la scanare:", error);

      // Gestionăm eroarea 401 specific
      if (error.status === 401) {
        Alert.alert("Sesiune expirată", "Te rugăm să te deloghezi și să te loghezi din nou.");
      } else {
        Alert.alert("Eroare", error.message || "Nu am putut contacta serverul.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Meal Scanner</Text>

      <View style={styles.imageContainer}>
        {image ? (
          <Image source={{ uri: image }} style={styles.preview} />
        ) : (
          <View style={styles.placeholder}>
            <Text style={{ color: COLORS.text_secondary }}>Nicio imagine selectată</Text>
          </View>
        )}
      </View>

      <Button
        title={loading ? "Se analizează..." : "Alege o poză cu mâncarea"}
        onPress={pickImage}
        disabled={loading}
      />

      {loading && (
        <View style={styles.loadingArea}>
          <ActivityIndicator size="large" color={COLORS.primary_workout} />
          <Text style={styles.loadingText}>Gemini analizează ingredientele...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: COLORS.background
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 30
  },
  imageContainer: {
    width: 250,
    height: 250,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: COLORS.card_bg,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center'
  },
  preview: {
    width: '100%',
    height: '100%'
  },
  placeholder: {
    padding: 20
  },
  loadingArea: {
    marginTop: 20,
    alignItems: 'center'
  },
  loadingText: {
    color: COLORS.text_secondary,
    marginTop: 10,
    fontSize: 14
  }
});