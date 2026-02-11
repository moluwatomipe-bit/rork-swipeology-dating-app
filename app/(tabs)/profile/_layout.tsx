import { Stack } from 'expo-router';
import Colors from '@/constants/colors';

export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.dark.background },
        headerTintColor: Colors.dark.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: Colors.dark.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Profile' }} />
    </Stack>
  );
}
