import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Lock, Eye, EyeOff } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';
import Colors from '@/constants/colors';

const theme = Colors.dark;

export default function ChangePasswordScreen() {
  const { currentUser, changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPasswords, setShowPasswords] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isChanging, setIsChanging] = useState<boolean>(false);

  if (!currentUser) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: 'Change Password' }} />
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Please log in.</Text>
        </View>
      </View>
    );
  }

  if (!currentUser.phone_verified) {
    router.replace({
      pathname: '/(tabs)/profile/verify-phone',
      params: { redirect: 'password' },
    });
    return null;
  }

  const handleChangePassword = async () => {
    setError('');

    if (!currentPassword.trim()) {
      setError('Please enter your current password');
      return;
    }
    if (currentPassword !== currentUser.password) {
      setError('Current password is incorrect');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsChanging(true);
    try {
      await changePassword(newPassword);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Your password has been changed.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      console.log('Change password error:', e);
      setError('Failed to change password. Please try again.');
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Change Password' }} />

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <LinearGradient
            colors={['#A855F7', '#EC4899']}
            style={styles.iconCircle}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Lock size={28} color="#fff" />
          </LinearGradient>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Current password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              value={currentPassword}
              onChangeText={(t) => { setCurrentPassword(t); setError(''); }}
              placeholder="Enter current password"
              placeholderTextColor={theme.textMuted}
              secureTextEntry={!showPasswords}
              testID="current-password-input"
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPasswords(!showPasswords)}
              activeOpacity={0.7}
            >
              {showPasswords ? (
                <EyeOff size={20} color={theme.textMuted} />
              ) : (
                <Eye size={20} color={theme.textMuted} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>New password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              value={newPassword}
              onChangeText={(t) => { setNewPassword(t); setError(''); }}
              placeholder="At least 6 characters"
              placeholderTextColor={theme.textMuted}
              secureTextEntry={!showPasswords}
              testID="new-password-input"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Confirm new password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              value={confirmPassword}
              onChangeText={(t) => { setConfirmPassword(t); setError(''); }}
              placeholder="Re-enter new password"
              placeholderTextColor={theme.textMuted}
              secureTextEntry={!showPasswords}
              testID="confirm-password-input"
            />
          </View>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.saveButton, isChanging && styles.buttonDisabled]}
          onPress={handleChangePassword}
          activeOpacity={0.8}
          disabled={isChanging}
          testID="change-password-btn"
        >
          <LinearGradient
            colors={['#A855F7', '#EC4899']}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.saveButtonText}>
              {isChanging ? 'Changing...' : 'Change Password'}
            </Text>
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
    paddingTop: 32,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: theme.textSecondary,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: theme.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.inputBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    color: theme.text,
  },
  eyeButton: {
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  errorText: {
    color: theme.error,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  saveButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
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
