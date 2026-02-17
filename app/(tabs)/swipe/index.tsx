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
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { User, Match } from '@/types';
import Colors from '@/constants/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const theme = Colors.dark;

export default function SwipeScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser } = useAuth();
  const { getFilteredUsers, performSwipe } = useData();
  const [activeTab, setActiveTab] = useState<'friends' | 'dating'>('friends');
  const [cardIndex, setCardIndex] = useState<number>(0);
  const [matchPopup, setMatchPopup] = useState<{ match: Match; user: User } | null>(null);

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

  const resetPosition = useCallback(() => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      friction: 5,
      useNativeDriver: false,
    }).start();
  }, [position]);

  const swipeCard = useCallback((direction: 'left' | 'right') => {
    if (!currentCard || !currentUser) return;
    const liked = direction === 'right';
    const toValue = direction === 'right' ? SCREEN_WIDTH + 100 : -SCREEN_WIDTH - 100;

    Haptics.impactAsync(
      liked ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light
    );

    Animated.timing(position, {
      toValue: { x: toValue, y: 0 },
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      const result = performSwipe(currentCard.id, activeTab, liked);
      if (result) {
        setMatchPopup({ match: result, user: currentCard });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      position.setValue({ x: 0, y: 0 });
      setCardIndex((prev) => prev + 1);
    });
  }, [currentCard, currentUser, activeTab, performSwipe, position]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
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
    [swipeCard, resetPosition, position]
  );

  const handleTabChange = useCallback((tab: 'friends' | 'dating') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
    setCardIndex(0);
    position.setValue({ x: 0, y: 0 });
  }, [position]);

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
          colors={['transparent', 'rgba(0,0,0,0.85)']}
          style={styles.cardGradient}
        >
          <View style={styles.cardInfo}>
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
            {user.bio ? (
              <Text style={styles.cardBio} numberOfLines={2}>{user.bio}</Text>
            ) : null}
            {interestsList.length > 0 && (
              <View style={styles.interestsRow}>
                {interestsList.slice(0, 4).map((interest) => (
                  <View key={interest} style={styles.interestTag}>
                    <Text style={styles.interestText}>{interest}</Text>
                  </View>
                ))}
              </View>
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
        {!currentCard ? (
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
              Check back later for new {activeTab === 'friends' ? 'friends' : 'matches'}
            </Text>
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
          >
            <X size={28} color={theme.error} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.likeBtn]}
            onPress={() => swipeCard('right')}
            activeOpacity={0.8}
            testID="like-btn"
          >
            <Heart size={28} color="#fff" fill="#fff" />
          </TouchableOpacity>
        </View>
      )}

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
    height: '50%',
    justifyContent: 'flex-end',
    padding: 20,
  },
  cardInfo: {
    gap: 6,
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
  cardBio: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 20,
    marginTop: 4,
  },
  interestsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  interestTag: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  interestText: {
    fontSize: 12,
    color: '#fff',
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
});
