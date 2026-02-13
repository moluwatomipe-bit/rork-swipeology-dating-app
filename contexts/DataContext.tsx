import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Swipe, Match, Message, User } from '@/types';
import { MOCK_USERS } from '@/mocks/users';
import { useAuth } from './AuthContext';

const STORAGE_SWIPES = '@swipeology_swipes';
const STORAGE_MATCHES = '@swipeology_matches';
const STORAGE_MESSAGES = '@swipeology_messages';

export const [DataProvider, useData] = createContextHook(() => {
  const { currentUser } = useAuth();

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
    queryKey: ['matches'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_MATCHES);
      return stored ? (JSON.parse(stored) as Match[]) : [];
    },
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

  const addSwipeMutation = useMutation({
    mutationFn: async (swipe: Swipe) => {
      const updated = [...swipes, swipe];
      await AsyncStorage.setItem(STORAGE_SWIPES, JSON.stringify(updated));
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
  });

  const { mutate: addMessageMutate } = addMessageMutation;

  const sendMessage = useCallback((matchId: string, text: string) => {
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
  }, [currentUser, addMessageMutate]);

  const { mutate: addSwipeMutate } = addSwipeMutation;
  const { mutate: addMatchMutate } = addMatchMutation;

  const performSwipe = useCallback((userId: string, context: 'friends' | 'dating', liked: boolean): Match | null => {
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
      const mutualSwipe = updatedSwipes.find(
        (s) =>
          s.user_from === userId &&
          s.user_to === currentUser.id &&
          s.context === context &&
          s.liked === true
      );

      if (mutualSwipe) {
        const match: Match = {
          id: `match_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          user1: currentUser.id,
          user2: userId,
          context,
          created_at: new Date().toISOString(),
        };
        const updatedMatches = [...matches, match];
        setMatches(updatedMatches);
        addMatchMutate(match);
        return match;
      }

      const shouldAutoMatch = Math.random() < 0.4;
      if (shouldAutoMatch) {
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

        const match: Match = {
          id: `match_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          user1: currentUser.id,
          user2: userId,
          context,
          created_at: new Date().toISOString(),
        };
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

    const swipedUserIds = swipes
      .filter((s) => s.user_from === currentUser.id && s.context === context)
      .map((s) => s.user_to);

    return MOCK_USERS.filter((u) => {
      if (u.id === currentUser.id) return false;
      if (swipedUserIds.includes(u.id)) return false;
      if (u.university !== 'East Stroudsburg University') return false;
      if (!u.is_verified_esu) return false;

      if (context === 'friends') {
        return u.wants_friends;
      }

      if (context === 'dating') {
        if (!u.wants_dating) return false;
        if (currentUser.dating_preference === 'men' && u.gender !== 'man') return false;
        if (currentUser.dating_preference === 'women' && u.gender !== 'woman') return false;
        return true;
      }

      return true;
    });
  }, [currentUser, swipes]);

  const getMatchesForContext = useCallback((context: 'friends' | 'dating'): (Match & { otherUser: User })[] => {
    if (!currentUser) return [];
    return matches
      .filter((m) => m.context === context)
      .filter((m) => m.user1 === currentUser.id || m.user2 === currentUser.id)
      .map((m) => {
        const otherId = m.user1 === currentUser.id ? m.user2 : m.user1;
        const otherUser = MOCK_USERS.find((u) => u.id === otherId);
        return otherUser ? { ...m, otherUser } : null;
      })
      .filter(Boolean) as (Match & { otherUser: User })[];
  }, [currentUser, matches]);

  const getMessagesForMatch = useCallback((matchId: string): Message[] => {
    return messages.filter((m) => m.match_id === matchId);
  }, [messages]);

  return {
    swipes,
    matches,
    messages,
    performSwipe,
    sendMessage,
    getFilteredUsers,
    getMatchesForContext,
    getMessagesForMatch,
  };
});
