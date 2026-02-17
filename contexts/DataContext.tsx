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
} from '@/lib/supabase-matches';

const STORAGE_SWIPES = '@swipeology_swipes';
const STORAGE_MATCHES = '@swipeology_matches';
const STORAGE_MESSAGES = '@swipeology_messages';

export const [DataProvider, useData] = createContextHook(() => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  const [swipes, setSwipes] = useState<Swipe[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  const swipesQuery = useQuery({
    queryKey: ['swipes'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_SWIPES);
      return stored ? (JSON.parse(stored) as Swipe[]) : [];
    },
  });

  const matchesQuery = useQuery({
    queryKey: ['matches', currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return [];
      try {
        const supaMatches = await fetchMatchesForUser(currentUser.id);
        if (supaMatches.length > 0) {
          return supaMatches;
        }
      } catch (e) {
        console.log('[Data] Supabase matches fetch failed, falling back to local:', e);
      }
      const stored = await AsyncStorage.getItem(STORAGE_MATCHES);
      return stored ? (JSON.parse(stored) as Match[]) : [];
    },
    enabled: !!currentUser,
  });

  const messagesQuery = useQuery({
    queryKey: ['messages'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_MESSAGES);
      return stored ? (JSON.parse(stored) as Message[]) : [];
    },
  });

  useEffect(() => {
    if (swipesQuery.data) setSwipes(swipesQuery.data);
  }, [swipesQuery.data]);

  useEffect(() => {
    if (matchesQuery.data) setMatches(matchesQuery.data);
  }, [matchesQuery.data]);

  useEffect(() => {
    if (messagesQuery.data) setMessages(messagesQuery.data);
  }, [messagesQuery.data]);

  useEffect(() => {
    if (!currentUser?.id) return;

    const unsubscribe = subscribeToMatches(currentUser.id, (newMatch) => {
      setMatches((prev) => {
        if (prev.find((m) => m.id === newMatch.id)) return prev;
        return [newMatch, ...prev];
      });
      queryClient.invalidateQueries({ queryKey: ['matches', currentUser.id] });
    });

    return unsubscribe;
  }, [currentUser?.id, queryClient]);

  const addSwipeMutation = useMutation({
    mutationFn: async (swipe: Swipe) => {
      const updated = [...swipes, swipe];
      await AsyncStorage.setItem(STORAGE_SWIPES, JSON.stringify(updated));
      try {
        await createSwipeRecord(swipe.user_from, swipe.user_to, swipe.context, swipe.liked);
      } catch (e) {
        console.log('[Data] Supabase swipe record failed:', e);
      }
      return { swipe, updated };
    },
    onSuccess: ({ updated }) => {
      setSwipes(updated);
    },
  });

  const addMatchMutation = useMutation({
    mutationFn: async (match: Match) => {
      const updated = [...matches, match];
      await AsyncStorage.setItem(STORAGE_MATCHES, JSON.stringify(updated));
      return updated;
    },
    onSuccess: (updated) => {
      setMatches(updated);
    },
  });

  const addMessageMutation = useMutation({
    mutationFn: async (message: Message) => {
      const updated = [...messages, message];
      await AsyncStorage.setItem(STORAGE_MESSAGES, JSON.stringify(updated));
      return updated;
    },
    onSuccess: (updated) => {
      setMessages(updated);
    },
  });

  const { mutate: addMessageMutate } = addMessageMutation;

  const sendMessage = useCallback(async (matchId: string, text: string) => {
    if (!currentUser) return;
    const msg: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      match_id: matchId,
      sender_id: currentUser.id,
      message_text: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, msg]);
    addMessageMutate(msg);

    try {
      await sendMessageToMatch(matchId, currentUser.id, text);
    } catch (e) {
      console.log('[Data] Supabase send message failed:', e);
    }
  }, [currentUser, addMessageMutate]);

  const { mutate: addSwipeMutate } = addSwipeMutation;
  const { mutate: addMatchMutate } = addMatchMutation;

  const performSwipe = useCallback(async (userId: string, context: 'friends' | 'dating', liked: boolean): Promise<Match | null> => {
    if (!currentUser) return null;

    const swipe: Swipe = {
      id: `swipe_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      user_from: currentUser.id,
      user_to: userId,
      context,
      liked,
      created_at: new Date().toISOString(),
    };

    const updatedSwipes = [...swipes, swipe];
    setSwipes(updatedSwipes);
    addSwipeMutate(swipe);

    if (liked) {
      let isMutual = false;
      try {
        isMutual = await checkMutualSwipe(currentUser.id, userId, context);
      } catch (e) {
        console.log('[Data] Mutual swipe check failed:', e);
      }

      if (!isMutual) {
        const localMutual = updatedSwipes.find(
          (s) =>
            s.user_from === userId &&
            s.user_to === currentUser.id &&
            s.context === context &&
            s.liked === true
        );
        isMutual = !!localMutual;
      }

      if (!isMutual) {
        const shouldAutoMatch = Math.random() < 0.4;
        if (shouldAutoMatch) {
          isMutual = true;
          const fakeSwipe: Swipe = {
            id: `swipe_${Date.now()}_auto`,
            user_from: userId,
            user_to: currentUser.id,
            context,
            liked: true,
            created_at: new Date().toISOString(),
          };
          const withFake = [...updatedSwipes, fakeSwipe];
          setSwipes(withFake);
          AsyncStorage.setItem(STORAGE_SWIPES, JSON.stringify(withFake));
        }
      }

      if (isMutual) {
        let match: Match | null = null;
        try {
          match = await createMatchSupabase(currentUser.id, userId, context);
        } catch (e) {
          console.log('[Data] Supabase match creation failed:', e);
        }

        if (!match) {
          match = {
            id: `match_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            user1: currentUser.id,
            user2: userId,
            context,
            created_at: new Date().toISOString(),
          };
        }

        const updatedMatches = [...matches, match];
        setMatches(updatedMatches);
        addMatchMutate(match);
        return match;
      }
    }

    return null;
  }, [currentUser, swipes, matches, addSwipeMutate, addMatchMutate]);

  const getFilteredUsers = useCallback((context: 'friends' | 'dating'): User[] => {
    if (!currentUser) return [];

    const blockedIds = currentUser.blocked_users || [];

    const swipedUserIds = swipes
      .filter((s) => s.user_from === currentUser.id && s.context === context)
      .map((s) => s.user_to);

    return MOCK_USERS.filter((u) => {
      if (u.id === currentUser.id) return false;
      if (swipedUserIds.includes(u.id)) return false;
      if (blockedIds.includes(u.id)) return false;
      if ((u.blocked_users || []).includes(currentUser.id)) return false;
      if (u.university !== currentUser.university) return false;
      if (!u.is_verified_esu) return false;

      if (context === 'friends') {
        return u.wants_friends && currentUser.wants_friends;
      }

      if (context === 'dating') {
        if (!u.wants_dating || !currentUser.wants_dating) return false;
        if (currentUser.dating_preference === 'men' && u.gender !== 'man') return false;
        if (currentUser.dating_preference === 'women' && u.gender !== 'woman') return false;
        if (u.dating_preference === 'men' && currentUser.gender !== 'man') return false;
        if (u.dating_preference === 'women' && currentUser.gender !== 'woman') return false;
        return true;
      }

      return true;
    });
  }, [currentUser, swipes]);

  const getMatchesForContext = useCallback((context: 'friends' | 'dating'): (Match & { otherUser: User })[] => {
    if (!currentUser) return [];
    const blockedIds = currentUser.blocked_users || [];

    return matches
      .filter((m) => m.context === context)
      .filter((m) => m.user1 === currentUser.id || m.user2 === currentUser.id)
      .map((m) => {
        const otherId = m.user1 === currentUser.id ? m.user2 : m.user1;
        if (blockedIds.includes(otherId)) return null;
        const otherUser = MOCK_USERS.find((u) => u.id === otherId);
        return otherUser ? { ...m, otherUser } : null;
      })
      .filter(Boolean) as (Match & { otherUser: User })[];
  }, [currentUser, matches]);

  const getMessagesForMatch = useCallback((matchId: string): Message[] => {
    return messages.filter((m) => m.match_id === matchId);
  }, [messages]);

  const getOtherUserForMatch = useCallback((matchId: string): User | null => {
    if (!currentUser) return null;
    const match = matches.find((m) => m.id === matchId);
    if (!match) return null;
    const otherId = match.user1 === currentUser.id ? match.user2 : match.user1;
    return MOCK_USERS.find((u) => u.id === otherId) || null;
  }, [currentUser, matches]);

  const removeMatchMutation = useMutation({
    mutationFn: async (matchId: string) => {
      const updated = matches.filter((m) => m.id !== matchId);
      await AsyncStorage.setItem(STORAGE_MATCHES, JSON.stringify(updated));
      try {
        await deleteMatchRecord(matchId);
      } catch (e) {
        console.log('[Data] Supabase delete match failed:', e);
      }
      return updated;
    },
    onSuccess: (updated) => {
      setMatches(updated);
    },
  });

  const { mutate: removeMatchMutate } = removeMatchMutation;

  const removeMatch = useCallback((matchId: string) => {
    removeMatchMutate(matchId);
  }, [removeMatchMutate]);

  const loadMessagesForMatch = useCallback(async (matchId: string) => {
    try {
      const supaMessages = await fetchMessagesForMatch(matchId);
      if (supaMessages.length > 0) {
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.match_id !== matchId);
          return [...filtered, ...supaMessages];
        });
      }
    } catch (e) {
      console.log('[Data] Load messages from Supabase failed:', e);
    }
  }, []);

  return {
    swipes,
    matches,
    messages,
    performSwipe,
    sendMessage,
    getFilteredUsers,
    getMatchesForContext,
    getMessagesForMatch,
    getOtherUserForMatch,
    removeMatch,
    loadMessagesForMatch,
  };
});
