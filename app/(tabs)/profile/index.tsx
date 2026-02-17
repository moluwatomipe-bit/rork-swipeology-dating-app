import { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Stack, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  LogOut,
  Trash2,
  BookOpen,
  GraduationCap,
  Heart,
  Users,
  Mail,
  Shield,
  ChevronRight,
  Edit3,
  Lock,
  Settings,
  Phone,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';
import Colors from '@/constants/colors';

const theme = Colors.dark;

export default function ProfileScreen() {
  const { currentUser, logout, deleteAccount } = useAuth();

  const handleEditProfile = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!currentUser?.phone_verified) {
      router.push({
        pathname: '/(tabs)/profile/verify-phone',
        params: { redirect: 'edit' },
      });
    } else {
      router.push('/(tabs)/profile/edit');
    }
  }, [currentUser]);

  const handleChangePassword = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!currentUser?.phone_verified) {
      router.push({
        pathname: '/(tabs)/profile/verify-phone',
        params: { redirect: 'password' },
      });
    } else {
      router.push('/(tabs)/profile/change-password');
    }
  }, [currentUser]);

  const handlePreferences = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/profile/preferences');
  }, []);

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            logout();
            router.replace('/onboarding');
          },
        },
      ]
    );
  }, [logout]);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account, matches, and messages. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you absolutely sure?',
              'All your data will be permanently removed.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete',
                  style: 'destructive',
                  onPress: () => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                    deleteAccount();
                    router.replace('/onboarding');
                  },
                },
              ]
            );
          },
        },
      ]
    );
  }, [deleteAccount]);

  if (!currentUser) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: 'Profile' }} />
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Please log in to view your profile.</Text>
        </View>
      </View>
    );
  }

  const interestsList = currentUser.interests
    ? currentUser.interests.split(',').map((i) => i.trim()).filter(Boolean)
    : [];

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Profile' }} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: currentUser.photo1_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200' }}
              style={styles.avatar}
              contentFit="cover"
            />
            <TouchableOpacity onPress={handleEditProfile} activeOpacity={0.7}>
              <LinearGradient
                colors={['#A855F7', '#EC4899']}
                style={styles.editAvatarBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Edit3 size={14} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
          <Text style={styles.profileName}>
            {currentUser.first_name || 'User'}{currentUser.age ? `, ${currentUser.age}` : ''}
          </Text>
          {currentUser.pronouns ? (
            <Text style={styles.pronounsText}>{currentUser.pronouns}</Text>
          ) : null}
          <View style={styles.verifiedRow}>
            <Shield size={14} color={theme.secondary} />
            <Text style={styles.verifiedText}>Verified ESU Student</Text>
          </View>
          {currentUser.phone_verified ? (
            <View style={styles.verifiedRow}>
              <Phone size={13} color={theme.primary} />
              <Text style={[styles.verifiedText, { color: theme.primary }]}>Phone Verified</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.verifyPhoneBanner}
              onPress={() => router.push('/(tabs)/profile/verify-phone')}
              activeOpacity={0.7}
            >
              <Phone size={16} color={theme.warning} />
              <Text style={styles.verifyPhoneText}>Verify your phone number</Text>
              <ChevronRight size={16} color={theme.warning} />
            </TouchableOpacity>
          )}
        </View>

        {currentUser.bio ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bio</Text>
            <View style={styles.sectionCard}>
              <Text style={styles.bioText}>{currentUser.bio}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.sectionCard}>
            {currentUser.major ? (
              <View style={styles.detailRow}>
                <BookOpen size={18} color={theme.textSecondary} />
                <Text style={styles.detailLabel}>Major</Text>
                <Text style={styles.detailValue}>{currentUser.major}</Text>
              </View>
            ) : null}
            {currentUser.class_year ? (
              <View style={styles.detailRow}>
                <GraduationCap size={18} color={theme.textSecondary} />
                <Text style={styles.detailLabel}>Class</Text>
                <Text style={styles.detailValue}>{currentUser.class_year}</Text>
              </View>
            ) : null}
            {currentUser.school_email ? (
              <View style={styles.detailRow}>
                <Mail size={18} color={theme.textSecondary} />
                <Text style={styles.detailLabel}>Email</Text>
                <Text style={styles.detailValue} numberOfLines={1}>{currentUser.school_email}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Looking for</Text>
          <View style={styles.lookingForRow}>
            {currentUser.wants_friends && (
              <View style={[styles.lookingForTag, { backgroundColor: '#EC489920', borderColor: theme.secondary }]}>
                <Users size={14} color={theme.secondary} />
                <Text style={[styles.lookingForText, { color: theme.secondary }]}>Friends</Text>
              </View>
            )}
            {currentUser.wants_dating && (
              <View style={[styles.lookingForTag, { backgroundColor: '#A855F720', borderColor: theme.primary }]}>
                <Heart size={14} color={theme.primary} />
                <Text style={[styles.lookingForText, { color: theme.primary }]}>Dating</Text>
              </View>
            )}
          </View>
        </View>

        {interestsList.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Interests</Text>
            <View style={styles.interestsWrap}>
              {interestsList.map((interest) => (
                <View key={interest} style={styles.interestChip}>
                  <Text style={styles.interestChipText}>{interest}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.sectionCard}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleEditProfile}
              activeOpacity={0.7}
              testID="edit-profile-btn"
            >
              <Edit3 size={20} color={theme.textSecondary} />
              <Text style={styles.menuText}>Edit Profile</Text>
              <ChevronRight size={18} color={theme.textMuted} />
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handlePreferences}
              activeOpacity={0.7}
              testID="preferences-btn"
            >
              <Settings size={20} color={theme.textSecondary} />
              <Text style={styles.menuText}>Preferences</Text>
              <ChevronRight size={18} color={theme.textMuted} />
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleChangePassword}
              activeOpacity={0.7}
              testID="change-password-btn"
            >
              <Lock size={20} color={theme.textSecondary} />
              <Text style={styles.menuText}>Change Password</Text>
              <ChevronRight size={18} color={theme.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.sectionCard}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleLogout}
              activeOpacity={0.7}
              testID="logout-btn"
            >
              <LogOut size={20} color={theme.textSecondary} />
              <Text style={styles.menuText}>Log Out</Text>
              <ChevronRight size={18} color={theme.textMuted} />
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleDeleteAccount}
              activeOpacity={0.7}
              testID="delete-account-btn"
            >
              <Trash2 size={20} color={theme.error} />
              <Text style={[styles.menuText, { color: theme.error }]}>Delete Account</Text>
              <ChevronRight size={18} color={theme.error} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Swipeology v1.0</Text>
          <Text style={styles.footerText}>Made for ESU students</Text>
        </View>
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
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 6,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.card,
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: -4,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: theme.background,
  },
  profileName: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: theme.text,
  },
  pronounsText: {
    fontSize: 14,
    color: theme.textSecondary,
    fontWeight: '500' as const,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  verifiedText: {
    fontSize: 13,
    color: theme.secondary,
    fontWeight: '500' as const,
  },
  verifyPhoneBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFC10715',
    borderWidth: 1,
    borderColor: '#FFC10740',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
    marginHorizontal: 20,
  },
  verifyPhoneText: {
    flex: 1,
    fontSize: 14,
    color: theme.warning,
    fontWeight: '600' as const,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: theme.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  sectionCard: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: theme.border,
  },
  bioText: {
    fontSize: 15,
    color: theme.text,
    lineHeight: 22,
    padding: 14,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  detailLabel: {
    fontSize: 14,
    color: theme.textSecondary,
    minWidth: 50,
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    color: theme.text,
    fontWeight: '500' as const,
    textAlign: 'right' as const,
  },
  lookingForRow: {
    flexDirection: 'row',
    gap: 10,
  },
  lookingForTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  lookingForText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  interestsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestChip: {
    backgroundColor: theme.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
  },
  interestChipText: {
    fontSize: 13,
    color: theme.textSecondary,
    fontWeight: '500' as const,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  menuText: {
    flex: 1,
    fontSize: 15,
    color: theme.text,
    fontWeight: '500' as const,
  },
  menuDivider: {
    height: 1,
    backgroundColor: theme.border,
    marginHorizontal: 14,
  },
  footer: {
    alignItems: 'center',
    gap: 4,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 12,
    color: theme.textMuted,
  },
});
