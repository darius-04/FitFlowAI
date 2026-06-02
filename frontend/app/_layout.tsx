import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../contexts/AuthContext";
import { COLORS } from "../lib/constants";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: COLORS.background },
            headerTintColor: COLORS.text_primary,
            headerTitleStyle: { fontWeight: "700" },
            contentStyle: { backgroundColor: COLORS.background },
            headerShadowVisible: false,
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="register" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ title: "Set Up Profile" }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="workout-plan" options={{ title: "Workout Plan" }} />
          <Stack.Screen name="workout-session" options={{ title: "Log Workout" }} />
          <Stack.Screen name="workout-history" options={{ title: "Workout History" }} />
          <Stack.Screen name="progress" options={{ title: "Progress" }} />
          <Stack.Screen name="meal-scan" options={{ title: "Meal Scan" }} />
          <Stack.Screen name="fridge-scan" options={{ title: "Fridge Scan" }} />
          <Stack.Screen name="meal-suggestions" options={{ title: "Meal Suggestions" }} />
          <Stack.Screen name="streak" options={{ title: "Weekly Streak" }} />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
