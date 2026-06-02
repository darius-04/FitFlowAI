import React, { useState } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { useAuth } from "../contexts/AuthContext";
import { COLORS } from "../lib/constants";

export default function Login() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (!email || !password) {
      setError("Please enter email and password.");
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      router.replace("/");
    } catch (e: any) {
      setError(e.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} testID="login-screen">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.brand}>FITFLOW AI</Text>
          <Text style={styles.h1}>WELCOME BACK</Text>
          <Text style={styles.sub}>Sign in to continue your training.</Text>

          <View style={styles.form}>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              testID="login-email-input"
            />
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              testID="login-password-input"
            />
            {error ? <Text style={styles.error} testID="login-error">{error}</Text> : null}
            <Button
              title="Sign In"
              onPress={onSubmit}
              loading={loading}
              testID="login-submit-btn"
            />
            <TouchableOpacity onPress={() => router.push("/register")} style={styles.link} testID="login-go-register">
              <Text style={styles.linkText}>
                Don&apos;t have an account? <Text style={{ color: COLORS.primary_workout }}>Sign up</Text>
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
