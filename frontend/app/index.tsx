import React, { useEffect } from "react";
import { View, Text, StyleSheet, Image, ActivityIndicator, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/Button";
import { COLORS } from "../lib/constants";
import { Disclaimer } from "../components/ui";

export default function Index() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user === undefined) return;
    if (user) {
      if (!user.has_profile) router.replace("/onboarding");
      else router.replace("/(tabs)/dashboard");
    }
  }, [user, router]);

  if (user === undefined) {
    return (
      <View style={styles.loading} testID="root-loading">
        <ActivityIndicator color={COLORS.primary_workout} />
      </View>
    );
  }

  // Landing for unauthenticated users
  return (
    <SafeAreaView style={styles.container} testID="landing-screen">
      <ScrollView contentContainerStyle={styles.scroll}>
        <Image
          source={{ uri: "https://images.unsplash.com/photo-1603665409265-bdc00027c217?crop=entropy&cs=srgb&fm=jpg&w=900" }}
          style={styles.hero}
        />
        <View style={styles.heroOverlay} />
        <View style={styles.heroContent}>
          <Text style={styles.brand}>FITFLOW AI</Text>
          <Text style={styles.headline}>TRAIN SMARTER.{"\n"}EAT BETTER.</Text>
          <Text style={styles.sub}>
            Your personal fitness & nutrition assistant — powered by AI.
          </Text>
        </View>

        <View style={styles.body}>
          <View style={styles.featureRow}>
            <Feature title="Plans" desc="Personalized workout splits" />
            <Feature title="Nutrition" desc="Daily calorie & macro targets" />
          </View>
          <View style={styles.featureRow}>
            <Feature title="AI Scan" desc="Estimate meals from a photo" />
            <Feature title="Streaks" desc="Stay consistent every week" />
          </View>
          <View style={styles.featureRow}>
            <Feature title="Ranking" desc="Track gains by muscle group" />
            <Feature title="Fridge AI" desc="Meal ideas from ingredients" />
          </View>

          <View style={{ marginTop: 24, gap: 12 }}>
            <Button
              title="Get Started"
              onPress={() => router.push("/register")}
              testID="landing-register-btn"
            />
            <Button
              title="I already have an account"
              variant="outline"
              onPress={() => router.push("/login")}
              testID="landing-login-btn"
            />
          </View>

          <Disclaimer testID="landing-disclaimer">
            Nutrition values and AI meal estimates are approximate and are not medical advice.
          </Disclaimer>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const Feature = ({ title, desc }: { title: string; desc: string }) => (
  <View style={styles.feature}>
    <Text style={styles.featureTitle}>{title.toUpperCase()}</Text>
    <Text style={styles.featureDesc}>{desc}</Text>
  </View>
);

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.background },
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingBottom: 32 },
  hero: { width: "100%", height: 320, resizeMode: "cover" },
  heroOverlay: {
    position: "absolute", left: 0, right: 0, top: 0, height: 320,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  heroContent: {
    position: "absolute", left: 0, right: 0, top: 0, height: 320,
    justifyContent: "flex-end", padding: 24,
  },
  brand: { color: COLORS.primary_workout, letterSpacing: 4, fontWeight: "800", fontSize: 12 },
  headline: { color: "#fff", fontSize: 36, fontWeight: "900", letterSpacing: 1, marginTop: 8 },
  sub: { color: COLORS.text_secondary, fontSize: 14, marginTop: 8, lineHeight: 20 },
  body: { padding: 24, gap: 12 },
  featureRow: { flexDirection: "row", gap: 12 },
  feature: {
    flex: 1, backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1,
    padding: 16, borderRadius: 8,
  },
  featureTitle: { color: COLORS.text_primary, fontWeight: "700", letterSpacing: 1, fontSize: 13 },
  featureDesc: { color: COLORS.text_secondary, marginTop: 4, fontSize: 13 },
});
