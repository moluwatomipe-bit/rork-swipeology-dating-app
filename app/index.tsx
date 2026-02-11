import { useEffect } from 'react';
import { router } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import Colors from '@/constants/colors';

export default function Index() {
  const { currentUser, onboardingStep, isReady } = useAuth();

  useEffect(() => {
    if (!isReady) return;

    if (currentUser && onboardingStep === 'complete') {
      router.replace('/(tabs)/swipe');
    } else {
      router.replace('/onboarding');
    }
  }, [isReady, currentUser, onboardingStep]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.dark.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.dark.background,
  },
});
