import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Heart, Users, Check } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';
import { User } from '@/types';
import Colors from '@/constants/colors';

const theme = Colors.dark;

type DatingPrefOption = 'men' | 'women' | 'both';

export default function PreferencesScreen() {
  const { currentUser, updateUser } = useAuth();

  const [datingPreference, setDatingPreference] = useState<DatingPrefOption>(
    currentUser?.dating_preference || 'both'
  );
  const [wantsFriends, setWantsFriends] = useState<boolean>(
    currentUser?.wants_friends ?? true
  );
  const [wantsDating, setWantsDating] = useState<boolean>(
    currentUser?.wants_dating ?? true
  );

  const genderOptions: { label: string; value: DatingPrefOption }[] = [
    { label: 'Men', value: 'men' },
    { label: 'Women', value: 'women' },
    { label: 'Both', value: 'both' },
  ];

  const handleSave = useCallback(() => {
    if (!wantsFriends && !wantsDating) {
      Alert.alert('Error', 'Please select at least one mode (Friends or Dating).');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateUser({
      dating_preference: datingPreference,
      wants_friends: wantsFriends,
      wants_dating: wantsDating,
    } as User);
    Alert.alert('Saved', 'Your preferences have been updated.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  }, [datingPreference, wantsFriends, wantsDating, updateUser]);

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Preferences' }} />

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Looking for</Text>
        <View style={styles.optionsContainer}>
          {genderOptions.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.optionButton,
                datingPreference === opt.value && styles.optionButtonSelected,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setDatingPreference(opt.value);
              }}
              activeOpacity={0.7}
              testID={`pref-${opt.value}`}
            >
              <Text
                style={[
                  styles.optionText,
                  datingPreference === opt.value && styles.optionTextSelected,
                ]}
              >
                {opt.label}
              </Text>
              {datingPreference === opt.value && <Check size={18} color={theme.primary} />}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Mode</Text>
        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, wantsFriends && styles.toggleFriendsActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setWantsFriends(!wantsFriends);
            }}
            activeOpacity={0.7}
            testID="toggle-friends"
          >
            <Users size={22} color={wantsFriends ? '#fff' : theme.secondary} />
            <View style={styles.toggleInfo}>
              <Text style={[styles.toggleText, wantsFriends && styles.toggleTextActive]}>
                Friends
              </Text>
              <Text style={[styles.toggleDesc, wantsFriends && styles.toggleDescActive]}>
                See students looking for friends
              </Text>
            </View>
            <View style={[styles.toggleCheck, wantsFriends && styles.toggleCheckActive]}>
              {wantsFriends && <Check size={14} color="#fff" />}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleButton, wantsDating && styles.toggleDatingActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setWantsDating(!wantsDating);
            }}
            activeOpacity={0.7}
            testID="toggle-dating"
          >
            <Heart size={22} color={wantsDating ? '#fff' : theme.primary} />
            <View style={styles.toggleInfo}>
              <Text style={[styles.toggleText, wantsDating && styles.toggleTextActive]}>
                Dating
              </Text>
              <Text style={[styles.toggleDesc, wantsDating && styles.toggleDescActive]}>
                See students looking to date
              </Text>
            </View>
            <View style={[styles.toggleCheck, wantsDating && styles.toggleCheckActive]}>
              {wantsDating && <Check size={14} color="#fff" />}
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.8} testID="save-prefs-btn">
          <LinearGradient
            colors={['#A855F7', '#EC4899']}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.saveButtonText}>Save Preferences</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: theme.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  optionsContainer: {
    gap: 10,
    marginBottom: 28,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.surface,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderWidth: 1.5,
    borderColor: theme.border,
  },
  optionButtonSelected: {
    borderColor: theme.primary,
    backgroundColor: '#A855F710',
  },
  optionText: {
    fontSize: 16,
    color: theme.textSecondary,
    fontWeight: '500' as const,
  },
  optionTextSelected: {
    color: theme.text,
    fontWeight: '600' as const,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderWidth: 1.5,
    borderColor: theme.border,
    gap: 14,
  },
  toggleFriendsActive: {
    borderColor: theme.secondary,
    backgroundColor: theme.secondary,
  },
  toggleDatingActive: {
    borderColor: theme.primary,
    backgroundColor: theme.primary,
  },
  toggleInfo: {
    flex: 1,
    gap: 2,
  },
  toggleText: {
    fontSize: 16,
    color: theme.textSecondary,
    fontWeight: '600' as const,
  },
  toggleTextActive: {
    color: '#fff',
  },
  toggleDesc: {
    fontSize: 13,
    color: theme.textMuted,
  },
  toggleDescActive: {
    color: 'rgba(255,255,255,0.7)',
  },
  toggleCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleCheckActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderColor: 'rgba(255,255,255,0.5)',
  },
  saveButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#fff',
  },
});
