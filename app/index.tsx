import { useEffect } from 'react';
import { router } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import Colors from '@/constants/colors';

export default function Index() {
  const { currentUser, onboardingStep, isReady, session, hasProfile, profileChecked } = useAuth();

  useEffect(() => {
    if (!isReady || !profileChecked) return;

    console.log('[Nav] Routing decision - session:', !!session, 'hasProfile:', hasProfile, 'currentUser:', !!currentUser, 'step:', onboardingStep);

    if (session && hasProfile && currentUser) {
      console.log('[Nav] Profile exists, going to main app');
      router.replace('/(tabs)/swipe' as any);
    } else if (session && hasProfile === false) {
      console.log('[Nav] Logged in but no profile, going to onboarding');
      router.replace('/onboarding' as any);
    } else if (!session) {
      console.log('[Nav] No session, going to onboarding');
      router.replace('/onboarding' as any);
    }
  }, [isReady, profileChecked, session, hasProfile, currentUser, onboardingStep]);

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
