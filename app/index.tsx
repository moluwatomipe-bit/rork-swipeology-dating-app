import { Redirect } from "expo-router";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import Colors from "@/constants/colors";

export default function Index() {
  const { user, profile, loading } = useAuth();

  // Still loading auth → show spinner, don't navigate yet
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.dark.primary} />
      </View>
    );
  }

  // No user → go to onboarding / auth flow
  if (!user) {
    return <Redirect href="/onboarding" />;
  }

  // User but no profile → onboarding
  if (user && !profile) {
    return <Redirect href="/onboarding" />;
  }

  // User + profile → main app
  return <Redirect href="/(tabs)/swipe" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.dark.background,
  },
});
