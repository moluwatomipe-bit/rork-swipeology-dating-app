import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Swipe, Match, Message, User } from '@/types';
import { supabase } from '@/supabase';
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
  const [supabaseUsers, setSupabaseUsers] = useState<User[]>([]);

  /* -------------------------------------------------------
     FETCH EXISTING SWIPES FROM SUPABASE
  ------------------------------------------------------- */
  const swipesQuery = useQuery({
    queryKey: ['swipes', currentUser?.id],
    enabled: !!currentUser,
    queryFn: async () => {
      if (!currentUser) return [];
      console.log('[Data] Fetching existing swipes from Supabase for:', currentUser.id);
      const { data, error } = await supabase
        .from('swipes')
        .select('*')
        .eq('user_from', currentUser.id);

      if (error) {
        console.log('[Data] Fetch swipes error:', error.message);
        return [];
      }

      console.log('[Data] Fetched existing swipes:', data?.length ?? 0);
      return (data ?? []).map((d: any): Swipe => ({
        id: d.id ?? `swipe_${d.user_from}_${d.user_to}`,
        user_from: d.user_from,
        user_to: d.user_to,
        context: d.context,
        liked: d.liked,
        created_at: d.created_at ?? new Date().toISOString(),
      }));
    },
    staleTime: 60000,
  });

  useEffect(() => {
    if (swipesQuery.data) {
      setSwipes(swipesQuery.data);
      console.log('[Data] Swipes loaded from Supabase:', swipesQuery.data.length);
    }
  }, [swipesQuery.data]);

  /* -------------------------------------------------------
     FETCH ALL USERS FROM SUPABASE
  ------------------------------------------------------- */
  const SAFE_USER_COLUMNS = [
    'id',
    'phone_number',
    'phone_verified',
    'school_email',
    'university',
    'is_verified_esu',
    'first_name',
    'age',
    'gender',
    'pronouns',
    'dating_preference',
    'wants_friends',
    'wants_dating',
    'photo1_url',
    'photo2_url',
    'photo3_url',
    'photo4_url',
    'photo5_url',
    'photo6_url',
    'bio',
    'major',
    'class_year',
    'interests',
    'blocked_users',
  ].join(',');

  const allUsersQuery = useQuery({
    queryKey: ['all-users'],
    enabled: !!currentUser,
    queryFn: async () => {
      console.log('[Data] Fetching all users from Supabase (safe columns)');
      const { data, error } = await supabase
        .from('users')
        .select(SAFE_USER_COLUMNS);

      if (error) {
        console.log('[Data] Fetch users error:', error.message, JSON.stringify(error));
        return [];
      }

      const rows = (data ?? []) as Record<string, any>[];
      console.log('[Data] Fetched users from Supabase:', rows.length);
      if (rows.length > 0) {
        console.log('[Data] Sample user keys:', Object.keys(rows[0]));
        console.log('[Data] Sample user first_name:', rows[0].first_name, 'id:', rows[0].id);
      }

      return rows.map((d: any): User => ({
        id: d.id ?? '',
        phone_number: d.phone_number ?? '',
        phone_verified: d.phone_verified ?? false,
        school_email: d.school_email ?? '',
        password: '',
        university: d.university ?? '',
        is_verified_esu: d.is_verified_esu ?? false,
        first_name: d.first_name ?? '',
        age: d.age ?? 0,
        gender: d.gender ?? 'prefer not to say',
        pronouns: d.pronouns ?? '',
        dating_preference: d.dating_preference ?? 'both',
        wants_friends: d.wants_friends ?? false,
        wants_dating: d.wants_dating ?? false,
        photo1_url: d.photo1_url ?? '',
        photo2_url: d.photo2_url ?? '',
        photo3_url: d.photo3_url ?? '',
        photo4_url: d.photo4_url ?? '',
        photo5_url: d.photo5_url ?? '',
        photo6_url: d.photo6_url ?? '',
        bio: d.bio ?? '',
        major: d.major ?? '',
        class_year: d.class_year ?? '',
        interests: d.interests ?? '',
        blocked_users: d.blocked_users ?? [],
        icebreaker_answers: {},
        personality_badges: [],
      }));
    },
    staleTime: 30000,
    refetchOnMount: 'always' as const,
  });

  useEffect(() => {
    if (allUsersQuery.data) {
      setSupabaseUsers(allUsersQuery.data);
      console.log('[Data] Supabase users loaded:', allUsersQuery.data.length);
    }
  }, [allUsersQuery.data]);

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

          const otherUser = supabaseUsers.find((u) => u.id === otherId);
          return otherUser ? { ...m, otherUser } : null;
        })
        .filter(Boolean) as (Match & { otherUser: User })[];
    },
    [currentUser, matches, supabaseUsers]
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
      return supabaseUsers.find((u) => u.id === otherId) || null;
    },
    [currentUser, matches, supabaseUsers]
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
const refreshUsers = useCallback(async () => {
  console.log('[Data] Manual refresh triggered');
  await queryClient.invalidateQueries({ queryKey: ['all-users'] });
  await queryClient.invalidateQueries({ queryKey: ['swipes', currentUser?.id] });
}, [queryClient, currentUser?.id]);

const getAllAvailableUsers = useCallback((): User[] => {
  return supabaseUsers;
}, [supabaseUsers]);

const getFilteredUsers = useCallback(
  (context: 'friends' | 'dating'): User[] => {
    if (!currentUser) return [];

    const blockedIds = currentUser.blocked_users || [];
    const allUsers = getAllAvailableUsers();

    console.log('[Data] getFilteredUsers context:', context, 'total users:', allUsers.length);

    const swipedUserIds = swipes
      .filter((s) => s.user_from === currentUser.id && s.context === context)
      .map((s) => s.user_to);

    const filtered = allUsers.filter((u) => {
      if (u.id === currentUser.id) return false;
      if (swipedUserIds.includes(u.id)) return false;
      if (blockedIds.includes(u.id)) return false;
      if ((u.blocked_users || []).includes(currentUser.id)) return false;

      if (!u.first_name) return false;

      if (context === 'friends') {
        return true;
      }

      if (context === 'dating') {
        if (currentUser.dating_preference === 'men' && u.gender !== 'man')
          return false;
        if (currentUser.dating_preference === 'women' && u.gender !== 'woman')
          return false;

        return true;
      }

      return true;
    });

    console.log('[Data] Filtered users for', context, ':', filtered.length);
    return filtered;
  },
  [currentUser, swipes, getAllAvailableUsers]
);

  const isUsersLoading = allUsersQuery.isLoading || swipesQuery.isLoading;

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
    isUsersLoading,
    refreshUsers,
    totalSupabaseUsers: supabaseUsers.length,
  };
});
