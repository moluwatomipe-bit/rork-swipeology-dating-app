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
import { Lock, Eye, EyeOff, Mail } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/supabase';
import Colors from '@/constants/colors';

const theme = Colors.dark;

export default function ChangePasswordScreen() {
  const { currentUser, changePassword, resetPassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPasswords, setShowPasswords] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isChanging, setIsChanging] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);

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

  const handleChangePassword = async () => {
    setError('');

    if (!currentPassword.trim()) {
      setError('Please enter your current password');
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
      console.log('[ChangePassword] Verifying current password via Supabase');
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: currentUser.school_email,
        password: currentPassword,
      });

      if (signInError) {
        console.log('[ChangePassword] Current password verification failed:', signInError.message);
        setError('Current password is incorrect');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setIsChanging(false);
        return;
      }

      await changePassword(newPassword);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Your password has been changed.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      console.log('[ChangePassword] Error:', e);
      setError(e?.message || 'Failed to change password. Please try again.');
    } finally {
      setIsChanging(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!currentUser.school_email) {
      Alert.alert('Error', 'No email associated with your account.');
      return;
    }

    setIsResetting(true);
    try {
      await resetPassword(currentUser.school_email);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Reset Email Sent',
        `A password reset link has been sent to ${currentUser.school_email}. Check your inbox and follow the link to reset your password.`,
        [{ text: 'OK' }]
      );
    } catch (e: any) {
      console.log('[ChangePassword] Reset error:', e);
      Alert.alert('Error', e?.message || 'Failed to send reset email. Try again later.');
    } finally {
      setIsResetting(false);
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

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={[styles.resetButton, isResetting && styles.buttonDisabled]}
          onPress={handleForgotPassword}
          activeOpacity={0.8}
          disabled={isResetting}
          testID="forgot-password-btn"
        >
          <Mail size={18} color={theme.primary} />
          <Text style={styles.resetButtonText}>
            {isResetting ? 'Sending...' : 'Send Password Reset Email'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.resetHint}>
          A reset link will be sent to your school email. Follow it to set a new password.
        </Text>
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
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.border,
  },
  dividerText: {
    fontSize: 13,
    color: theme.textMuted,
    fontWeight: '500' as const,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: theme.surface,
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: theme.primary,
  },
  resetHint: {
    fontSize: 13,
    color: theme.textMuted,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 18,
  },
});
