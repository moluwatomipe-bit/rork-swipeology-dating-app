import { useEffect } from "react";
import { router } from "expo-router";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import Colors from "@/constants/colors";

export default function Index() {
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    // No user → go to login screen
    if (!user) {
      router.replace("/onboarding");
      return;
    }

    // User exists but no profile → onboarding
    if (user && !profile) {
      router.replace("/onboarding");
      return;
    }

    // User + profile → main app
    if (user && profile) {
      router.replace("/(tabs)/swipe");
    }
  }, [user, profile, loading]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.dark.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.dark.background,
  },
});

