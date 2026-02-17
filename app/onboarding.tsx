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
  ArrowLeft,
  Check,
  X,
  Lock,
  Eye,
  EyeOff,
  Mail,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';
import Colors from '@/constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const theme = Colors.dark;

type GenderOption = 'man' | 'woman' | 'non-binary' | 'prefer not to say';
type DatingPrefOption = 'men' | 'women' | 'both';

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Auth functions
  const { signUp, signIn, resetPassword, user } = useAuth();

  // Step navigation
  const [onboardingStep, setOnboardingStep] = useState<'login' | 'phone-login' | 'esu-email' | 'create-password' | 'name-age' | 'gender' | 'dating-preference' | 'intent' | 'photos' | 'bio-details' | 'notifications' | 'tutorial'>('login');

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

  // Form state
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

  const [error, setError] = useState('');

  // Photo picker
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
  // -----------------------------
  // LOGIN SCREEN
  // -----------------------------
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
        style={styles.primaryButton}
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

          const { user, error: loginErr } = await signIn(
            loginEmail.trim(),
            loginPassword.trim()
          );

          if (loginErr) {
            setError(loginErr);
            return;
          }

          router.replace('/(tabs)/swipe');
        }}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#A855F7', '#EC4899']}
          style={styles.buttonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={styles.primaryButtonText}>Log In</Text>
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

  // -----------------------------
  // FORGOT PASSWORD (SUPABASE EMAIL RESET)
  // -----------------------------
  const renderForgotPassword = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <View style={[styles.stepIconCircle, { backgroundColor: '#A855F720' }]}>
          <Lock size={28} color={theme.primary} />
        </View>
        <Text style={styles.stepTitle}>Reset password</Text>
        <Text style={styles.stepDescription}>
          Enter your ESU email and we’ll send a reset link
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
        style={styles.primaryButton}
        onPress={async () => {
          if (!loginEmail.trim()) {
            setError('Please enter your email');
            return;
          }

          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

          const err = await resetPassword(loginEmail.trim());
          if (err) {
            setError(err);
            return;
          }

          Alert.alert(
            'Reset Email Sent',
            'Check your inbox for a password reset link.'
          );

          animateTransition('login');
        }}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#A855F7', '#EC4899']}
          style={styles.buttonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={styles.primaryButtonText}>Send Reset Link</Text>
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
  // -----------------------------
  // PHONE LOGIN (FIRST SIGNUP STEP)
  // -----------------------------
  const renderPhoneLogin = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <View style={[styles.stepIconCircle, { backgroundColor: '#EC489920' }]}>
          <Phone size={28} color={theme.secondary} />
        </View>
        <Text style={styles.stepTitle}>Let’s get started</Text>
        <Text style={styles.stepDescription}>
          Enter your phone number (optional)
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Phone number</Text>
        <TextInput
          style={styles.textInput}
          placeholder="(555) 123‑4567"
          placeholderTextColor={theme.textMuted}
          keyboardType="phone-pad"
          value={''} // phone is optional and not stored in Supabase
          onChangeText={() => {}}
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
        onPress={() => animateTransition('login')}
        activeOpacity={0.7}
      >
        <Text style={styles.secondaryButtonText}>Back to login</Text>
      </TouchableOpacity>
    </View>
  );

  // -----------------------------
  // ESU EMAIL STEP
  // -----------------------------
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

  // -----------------------------
  // CREATE PASSWORD (SUPABASE SIGNUP)
  // -----------------------------
  const renderCreatePassword = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <View style={[styles.stepIconCircle, { backgroundColor: '#A855F720' }]}>
          <Lock size={28} color={theme.primary} />
        </View>
        <Text style={styles.stepTitle}>Create a password</Text>
        <Text style={styles.stepDescription}>
          You’ll use this to log back in
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
        style={styles.primaryButton}
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

          // SUPABASE SIGNUP
          const { user: newUser, error: signUpErr } = await signUp(
            schoolEmail.trim(),
            password.trim(),
            {
              onboarding_started: true,
            }
          );

          if (signUpErr) {
            setError(signUpErr);
            return;
          }

          animateTransition('name-age');
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
        onPress={() => animateTransition('esu-email')}
        activeOpacity={0.7}
      >
        <Text style={styles.secondaryButtonText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
  // -----------------------------
  // NAME + AGE
  // -----------------------------
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

  // -----------------------------
  // GENDER
  // -----------------------------
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
          <Text style={styles.stepTitle}>What’s your gender?</Text>
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
            animateTransition('dating-preference');
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

  // -----------------------------
  // DATING PREFERENCE
  // -----------------------------
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

  // -----------------------------
  // INTENT (FRIENDS / DATING)
  // -----------------------------
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
  // -----------------------------
  // PHOTOS
  // -----------------------------
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

  // -----------------------------
  // BIO DETAILS
  // -----------------------------
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
          animateTransition('notifications');
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

  // -----------------------------
  // NOTIFICATIONS
  // -----------------------------
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

  // -----------------------------
  // TUTORIAL
  // -----------------------------
  const renderTutorial = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Sparkles size={28} color={theme.primary} />
        <Text style={styles.stepTitle}>How Swipeology works</Text>
        <Text style={styles.stepDescription}>
          Swipe right to like, left to pass. If you both like each other, it’s a match!
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
  // -----------------------------
  // FINAL SUBMIT — SAVE PROFILE TO SUPABASE
  // -----------------------------
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
        style={styles.primaryButton}
        onPress={async () => {
          if (!user) {
            setError('You must be logged in to finish onboarding.');
            return;
          }

          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

          try {
            const { error: upsertErr } = await supabase
              .from('users')
              .upsert({
                auth_id: user.id,
                email: user.email,

                // BASIC INFO
                first_name: firstName.trim(),
                age: parseInt(age, 10),
                gender,
                dating_preference: datingPreference,

                // INTENT
                wants_friends: wantsFriends,
                wants_dating: wantsDating,

                // PHOTOS
                photo1_url: photos[0] || null,
                photo2_url: photos[1] || null,
                photo3_url: photos[2] || null,
                photo4_url: photos[3] || null,
                photo5_url: photos[4] || null,
                photo6_url: photos[5] || null,

                // BIO DETAILS
                bio: bio.trim(),
                major: major.trim(),
                class_year: classYear.trim(),
                interests: interests.trim(),

                // STATUS
                onboarding_complete: true,
                updated_at: new Date().toISOString(),
              });

            if (upsertErr) {
              setError(upsertErr.message);
              return;
            }

            router.replace('/(tabs)/swipe');
          } catch (e) {
            const msg = e instanceof Error ? e.message : 'Something went wrong.';
            setError(msg);
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
      case 'login': return renderLogin();
      case 'forgot-password': return renderForgotPassword();
      case 'phone-login': return renderPhoneLogin();
      case 'esu-email': return renderEsuEmail();
      case 'create-password': return renderCreatePassword();
      case 'name-age': return renderNameAge();
      case 'gender': return renderGender();
      case 'dating-preference': return renderDatingPreference();
      case 'intent': return renderIntent();
      case 'photos': return renderPhotos();
      case 'bio-details': return renderBioDetails();
      case 'notifications': return renderNotifications();
      case 'tutorial': return renderTutorial();
      case 'final-submit': return renderFinalSubmit();
      default: return renderLogin();
    }
  };
  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim, paddingTop: insets.top }}>
      {renderStep()}
    </Animated.View>
  );
}


  
