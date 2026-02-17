import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Phone, ShieldCheck } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import Colors from '@/constants/colors';

const theme = Colors.dark;

export default function VerifyPhoneScreen() {
  const { currentUser, verifyPhone } = useAuth();
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  const [code, setCode] = useState<string>('');
  const [codeSent, setCodeSent] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const MOCK_CODE = '123456';

  const handleSendCode = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCodeSent(true);
    setError('');
    Alert.alert(
      'Code Sent',
      `A verification code has been sent to ${currentUser?.phone_number || 'your phone'}. (Demo: use 123456)`
    );
    console.log('OTP sent to:', currentUser?.phone_number);
  }, [currentUser]);

  const shakeInput = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const handleVerify = useCallback(async () => {
    if (code.length < 6) {
      setError('Please enter the 6-digit code');
      shakeInput();
      return;
    }

    if (code !== MOCK_CODE) {
      setError('Invalid code. Please try again. (Demo: use 123456)');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      shakeInput();
      return;
    }

    setIsVerifying(true);
    try {
      await verifyPhone();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Verified!', 'Your phone number has been verified.', [
        {
          text: 'Continue',
          onPress: () => {
            if (redirect === 'edit') {
              router.replace('/(tabs)/profile/edit');
            } else if (redirect === 'password') {
              router.replace('/(tabs)/profile/change-password');
            } else {
              router.back();
            }
          },
        },
      ]);
    } catch (e) {
      console.log('Verify phone error:', e);
      setError('Failed to verify. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  }, [code, verifyPhone, redirect, shakeInput]);

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Verify Phone' }} />

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <LinearGradient
            colors={['#A855F7', '#EC4899']}
            style={styles.iconCircle}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {codeSent ? (
              <ShieldCheck size={32} color="#fff" />
            ) : (
              <Phone size={32} color="#fff" />
            )}
          </LinearGradient>
        </View>

        <Text style={styles.title}>
          {codeSent ? 'Enter verification code' : 'Confirm your phone number'}
        </Text>
        <Text style={styles.subtitle}>
          {codeSent
            ? `We sent a 6-digit code to ${currentUser?.phone_number || 'your phone'}`
            : 'We need to verify your phone number before you can make changes to your profile.'}
        </Text>

        {!codeSent ? (
          <View style={styles.phoneDisplay}>
            <Phone size={18} color={theme.textSecondary} />
            <Text style={styles.phoneText}>
              {currentUser?.phone_number || 'No phone number'}
            </Text>
          </View>
        ) : (
          <Animated.View style={[styles.codeInputContainer, { transform: [{ translateX: shakeAnim }] }]}>
            <TextInput
              style={styles.codeInput}
              placeholder="000000"
              placeholderTextColor={theme.textMuted}
              value={code}
              onChangeText={(text) => {
                setCode(text.replace(/[^0-9]/g, '').slice(0, 6));
                setError('');
              }}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              testID="otp-input"
            />
          </Animated.View>
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.primaryButton, isVerifying && styles.buttonDisabled]}
          onPress={codeSent ? handleVerify : handleSendCode}
          activeOpacity={0.8}
          disabled={isVerifying}
          testID="verify-btn"
        >
          <LinearGradient
            colors={['#A855F7', '#EC4899']}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.primaryButtonText}>
              {isVerifying ? 'Verifying...' : codeSent ? 'Verify Code' : 'Send Code'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {codeSent && (
          <TouchableOpacity
            onPress={() => {
              setCodeSent(false);
              setCode('');
              setError('');
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.resendText}>Resend code</Text>
          </TouchableOpacity>
        )}
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: theme.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: theme.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  phoneDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.surface,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 24,
    width: '100%',
  },
  phoneText: {
    fontSize: 16,
    color: theme.text,
    fontWeight: '500' as const,
  },
  codeInputContainer: {
    width: '100%',
    marginBottom: 24,
  },
  codeInput: {
    backgroundColor: theme.inputBg,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 18,
    fontSize: 28,
    color: theme.text,
    borderWidth: 1,
    borderColor: theme.border,
    textAlign: 'center',
    letterSpacing: 12,
    fontWeight: '700' as const,
  },
  errorText: {
    color: theme.error,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  primaryButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#fff',
  },
  resendText: {
    fontSize: 14,
    color: theme.textSecondary,
    marginTop: 16,
    textDecorationLine: 'underline' as const,
  },
});
