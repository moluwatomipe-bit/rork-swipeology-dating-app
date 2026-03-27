import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Camera, X, Check, ChevronDown } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useAuth } from '@/contexts/AuthContext';
import { User } from '@/types';
import { fetchPronouns, PronounOption } from '@/lib/pronouns';
import { ICEBREAKER_QUESTIONS, PERSONALITY_BADGES, MAX_BADGES } from '@/constants/matching';
import Colors from '@/constants/colors';

const theme = Colors.dark;

export default function EditProfileScreen() {
  const { currentUser, updateUser } = useAuth();

  const [firstName, setFirstName] = useState<string>(currentUser?.first_name || '');
  const [bio, setBio] = useState<string>(currentUser?.bio || '');
  const [major, setMajor] = useState<string>(currentUser?.major || '');
  const [classYear, setClassYear] = useState<string>(currentUser?.class_year || '');
  const [pronouns, setPronouns] = useState<string>(currentUser?.pronouns || '');
  const [pronounOptions, setPronounOptions] = useState<PronounOption[]>([]);
  const [showPronounPicker, setShowPronounPicker] = useState<boolean>(false);

  useEffect(() => {
    fetchPronouns().then(setPronounOptions);
  }, []);
  const [interests, setInterests] = useState<string>(currentUser?.interests || '');
  const [photos, setPhotos] = useState<string[]>([
    currentUser?.photo1_url || '',
    currentUser?.photo2_url || '',
    currentUser?.photo3_url || '',
    currentUser?.photo4_url || '',
    currentUser?.photo5_url || '',
    currentUser?.photo6_url || '',
  ]);

  const [icebreakerAnswers, setIcebreakerAnswers] = useState<Record<string, string>>(
    currentUser?.icebreaker_answers || {}
  );
  const [expandedIcebreaker, setExpandedIcebreaker] = useState<string | null>(null);
  const [selectedBadges, setSelectedBadges] = useState<string[]>(
    currentUser?.personality_badges || []
  );

  if (!currentUser) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: 'Edit Profile' }} />
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Please log in.</Text>
        </View>
      </View>
    );
  }

  const handlePickPhoto = async (index: number) => {
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
  };

  const handleRemovePhoto = (index: number) => {
    const newPhotos = [...photos];
    newPhotos[index] = '';
    setPhotos(newPhotos);
  };

  const handleToggleBadge = (badgeId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedBadges((prev) => {
      if (prev.includes(badgeId)) {
        return prev.filter((b) => b !== badgeId);
      }
      if (prev.length >= MAX_BADGES) {
        Alert.alert('Limit reached', `You can select up to ${MAX_BADGES} badges.`);
        return prev;
      }
      return [...prev, badgeId];
    });
  };

  const handleSelectIcebreaker = (questionId: string, answer: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIcebreakerAnswers((prev) => ({ ...prev, [questionId]: answer }));
    setExpandedIcebreaker(null);
  };

  const handleSave = () => {
    if (!firstName.trim()) {
      Alert.alert('Error', 'Please enter your first name');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateUser({
      first_name: firstName.trim(),
      bio: bio.trim(),
      major: major.trim(),
      class_year: classYear.trim(),
      pronouns: pronouns.trim(),
      interests: interests.trim(),
      photo1_url: photos[0],
      photo2_url: photos[1],
      photo3_url: photos[2],
      photo4_url: photos[3],
      photo5_url: photos[4],
      photo6_url: photos[5],
      icebreaker_answers: icebreakerAnswers,
      personality_badges: selectedBadges,
    } as User);

    Alert.alert('Saved', 'Your profile has been updated.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          title: 'Edit Profile',
          headerRight: () => (
            <TouchableOpacity onPress={handleSave} activeOpacity={0.7} testID="save-btn">
              <Check size={22} color={theme.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>Photos</Text>
        <View style={styles.photoGrid}>
          {photos.map((photo, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.photoBox, photo ? styles.photoBoxFilled : null]}
              onPress={() => handlePickPhoto(index)}
              activeOpacity={0.7}
              testID={`edit-photo-${index}`}
            >
              {photo ? (
                <View style={styles.photoPreviewContainer}>
                  <Image source={{ uri: photo }} style={styles.photoImage} contentFit="cover" />
                  <TouchableOpacity
                    style={styles.photoRemove}
                    onPress={() => handleRemovePhoto(index)}
                    activeOpacity={0.7}
                  >
                    <X size={12} color="#fff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Camera size={20} color={theme.textMuted} />
                  <Text style={styles.photoPlaceholderText}>{index + 1}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>First name</Text>
          <TextInput
            style={styles.textInput}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Your first name"
            placeholderTextColor={theme.textMuted}
            testID="edit-name-input"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Pronouns</Text>
          <TouchableOpacity
            style={styles.textInput}
            onPress={() => setShowPronounPicker(!showPronounPicker)}
            activeOpacity={0.7}
            testID="edit-pronouns-input"
          >
            <Text style={{ color: pronouns ? theme.text : theme.textMuted, fontSize: 16 }}>
              {pronouns ? pronounOptions.find(p => p.value === pronouns)?.label || pronouns : 'Select pronouns'}
            </Text>
          </TouchableOpacity>
          {showPronounPicker && (
            <View style={styles.pronounPickerContainer}>
              {pronounOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.pronounOption,
                    pronouns === opt.value && styles.pronounOptionSelected,
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setPronouns(opt.value);
                    setShowPronounPicker(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.pronounOptionText,
                    pronouns === opt.value && styles.pronounOptionTextSelected,
                  ]}>{opt.label}</Text>
                  {pronouns === opt.value && <Check size={16} color={theme.primary} />}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Bio</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={bio}
            onChangeText={setBio}
            placeholder="Tell people about yourself..."
            placeholderTextColor={theme.textMuted}
            multiline
            numberOfLines={4}
            testID="edit-bio-input"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Major</Text>
          <TextInput
            style={styles.textInput}
            value={major}
            onChangeText={setMajor}
            placeholder="e.g., Biology"
            placeholderTextColor={theme.textMuted}
            testID="edit-major-input"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Class year</Text>
          <TextInput
            style={styles.textInput}
            value={classYear}
            onChangeText={setClassYear}
            placeholder="e.g., 2026"
            placeholderTextColor={theme.textMuted}
            keyboardType="number-pad"
            testID="edit-class-year-input"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Interests</Text>
          <TextInput
            style={styles.textInput}
            value={interests}
            onChangeText={setInterests}
            placeholder="hiking, coffee, music..."
            placeholderTextColor={theme.textMuted}
            testID="edit-interests-input"
          />
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionLabel}>Personality Badges</Text>
        <Text style={styles.sectionHint}>
          Pick up to {MAX_BADGES} that describe you ({selectedBadges.length}/{MAX_BADGES})
        </Text>
        <View style={styles.badgeGrid}>
          {PERSONALITY_BADGES.map((badge) => {
            const isSelected = selectedBadges.includes(badge.id);
            return (
              <TouchableOpacity
                key={badge.id}
                style={[
                  styles.badgeChip,
                  isSelected && { backgroundColor: badge.color + '25', borderColor: badge.color },
                ]}
                onPress={() => handleToggleBadge(badge.id)}
                activeOpacity={0.7}
                testID={`badge-${badge.id}`}
              >
                <Text style={styles.badgeEmoji}>{badge.emoji}</Text>
                <Text
                  style={[
                    styles.badgeLabel,
                    isSelected && { color: badge.color, fontWeight: '700' as const },
                  ]}
                >
                  {badge.label}
                </Text>
                {isSelected && (
                  <View style={[styles.badgeCheck, { backgroundColor: badge.color }]}>
                    <Check size={10} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionLabel}>Icebreakers</Text>
        <Text style={styles.sectionHint}>
          Answer these to improve your match quality
        </Text>
        {ICEBREAKER_QUESTIONS.map((q) => {
          const currentAnswer = icebreakerAnswers[q.id] || '';
          const isExpanded = expandedIcebreaker === q.id;
          return (
            <View key={q.id} style={styles.icebreakerCard}>
              <TouchableOpacity
                style={styles.icebreakerHeader}
                onPress={() => setExpandedIcebreaker(isExpanded ? null : q.id)}
                activeOpacity={0.7}
                testID={`icebreaker-${q.id}`}
              >
                <View style={styles.icebreakerHeaderLeft}>
                  <Text style={styles.icebreakerQuestion}>{q.question}</Text>
                  {currentAnswer ? (
                    <Text style={styles.icebreakerCurrentAnswer}>{currentAnswer}</Text>
                  ) : (
                    <Text style={styles.icebreakerPlaceholder}>Tap to answer</Text>
                  )}
                </View>
                <ChevronDown
                  size={18}
                  color={theme.textMuted}
                  style={isExpanded ? { transform: [{ rotate: '180deg' }] } : undefined}
                />
              </TouchableOpacity>
              {isExpanded && (
                <View style={styles.icebreakerOptions}>
                  {q.options.map((opt) => {
                    const isActive = currentAnswer === opt;
                    return (
                      <TouchableOpacity
                        key={opt}
                        style={[
                          styles.icebreakerOption,
                          isActive && styles.icebreakerOptionActive,
                        ]}
                        onPress={() => handleSelectIcebreaker(q.id, opt)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.icebreakerOptionText,
                            isActive && styles.icebreakerOptionTextActive,
                          ]}
                        >
                          {opt}
                        </Text>
                        {isActive && <Check size={14} color={theme.primary} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}

        <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.8}>
          <LinearGradient
            colors={['#A855F7', '#EC4899']}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
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
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: theme.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  sectionHint: {
    fontSize: 13,
    color: theme.textSecondary,
    marginBottom: 14,
  },
  divider: {
    height: 1,
    backgroundColor: theme.border,
    marginVertical: 22,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
    marginTop: 6,
  },
  photoBox: {
    width: '30.5%',
    aspectRatio: 0.75,
    borderRadius: 14,
    backgroundColor: theme.surface,
    borderWidth: 1.5,
    borderColor: theme.border,
    borderStyle: 'dashed' as const,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  photoBoxFilled: {
    borderStyle: 'solid' as const,
    borderColor: theme.primary,
  },
  photoPreviewContainer: {
    width: '100%',
    height: '100%',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoRemove: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholder: {
    alignItems: 'center',
    gap: 4,
  },
  photoPlaceholderText: {
    fontSize: 12,
    color: theme.textMuted,
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
    textAlignVertical: 'top' as const,
    paddingTop: 16,
  },
  saveButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 20,
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
  pronounPickerContainer: {
    marginTop: 8,
    backgroundColor: theme.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: 'hidden',
  },
  pronounOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  pronounOptionSelected: {
    backgroundColor: `${theme.primary}15`,
  },
  pronounOptionText: {
    fontSize: 16,
    color: theme.text,
  },
  pronounOptionTextSelected: {
    color: theme.primary,
    fontWeight: '600' as const,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  badgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: theme.surface,
    borderWidth: 1.5,
    borderColor: theme.border,
  },
  badgeEmoji: {
    fontSize: 16,
  },
  badgeLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: theme.textSecondary,
  },
  badgeCheck: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 2,
  },
  icebreakerCard: {
    backgroundColor: theme.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 10,
    overflow: 'hidden',
  },
  icebreakerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  icebreakerHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  icebreakerQuestion: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: theme.text,
    marginBottom: 2,
  },
  icebreakerCurrentAnswer: {
    fontSize: 13,
    color: theme.primary,
    fontWeight: '500' as const,
  },
  icebreakerPlaceholder: {
    fontSize: 13,
    color: theme.textMuted,
  },
  icebreakerOptions: {
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  icebreakerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  icebreakerOptionActive: {
    backgroundColor: `${theme.primary}12`,
  },
  icebreakerOptionText: {
    fontSize: 15,
    color: theme.textSecondary,
  },
  icebreakerOptionTextActive: {
    color: theme.primary,
    fontWeight: '600' as const,
  },
});
