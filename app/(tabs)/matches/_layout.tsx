import { Stack } from 'expo-router';
import Colors from '@/constants/colors';

export default function MatchesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.dark.background },
        headerTintColor: Colors.dark.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: Colors.dark.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Matches & Chats' }} />
      <Stack.Screen name="chat" options={{ title: 'Chat' }} />
    </Stack>
  );
}
