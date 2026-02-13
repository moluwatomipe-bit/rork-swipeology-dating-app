import { useState, useRef, useCallback } from 'react';
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
} from 'react-native';
import { router, Stack } from 'expo-router';
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
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { OnboardingStep, User } from '@/types';
import Colors from '@/constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const theme = Colors.dark;

type GenderOption = 'man' | 'woman' | 'non-binary' | 'prefer not to say';
type DatingPrefOption = 'men' | 'women' | 'both';

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { onboardingStep, goToStep, updateUser } = useAuth();
  const { requestPermissions } = useNotifications();
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const [phoneNumber, setPhoneNumber] = useState<string>('');

  const [schoolEmail, setSchoolEmail] = useState<string>('');
  const [firstName, setFirstName] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [gender, setGender] = useState<GenderOption | null>(null);
  const [datingPreference, setDatingPreference] = useState<DatingPrefOption | null>(null);
  const [wantsFriends, setWantsFriends] = useState<boolean>(false);
  const [wantsDating, setWantsDating] = useState<boolean>(false);
  const [photos, setPhotos] = useState<string[]>(['', '', '', '', '', '']);
  const [bio, setBio] = useState<string>('');
  const [major, setMajor] = useState<string>('');
  const [classYear, setClassYear] = useState<string>('');
  const [interests, setInterests] = useState<string>('');
  const [error, setError] = useState<string>('');

  const animateTransition = useCallback((nextStep: OnboardingStep) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setError('');
      goToStep(nextStep);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    });
  }, [fadeAnim, goToStep]);

  const handlePickPhoto = useCallback(async (index: number) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        const newPhotos = [...photos];
        newPhotos[index] = result.assets[0].uri;
        setPhotos(newPhotos);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (e) {
      console.log('Photo picker error:', e);
    }
  }, [photos]);

  const renderWelcome = () => (
    <View style={styles.stepContainer}>
      <View style={styles.welcomeHeader}>
        <LinearGradient
          colors={['#A855F7', '#D946EF', '#EC4899']}
          style={styles.logoCircle}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Heart size={48} color="#fff" fill="#fff" />
        </LinearGradient>
        <Text style={styles.welcomeTitle}>Swipeology</Text>
        <Text style={styles.welcomeSubtitle}>
          Meet friends and date safely with students from your university.
        </Text>
      </View>

      <View style={styles.bulletContainer}>
        <View style={styles.bulletRow}>
          <View style={[styles.bulletIcon, { backgroundColor: '#A855F720' }]}>
            <Shield size={20} color={theme.primary} />
          </View>
          <Text style={styles.bulletText}>
            Only confirmed students from East Stroudsburg University
          </Text>
        </View>
        <View style={styles.bulletRow}>
          <View style={[styles.bulletIcon, { backgroundColor: '#EC489920' }]}>
            <Users size={20} color={theme.secondary} />
          </View>
          <Text style={styles.bulletText}>
            Friends and Dating sections in one app
          </Text>
        </View>
        <View style={styles.bulletRow}>
          <View style={[styles.bulletIcon, { backgroundColor: '#F9A8D420' }]}>
            <Sparkles size={20} color={theme.accent} />
          </View>
          <Text style={styles.bulletText}>
            Swipe to match, then chat
          </Text>
        </View>
      </View>

      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            animateTransition('phone-login');
          }}
          activeOpacity={0.8}
          testID="get-started-btn"
        >
          <LinearGradient
            colors={['#A855F7', '#EC4899']}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
            <ChevronRight size={20} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            animateTransition('phone-login');
          }}
          activeOpacity={0.7}
          testID="login-btn"
        >
          <Text style={styles.secondaryButtonText}>Log In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPhoneLogin = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <View style={[styles.stepIconCircle, { backgroundColor: '#EC489920' }]}>
          <Phone size={28} color={theme.secondary} />
        </View>
        <Text style={styles.stepTitle}>Verify your phone</Text>
        <Text style={styles.stepDescription}>
          We&apos;ll send you a verification code
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Phone number</Text>
        <TextInput
          style={styles.textInput}
          placeholder="+1 (570) 000-0000"
          placeholderTextColor={theme.textMuted}
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
          testID="phone-input"
        />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => {
          if (!phoneNumber.trim()) {
            setError('Please enter your phone number');
            return;
          }
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          const userId = `user_${Date.now()}`;
          updateUser({
            id: userId,
            phone_number: phoneNumber,
          } as User);
          animateTransition('esu-email');
        }}
        activeOpacity={0.8}
        testID="send-code-btn"
      >
        <LinearGradient
          colors={['#A855F7', '#EC4899']}
          style={styles.buttonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={styles.primaryButtonText}>Continue</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const renderEsuEmail = () => (
    <ScrollView style={styles.scrollStep} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <View style={styles.stepHeader}>
        <View style={[styles.stepIconCircle, { backgroundColor: '#A855F720' }]}>
          <Shield size={28} color={theme.primary} />
        </View>
        <Text style={styles.stepTitle}>Verify your school</Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          Swipeology is only for East Stroudsburg University students.
        </Text>
        <Text style={styles.infoText}>
          Use your ESU email to get access.
        </Text>
        <Text style={[styles.infoText, { color: theme.textMuted, fontSize: 13 }]}>
          We never sell your email or share it with ESU. Swipeology is not affiliated with or endorsed by East Stroudsburg University.
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>School email</Text>
        <TextInput
          style={styles.textInput}
          placeholder="yourname@live.esu.edu"
          placeholderTextColor={theme.textMuted}
          value={schoolEmail}
          onChangeText={setSchoolEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          testID="email-input"
        />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => {
          if (!schoolEmail.endsWith('@live.esu.edu')) {
            setError('Please use your ESU student email ending in @live.esu.edu.');
            return;
          }
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          updateUser({
            school_email: schoolEmail,
            university: 'East Stroudsburg University',
            is_verified_esu: true,
          } as User);
          animateTransition('name-age');
        }}
        activeOpacity={0.8}
        testID="verify-email-btn"
      >
        <LinearGradient
          colors={['#A855F7', '#EC4899']}
          style={styles.buttonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={styles.primaryButtonText}>Continue</Text>
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
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
          onChangeText={setFirstName}
          testID="name-input"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Age</Text>
        <TextInput
          style={styles.textInput}
          placeholder="18"
          placeholderTextColor={theme.textMuted}
          value={age}
          onChangeText={setAge}
          keyboardType="number-pad"
          testID="age-input"
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
          updateUser({ first_name: firstName, age: ageNum } as User);
          animateTransition('gender');
        }}
        activeOpacity={0.8}
        testID="name-age-continue-btn"
      >
        <LinearGradient
          colors={['#A855F7', '#EC4899']}
          style={styles.buttonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
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
          <Text style={styles.stepTitle}>What&apos;s your gender?</Text>
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
              }}
              activeOpacity={0.7}
              testID={`gender-${opt.value}`}
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
            updateUser({ gender } as User);
            animateTransition('dating-preference');
          }}
          activeOpacity={0.8}
          disabled={!gender}
          testID="gender-continue-btn"
        >
          <LinearGradient
            colors={gender ? ['#A855F7', '#EC4899'] : ['#444', '#555']}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
          </LinearGradient>
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

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.primaryButton, !datingPreference && styles.buttonDisabled]}
          onPress={() => {
            if (!datingPreference) {
              setError('Please select a preference');
              return;
            }
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            updateUser({ dating_preference: datingPreference } as User);
            animateTransition('intent');
          }}
          activeOpacity={0.8}
          disabled={!datingPreference}
          testID="pref-continue-btn"
        >
          <LinearGradient
            colors={datingPreference ? ['#A855F7', '#EC4899'] : ['#444', '#555']}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
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
          }}
          activeOpacity={0.7}
          testID="toggle-friends"
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
          }}
          activeOpacity={0.7}
          testID="toggle-dating"
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
          updateUser({ wants_friends: wantsFriends, wants_dating: wantsDating } as User);
          animateTransition('photos');
        }}
        activeOpacity={0.8}
        testID="intent-continue-btn"
      >
        <LinearGradient
          colors={['#A855F7', '#EC4899']}
          style={styles.buttonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
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
            testID={`photo-${index}`}
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
          updateUser({
            photo1_url: photos[0] || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=600&fit=crop',
            photo2_url: photos[1],
            photo3_url: photos[2],
            photo4_url: photos[3],
            photo5_url: photos[4],
            photo6_url: photos[5],
          } as User);
          animateTransition('bio-details');
        }}
        activeOpacity={0.8}
        testID="photos-continue-btn"
      >
        <LinearGradient
          colors={['#A855F7', '#EC4899']}
          style={styles.buttonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={styles.primaryButtonText}>Continue</Text>
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.skipPhotoButton}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          updateUser({
            photo1_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=600&fit=crop',
            photo2_url: '',
            photo3_url: '',
            photo4_url: '',
            photo5_url: '',
            photo6_url: '',
          } as User);
          animateTransition('bio-details');
        }}
        activeOpacity={0.7}
      >
        <Text style={styles.skipPhotoText}>Use default photo for now</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderBioDetails = () => (
    <ScrollView style={styles.scrollStep} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Add a short bio</Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Bio</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          placeholder="Tell people about yourself..."
          placeholderTextColor={theme.textMuted}
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={4}
          testID="bio-input"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Major (optional)</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g., Biology"
          placeholderTextColor={theme.textMuted}
          value={major}
          onChangeText={setMajor}
          testID="major-input"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Class year (optional)</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g., 2026"
          placeholderTextColor={theme.textMuted}
          value={classYear}
          onChangeText={setClassYear}
          keyboardType="number-pad"
          testID="class-year-input"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Interests (optional)</Text>
        <TextInput
          style={styles.textInput}
          placeholder="hiking, coffee, music..."
          placeholderTextColor={theme.textMuted}
          value={interests}
          onChangeText={setInterests}
          testID="interests-input"
        />
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          updateUser({
            bio,
            major,
            class_year: classYear,
            interests,
          } as User);
          animateTransition('notifications');
        }}
        activeOpacity={0.8}
        testID="bio-continue-btn"
      >
        <LinearGradient
          colors={['#A855F7', '#EC4899']}
          style={styles.buttonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={styles.primaryButtonText}>Continue</Text>
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderNotifications = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <View style={[styles.stepIconCircle, { backgroundColor: '#F9A8D420' }]}>
          <Bell size={28} color={theme.accent} />
        </View>
        <Text style={styles.stepTitle}>Stay in the loop</Text>
        <Text style={styles.stepDescription}>
          Turn on notifications so you don&apos;t miss matches and messages.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          await requestPermissions();
          animateTransition('tutorial');
        }}
        activeOpacity={0.8}
        testID="enable-notif-btn"
      >
        <LinearGradient
          colors={['#A855F7', '#EC4899']}
          style={styles.buttonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={styles.primaryButtonText}>Enable notifications</Text>
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => animateTransition('tutorial')}
        activeOpacity={0.7}
        testID="skip-notif-btn"
      >
        <Text style={styles.secondaryButtonText}>Not now</Text>
      </TouchableOpacity>
    </View>
  );

  const renderTutorial = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <View style={[styles.stepIconCircle, { backgroundColor: '#A855F720' }]}>
          <Sparkles size={28} color={theme.primary} />
        </View>
        <Text style={styles.stepTitle}>How Swipeology works</Text>
      </View>

      <View style={styles.bulletContainer}>
        <View style={styles.tutorialBullet}>
          <View style={[styles.tutorialDot, { backgroundColor: theme.secondary }]} />
          <View style={styles.tutorialTextWrap}>
            <Text style={styles.tutorialLabel}>Friends</Text>
            <Text style={styles.tutorialDesc}>
              Swipe to meet people at ESU who want to make friends.
            </Text>
          </View>
        </View>
        <View style={styles.tutorialBullet}>
          <View style={[styles.tutorialDot, { backgroundColor: theme.primary }]} />
          <View style={styles.tutorialTextWrap}>
            <Text style={styles.tutorialLabel}>Dating</Text>
            <Text style={styles.tutorialDesc}>
              Swipe on people at ESU who match your preferences.
            </Text>
          </View>
        </View>
        <View style={styles.tutorialBullet}>
          <View style={[styles.tutorialDot, { backgroundColor: theme.accent }]} />
          <View style={styles.tutorialTextWrap}>
            <Text style={styles.tutorialLabel}>Separate</Text>
            <Text style={styles.tutorialDesc}>
              Matches and chats are separate for Friends and Dating.
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          goToStep('complete');
          router.replace('/(tabs)/swipe');
        }}
        activeOpacity={0.8}
        testID="got-it-btn"
      >
        <LinearGradient
          colors={['#A855F7', '#EC4899']}
          style={styles.buttonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={styles.primaryButtonText}>Got it</Text>
          <Sparkles size={18} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const canGoBack = onboardingStep !== 'welcome';

  const renderStep = () => {
    switch (onboardingStep) {
      case 'welcome': return renderWelcome();
      case 'phone-login': return renderPhoneLogin();
      case 'esu-email': return renderEsuEmail();
      case 'name-age': return renderNameAge();
      case 'gender': return renderGender();
      case 'dating-preference': return renderDatingPreference();
      case 'intent': return renderIntent();
      case 'photos': return renderPhotos();
      case 'bio-details': return renderBioDetails();
      case 'notifications': return renderNotifications();
      case 'tutorial': return renderTutorial();
      default: return renderWelcome();
    }
  };

  const stepMap: Record<string, OnboardingStep> = {
    'esu-email': 'phone-login',
    'name-age': 'esu-email',
    'gender': 'name-age',
    'dating-preference': 'gender',
    'intent': 'dating-preference',
    'photos': 'intent',
    'bio-details': 'photos',
    'notifications': 'bio-details',
    'tutorial': 'notifications',
    'phone-login': 'welcome',
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {canGoBack && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              const prev = stepMap[onboardingStep];
              if (prev) animateTransition(prev);
            }}
            activeOpacity={0.7}
            testID="back-btn"
          >
            <ArrowLeft size={24} color={theme.text} />
          </TouchableOpacity>
        )}

        {onboardingStep !== 'welcome' && (
          <View style={styles.progressContainer}>
            {['phone-login', 'esu-email', 'name-age', 'gender', 'dating-preference', 'intent', 'photos', 'bio-details', 'notifications', 'tutorial'].map((step, i) => (
              <View
                key={step}
                style={[
                  styles.progressDot,
                  {
                    backgroundColor:
                      ['phone-login', 'esu-email', 'name-age', 'gender', 'dating-preference', 'intent', 'photos', 'bio-details', 'notifications', 'tutorial'].indexOf(onboardingStep) >= i
                        ? theme.primary
                        : theme.border,
                  },
                ]}
              />
            ))}
          </View>
        )}

        <Animated.View style={[styles.flex, { opacity: fadeAnim }]}>
          {renderStep()}
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.background,
  },
  flex: {
    flex: 1,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignSelf: 'flex-start',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  progressDot: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
  stepContainer: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  scrollStep: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  welcomeHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 36,
    fontWeight: '800' as const,
    color: theme.text,
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: theme.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  bulletContainer: {
    gap: 16,
    marginBottom: 40,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  bulletIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    color: theme.textSecondary,
    lineHeight: 22,
  },
  bottomActions: {
    gap: 16,
    alignItems: 'center',
  },
  primaryButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
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
  secondaryButtonText: {
    fontSize: 15,
    color: theme.textSecondary,
    fontWeight: '600' as const,
    paddingVertical: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  stepIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: theme.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 15,
    color: theme.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: theme.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: theme.inputBg,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    color: theme.text,
    borderWidth: 1,
    borderColor: theme.border,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 16,
  },
  errorText: {
    color: theme.error,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  infoCard: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 20,
    gap: 10,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.border,
  },
  infoText: {
    fontSize: 14,
    color: theme.textSecondary,
    lineHeight: 22,
  },
  optionsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.surface,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
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
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: theme.border,
    gap: 14,
  },
  toggleButtonActive: {
    borderColor: theme.primary,
    backgroundColor: theme.primary,
  },
  toggleText: {
    flex: 1,
    fontSize: 16,
    color: theme.textSecondary,
    fontWeight: '500' as const,
  },
  toggleTextActive: {
    color: '#fff',
    fontWeight: '600' as const,
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
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  photoBox: {
    width: (SCREEN_WIDTH - 48 - 24) / 3,
    height: (SCREEN_WIDTH - 48 - 24) / 3 * 1.3,
    borderRadius: 14,
    backgroundColor: theme.surface,
    borderWidth: 1.5,
    borderColor: theme.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoBoxFilled: {
    borderStyle: 'solid',
    borderColor: theme.primary,
    backgroundColor: '#A855F715',
  },
  photoPlaceholder: {
    alignItems: 'center',
    gap: 4,
  },
  photoPlaceholderText: {
    fontSize: 12,
    color: theme.textMuted,
  },
  photoPreview: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  photoPreviewText: {
    fontSize: 12,
    color: theme.primary,
    fontWeight: '600' as const,
  },
  photoRemove: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipPhotoButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipPhotoText: {
    fontSize: 14,
    color: theme.textMuted,
    textDecorationLine: 'underline',
  },
  tutorialBullet: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  tutorialDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
  },
  tutorialTextWrap: {
    flex: 1,
  },
  tutorialLabel: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: theme.text,
    marginBottom: 4,
  },
  tutorialDesc: {
    fontSize: 14,
    color: theme.textSecondary,
    lineHeight: 21,
  },
});
