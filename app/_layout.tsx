import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { DataProvider } from "@/contexts/DataContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import Colors from "@/constants/colors";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { user, profile, loading } = useAuth();

  // Don’t render anything until AuthContext finishes loading
  if (loading) return null;

  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Back",
        contentStyle: { backgroundColor: Colors.dark.background },
        headerShown: false,
      }}
    >
      {/* No user → show login */}
      {!user && <Stack.Screen name="index" />}

      {/* User exists but no profile → onboarding */}
      {user && !profile && <Stack.Screen name="onboarding" />}

      {/* User + profile → main app */}
      {user && profile && <Stack.Screen name="(tabs)" />}
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <NotificationProvider>
            <DataProvider>
              <RootLayoutNav />
            </DataProvider>
          </NotificationProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
