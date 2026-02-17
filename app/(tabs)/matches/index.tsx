import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import { Heart, Users, MessageCircle, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useData } from '@/contexts/DataContext';
import { Match, User } from '@/types';
import Colors from '@/constants/colors';

const theme = Colors.dark;

export default function MatchesScreen() {
  const { getMatchesForContext } = useData();
  const [activeTab, setActiveTab] = useState<'friends' | 'dating'>('friends');

  const matchesWithUsers = useMemo(
    () => getMatchesForContext(activeTab),
    [activeTab, getMatchesForContext]
  );

  const handleOpenChat = useCallback((match: Match & { otherUser: User }) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/(tabs)/matches/chat' as any,
      params: {
        matchId: match.id,
        userName: match.otherUser.first_name,
        context: match.context,
      },
    });
  }, []);

  const renderMatchItem = useCallback(({ item }: { item: Match & { otherUser: User } }) => {
    return (
      <TouchableOpacity
        style={styles.matchItem}
        onPress={() => handleOpenChat(item)}
        activeOpacity={0.7}
        testID={`match-${item.id}`}
      >
        <Image
          source={{ uri: item.otherUser.photo1_url }}
          style={styles.matchAvatar}
          contentFit="cover"
        />
        <View style={styles.matchInfo}>
          <Text style={styles.matchName}>{item.otherUser.first_name}</Text>
          <View style={styles.matchContext}>
            {item.context === 'friends' ? (
              <Users size={12} color={theme.secondary} />
            ) : (
              <Heart size={12} color={theme.primary} />
            )}
            <Text style={[
              styles.matchContextText,
              { color: item.context === 'friends' ? theme.secondary : theme.primary }
            ]}>
              {item.context === 'friends' ? 'Friends match' : 'Dating match'}
            </Text>
          </View>
        </View>
        <ChevronRight size={20} color={theme.textMuted} />
      </TouchableOpacity>
    );
  }, [handleOpenChat]);

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Matches & Chats' }} />

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.tabActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab('friends');
          }}
          activeOpacity={0.7}
        >
          <Users size={16} color={activeTab === 'friends' ? '#fff' : theme.textMuted} />
          <Text style={[styles.tabText, activeTab === 'friends' && styles.tabTextActive]}>
            Friends
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'dating' && styles.tabActiveDating]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab('dating');
          }}
          activeOpacity={0.7}
        >
          <Heart size={16} color={activeTab === 'dating' ? '#fff' : theme.textMuted} />
          <Text style={[styles.tabText, activeTab === 'dating' && styles.tabTextActive]}>
            Dating
          </Text>
        </TouchableOpacity>
      </View>

      {matchesWithUsers.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <MessageCircle size={48} color={theme.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>No matches yet</Text>
          <Text style={styles.emptySubtitle}>
            Start swiping to find your {activeTab === 'friends' ? 'friends' : 'match'}!
          </Text>
        </View>
      ) : (
        <FlatList
          data={matchesWithUsers}
          renderItem={renderMatchItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.background,
  },
  tabBar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
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
  listContent: {
    paddingHorizontal: 20,
    gap: 8,
    paddingBottom: 20,
  },
  matchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 14,
    gap: 14,
    borderWidth: 1,
    borderColor: theme.border,
  },
  matchAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.card,
  },
  matchInfo: {
    flex: 1,
    gap: 4,
  },
  matchName: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: theme.text,
  },
  matchContext: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  matchContextText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 40,
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
});
