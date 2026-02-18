import { useEffect } from "react";
import { useRouter, useRootNavigationState } from "expo-router";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import Colors from "@/constants/colors";

export default function Index() {
  const router = useRouter();
  const navState = useRootNavigationState();
  const { user, profile, loading } = useAuth();

  // Wait until navigation is fully mounted
  const navReady = navState?.key != null;

  useEffect(() => {
    if (!navReady || loading) return;

    // No user → onboarding
    if (!user) {
      router.replace("/onboarding");
      return;
    }

    // User but no profile → onboarding
    if (user && !profile) {
      router.replace("/onboarding");
      return;
    }

    // User + profile → main app
    if (user && profile) {
      router.replace("/(tabs)/swipe");
    }
  }, [navReady, loading, user, profile]);

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
