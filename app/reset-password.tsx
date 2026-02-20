import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/supabase';
import Colors from '@/constants/colors';

const theme = Colors.dark;

export default function ResetPasswordScreen() {
  const insets = useSafeAreaInsets();
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPasswords, setShowPasswords] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(true);
  const [sessionReady, setSessionReady] = useState<boolean>(false);

  useEffect(() => {
    console.log('[ResetPassword] Screen mounted, checking for auth session...');

    const checkSession = async () => {
      try {
        if (Platform.OS === 'web') {
          const hash = typeof window !== 'undefined' ? window.location.hash : '';
          console.log('[ResetPassword] Web hash:', hash);

          if (hash) {
            const params = new URLSearchParams(hash.replace('#', ''));
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');
            const type = params.get('type');

            console.log('[ResetPassword] Token type:', type, 'Has access token:', !!accessToken);

            if (accessToken && type === 'recovery') {
              const { data, error: sessionError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken || '',
              });

              if (sessionError) {
                console.log('[ResetPassword] Session error:', sessionError.message);
                setError('Invalid or expired reset link. Please request a new one.');
              } else {
                console.log('[ResetPassword] Session set from URL hash');
                setSessionReady(true);
              }
            }
          }
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log('[ResetPassword] Active session found for:', session.user.email);
          setSessionReady(true);
        } else {
          console.log('[ResetPassword] No active session');
          setError('No active session. Please use the reset link from your email, or request a new one.');
        }
      } catch (err) {
        console.log('[ResetPassword] Error checking session:', err);
        setError('Something went wrong. Please try again.');
      } finally {
        setIsVerifying(false);
      }
    };

    const handleUrl = async (url: string) => {
      console.log('[ResetPassword] Handling deep link URL:', url);
      try {
        const parsed = Linking.parse(url);
        console.log('[ResetPassword] Parsed URL:', JSON.stringify(parsed));

        if (parsed.queryParams?.access_token && parsed.queryParams?.type === 'recovery') {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: parsed.queryParams.access_token as string,
            refresh_token: (parsed.queryParams.refresh_token as string) || '',
          });

          if (sessionError) {
            console.log('[ResetPassword] Deep link session error:', sessionError.message);
            setError('Invalid or expired reset link.');
          } else {
            console.log('[ResetPassword] Session set from deep link');
            setSessionReady(true);
            setIsVerifying(false);
          }
        }
      } catch (err) {
        console.log('[ResetPassword] Deep link parse error:', err);
      }
    };

    const subscription = Linking.addEventListener('url', (event) => {
      handleUrl(event.url);
    });

    Linking.getInitialURL().then((url) => {
      if (url) {
        handleUrl(url);
      }
    });

    const timer = setTimeout(() => {
      checkSession();
    }, 500);

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[ResetPassword] Auth state changed:', event);
      if (event === 'PASSWORD_RECOVERY' && session) {
        console.log('[ResetPassword] PASSWORD_RECOVERY event received');
        setSessionReady(true);
        setIsVerifying(false);
        setError('');
      }
    });

    return () => {
      clearTimeout(timer);
      subscription.remove();
      authSub.unsubscribe();
    };
  }, []);

  const handleResetPassword = async () => {
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('[ResetPassword] Updating password via Supabase...');
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        console.log('[ResetPassword] Update error:', updateError.message);
        setError(updateError.message);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else {
        console.log('[ResetPassword] Password updated successfully');
        setIsSuccess(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e: any) {
      console.log('[ResetPassword] Exception:', e);
      setError(e?.message || 'Failed to reset password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoToLogin = () => {
    router.replace('/onboarding' as any);
  };

  if (isVerifying) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.centeredContent}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.verifyingText}>Verifying reset link...</Text>
        </View>
      </View>
    );
  }

  if (isSuccess) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.centeredContent}>
          <View style={styles.successIconWrap}>
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.successIconCircle}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <CheckCircle size={40} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={styles.successTitle}>Password Reset!</Text>
          <Text style={styles.successSubtitle}>
            Your password has been updated successfully. You can now log in with your new password.
          </Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleGoToLogin}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#A855F7', '#EC4899']}
              style={styles.loginButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.loginButtonText}>Go to Login</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

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

        <Text style={styles.title}>Reset Your Password</Text>
        <Text style={styles.subtitle}>
          Enter your new password below to regain access to Swipeology.
        </Text>

        {!sessionReady && error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorBoxText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={handleGoToLogin}
              activeOpacity={0.8}
            >
              <Text style={styles.retryButtonText}>Go to Login</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
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
                  testID="reset-new-password-input"
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
              <Text style={styles.inputLabel}>Confirm new password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={confirmPassword}
                  onChangeText={(t) => { setConfirmPassword(t); setError(''); }}
                  placeholder="Re-enter new password"
                  placeholderTextColor={theme.textMuted}
                  secureTextEntry={!showPasswords}
                  testID="reset-confirm-password-input"
                />
              </View>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.submitButton, (isSubmitting || !sessionReady) && styles.buttonDisabled]}
              onPress={handleResetPassword}
              activeOpacity={0.8}
              disabled={isSubmitting || !sessionReady}
              testID="reset-password-submit"
            >
              <LinearGradient
                colors={['#A855F7', '#EC4899']}
                style={styles.submitGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.submitText}>
                  {isSubmitting ? 'Resetting...' : 'Reset Password'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={styles.backLink}
          onPress={handleGoToLogin}
          activeOpacity={0.7}
        >
          <Text style={styles.backLinkText}>Back to Login</Text>
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
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  verifyingText: {
    fontSize: 16,
    color: theme.textSecondary,
    marginTop: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: theme.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: theme.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
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
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorBoxText: {
    color: theme.error,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: theme.surface,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: theme.text,
  },
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  submitText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#fff',
  },
  backLink: {
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 10,
  },
  backLinkText: {
    fontSize: 15,
    color: theme.primary,
    fontWeight: '600' as const,
  },
  successIconWrap: {
    marginBottom: 24,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: theme.text,
    marginBottom: 12,
  },
  successSubtitle: {
    fontSize: 16,
    color: theme.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  loginButton: {
    borderRadius: 16,
    overflow: 'hidden',
    width: '100%',
  },
  loginButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  loginButtonText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#fff',
  },
});
