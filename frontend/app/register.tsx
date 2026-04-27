import React, { useState } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { useAuth } from "../contexts/AuthContext";
import { COLORS } from "../lib/constants";

export default function Register() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (!name || !email || !password) {
      setError("All fields are required.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      await signUp(email.trim(), password, name.trim());
      router.replace("/onboarding");
    } catch (e: any) {
      setError(e.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} testID="register-screen">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.brand}>FITFLOW AI</Text>
          <Text style={styles.h1}>CREATE ACCOUNT</Text>
          <Text style={styles.sub}>Start your fitness journey today.</Text>

          <View style={styles.form}>
            <Input label="Name" value={name} onChangeText={setName} testID="register-name-input" />
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              testID="register-email-input"
            />
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              testID="register-password-input"
            />
            {error ? <Text style={styles.error} testID="register-error">{error}</Text> : null}
            <Button title="Sign Up" onPress={onSubmit} loading={loading} testID="register-submit-btn" />
            <TouchableOpacity onPress={() => router.push("/login")} style={styles.link} testID="register-go-login">
              <Text style={styles.linkText}>
                Already have an account? <Text style={{ color: COLORS.primary_workout }}>Sign in</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 24, paddingTop: 80 },
  brand: { color: COLORS.primary_workout, letterSpacing: 4, fontWeight: "800", fontSize: 12 },
  h1: { color: "#fff", fontSize: 32, fontWeight: "900", marginTop: 8, letterSpacing: 1 },
  sub: { color: COLORS.text_secondary, marginTop: 6, marginBottom: 32 },
  form: { gap: 4 },
  error: { color: COLORS.danger, marginVertical: 8, fontSize: 13 },
  link: { marginTop: 18, alignItems: "center" },
  linkText: { color: COLORS.text_secondary },
});
