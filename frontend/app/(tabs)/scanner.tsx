import React, { useState } from 'react';
import { View, Button, Image, ActivityIndicator, Alert, Text } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';

const API_BASE = "http://10.0.2.2:8000/api"; // Pentru emulator Android

export default function ScannerScreen() {
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);

  const pickImage = async () => {
    // Cerem permisiunea
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Eroare', 'Avem nevoie de acces la galerie!');
      return;
    }

    // Deschidem galeria
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5, // Comprimare pentru a nu bloca API-ul
      base64: true,
    });

    if (!result.canceled) {
      const base64 = result.assets[0].base64;
      setImage(result.assets[0].uri);
      handleUpload(base64);
    }
  };

  const handleUpload = async (base64Data: string | undefined | null) => {
    if (!base64Data) return;

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/ai/scan-meal`, {
        image_base64: base64Data,
      });

      console.log("Rezultat:", response.data);
      Alert.alert("Analiză Finalizată", `Calorii estimate: ${response.data.totalEstimate?.calories || 0}`);
    } catch (error) {
      console.error(error);
      Alert.alert("Eroare", "Nu am putut contacta serverul.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      {image && <Image source={{ uri: image }} style={{ width: 200, height: 200, marginBottom: 20 }} />}

      <Button title="Alege o poză cu mâncarea" onPress={pickImage} disabled={loading} />

      {loading && (
        <View style={{ marginTop: 20 }}>
          <ActivityIndicator size="large" color="#00ff00" />
          <Text>AI-ul analizează poza...</Text>
        </View>
      )}
    </View>
  );
}