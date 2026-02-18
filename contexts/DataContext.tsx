import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Swipe, Match, Message, User } from '@/types';
import { MOCK_USERS } from '@/mocks/users';
import { useAuth } from './AuthContext';
import {
  createMatch as createMatchSupabase,
  fetchMatchesForUser,
  fetchMessagesForMatch,
  sendMessageToMatch,
  createSwipeRecord,
  checkMutualSwipe,
  deleteMatchRecord,
  subscribeToMatches,
  subscribeToMessages,
} from '@/lib/supabase-matches';

const STORAGE_MESSAGES = '@swipeology_messages';

export const [DataProvider, useData] = createContextHook(() => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  // TEMPORARY CLEANUP — run once to remove old message format
  useEffect(() => {
    AsyncStorage.removeItem('@swipeology_messages');
  }, []);

  /* -------------------------------------------------------
     INTERNAL STATE (Maps)
  ------------------------------------------------------- */
  const [matches, setMatches] = useState<Map<string, Match>>(new Map());
  const [messages, setMessages] = useState<Map<string, Message[]>>(new Map());
  const [swipes, setSwipes] = useState<Swipe[]>([]);

  /* -------------------------------------------------------
     LOAD MATCHES FROM SUPABASE (React Query)
  ------------------------------------------------------- */
  const matchesQuery = useQuery({
    queryKey: ['matches', currentUser?.id],
    enabled: !!currentUser,
    queryFn: async () => {
      if (!currentUser) return [];
      const supaMatches = await fetchMatchesForUser(currentUser.id);
      return supaMatches;
    },
  });

  useEffect(() => {
    if (!matchesQuery.data) return;

    const map = new Map<string, Match>();
    for (const m of matchesQuery.data) {
      map.set(m.id, m);
    }
    setMatches(map);
  }, [matchesQuery.data]);

  /* -------------------------------------------------------
     LOAD MESSAGES FROM ASYNC STORAGE (Map format)
  ------------------------------------------------------- */
  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(STORAGE_MESSAGES);
      if (!stored) return;

      const parsed = JSON.parse(stored) as Record<string, Message[]>;
      const map = new Map<string, Message[]>();

      for (const matchId of Object.keys(parsed)) {
        const sorted = parsed[matchId].sort(
          (a, b) =>
            new Date(a.created_at).getTime() -
            new Date(b.created_at).getTime()
        );
        map.set(matchId, sorted);
      }

      setMessages(map);
    })();
  }, []);

  /* -------------------------------------------------------
     SAVE MESSAGES TO ASYNC STORAGE
  ------------------------------------------------------- */
  const persistMessages = useCallback(async (map: Map<string, Message[]>) => {
    const obj: Record<string, Message[]> = {};
    for (const [matchId, arr] of map.entries()) {
      obj[matchId] = arr;
    }
    await AsyncStorage.setItem(STORAGE_MESSAGES, JSON.stringify(obj));
  }, []);

  /* -------------------------------------------------------
     REAL-TIME MATCH SUBSCRIPTION
  ------------------------------------------------------- */
  useEffect(() => {
    if (!currentUser?.id) return;

    const unsubscribe = subscribeToMatches(currentUser.id, (newMatch) => {
      setMatches((prev) => {
        const updated = new Map(prev);
        updated.set(newMatch.id, newMatch);
        return updated;
      });

      queryClient.invalidateQueries({
        queryKey: ['matches', currentUser.id],
      });
    });

    return unsubscribe;
  }, [currentUser?.id, queryClient]);

  /* -------------------------------------------------------
     REAL-TIME MESSAGE SUBSCRIPTION
  ------------------------------------------------------- */
  const subscribeToMatchMessages = useCallback(
    (matchId: string) => {
      return subscribeToMessages(matchId, (msg) => {
        setMessages((prev) => {
          const updated = new Map(prev);
          const arr = updated.get(matchId) || [];

          // prevent duplicates
          if (arr.some((m) => m.id === msg.id)) return prev;

          const newArr = [...arr, msg].sort(
            (a, b) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime()
          );

          updated.set(matchId, newArr);
          persistMessages(updated);
          return updated;
        });
      });
    },
    [persistMessages]
  );

  /* -------------------------------------------------------
     SEND MESSAGE (NO TEMP IDs)
  ------------------------------------------------------- */
  const sendMessage = useCallback(
    async (matchId: string, text: string) => {
      if (!currentUser) return;

      const sent = await sendMessageToMatch(matchId, currentUser.id, text);
      if (!sent) return;

      setMessages((prev) => {
        const updated = new Map(prev);
        const arr = updated.get(matchId) || [];
        updated.set(matchId, [...arr, sent]);
        persistMessages(updated);
        return updated;
      });
    },
    [currentUser, persistMessages]
  );

  /* -------------------------------------------------------
     LOAD MESSAGES FOR MATCH FROM SUPABASE
  ------------------------------------------------------- */
  const loadMessagesForMatch = useCallback(
    async (matchId: string) => {
      const supaMessages = await fetchMessagesForMatch(matchId);

      setMessages((prev) => {
        const updated = new Map(prev);
        updated.set(matchId, supaMessages);
        persistMessages(updated);
        return updated;
      });

      return subscribeToMatchMessages(matchId);
    },
    [persistMessages, subscribeToMatchMessages]
  );

  /* -------------------------------------------------------
     SWIPING + MATCH CREATION (STABLE)
  ------------------------------------------------------- */
  const performSwipe = useCallback(
    async (
      userId: string,
      context: 'friends' | 'dating',
      liked: boolean
    ): Promise<Match | null> => {
      if (!currentUser) return null;

      const swipe: Swipe = {
        id: `swipe_${Date.now()}`,
        user_from: currentUser.id,
        user_to: userId,
        context,
        liked,
        created_at: new Date().toISOString(),
      };

      setSwipes((prev) => [...prev, swipe]);
      createSwipeRecord(
        swipe.user_from,
        swipe.user_to,
        swipe.context,
        swipe.liked
      );

      if (!liked) return null;

      let isMutual = await checkMutualSwipe(
        currentUser.id,
        userId,
        context
      );

      if (!isMutual) return null;

      let match = await createMatchSupabase(
        currentUser.id,
        userId,
        context
      );

      if (!match) return null;

      setMatches((prev) => {
        const updated = new Map(prev);
        updated.set(match.id, match);
        return updated;
      });

      return match;
    },
    [currentUser]
  );

  /* -------------------------------------------------------
     GETTERS
  ------------------------------------------------------- */
  const getMatchesForContext = useCallback(
    (context: 'friends' | 'dating'): (Match & { otherUser: User })[] => {
      if (!currentUser) return [];

      const blockedIds = currentUser.blocked_users || [];

      return Array.from(matches.values())
        .filter((m) => m.context === context)
        .map((m) => {
          const otherId = m.user1 === currentUser.id ? m.user2 : m.user1;
          if (blockedIds.includes(otherId)) return null;

          const otherUser = MOCK_USERS.find((u) => u.id === otherId);
          return otherUser ? { ...m, otherUser } : null;
        })
        .filter(Boolean) as (Match & { otherUser: User })[];
    },
    [currentUser, matches]
  );

  const getMessagesForMatch = useCallback(
    (matchId: string): Message[] => {
      return messages.get(matchId) || [];
    },
    [messages]
  );

  const getOtherUserForMatch = useCallback(
    (matchId: string): User | null => {
      if (!currentUser) return null;

      const match = matches.get(matchId);
      if (!match) return null;

      const otherId = match.user1 === currentUser.id ? match.user2 : match.user1;
      return MOCK_USERS.find((u) => u.id === otherId) || null;
    },
    [currentUser, matches]
  );

  /* -------------------------------------------------------
     REMOVE MATCH
  ------------------------------------------------------- */
  const removeMatch = useCallback(
    async (matchId: string) => {
      await deleteMatchRecord(matchId);

      setMatches((prev) => {
        const updated = new Map(prev);
        updated.delete(matchId);
        return updated;
      });

      setMessages((prev) => {
        const updated = new Map(prev);
        updated.delete(matchId);
        persistMessages(updated);
        return updated;
      });
    },
    [persistMessages]
  );
const getFilteredUsers = useCallback(
  (context: 'friends' | 'dating'): User[] => {
    if (!currentUser) return [];

    const blockedIds = currentUser.blocked_users || [];

    // Users the current user already swiped on
    const swipedUserIds = swipes
      .filter((s) => s.user_from === currentUser.id && s.context === context)
      .map((s) => s.user_to);

    return MOCK_USERS.filter((u) => {
      if (u.id === currentUser.id) return false;
      if (swipedUserIds.includes(u.id)) return false;
      if (blockedIds.includes(u.id)) return false;
      if ((u.blocked_users || []).includes(currentUser.id)) return false;

      // Must be same school + verified
      if (u.university !== currentUser.university) return false;
      if (!u.is_verified_esu) return false;

      // FRIENDS MODE
      if (context === 'friends') {
        return u.wants_friends && currentUser.wants_friends;
      }

      // DATING MODE
      if (context === 'dating') {
        if (!u.wants_dating || !currentUser.wants_dating) return false;

        // CURRENT USER'S preference
        if (currentUser.dating_preference === 'men' && u.gender !== 'man')
          return false;
        if (currentUser.dating_preference === 'women' && u.gender !== 'woman')
          return false;

        // OTHER USER'S preference
        if (u.dating_preference === 'men' && currentUser.gender !== 'man')
          return false;
        if (u.dating_preference === 'women' && currentUser.gender !== 'woman')
          return false;

        return true;
      }

      return true;
    });
  },
  [currentUser, swipes]
);

  return {
    swipes,
    matches,
    messages,
    performSwipe,
    sendMessage,
    getMatchesForContext,
    getMessagesForMatch,
    getOtherUserForMatch,
    removeMatch,
    loadMessagesForMatch,
    getFilteredUsers,
  };
});
