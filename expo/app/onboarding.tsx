import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Heart,
  Users,
  Shield,
  ChevronRight,
  Phone,
  User as UserIcon,
  Camera,
  Bell,
  Sparkles,
  Check,
  X,
  Lock,
  Eye,
  EyeOff,
  Mail,
  MessageCircle,
  Award,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/supabase';
import { fetchPronouns, PronounOption } from '@/lib/pronouns';
import { ICEBREAKER_QUESTIONS, PERSONALITY_BADGES, MAX_BADGES } from '@/constants/matching';
import Colors from '@/constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const theme = Colors.dark;

type GenderOption = 'man' | 'woman' | 'non-binary' | 'prefer not to say';
type DatingPrefOption = 'men' | 'women' | 'both';
type OnboardingStepType = 'welcome' | 'login' | 'forgot-password' | 'phone-login' | 'esu-email' | 'create-password' | 'name-age' | 'gender' | 'pronouns' | 'dating-preference' | 'intent' | 'photos' | 'bio-details' | 'icebreakers' | 'personality-badges' | 'notifications' | 'tutorial' | 'final-submit';

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const { login, signUp, completeRegistration, updateUser, goToStep, resetPassword, lookupAccountByEmail, currentUser, session, refreshProfile, isLoggingIn, isSigningUp } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [onboardingStep, setOnboardingStep] = useState<OnboardingStepType>('welcome');

  const animateTransition = (next: typeof onboardingStep) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setOnboardingStep(next);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  };

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [schoolEmail, setSchoolEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<GenderOption | null>(null);
  const [datingPreference, setDatingPreference] = useState<DatingPrefOption | null>(null);
  const [wantsFriends, setWantsFriends] = useState(false);
  const [wantsDating, setWantsDating] = useState(false);

  const [photos, setPhotos] = useState<string[]>(['', '', '', '', '', '']);
  const [bio, setBio] = useState('');
  const [major, setMajor] = useState('');
  const [classYear, setClassYear] = useState('');
  const [interests, setInterests] = useState('');

  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedPronouns, setSelectedPronouns] = useState<string>('');
  const [pronounOptions, setPronounOptions] = useState<PronounOption[]>([]);
  const [pronounsLoaded, setPronounsLoaded] = useState(false);
  const [icebreakerAnswers, setIcebreakerAnswers] = useState<Record<string, string>>({});
  const [selectedBadges, setSelectedBadges] = useState<string[]>([]);
  const [error, setError] = useState('');

  const handlePickPhoto = async (index: number) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled) {
      const updated = [...photos];
      updated[index] = result.assets[0].uri;
      setPhotos(updated);
    }
  };

  const renderWelcome = () => (
    <View style={welcomeStyles.container}>
      <View style={welcomeStyles.content}>
        <View style={welcomeStyles.heroSection}>
          <View style={welcomeStyles.heartCircle}>
            <LinearGradient
              colors={['#C084FC', '#E879F9']}
              style={welcomeStyles.heartGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Heart size={36} color="#FDE68A" fill="#FDE68A" />
            </LinearGradient>
          </View>

          <Text style={welcomeStyles.appName}>Swipeology</Text>
          <Text style={welcomeStyles.tagline}>
            Meet friends and date safely with{'\n'}students from your university.
          </Text>
        </View>

        <View style={welcomeStyles.features}>
          <View style={welcomeStyles.featureRow}>
            <View style={[welcomeStyles.featureIcon, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
              <Shield size={18} color="#A855F7" />
            </View>
            <Text style={welcomeStyles.featureText}>
              Only confirmed students from East{'\n'}Stroudsburg University
            </Text>
          </View>

          <View style={welcomeStyles.featureRow}>
            <View style={[welcomeStyles.featureIcon, { backgroundColor: 'rgba(236, 72, 153, 0.15)' }]}>
              <Users size={18} color="#EC4899" />
            </View>
            <Text style={welcomeStyles.featureText}>
              Friends and Dating sections in one{'\n'}app
            </Text>
          </View>

          <View style={welcomeStyles.featureRow}>
            <View style={[welcomeStyles.featureIcon, { backgroundColor: 'rgba(168, 85, 247, 0.1)' }]}>
              <Sparkles size={18} color="#C084FC" />
            </View>
            <Text style={welcomeStyles.featureText}>
              Swipe to match, then chat
            </Text>
          </View>
        </View>
      </View>

      <View style={welcomeStyles.bottomSection}>
        <TouchableOpacity
          style={welcomeStyles.getStartedBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            animateTransition('phone-login');
          }}
          activeOpacity={0.85}
          testID="get-started-btn"
        >
          <LinearGradient
            colors={['#EC4899', '#D946EF']}
            style={welcomeStyles.getStartedGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={welcomeStyles.getStartedText}>Get Started</Text>
            <ChevronRight size={20} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            animateTransition('login');
          }}
          activeOpacity={0.7}
          testID="login-btn"
        >
          <Text style={welcomeStyles.loginText}>Log In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderLogin = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <View style={[styles.stepIconCircle, { backgroundColor: '#A855F720' }]}>
          <Mail size={28} color={theme.primary} />
        </View>
        <Text style={styles.stepTitle}>Welcome back</Text>
        <Text style={styles.stepDescription}>
          Log in with your ESU email and password
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>School email</Text>
        <TextInput
          style={styles.textInput}
          placeholder="yourname@live.esu.edu"
          placeholderTextColor={theme.textMuted}
          value={loginEmail}
          onChangeText={setLoginEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Password</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Enter your password"
            placeholderTextColor={theme.textMuted}
            value={loginPassword}
            onChangeText={setLoginPassword}
            secureTextEntry={!showLoginPassword}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowLoginPassword(!showLoginPassword)}
            activeOpacity={0.7}
          >
            {showLoginPassword ? (
              <EyeOff size={20} color={theme.textMuted} />
            ) : (
              <Eye size={20} color={theme.textMuted} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.primaryButton, isLoggingIn && styles.buttonDisabled]}
        disabled={isLoggingIn}
        onPress={async () => {
          if (!loginEmail.trim()) {
            setError('Please enter your email');
            return;
          }
          if (!loginPassword.trim()) {
            setError('Please enter your password');
            return;
          }

          setError('');
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

          try {
            const result = await login(loginEmail.trim(), loginPassword.trim());
            if (result?.hasProfile) {
              goToStep('complete');
              router.replace('/(tabs)/swipe' as any);
            } else {
              setSchoolEmail(loginEmail.trim());
              setPassword(loginPassword.trim());
              animateTransition('name-age');
            }
          } catch (loginErr: any) {
            setError(loginErr?.message || 'Invalid email or password');
            return;
          }
        }}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#A855F7', '#EC4899']}
          style={styles.buttonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={styles.primaryButtonText}>{isLoggingIn ? 'Logging in...' : 'Log In'}</Text>
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => {
          setError('');
          animateTransition('forgot-password');
        }}
        activeOpacity={0.7}
      >
        <Text style={styles.forgotPasswordText}>Forgot password?</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => {
          setError('');
          animateTransition('phone-login');
        }}
        activeOpacity={0.7}
      >
        <Text style={styles.secondaryButtonText}>Create an account</Text>
      </TouchableOpacity>
    </View>
  );

  const renderForgotPassword = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <View style={[styles.stepIconCircle, { backgroundColor: '#A855F720' }]}>
          <Lock size={28} color={theme.primary} />
        </View>
        <Text style={styles.stepTitle}>Reset password</Text>
        <Text style={styles.stepDescription}>
          Enter your ESU email and we'll send a reset link
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>School email</Text>
        <TextInput
          style={styles.textInput}
          placeholder="yourname@live.esu.edu"
          placeholderTextColor={theme.textMuted}
          value={loginEmail}
          onChangeText={(t) => {
            setLoginEmail(t);
            setError('');
          }}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
        disabled={isSubmitting}
        onPress={async () => {
          if (!loginEmail.trim()) {
            setError('Please enter your email');
            return;
          }

          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setIsSubmitting(true);
          setError('');

          try {
            await resetPassword(loginEmail.trim());
            Alert.alert(
              'Check your email',
              'We sent a password reset link to your email address.'
            );
            animateTransition('login');
          } catch (e: any) {
            setError(e?.message || 'Failed to send reset link');
          } finally {
            setIsSubmitting(false);
          }
        }}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#A855F7', '#EC4899']}
          style={styles.buttonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={styles.primaryButtonText}>{isSubmitting ? 'Sending...' : 'Send Reset Link'}</Text>
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => animateTransition('login')}
        activeOpacity={0.7}
      >
        <Text style={styles.secondaryButtonText}>Back to login</Text>
      </TouchableOpacity>
    </View>
  );

  const renderPhoneLogin = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <View style={[styles.stepIconCircle, { backgroundColor: '#EC489920' }]}>
          <Phone size={28} color={theme.secondary} />
        </View>
        <Text style={styles.stepTitle}>Let's get started</Text>
        <Text style={styles.stepDescription}>
          Enter your phone number (optional)
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Phone number</Text>
        <TextInput
          style={styles.textInput}
          placeholder="(555) 123-4567"
          placeholderTextColor={theme.textMuted}
          keyboardType="phone-pad"
          returnKeyType="done"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          blurOnSubmit={true}
        />
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          animateTransition('esu-email');
        }}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#A855F7', '#EC4899']}
          style={styles.buttonGradient}
        >
          <Text style={styles.primaryButtonText}>Continue</Text>
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => animateTransition('welcome')}
        activeOpacity={0.7}
      >
        <Text style={styles.secondaryButtonText}>Back</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEsuEmail = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <View style={[styles.stepIconCircle, { backgroundColor: '#A855F720' }]}>
          <Mail size={28} color={theme.primary} />
        </View>
        <Text style={styles.stepTitle}>Your ESU email</Text>
        <Text style={styles.stepDescription}>
          You must use your @live.esu.edu email to sign up
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>School email</Text>
        <TextInput
          style={styles.textInput}
          placeholder="yourname@live.esu.edu"
          placeholderTextColor={theme.textMuted}
          value={schoolEmail}
          onChangeText={(t) => {
            setSchoolEmail(t);
            setError('');
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoFocus={true}
        />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => {
          if (!schoolEmail.trim()) {
            setError('Please enter your ESU email');
            return;
          }
          if (!schoolEmail.endsWith('@live.esu.edu')) {
            setError('You must use your @live.esu.edu email');
            return;
          }

          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          animateTransition('create-password');
        }}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#A855F7', '#EC4899']}
          style={styles.buttonGradient}
        >
          <Text style={styles.primaryButtonText}>Continue</Text>
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => animateTransition('phone-login')}
        activeOpacity={0.7}
      >
        <Text style={styles.secondaryButtonText}>Back</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCreatePassword = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <View style={[styles.stepIconCircle, { backgroundColor: '#A855F720' }]}>
          <Lock size={28} color={theme.primary} />
        </View>
        <Text style={styles.stepTitle}>Create a password</Text>
        <Text style={styles.stepDescription}>
          You'll use this to log back in
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Password</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="At least 6 characters"
            placeholderTextColor={theme.textMuted}
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              setError('');
            }}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword(!showPassword)}
            activeOpacity={0.7}
          >
            {showPassword ? (
              <EyeOff size={20} color={theme.textMuted} />
            ) : (
              <Eye size={20} color={theme.textMuted} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Confirm password</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Re-enter your password"
            placeholderTextColor={theme.textMuted}
            value={confirmPassword}
            onChangeText={(t) => {
              setConfirmPassword(t);
              setError('');
            }}
            secureTextEntry={!showPassword}
          />
        </View>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.primaryButton, isSigningUp && styles.buttonDisabled]}
        disabled={isSigningUp}
        onPress={async () => {
          if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
          }
          if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
          }

          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setError('');

          try {
            await signUp(schoolEmail.trim(), password.trim());
            console.log('[Onboarding] Supabase signup successful');
            animateTransition('name-age');
          } catch (e: any) {
            console.log('[Onboarding] Supabase signup error:', e?.message);
            setError(e?.message || 'Signup failed. Please try again.');
          }
        }}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#A855F7', '#EC4899']}
          style={styles.buttonGradient}
        >
          <Text style={styles.primaryButtonText}>{isSigningUp ? 'Creating account...' : 'Continue'}</Text>
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => animateTransition('esu-email')}
        activeOpacity={0.7}
      >
        <Text style={styles.secondaryButtonText}>Back</Text>
      </TouchableOpacity>
    </View>
  );

  const renderNameAge = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <View style={[styles.stepIconCircle, { backgroundColor: '#EC489920' }]}>
          <UserIcon size={28} color={theme.secondary} />
        </View>
        <Text style={styles.stepTitle}>Tell us about you</Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>First name</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Your first name"
          placeholderTextColor={theme.textMuted}
          value={firstName}
          onChangeText={(t) => {
            setFirstName(t);
            setError('');
          }}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Age</Text>
        <TextInput
          style={styles.textInput}
          placeholder="18"
          placeholderTextColor={theme.textMuted}
          value={age}
          onChangeText={(t) => {
            setAge(t);
            setError('');
          }}
          keyboardType="number-pad"
        />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => {
          if (!firstName.trim()) {
            setError('Please enter your first name');
            return;
          }

          const ageNum = parseInt(age, 10);
          if (isNaN(ageNum) || ageNum < 18) {
            setError('You must be 18 or older to use Swipeology.');
            return;
          }

          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          animateTransition('gender');
        }}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#A855F7', '#EC4899']}
          style={styles.buttonGradient}
        >
          <Text style={styles.primaryButtonText}>Continue</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const renderGender = () => {
    const options: { label: string; value: GenderOption }[] = [
      { label: 'Man', value: 'man' },
      { label: 'Woman', value: 'woman' },
      { label: 'Non-binary', value: 'non-binary' },
      { label: 'Prefer not to say', value: 'prefer not to say' },
    ];

    return (
      <View style={styles.stepContainer}>
        <View style={styles.stepHeader}>
          <Text style={styles.stepTitle}>What's your gender?</Text>
        </View>

        <View style={styles.optionsContainer}>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.optionButton,
                gender === opt.value && styles.optionButtonSelected,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setGender(opt.value);
                setError('');
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.optionText,
                  gender === opt.value && styles.optionTextSelected,
                ]}
              >
                {opt.label}
              </Text>
              {gender === opt.value && <Check size={18} color={theme.primary} />}
            </TouchableOpacity>
          ))}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.primaryButton, !gender && styles.buttonDisabled]}
          onPress={() => {
            if (!gender) {
              setError('Please select your gender');
              return;
            }

            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            if (!pronounsLoaded) {
              fetchPronouns().then((opts) => {
                setPronounOptions(opts);
                setPronounsLoaded(true);
              });
            }
            animateTransition('pronouns');
          }}
          activeOpacity={0.8}
          disabled={!gender}
        >
          <LinearGradient
            colors={gender ? ['#A855F7', '#EC4899'] : ['#444', '#555']}
            style={styles.buttonGradient}
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  const renderPronouns = () => {
    return (
      <View style={styles.stepContainer}>
        <View style={styles.stepHeader}>
          <Text style={styles.stepTitle}>Your pronouns</Text>
          <Text style={styles.stepDescription}>This helps others know how to refer to you.</Text>
        </View>

        <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
          <View style={styles.optionsContainer}>
            {pronounOptions.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={[
                  styles.optionButton,
                  selectedPronouns === opt.value && styles.optionButtonSelected,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedPronouns(opt.value);
                  setError('');
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.optionText,
                    selectedPronouns === opt.value && styles.optionTextSelected,
                  ]}
                >
                  {opt.label}
                </Text>
                {selectedPronouns === opt.value && <Check size={18} color={theme.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.primaryButton, !selectedPronouns && styles.buttonDisabled]}
          onPress={() => {
            if (!selectedPronouns) {
              setError('Please select your pronouns');
              return;
            }
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            animateTransition('dating-preference');
          }}
          activeOpacity={0.8}
          disabled={!selectedPronouns}
        >
          <LinearGradient
            colors={selectedPronouns ? ['#A855F7', '#EC4899'] : ['#444', '#555']}
            style={styles.buttonGradient}
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setSelectedPronouns('prefer not to say');
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            animateTransition('dating-preference');
          }}
          activeOpacity={0.7}
          style={{ marginTop: 14, alignSelf: 'center' }}
        >
          <Text style={{ color: theme.textMuted, fontSize: 15 }}>Skip</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderDatingPreference = () => {
    const options: { label: string; value: DatingPrefOption }[] = [
      { label: 'Men', value: 'men' },
      { label: 'Women', value: 'women' },
      { label: 'Men and women', value: 'both' },
    ];

    return (
      <View style={styles.stepContainer}>
        <View style={styles.stepHeader}>
          <Text style={styles.stepTitle}>Who are you interested in?</Text>
        </View>

        <View style={styles.optionsContainer}>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.optionButton,
                datingPreference === opt.value && styles.optionButtonSelected,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setDatingPreference(opt.value);
                setError('');
              }}
              activeOpacity={0.7}
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

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.primaryButton, !datingPreference && styles.buttonDisabled]}
          onPress={() => {
            if (!datingPreference) {
              setError('Please select a preference');
              return;
            }

            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            animateTransition('intent');
          }}
          activeOpacity={0.8}
          disabled={!datingPreference}
        >
          <LinearGradient
            colors={datingPreference ? ['#A855F7', '#EC4899'] : ['#444', '#555']}
            style={styles.buttonGradient}
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  const renderIntent = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>What are you here for?</Text>
        <Text style={styles.stepDescription}>You can always change this later.</Text>
      </View>

      <View style={styles.optionsContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, wantsFriends && styles.toggleButtonActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setWantsFriends(!wantsFriends);
            setError('');
          }}
          activeOpacity={0.7}
        >
          <Users size={24} color={wantsFriends ? '#fff' : theme.secondary} />
          <Text style={[styles.toggleText, wantsFriends && styles.toggleTextActive]}>
            Make friends at ESU
          </Text>
          <View style={[styles.toggleCheck, wantsFriends && styles.toggleCheckActive]}>
            {wantsFriends && <Check size={14} color="#fff" />}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toggleButton, wantsDating && styles.toggleButtonActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setWantsDating(!wantsDating);
            setError('');
          }}
          activeOpacity={0.7}
        >
          <Heart size={24} color={wantsDating ? '#fff' : theme.primary} />
          <Text style={[styles.toggleText, wantsDating && styles.toggleTextActive]}>
            Date people at ESU
          </Text>
          <View style={[styles.toggleCheck, wantsDating && styles.toggleCheckActive]}>
            {wantsDating && <Check size={14} color="#fff" />}
          </View>
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => {
          if (!wantsFriends && !wantsDating) {
            setError('Please choose at least friends, dating, or both.');
            return;
          }

          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          animateTransition('photos');
        }}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#A855F7', '#EC4899']}
          style={styles.buttonGradient}
        >
          <Text style={styles.primaryButtonText}>Continue</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const renderPhotos = () => (
    <ScrollView style={styles.scrollStep} contentContainerStyle={styles.scrollContent}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Add your photos</Text>
        <Text style={styles.stepDescription}>Add at least one photo to continue</Text>
      </View>

      <View style={styles.photoGrid}>
        {photos.map((photo, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.photoBox, photo ? styles.photoBoxFilled : null]}
            onPress={() => handlePickPhoto(index)}
            activeOpacity={0.7}
          >
            {photo ? (
              <View style={styles.photoPreview}>
                <Text style={styles.photoPreviewText}>Photo {index + 1}</Text>
                <View style={styles.photoRemove}>
                  <X size={14} color="#fff" />
                </View>
              </View>
            ) : (
              <View style={styles.photoPlaceholder}>
                <Camera size={24} color={theme.textMuted} />
                <Text style={styles.photoPlaceholderText}>{index + 1}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => {
          const hasPhoto = photos.some((p) => p.length > 0);
          if (!hasPhoto) {
            setError('Please add at least one photo');
            return;
          }

          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          animateTransition('bio-details');
        }}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#A855F7', '#EC4899']}
          style={styles.buttonGradient}
        >
          <Text style={styles.primaryButtonText}>Continue</Text>
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderBioDetails = () => (
    <ScrollView style={styles.scrollStep} contentContainerStyle={styles.scrollContent}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Tell us more</Text>
        <Text style={styles.stepDescription}>This helps people get to know you</Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Bio</Text>
        <TextInput
          style={[styles.textInput, { height: 100 }]}
          placeholder="Write a short bio..."
          placeholderTextColor={theme.textMuted}
          value={bio}
          onChangeText={(t) => {
            setBio(t);
            setError('');
          }}
          multiline
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Major</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Your major"
          placeholderTextColor={theme.textMuted}
          value={major}
          onChangeText={(t) => {
            setMajor(t);
            setError('');
          }}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Class year</Text>
        <TextInput
          style={styles.textInput}
          placeholder="2026"
          placeholderTextColor={theme.textMuted}
          value={classYear}
          onChangeText={(t) => {
            setClassYear(t);
            setError('');
          }}
          keyboardType="number-pad"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Interests</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Hiking, music, gaming..."
          placeholderTextColor={theme.textMuted}
          value={interests}
          onChangeText={(t) => {
            setInterests(t);
            setError('');
          }}
        />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          animateTransition('icebreakers');
        }}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#A855F7', '#EC4899']}
          style={styles.buttonGradient}
        >
          <Text style={styles.primaryButtonText}>Continue</Text>
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderIcebreakers = () => {
    const currentQuestionIndex = ICEBREAKER_QUESTIONS.findIndex(
      (q) => !icebreakerAnswers[q.id]
    );
    const allAnswered = currentQuestionIndex === -1;
    const activeQuestion = allAnswered ? null : ICEBREAKER_QUESTIONS[currentQuestionIndex];
    const answeredCount = Object.keys(icebreakerAnswers).length;

    return (
      <ScrollView style={styles.scrollStep} contentContainerStyle={styles.scrollContent}>
        <View style={styles.stepHeader}>
          <View style={[styles.stepIconCircle, { backgroundColor: '#3B82F620' }]}>
            <MessageCircle size={28} color="#3B82F6" />
          </View>
          <Text style={styles.stepTitle}>Icebreaker Questions</Text>
          <Text style={styles.stepDescription}>
            Your answers help us find better matches for you
          </Text>
        </View>

        <View style={icebreakerStyles.progressRow}>
          {ICEBREAKER_QUESTIONS.map((q, i) => (
            <View
              key={q.id}
              style={[
                icebreakerStyles.progressDot,
                icebreakerAnswers[q.id] ? icebreakerStyles.progressDotFilled : null,
                activeQuestion?.id === q.id ? icebreakerStyles.progressDotActive : null,
              ]}
            />
          ))}
          <Text style={icebreakerStyles.progressText}>
            {answeredCount}/{ICEBREAKER_QUESTIONS.length}
          </Text>
        </View>

        {allAnswered ? (
          <View style={icebreakerStyles.doneContainer}>
            <View style={icebreakerStyles.doneIcon}>
              <Check size={32} color="#10B981" />
            </View>
            <Text style={icebreakerStyles.doneTitle}>All answered!</Text>
            <Text style={icebreakerStyles.doneSubtitle}>
              Great job! These answers will help find your best matches.
            </Text>

            <View style={icebreakerStyles.answersReview}>
              {ICEBREAKER_QUESTIONS.map((q) => (
                <TouchableOpacity
                  key={q.id}
                  style={icebreakerStyles.answerReviewItem}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    const updated = { ...icebreakerAnswers };
                    delete updated[q.id];
                    setIcebreakerAnswers(updated);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={icebreakerStyles.answerReviewQ} numberOfLines={1}>{q.question}</Text>
                  <Text style={icebreakerStyles.answerReviewA}>{icebreakerAnswers[q.id]}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : activeQuestion ? (
          <View style={icebreakerStyles.questionContainer}>
            <Text style={icebreakerStyles.questionText}>{activeQuestion.question}</Text>
            <View style={icebreakerStyles.optionsGrid}>
              {activeQuestion.options.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={icebreakerStyles.optionChip}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setIcebreakerAnswers((prev) => ({
                      ...prev,
                      [activeQuestion.id]: option,
                    }));
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={icebreakerStyles.optionChipText}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.primaryButton, !allAnswered && styles.buttonDisabled]}
          onPress={() => {
            if (!allAnswered) {
              setError('Please answer all icebreaker questions');
              return;
            }
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setError('');
            animateTransition('personality-badges');
          }}
          activeOpacity={0.8}
          disabled={!allAnswered}
        >
          <LinearGradient
            colors={allAnswered ? ['#A855F7', '#EC4899'] : ['#444', '#555']}
            style={styles.buttonGradient}
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            animateTransition('personality-badges');
          }}
          activeOpacity={0.7}
          style={{ marginTop: 14, alignSelf: 'center' }}
        >
          <Text style={{ color: theme.textMuted, fontSize: 15 }}>Skip</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  const renderPersonalityBadges = () => {
    const canSelectMore = selectedBadges.length < MAX_BADGES;

    return (
      <ScrollView style={styles.scrollStep} contentContainerStyle={styles.scrollContent}>
        <View style={styles.stepHeader}>
          <View style={[styles.stepIconCircle, { backgroundColor: '#EC489920' }]}>
            <Award size={28} color="#EC4899" />
          </View>
          <Text style={styles.stepTitle}>Personality Badges</Text>
          <Text style={styles.stepDescription}>
            Pick up to {MAX_BADGES} badges that describe you
          </Text>
        </View>

        {selectedBadges.length > 0 && (
          <View style={badgeStyles.selectedRow}>
            {selectedBadges.map((id) => {
              const badge = PERSONALITY_BADGES.find((b) => b.id === id);
              if (!badge) return null;
              return (
                <TouchableOpacity
                  key={badge.id}
                  style={[badgeStyles.selectedChip, { backgroundColor: badge.color + '25', borderColor: badge.color + '60' }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedBadges((prev) => prev.filter((b) => b !== id));
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={badgeStyles.selectedEmoji}>{badge.emoji}</Text>
                  <Text style={[badgeStyles.selectedLabel, { color: badge.color }]}>{badge.label}</Text>
                  <X size={12} color={badge.color} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <Text style={badgeStyles.countText}>
          {selectedBadges.length}/{MAX_BADGES} selected
        </Text>

        <View style={badgeStyles.badgeGrid}>
          {PERSONALITY_BADGES.map((badge) => {
            const isSelected = selectedBadges.includes(badge.id);
            const isDisabled = !isSelected && !canSelectMore;

            return (
              <TouchableOpacity
                key={badge.id}
                style={[
                  badgeStyles.badgeItem,
                  isSelected && { backgroundColor: badge.color + '18', borderColor: badge.color + '50' },
                  isDisabled && { opacity: 0.4 },
                ]}
                onPress={() => {
                  if (isDisabled) return;
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  if (isSelected) {
                    setSelectedBadges((prev) => prev.filter((b) => b !== badge.id));
                  } else {
                    setSelectedBadges((prev) => [...prev, badge.id]);
                  }
                }}
                activeOpacity={isDisabled ? 1 : 0.7}
              >
                <Text style={badgeStyles.badgeEmoji}>{badge.emoji}</Text>
                <Text style={[
                  badgeStyles.badgeLabel,
                  isSelected && { color: badge.color, fontWeight: '700' as const },
                ]}>{badge.label}</Text>
                {isSelected && (
                  <View style={[badgeStyles.badgeCheck, { backgroundColor: badge.color }]}>
                    <Check size={10} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.primaryButton, selectedBadges.length === 0 && styles.buttonDisabled]}
          onPress={() => {
            if (selectedBadges.length === 0) {
              setError('Please select at least one badge');
              return;
            }
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setError('');
            animateTransition('notifications');
          }}
          activeOpacity={0.8}
          disabled={selectedBadges.length === 0}
        >
          <LinearGradient
            colors={selectedBadges.length > 0 ? ['#A855F7', '#EC4899'] : ['#444', '#555']}
            style={styles.buttonGradient}
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            animateTransition('notifications');
          }}
          activeOpacity={0.7}
          style={{ marginTop: 14, alignSelf: 'center' }}
        >
          <Text style={{ color: theme.textMuted, fontSize: 15 }}>Skip</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  const renderNotifications = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Bell size={28} color={theme.primary} />
        <Text style={styles.stepTitle}>Stay updated</Text>
        <Text style={styles.stepDescription}>
          Enable notifications to get match alerts and messages
        </Text>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          animateTransition('tutorial');
        }}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#A855F7', '#EC4899']}
          style={styles.buttonGradient}
        >
          <Text style={styles.primaryButtonText}>Enable Notifications</Text>
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => animateTransition('tutorial')}
        activeOpacity={0.7}
      >
        <Text style={styles.secondaryButtonText}>Skip for now</Text>
      </TouchableOpacity>
    </View>
  );

  const renderTutorial = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Sparkles size={28} color={theme.primary} />
        <Text style={styles.stepTitle}>How Swipeology works</Text>
        <Text style={styles.stepDescription}>
          Swipe right to like, left to pass. If you both like each other, it's a match!
        </Text>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          animateTransition('final-submit');
        }}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#A855F7', '#EC4899']}
          style={styles.buttonGradient}
        >
          <Text style={styles.primaryButtonText}>Finish</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const renderFinalSubmit = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Shield size={28} color={theme.primary} />
        <Text style={styles.stepTitle}>All set!</Text>
        <Text style={styles.stepDescription}>
          Tap finish to complete your profile and start swiping
        </Text>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
        disabled={isSubmitting}
        onPress={async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setIsSubmitting(true);
          setError('');

          try {
            const userId = session?.user?.id;
            if (!userId) {
              setError('You must be logged in to complete your profile.');
              setIsSubmitting(false);
              return;
            }

            console.log('[Onboarding] Upserting profile with id:', userId);

            const coreProfileData = {
              id: userId,
              phone_number: phoneNumber.trim() || '',
              phone_verified: false,
              school_email: schoolEmail.trim() || session?.user?.email || '',
              university: 'East Stroudsburg University',
              is_verified_esu: true,
              first_name: firstName.trim(),
              age: parseInt(age, 10) || 18,
              gender: gender || 'prefer not to say',
              pronouns: selectedPronouns,
              dating_preference: datingPreference || 'both',
              wants_friends: wantsFriends,
              wants_dating: wantsDating,
              photo1_url: photos[0] || '',
              photo2_url: photos[1] || '',
              photo3_url: photos[2] || '',
              photo4_url: photos[3] || '',
              photo5_url: photos[4] || '',
              photo6_url: photos[5] || '',
              bio: bio.trim(),
              major: major.trim(),
              class_year: classYear.trim(),
              interests: interests.trim(),
            };

            const fullProfileData = {
              ...coreProfileData,
              icebreaker_answers: icebreakerAnswers,
              personality_badges: selectedBadges,
            };

            console.log('[Onboarding] Trying full upsert with icebreaker data...');
            const { error: fullUpsertError } = await supabase
              .from('users')
              .upsert(fullProfileData, { onConflict: 'id' });

            if (fullUpsertError) {
              console.log('[Onboarding] Full upsert failed:', fullUpsertError.message, '- trying without optional columns...');
              const { error: coreUpsertError } = await supabase
                .from('users')
                .upsert(coreProfileData, { onConflict: 'id' });

              if (coreUpsertError) {
                console.log('[Onboarding] Core upsert also failed:', coreUpsertError.message);
                setError(coreUpsertError.message);
                setIsSubmitting(false);
                return;
              }
              console.log('[Onboarding] Core profile saved (without icebreaker columns)');
            }

            console.log('[Onboarding] Profile saved to Supabase successfully');

            await refreshProfile();

            const localUser = {
              ...coreProfileData,
              password: '',
              blocked_users: [] as string[],
              icebreaker_answers: icebreakerAnswers,
              personality_badges: selectedBadges,
            };
            await completeRegistration(localUser);
            goToStep('complete');
            router.replace('/(tabs)/swipe' as any);
          } catch (e) {
            const msg = e instanceof Error ? e.message : 'Something went wrong.';
            console.log('[Onboarding] Final submit error:', msg);
            setError(msg);
          } finally {
            setIsSubmitting(false);
          }
        }}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#A855F7', '#EC4899']}
          style={styles.buttonGradient}
        >
          <Text style={styles.primaryButtonText}>Finish</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const renderStep = () => {
    switch (onboardingStep) {
      case 'welcome': return renderWelcome();
      case 'login': return renderLogin();
      case 'forgot-password': return renderForgotPassword();
      case 'phone-login': return renderPhoneLogin();
      case 'esu-email': return renderEsuEmail();
      case 'create-password': return renderCreatePassword();
      case 'name-age': return renderNameAge();
      case 'gender': return renderGender();
      case 'pronouns': return renderPronouns();
      case 'dating-preference': return renderDatingPreference();
      case 'intent': return renderIntent();
      case 'photos': return renderPhotos();
      case 'bio-details': return renderBioDetails();
      case 'icebreakers': return renderIcebreakers();
      case 'personality-badges': return renderPersonalityBadges();
      case 'notifications': return renderNotifications();
      case 'tutorial': return renderTutorial();
      case 'final-submit': return renderFinalSubmit();
      default: return renderWelcome();
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim, paddingTop: insets.top }}>
        {renderStep()}
      </Animated.View>
    </View>
  );
}

const welcomeStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 28,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 48,
  },
  heartCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: 20,
    overflow: 'hidden',
  },
  heartGradient: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appName: {
    fontSize: 36,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  tagline: {
    fontSize: 16,
    color: '#C4A8D8',
    textAlign: 'center',
    lineHeight: 24,
  },
  features: {
    width: '100%',
    gap: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  featureIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    color: '#E2D1F0',
    fontWeight: '500' as const,
    lineHeight: 22,
  },
  bottomSection: {
    paddingBottom: 40,
    gap: 16,
    alignItems: 'center',
  },
  getStartedBtn: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  getStartedGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 6,
  },
  getStartedText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  loginText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#C4A8D8',
  },
});

const styles = StyleSheet.create({
  stepContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  stepHeader: {
    marginBottom: 24,
    alignItems: 'center',
  },
  stepIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 6,
  },
  stepDescription: {
    fontSize: 15,
    color: '#aaa',
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    color: '#ccc',
    marginBottom: 6,
    fontSize: 14,
  },
  textInput: {
    backgroundColor: '#1C1228',
    borderRadius: 10,
    padding: 14,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#3A2550',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1228',
    borderRadius: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#3A2550',
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 16,
  },
  eyeButton: {
    padding: 8,
  },
  primaryButton: {
    marginTop: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonGradient: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600' as const,
  },
  secondaryButtonText: {
    color: '#aaa',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 14,
  },
  forgotPasswordText: {
    color: '#aaa',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 14,
  },
  errorText: {
    color: '#ff6b6b',
    marginBottom: 10,
    textAlign: 'center',
  },
  optionsContainer: {
    marginTop: 20,
  },
  optionButton: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#1C1228',
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3A2550',
  },
  optionButtonSelected: {
    backgroundColor: '#A855F720',
    borderColor: '#A855F7',
  },
  optionText: {
    color: '#ccc',
    fontSize: 16,
  },
  optionTextSelected: {
    color: '#fff',
    fontWeight: '600' as const,
  },
  toggleButton: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#1C1228',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3A2550',
  },
  toggleButtonActive: {
    backgroundColor: '#A855F720',
    borderColor: '#A855F7',
  },
  toggleText: {
    flex: 1,
    marginLeft: 12,
    color: '#ccc',
    fontSize: 16,
  },
  toggleTextActive: {
    color: '#fff',
    fontWeight: '600' as const,
  },
  toggleCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#555',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleCheckActive: {
    backgroundColor: '#A855F7',
    borderColor: '#A855F7',
  },
  scrollStep: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  photoBox: {
    width: '48%',
    height: 160,
    backgroundColor: '#1C1228',
    borderRadius: 12,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3A2550',
  },
  photoBoxFilled: {
    backgroundColor: '#2E1E45',
  },
  photoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: {
    color: '#aaa',
    marginTop: 6,
  },
  photoPreview: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPreviewText: {
    color: '#fff',
    marginBottom: 6,
  },
  photoRemove: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#0008',
    padding: 4,
    borderRadius: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

const icebreakerStyles = StyleSheet.create({
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
    justifyContent: 'center',
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2A1B3D',
    borderWidth: 1,
    borderColor: '#3A2550',
  },
  progressDotFilled: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  progressDotActive: {
    borderColor: '#3B82F6',
    backgroundColor: '#3B82F630',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  progressText: {
    color: '#aaa',
    fontSize: 13,
    fontWeight: '600' as const,
    marginLeft: 4,
  },
  questionContainer: {
    marginBottom: 20,
  },
  questionText: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  optionsGrid: {
    gap: 10,
  },
  optionChip: {
    backgroundColor: '#1C1228',
    borderWidth: 1,
    borderColor: '#3A2550',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  optionChipText: {
    color: '#E2D1F0',
    fontSize: 16,
    fontWeight: '500' as const,
  },
  doneContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  doneIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#10B98120',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  doneTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#10B981',
    marginBottom: 4,
  },
  doneSubtitle: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 16,
  },
  answersReview: {
    width: '100%',
    gap: 8,
  },
  answerReviewItem: {
    backgroundColor: '#1C1228',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#3A2550',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  answerReviewQ: {
    color: '#aaa',
    fontSize: 13,
    flex: 1,
    marginRight: 8,
  },
  answerReviewA: {
    color: '#C084FC',
    fontSize: 14,
    fontWeight: '600' as const,
  },
});

const badgeStyles = StyleSheet.create({
  selectedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  selectedEmoji: {
    fontSize: 14,
  },
  selectedLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  countText: {
    color: '#aaa',
    fontSize: 13,
    fontWeight: '600' as const,
    textAlign: 'center',
    marginBottom: 16,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    marginBottom: 20,
  },
  badgeItem: {
    width: '47%',
    backgroundColor: '#1C1228',
    borderWidth: 1,
    borderColor: '#3A2550',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 6,
  },
  badgeEmoji: {
    fontSize: 28,
  },
  badgeLabel: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '500' as const,
  },
  badgeCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
