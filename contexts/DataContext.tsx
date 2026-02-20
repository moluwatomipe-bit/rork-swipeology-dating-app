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

function normalizeGender(raw: any): string {
  const val = (raw ?? '').toString().toLowerCase().trim();
  if (val === 'male' || val === 'man' || val === 'm') return 'man';
  if (val === 'female' || val === 'woman' || val === 'f') return 'woman';
  if (val === 'non-binary' || val === 'nonbinary' || val === 'nb') return 'non-binary';
  return val || 'prefer not to say';
}

function normalizeDatingPref(raw: any): string {
  const val = (raw ?? '').toString().toLowerCase().trim();
  if (val === 'male' || val === 'men' || val === 'man' || val === 'm') return 'men';
  if (val === 'female' || val === 'women' || val === 'woman' || val === 'f') return 'women';
  if (val === 'everyone' || val === 'all' || val === 'both' || val === 'no preference' || val === '') return 'both';
  return val || 'both';
}

function resolveWantsFlags(d: Record<string, any>): { wantsFriends: boolean; wantsDating: boolean } {
  const mode = (d.mode ?? d.intent ?? '').toString().toLowerCase().trim();
  const rawFriends = d.wants_friends;
  const rawDating = d.wants_dating;

  let wantsFriends: boolean;
  let wantsDating: boolean;

  if (rawFriends === true || rawFriends === 'true' || rawFriends === 1) {
    wantsFriends = true;
  } else if (rawFriends === false || rawFriends === 'false' || rawFriends === 0) {
    wantsFriends = false;
  } else if (mode) {
    wantsFriends = mode === 'friends' || mode === 'both';
  } else {
    wantsFriends = true;
  }

  if (rawDating === true || rawDating === 'true' || rawDating === 1) {
    wantsDating = true;
  } else if (rawDating === false || rawDating === 'false' || rawDating === 0) {
    wantsDating = false;
  } else if (mode) {
    wantsDating = mode === 'dating' || mode === 'both';
  } else {
    wantsDating = true;
  }

  if (!wantsFriends && !wantsDating) {
    wantsFriends = true;
    wantsDating = true;
  }

  return { wantsFriends, wantsDating };
}

export const [DataProvider, useData] = createContextHook(() => {
  const { currentUser, session } = useAuth();
  const queryClient = useQueryClient();

  const [matches, setMatches] = useState<Map<string, Match>>(new Map());
  const [messages, setMessages] = useState<Map<string, Message[]>>(new Map());
  const [swipes, setSwipes] = useState<Swipe[]>([]);
  const [supabaseUsers, setSupabaseUsers] = useState<User[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const isSessionReady = !!session?.user?.id && !!currentUser?.id;

  const swipesQuery = useQuery({
    queryKey: ['swipes', currentUser?.id],
    enabled: isSessionReady,
    queryFn: async () => {
      if (!currentUser) return [];
      console.log('[Data] Fetching swipes for:', currentUser.id);
      const { data, error } = await supabase
        .from('swipes')
        .select('*')
        .eq('user_from', currentUser.id);

      if (error) {
        console.log('[Data] Fetch swipes error:', error.message);
        return [];
      }

      console.log('[Data] Fetched swipes:', data?.length ?? 0);
      return (data ?? []).map((d: any): Swipe => ({
        id: d.id ?? `swipe_${d.user_from}_${d.user_to}`,
        user_from: d.user_from,
        user_to: d.user_to,
        context: d.context,
        liked: d.liked,
        created_at: d.created_at ?? new Date().toISOString(),
      }));
    },
    staleTime: 0,
    refetchOnMount: true,
  });

  useEffect(() => {
    if (swipesQuery.data) {
      setSwipes(swipesQuery.data);
      console.log('[Data] Swipes synced:', swipesQuery.data.length);
    }
  }, [swipesQuery.data]);

  const mapRowToUser = (d: Record<string, any>): User => {
    const { wantsFriends, wantsDating } = resolveWantsFlags(d);
    const gender = normalizeGender(d.gender);
    const datingPref = normalizeDatingPref(d.dating_preference ?? d.gender_preference);

    console.log(`[Data] mapRow: id=${d.id}, name=${d.first_name ?? d.name}, gender=${gender}, pref=${datingPref}, wF=${wantsFriends}, wD=${wantsDating}`);

    return {
      id: d.id ?? '',
      phone_number: d.phone_number ?? '',
      phone_verified: d.phone_verified ?? false,
      school_email: d.school_email ?? d.email ?? '',
      password: '',
      university: d.university ?? '',
      is_verified_esu: d.is_verified_esu ?? d.verified ?? false,
      first_name: d.first_name ?? d.name ?? '',
      age: d.age ?? 0,
      gender: gender as User['gender'],
      pronouns: d.pronouns ?? '',
      dating_preference: datingPref as User['dating_preference'],
      wants_friends: wantsFriends,
      wants_dating: wantsDating,
      photo1_url: d.photo1_url ?? d.photo_url ?? d.avatar_url ?? '',
      photo2_url: d.photo2_url ?? '',
      photo3_url: d.photo3_url ?? '',
      photo4_url: d.photo4_url ?? '',
      photo5_url: d.photo5_url ?? '',
      photo6_url: d.photo6_url ?? '',
      bio: d.bio ?? '',
      major: d.major ?? '',
      class_year: d.class_year ?? '',
      interests: d.interests ?? '',
      blocked_users: Array.isArray(d.blocked_users) ? d.blocked_users : [],
      icebreaker_answers: (d.icebreaker_answers && typeof d.icebreaker_answers === 'object') ? d.icebreaker_answers : {},
      personality_badges: Array.isArray(d.personality_badges) ? d.personality_badges : [],
    };
  };

  const allUsersQuery = useQuery({
    queryKey: ['all-users', session?.user?.id],
    enabled: isSessionReady,
    queryFn: async () => {
      console.log('[Data] ===== FETCHING ALL USERS FROM SUPABASE =====');
      console.log('[Data] Session user:', session?.user?.id);
      console.log('[Data] Session access_token present:', !!session?.access_token);
      setFetchError(null);

      const { data, error, status } = await supabase
        .from('users')
        .select('*');

      console.log('[Data] Users query status:', status);

      if (error) {
        console.log('[Data] Users table error:', error.message, 'code:', error.code, 'status:', status);

        console.log('[Data] Trying profiles table as fallback...');
        const { data: profileData, error: profileError, status: profileStatus } = await supabase
          .from('profiles')
          .select('*');

        console.log('[Data] Profiles query status:', profileStatus);

        if (profileError) {
          console.log('[Data] Profiles table also failed:', profileError.message);
          const errMsg = `Could not load users. Users table: ${error.message}. Profiles table: ${profileError.message}. This is likely a Row Level Security (RLS) issue — add a SELECT policy for authenticated users.`;
          setFetchError(errMsg);
          return [];
        }

        const profileRows = (profileData ?? []) as Record<string, any>[];
        console.log('[Data] Fetched from profiles table:', profileRows.length);
        if (profileRows.length > 0) {
          console.log('[Data] Sample profile keys:', Object.keys(profileRows[0]));
        }
        return profileRows.map(mapRowToUser);
      }

      const rows = (data ?? []) as Record<string, any>[];
      console.log('[Data] Fetched users count:', rows.length);

      if (rows.length === 0) {
        console.log('[Data] WARNING: 0 rows returned. Possible causes:');
        console.log('[Data]   1. No users in the table');
        console.log('[Data]   2. RLS policy blocking reads — add: CREATE POLICY "Allow authenticated read" ON users FOR SELECT TO authenticated USING (true)');
        console.log('[Data]   3. Wrong table name');
        setFetchError('No users found. If users exist, check that the "users" table has an RLS SELECT policy allowing authenticated users to read all rows.');
      } else {
        rows.forEach((r, i) => {
          console.log(`[Data] DB Row[${i}]: id=${r.id}, name=${r.first_name ?? r.name}, gender=${r.gender}, mode=${r.mode ?? r.intent}, wf=${r.wants_friends}, wd=${r.wants_dating}, pref=${r.dating_preference ?? r.gender_preference}`);
        });
      }

      return rows.map(mapRowToUser);
    },
    staleTime: 0,
    refetchOnMount: 'always' as const,
    refetchInterval: 30000,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });

  useEffect(() => {
    if (allUsersQuery.data) {
      setSupabaseUsers(allUsersQuery.data);
      console.log('[Data] supabaseUsers state updated:', allUsersQuery.data.length);
    }
  }, [allUsersQuery.data]);

  const matchesQuery = useQuery({
    queryKey: ['matches', currentUser?.id],
    enabled: isSessionReady,
    queryFn: async () => {
      if (!currentUser) return [];
      return fetchMatchesForUser(currentUser.id);
    },
    staleTime: 0,
    refetchOnMount: true,
  });

  useEffect(() => {
    if (!matchesQuery.data) return;
    const map = new Map<string, Match>();
    for (const m of matchesQuery.data) {
      map.set(m.id, m);
    }
    setMatches(map);
  }, [matchesQuery.data]);

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(STORAGE_MESSAGES);
      if (!stored) return;
      const parsed = JSON.parse(stored) as Record<string, Message[]>;
      const map = new Map<string, Message[]>();
      for (const matchId of Object.keys(parsed)) {
        const sorted = parsed[matchId].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        map.set(matchId, sorted);
      }
      setMessages(map);
    })();
  }, []);

  const persistMessages = useCallback(async (map: Map<string, Message[]>) => {
    const obj: Record<string, Message[]> = {};
    for (const [matchId, arr] of map.entries()) {
      obj[matchId] = arr;
    }
    await AsyncStorage.setItem(STORAGE_MESSAGES, JSON.stringify(obj));
  }, []);

  useEffect(() => {
    if (!currentUser?.id) return;
    const unsubscribe = subscribeToMatches(currentUser.id, (newMatch) => {
      setMatches((prev) => {
        const updated = new Map(prev);
        updated.set(newMatch.id, newMatch);
        return updated;
      });
      queryClient.invalidateQueries({ queryKey: ['matches', currentUser.id] });
    });
    return unsubscribe;
  }, [currentUser?.id, queryClient]);

  const subscribeToMatchMessages = useCallback(
    (matchId: string) => {
      return subscribeToMessages(matchId, (msg) => {
        setMessages((prev) => {
          const updated = new Map(prev);
          const arr = updated.get(matchId) || [];
          if (arr.some((m) => m.id === msg.id)) return prev;
          const newArr = [...arr, msg].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          updated.set(matchId, newArr);
          persistMessages(updated);
          return updated;
        });
      });
    },
    [persistMessages]
  );

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

      await createSwipeRecord(swipe.user_from, swipe.user_to, swipe.context, swipe.liked);

      if (!liked) return null;

      console.log('[Data] Checking for mutual swipe...');
      const isMutual = await checkMutualSwipe(currentUser.id, userId, context);
      console.log('[Data] Mutual swipe result:', isMutual);

      if (!isMutual) return null;

      console.log('[Data] MUTUAL MATCH! Creating match...');
      const match = await createMatchSupabase(currentUser.id, userId, context);

      if (!match) {
        console.log('[Data] Failed to create match record');
        return null;
      }

      console.log('[Data] Match created:', match.id);
      setMatches((prev) => {
        const updated = new Map(prev);
        updated.set(match.id, match);
        return updated;
      });

      queryClient.invalidateQueries({ queryKey: ['matches', currentUser.id] });
      return match;
    },
    [currentUser, queryClient]
  );

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
    console.log('[Data] ===== MANUAL REFRESH TRIGGERED =====');
    console.log('[Data] Session ready:', isSessionReady);
    setFetchError(null);
    await queryClient.invalidateQueries({ queryKey: ['all-users'] });
    await queryClient.invalidateQueries({ queryKey: ['swipes', currentUser?.id] });
    await queryClient.invalidateQueries({ queryKey: ['matches', currentUser?.id] });
    await queryClient.refetchQueries({ queryKey: ['all-users', session?.user?.id] });
    await queryClient.refetchQueries({ queryKey: ['swipes', currentUser?.id] });
    await queryClient.refetchQueries({ queryKey: ['matches', currentUser?.id] });
    console.log('[Data] ===== REFRESH COMPLETE =====');
  }, [queryClient, currentUser?.id, session?.user?.id, isSessionReady]);

  const getFilteredUsers = useCallback(
    (context: 'friends' | 'dating'): User[] => {
      if (!currentUser) {
        console.log('[Data] getFilteredUsers: no currentUser');
        return [];
      }

      const blockedIds = currentUser.blocked_users || [];

      console.log('[Data] getFilteredUsers:', context);
      console.log('[Data]   total supabaseUsers:', supabaseUsers.length);
      console.log('[Data]   currentUser:', currentUser.id, currentUser.first_name);
      console.log('[Data]   currentUser wants_friends:', currentUser.wants_friends, 'wants_dating:', currentUser.wants_dating);
      console.log('[Data]   currentUser gender:', currentUser.gender, 'dating_preference:', currentUser.dating_preference);

      const swipedUserIds = new Set(
        swipes
          .filter((s) => s.user_from === currentUser.id && s.context === context)
          .map((s) => s.user_to)
      );

      console.log('[Data]   Already swiped in', context, ':', swipedUserIds.size);

      const filtered = supabaseUsers.filter((u) => {
        if (u.id === currentUser.id) {
          console.log(`[Data]   SKIP ${u.first_name}: is self`);
          return false;
        }

        if (swipedUserIds.has(u.id)) {
          console.log(`[Data]   SKIP ${u.first_name}: already swiped`);
          return false;
        }

        if (blockedIds.includes(u.id)) {
          console.log(`[Data]   SKIP ${u.first_name}: blocked by me`);
          return false;
        }

        if ((u.blocked_users || []).includes(currentUser.id)) {
          console.log(`[Data]   SKIP ${u.first_name}: blocked me`);
          return false;
        }

        if (context === 'dating') {
          if (!u.wants_dating) {
            console.log(`[Data]   SKIP ${u.first_name}: does not want dating (wants_dating=${u.wants_dating})`);
            return false;
          }

          if (!currentUser.wants_dating) {
            console.log(`[Data]   SKIP dating tab: current user does not want dating`);
            return false;
          }

          const myPref = normalizeDatingPref(currentUser.dating_preference);
          const theirGender = normalizeGender(u.gender);
          const theirPref = normalizeDatingPref(u.dating_preference);
          const myGender = normalizeGender(currentUser.gender);

          console.log(`[Data]   Dating check for ${u.first_name}: myPref=${myPref}, theirGender=${theirGender}, theirPref=${theirPref}, myGender=${myGender}`);

          if (myPref === 'men' && theirGender !== 'man') {
            console.log(`[Data]   SKIP ${u.first_name}: I want men, they are ${theirGender}`);
            return false;
          }
          if (myPref === 'women' && theirGender !== 'woman') {
            console.log(`[Data]   SKIP ${u.first_name}: I want women, they are ${theirGender}`);
            return false;
          }

          if (theirPref === 'men' && myGender !== 'man') {
            console.log(`[Data]   SKIP ${u.first_name}: they want men, I am ${myGender}`);
            return false;
          }
          if (theirPref === 'women' && myGender !== 'woman') {
            console.log(`[Data]   SKIP ${u.first_name}: they want women, I am ${myGender}`);
            return false;
          }
        }

        if (context === 'friends') {
          if (!u.wants_friends) {
            console.log(`[Data]   SKIP ${u.first_name}: does not want friends (wants_friends=${u.wants_friends})`);
            return false;
          }
        }

        console.log(`[Data]   INCLUDE ${u.first_name || u.id} in ${context}`);
        return true;
      });

      console.log('[Data] Filtered result for', context, ':', filtered.length, 'users');
      return filtered;
    },
    [currentUser, swipes, supabaseUsers]
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
    fetchError,
    isRefreshing: allUsersQuery.isFetching,
  };
});
