import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import Colors from '@/constants/colors';

export default function ModalScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Modal' }} />
      <Text style={styles.text}>Modal</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 16,
  },
});
