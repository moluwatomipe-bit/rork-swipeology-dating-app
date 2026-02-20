import { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
  TouchableOpacity,
  Modal,
  Platform,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Heart,
  X,
  Users,
  Sparkles,
  BookOpen,
  GraduationCap,
  Zap,
  ChevronUp,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { User, Match } from '@/types';
import { PERSONALITY_BADGES, ICEBREAKER_QUESTIONS } from '@/constants/matching';
import { calculateCompatibility, getCompatibilityLabel } from '@/lib/compatibility';
import Colors from '@/constants/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const theme = Colors.dark;

export default function SwipeScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser } = useAuth();
  const { getFilteredUsers, performSwipe, isUsersLoading, refreshUsers, totalSupabaseUsers } = useData();
  const [activeTab, setActiveTab] = useState<'friends' | 'dating'>('friends');
  const [cardIndex, setCardIndex] = useState<number>(0);
  const [matchPopup, setMatchPopup] = useState<{ match: Match; user: User } | null>(null);
  const [isSwiping, setIsSwiping] = useState<boolean>(false);
  const [showDetails, setShowDetails] = useState<boolean>(false);

  const position = useRef(new Animated.ValueXY()).current;
  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-12deg', '0deg', '12deg'],
    extrapolate: 'clamp',
  });
  const likeOpacity = position.x.interpolate({
    inputRange: [0, SCREEN_WIDTH / 4],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const nopeOpacity = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 4, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const users = useMemo(() => getFilteredUsers(activeTab), [activeTab, getFilteredUsers]);
  const currentCard = users[cardIndex] || null;
  const nextCard = users[cardIndex + 1] || null;

  const compatibility = useMemo(() => {
    if (!currentUser || !currentCard) return null;
    return calculateCompatibility(currentUser, currentCard);
  }, [currentUser, currentCard]);

  const compatLabel = useMemo(() => {
    if (!compatibility) return null;
    return getCompatibilityLabel(compatibility.score);
  }, [compatibility]);

  const resetPosition = useCallback(() => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      friction: 5,
      useNativeDriver: false,
    }).start();
  }, [position]);

  const swipeCard = useCallback(async (direction: 'left' | 'right') => {
    if (!currentCard || !currentUser || isSwiping) return;
    const liked = direction === 'right';
    const toValue = direction === 'right' ? SCREEN_WIDTH + 100 : -SCREEN_WIDTH - 100;

    setIsSwiping(true);
    setShowDetails(false);

    Haptics.impactAsync(
      liked ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light
    );

    Animated.timing(position, {
      toValue: { x: toValue, y: 0 },
      duration: 300,
      useNativeDriver: false,
    }).start(async () => {
      try {
        const result = await performSwipe(currentCard.id, activeTab, liked);
        if (result) {
          setMatchPopup({ match: result, user: currentCard });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch (e) {
        console.log('[Swipe] Error performing swipe:', e);
      }
      position.setValue({ x: 0, y: 0 });
      setCardIndex((prev) => prev + 1);
      setIsSwiping(false);
    });
  }, [currentCard, currentUser, activeTab, performSwipe, position, isSwiping]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !isSwiping && !showDetails,
        onPanResponderMove: (_, gesture) => {
          position.setValue({ x: gesture.dx, y: gesture.dy * 0.3 });
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx > SWIPE_THRESHOLD) {
            swipeCard('right');
          } else if (gesture.dx < -SWIPE_THRESHOLD) {
            swipeCard('left');
          } else {
            resetPosition();
          }
        },
      }),
    [swipeCard, resetPosition, position, isSwiping, showDetails]
  );

  const handleTabChange = useCallback((tab: 'friends' | 'dating') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
    setCardIndex(0);
    setShowDetails(false);
    position.setValue({ x: 0, y: 0 });
  }, [position]);

  const handleRefresh = useCallback(async () => {
    console.log('[Swipe] Refresh triggered');
    await refreshUsers();
    setCardIndex(0);
    position.setValue({ x: 0, y: 0 });
  }, [refreshUsers, position]);

  const getUserBadges = (user: User) => {
    const badges = user.personality_badges || [];
    return badges
      .map((id) => PERSONALITY_BADGES.find((b) => b.id === id))
      .filter(Boolean);
  };

  const getUserIcebreakerHighlight = (user: User) => {
    const answers = user.icebreaker_answers || {};
    const keys = Object.keys(answers);
    if (keys.length === 0) return null;
    const randomKey = keys[0];
    const question = ICEBREAKER_QUESTIONS.find((q) => q.id === randomKey);
    if (!question) return null;
    return { question: question.question, answer: answers[randomKey] };
  };

  const renderCard = (user: User, isTop: boolean) => {
    const cardStyle = isTop
      ? {
          transform: [
            { translateX: position.x },
            { translateY: position.y },
            { rotate },
          ],
        }
      : { transform: [{ scale: 0.95 }] };

    const interestsList = user.interests
      ? user.interests.split(',').map((i) => i.trim()).filter(Boolean)
      : [];

    const badges = getUserBadges(user);
    const icebreaker = getUserIcebreakerHighlight(user);
    const cardCompat = isTop && currentUser ? calculateCompatibility(currentUser, user) : null;
    const cardCompatLabel = cardCompat ? getCompatibilityLabel(cardCompat.score) : null;

    return (
      <Animated.View
        key={user.id}
        style={[styles.card, cardStyle]}
        {...(isTop ? panResponder.panHandlers : {})}
      >
        <Image
          source={{ uri: user.photo1_url }}
          style={styles.cardImage}
          contentFit="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.9)']}
          style={styles.cardGradient}
        >
          <View style={styles.cardInfo}>
            {isTop && cardCompat && cardCompatLabel && (
              <View style={[styles.compatBadge, { backgroundColor: cardCompatLabel.color + '30' }]}>
                <Zap size={12} color={cardCompatLabel.color} />
                <Text style={[styles.compatScore, { color: cardCompatLabel.color }]}>
                  {cardCompat.score}%
                </Text>
                <Text style={[styles.compatLabel, { color: cardCompatLabel.color }]}>
                  {cardCompatLabel.label}
                </Text>
              </View>
            )}

            <View style={styles.cardNameRow}>
              <Text style={styles.cardName}>{user.first_name}, {user.age}</Text>
              {user.is_verified_esu && (
                <View style={styles.verifiedBadge}>
                  <Sparkles size={12} color="#fff" />
                </View>
              )}
            </View>

            {user.major ? (
              <View style={styles.cardDetail}>
                <BookOpen size={14} color="rgba(255,255,255,0.7)" />
                <Text style={styles.cardDetailText}>{user.major}</Text>
              </View>
            ) : null}
            {user.class_year ? (
              <View style={styles.cardDetail}>
                <GraduationCap size={14} color="rgba(255,255,255,0.7)" />
                <Text style={styles.cardDetailText}>Class of {user.class_year}</Text>
              </View>
            ) : null}

            {badges.length > 0 && (
              <View style={styles.badgesRow}>
                {badges.slice(0, 4).map((badge) => badge && (
                  <View
                    key={badge.id}
                    style={[styles.cardBadge, { backgroundColor: badge.color + '35' }]}
                  >
                    <Text style={styles.cardBadgeEmoji}>{badge.emoji}</Text>
                    <Text style={[styles.cardBadgeText, { color: badge.color }]}>{badge.label}</Text>
                  </View>
                ))}
              </View>
            )}

            {user.bio ? (
              <Text style={styles.cardBio} numberOfLines={2}>{user.bio}</Text>
            ) : null}

            {interestsList.length > 0 && (
              <View style={styles.interestsRow}>
                {interestsList.slice(0, 4).map((interest) => (
                  <View key={interest} style={[
                    styles.interestTag,
                    isTop && cardCompat && cardCompat.sharedInterests.includes(interest.toLowerCase())
                      ? styles.interestTagShared
                      : null,
                  ]}>
                    <Text style={[
                      styles.interestText,
                      isTop && cardCompat && cardCompat.sharedInterests.includes(interest.toLowerCase())
                        ? styles.interestTextShared
                        : null,
                    ]}>{interest}</Text>
                  </View>
                ))}
              </View>
            )}

            {isTop && icebreaker && (
              <TouchableOpacity
                style={styles.icebreakerPreview}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowDetails(true);
                }}
                activeOpacity={0.7}
              >
                <ChevronUp size={14} color="rgba(255,255,255,0.6)" />
                <Text style={styles.icebreakerPreviewText}>Tap for more details</Text>
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>

        {isTop && (
          <>
            <Animated.View style={[styles.stampContainer, styles.likeStamp, { opacity: likeOpacity }]}>
              <Text style={styles.likeStampText}>LIKE</Text>
            </Animated.View>
            <Animated.View style={[styles.stampContainer, styles.nopeStamp, { opacity: nopeOpacity }]}>
              <Text style={styles.nopeStampText}>NOPE</Text>
            </Animated.View>
          </>
        )}
      </Animated.View>
    );
  };

  const renderDetailsModal = () => {
    if (!currentCard || !currentUser) return null;

    const badges = getUserBadges(currentCard);
    const answers = currentCard.icebreaker_answers || {};
    const myAnswers = currentUser.icebreaker_answers || {};
    const interestsList = currentCard.interests
      ? currentCard.interests.split(',').map((i) => i.trim()).filter(Boolean)
      : [];

    return (
      <Modal
        visible={showDetails}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDetails(false)}
      >
        <View style={styles.detailsOverlay}>
          <TouchableOpacity
            style={styles.detailsDismiss}
            onPress={() => setShowDetails(false)}
            activeOpacity={1}
          />
          <View style={styles.detailsSheet}>
            <View style={styles.detailsHandle} />
            <ScrollView showsVerticalScrollIndicator={false} style={styles.detailsScroll}>
              <View style={styles.detailsHeader}>
                <Text style={styles.detailsName}>{currentCard.first_name}, {currentCard.age}</Text>
                {compatibility && compatLabel && (
                  <View style={[styles.detailsCompatBadge, { backgroundColor: compatLabel.color + '20' }]}>
                    <Zap size={14} color={compatLabel.color} />
                    <Text style={[styles.detailsCompatText, { color: compatLabel.color }]}>
                      {compatibility.score}% {compatLabel.label}
                    </Text>
                  </View>
                )}
              </View>

              {currentCard.bio ? (
                <Text style={styles.detailsBio}>{currentCard.bio}</Text>
              ) : null}

              {badges.length > 0 && (
                <View style={styles.detailsSection}>
                  <Text style={styles.detailsSectionTitle}>Personality</Text>
                  <View style={styles.detailsBadges}>
                    {badges.map((badge) => badge && (
                      <View
                        key={badge.id}
                        style={[styles.detailBadgeChip, { backgroundColor: badge.color + '20', borderColor: badge.color + '40' }]}
                      >
                        <Text style={styles.detailBadgeEmoji}>{badge.emoji}</Text>
                        <Text style={[styles.detailBadgeLabel, { color: badge.color }]}>{badge.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {interestsList.length > 0 && (
                <View style={styles.detailsSection}>
                  <Text style={styles.detailsSectionTitle}>Interests</Text>
                  <View style={styles.detailsInterests}>
                    {interestsList.map((interest) => {
                      const isShared = compatibility?.sharedInterests.includes(interest.toLowerCase());
                      return (
                        <View
                          key={interest}
                          style={[
                            styles.detailInterestChip,
                            isShared && styles.detailInterestChipShared,
                          ]}
                        >
                          <Text style={[
                            styles.detailInterestText,
                            isShared && styles.detailInterestTextShared,
                          ]}>
                            {interest}
                            {isShared ? ' \u2728' : ''}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                  {compatibility && compatibility.sharedInterests.length > 0 && (
                    <Text style={styles.sharedHint}>
                      {compatibility.sharedInterests.length} shared interest{compatibility.sharedInterests.length > 1 ? 's' : ''}
                    </Text>
                  )}
                </View>
              )}

              {Object.keys(answers).length > 0 && (
                <View style={styles.detailsSection}>
                  <Text style={styles.detailsSectionTitle}>Icebreakers</Text>
                  {ICEBREAKER_QUESTIONS.filter((q) => answers[q.id]).map((q) => {
                    const theirAnswer = answers[q.id];
                    const myAnswer = myAnswers[q.id];
                    const isMatch = myAnswer && myAnswer === theirAnswer;
                    return (
                      <View key={q.id} style={styles.icebreakerItem}>
                        <Text style={styles.icebreakerItemQ}>{q.question}</Text>
                        <View style={styles.icebreakerAnswerRow}>
                          <View style={[
                            styles.icebreakerAnswerChip,
                            isMatch && styles.icebreakerAnswerChipMatch,
                          ]}>
                            <Text style={[
                              styles.icebreakerAnswerText,
                              isMatch && styles.icebreakerAnswerTextMatch,
                            ]}>
                              {theirAnswer}
                            </Text>
                          </View>
                          {isMatch && (
                            <Text style={styles.icebreakerMatchLabel}>Same as you!</Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {compatibility && (
                <View style={styles.detailsSection}>
                  <Text style={styles.detailsSectionTitle}>Compatibility Breakdown</Text>
                  <View style={styles.compatBreakdown}>
                    <View style={styles.compatRow}>
                      <Text style={styles.compatRowLabel}>Shared Interests</Text>
                      <Text style={styles.compatRowValue}>{compatibility.sharedInterests.length}</Text>
                    </View>
                    <View style={styles.compatRow}>
                      <Text style={styles.compatRowLabel}>Same Major</Text>
                      <Text style={[styles.compatRowValue, compatibility.sameMajor ? { color: '#10B981' } : {}]}>
                        {compatibility.sameMajor ? 'Yes' : 'No'}
                      </Text>
                    </View>
                    <View style={styles.compatRow}>
                      <Text style={styles.compatRowLabel}>Icebreaker Matches</Text>
                      <Text style={styles.compatRowValue}>{compatibility.icebreakerMatches}</Text>
                    </View>
                    <View style={styles.compatRow}>
                      <Text style={styles.compatRowLabel}>Badge Overlap</Text>
                      <Text style={styles.compatRowValue}>{compatibility.badgeOverlap}</Text>
                    </View>
                  </View>
                </View>
              )}

              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Swipeology</Text>
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'friends' && styles.tabActive]}
            onPress={() => handleTabChange('friends')}
            activeOpacity={0.7}
            testID="tab-friends"
          >
            <Users size={16} color={activeTab === 'friends' ? '#fff' : theme.textMuted} />
            <Text style={[styles.tabText, activeTab === 'friends' && styles.tabTextActive]}>
              Friends
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'dating' && styles.tabActiveDating]}
            onPress={() => handleTabChange('dating')}
            activeOpacity={0.7}
            testID="tab-dating"
          >
            <Heart size={16} color={activeTab === 'dating' ? '#fff' : theme.textMuted} />
            <Text style={[styles.tabText, activeTab === 'dating' && styles.tabTextActive]}>
              Dating
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.deckContainer}>
        {isUsersLoading ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Sparkles size={48} color={theme.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>Loading profiles...</Text>
            <Text style={styles.emptySubtitle}>
              Fetching real students from your campus
            </Text>
          </View>
        ) : !currentCard ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              {activeTab === 'friends' ? (
                <Users size={48} color={theme.textMuted} />
              ) : (
                <Heart size={48} color={theme.textMuted} />
              )}
            </View>
            <Text style={styles.emptyTitle}>No more profiles</Text>
            <Text style={styles.emptySubtitle}>
              {totalSupabaseUsers <= 1
                ? 'No other users have signed up yet. Check back soon!'
                : `Check back later for new ${activeTab === 'friends' ? 'friends' : 'matches'}`}
            </Text>
            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={handleRefresh}
              activeOpacity={0.7}
              testID="refresh-btn"
            >
              <Text style={styles.refreshBtnText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {nextCard && renderCard(nextCard, false)}
            {renderCard(currentCard, true)}
          </>
        )}
      </View>

      {currentCard && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.dislikeBtn]}
            onPress={() => swipeCard('left')}
            activeOpacity={0.8}
            testID="dislike-btn"
            disabled={isSwiping}
          >
            <X size={28} color={theme.error} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.likeBtn]}
            onPress={() => swipeCard('right')}
            activeOpacity={0.8}
            testID="like-btn"
            disabled={isSwiping}
          >
            <Heart size={28} color="#fff" fill="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {renderDetailsModal()}

      <Modal
        visible={matchPopup !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setMatchPopup(null)}
      >
        <View style={styles.matchOverlay}>
          <View style={styles.matchPopup}>
            <LinearGradient
              colors={activeTab === 'friends' ? ['#EC4899', '#F472B6'] : ['#A855F7', '#D946EF']}
              style={styles.matchGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Sparkles size={40} color="#fff" />
              <Text style={styles.matchTitle}>It&apos;s a match!</Text>
              <Text style={styles.matchSubtext}>
                {activeTab === 'friends'
                  ? `You and ${matchPopup?.user.first_name} want to be friends!`
                  : `You and ${matchPopup?.user.first_name} like each other!`}
              </Text>
              <TouchableOpacity
                style={styles.matchChatBtn}
                onPress={() => {
                  const m = matchPopup;
                  setMatchPopup(null);
                  if (m) {
                    router.push({
                      pathname: '/(tabs)/matches/chat' as any,
                      params: {
                        matchId: m.match.id,
                        userName: m.user.first_name,
                        context: m.match.context,
                      },
                    });
                  }
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.matchChatBtnText}>Go to Chat</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setMatchPopup(null)}
                activeOpacity={0.7}
              >
                <Text style={styles.matchKeepText}>Keep swiping</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: theme.text,
    marginBottom: 14,
    letterSpacing: -0.5,
  },
  tabBar: {
    flexDirection: 'row',
    gap: 10,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  tabActive: {
    backgroundColor: theme.secondary,
    borderColor: theme.secondary,
  },
  tabActiveDating: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: theme.textMuted,
  },
  tabTextActive: {
    color: '#fff',
  },
  deckContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  card: {
    position: 'absolute',
    width: SCREEN_WIDTH - 32,
    height: SCREEN_HEIGHT * 0.58,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: theme.card,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
      web: {},
    }),
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    justifyContent: 'flex-end',
    padding: 16,
  },
  cardInfo: {
    gap: 5,
  },
  compatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    marginBottom: 4,
  },
  compatScore: {
    fontSize: 13,
    fontWeight: '800' as const,
  },
  compatLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  cardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardName: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: '#fff',
  },
  verifiedBadge: {
    backgroundColor: theme.secondary,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardDetailText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 2,
  },
  cardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  cardBadgeEmoji: {
    fontSize: 11,
  },
  cardBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  cardBio: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 18,
    marginTop: 2,
  },
  interestsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 4,
  },
  interestTag: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
  },
  interestTagShared: {
    backgroundColor: 'rgba(16, 185, 129, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.5)',
  },
  interestText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '500' as const,
  },
  interestTextShared: {
    color: '#6EE7B7',
    fontWeight: '700' as const,
  },
  icebreakerPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 6,
    paddingVertical: 4,
  },
  icebreakerPreviewText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500' as const,
  },
  stampContainer: {
    position: 'absolute',
    top: 40,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 3,
    borderRadius: 8,
  },
  likeStamp: {
    right: 20,
    borderColor: '#A855F7',
    transform: [{ rotate: '-15deg' }],
  },
  nopeStamp: {
    left: 20,
    borderColor: theme.error,
    transform: [{ rotate: '15deg' }],
  },
  likeStampText: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: '#A855F7',
  },
  nopeStampText: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: theme.error,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    paddingVertical: 16,
    paddingBottom: 8,
  },
  actionBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
      },
      android: { elevation: 4 },
      web: {},
    }),
  },
  dislikeBtn: {
    backgroundColor: theme.surface,
    borderWidth: 2,
    borderColor: theme.border,
  },
  likeBtn: {
    backgroundColor: theme.primary,
  },
  emptyState: {
    alignItems: 'center',
    gap: 12,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: theme.text,
  },
  emptySubtitle: {
    fontSize: 15,
    color: theme.textSecondary,
    textAlign: 'center',
  },
  matchOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  matchPopup: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
  },
  matchGradient: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  matchTitle: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: '#fff',
    marginTop: 8,
  },
  matchSubtext: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 8,
  },
  matchChatBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
    marginTop: 8,
  },
  matchChatBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#333',
  },
  matchKeepText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
  },
  detailsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  detailsDismiss: {
    flex: 1,
  },
  detailsSheet: {
    backgroundColor: theme.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.7,
    paddingTop: 12,
  },
  detailsHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.border,
    alignSelf: 'center',
    marginBottom: 12,
  },
  detailsScroll: {
    paddingHorizontal: 22,
  },
  detailsHeader: {
    gap: 8,
    marginBottom: 12,
  },
  detailsName: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: theme.text,
  },
  detailsCompatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  detailsCompatText: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  detailsBio: {
    fontSize: 15,
    color: theme.textSecondary,
    lineHeight: 22,
    marginBottom: 16,
  },
  detailsSection: {
    marginBottom: 20,
  },
  detailsSectionTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: theme.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  detailsBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailBadgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  detailBadgeEmoji: {
    fontSize: 16,
  },
  detailBadgeLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  detailsInterests: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailInterestChip: {
    backgroundColor: theme.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  detailInterestChipShared: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  detailInterestText: {
    fontSize: 13,
    color: theme.textSecondary,
    fontWeight: '500' as const,
  },
  detailInterestTextShared: {
    color: '#6EE7B7',
    fontWeight: '700' as const,
  },
  sharedHint: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600' as const,
    marginTop: 8,
  },
  icebreakerItem: {
    backgroundColor: theme.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.border,
  },
  icebreakerItemQ: {
    fontSize: 13,
    color: theme.textMuted,
    fontWeight: '600' as const,
    marginBottom: 6,
  },
  icebreakerAnswerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  icebreakerAnswerChip: {
    backgroundColor: theme.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  icebreakerAnswerChipMatch: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  icebreakerAnswerText: {
    fontSize: 14,
    color: theme.text,
    fontWeight: '500' as const,
  },
  icebreakerAnswerTextMatch: {
    color: '#6EE7B7',
    fontWeight: '700' as const,
  },
  icebreakerMatchLabel: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '700' as const,
  },
  compatBreakdown: {
    backgroundColor: theme.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: 'hidden',
  },
  compatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  compatRowLabel: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  compatRowValue: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: theme.text,
  },
  refreshBtn: {
    marginTop: 16,
    backgroundColor: theme.primary,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
  },
  refreshBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700' as const,
  },
});
