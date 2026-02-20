import { supabase } from '@/supabase';
import { Match, Message } from '@/types';

/* -------------------------------------------------------
   CREATE MATCH (duplicate-proof)
------------------------------------------------------- */
export async function createMatch(
  user1: string,
  user2: string,
  context: 'friends' | 'dating'
): Promise<Match | null> {
  console.log('[Supabase] Creating match:', user1, user2, context);

  // 1. Check if match already exists (in either direction)
  const { data: existing, error: existingError } = await supabase
    .from('matches')
    .select('*')
    .or(
      `and(user1.eq.${user1},user2.eq.${user2}),and(user1.eq.${user2},user2.eq.${user1})`
    )
    .eq('context', context)
    .maybeSingle();

  if (existing) {
    console.log('[Supabase] Match already exists:', existing.id);
    return existing as Match;
  }

  // 2. Create a new match
  const { data, error } = await supabase
    .from('matches')
    .insert({
      user1,
      user2,
      context,
    })
    .select()
    .single();

  if (error) {
    console.log('[Supabase] Create match error:', error.message);
    return null;
  }

  console.log('[Supabase] Match created:', data.id);
  return data as Match;
}

/* -------------------------------------------------------
   FETCH MATCHES FOR USER
------------------------------------------------------- */
export async function fetchMatchesForUser(userId: string): Promise<Match[]> {
  console.log('[Supabase] Fetching matches for user:', userId);

  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .or(`user1.eq.${userId},user2.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) {
    console.log('[Supabase] Fetch matches error:', error.message);
    return [];
  }

  console.log('[Supabase] Fetched matches:', data?.length ?? 0);
  return (data ?? []) as Match[];
}

/* -------------------------------------------------------
   FETCH MESSAGES FOR MATCH
------------------------------------------------------- */
export async function fetchMessagesForMatch(matchId: string): Promise<Message[]> {
  console.log('[Supabase] Fetching messages for match:', matchId);

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('match_id', matchId)
    .order('created_at', { ascending: true });

  if (error) {
    console.log('[Supabase] Fetch messages error:', error.message);
    return [];
  }

  console.log('[Supabase] Fetched messages:', data?.length ?? 0);
  return (data ?? []) as Message[];
}

/* -------------------------------------------------------
   SEND MESSAGE (clean, no temp IDs)
------------------------------------------------------- */
export async function sendMessageToMatch(
  matchId: string,
  senderId: string,
  messageText: string
): Promise<Message | null> {
  console.log('[Supabase] Sending message to match:', matchId);

  const { data, error } = await supabase
    .from('messages')
    .insert({
      match_id: matchId,
      sender_id: senderId,
      message_text: messageText,
    })
    .select()
    .single();

  if (error) {
    console.log('[Supabase] Send message error:', error.message);
    return null;
  }

  console.log('[Supabase] Message sent:', data.id);
  return data as Message;
}

/* -------------------------------------------------------
   CREATE SWIPE RECORD
------------------------------------------------------- */
export async function createSwipeRecord(
  userFrom: string,
  userTo: string,
  context: 'friends' | 'dating',
  liked: boolean
): Promise<boolean> {
  console.log('[Supabase] Creating swipe:', userFrom, '->', userTo, liked ? 'LIKE' : 'PASS');

  const { error } = await supabase
    .from('swipes')
    .upsert(
      {
        user_from: userFrom,
        user_to: userTo,
        context,
        liked,
      },
      { onConflict: 'user_from,user_to,context', ignoreDuplicates: false }
    );

  if (error) {
    console.log('[Supabase] Create swipe error:', error.message);
    const { error: insertError } = await supabase
      .from('swipes')
      .insert({
        user_from: userFrom,
        user_to: userTo,
        context,
        liked,
      });
    if (insertError) {
      console.log('[Supabase] Fallback insert swipe error:', insertError.message);
      return false;
    }
  }

  console.log('[Supabase] Swipe saved successfully');
  return true;
}

/* -------------------------------------------------------
   CHECK MUTUAL SWIPE
------------------------------------------------------- */
export async function checkMutualSwipe(
  userFrom: string,
  userTo: string,
  context: 'friends' | 'dating'
): Promise<boolean> {
  console.log('[Supabase] Checking mutual swipe:', userTo, '->', userFrom);

  const { data, error } = await supabase
    .from('swipes')
    .select('id')
    .eq('user_from', userTo)
    .eq('user_to', userFrom)
    .eq('context', context)
    .eq('liked', true)
    .limit(1);

  if (error) {
    console.log('[Supabase] Check mutual swipe error:', error.message);
    return false;
  }

  return (data?.length ?? 0) > 0;
}

/* -------------------------------------------------------
   DELETE MATCH
------------------------------------------------------- */
export async function deleteMatchRecord(matchId: string): Promise<boolean> {
  console.log('[Supabase] Deleting match:', matchId);

  const { error } = await supabase
    .from('matches')
    .delete()
    .eq('id', matchId);

  if (error) {
    console.log('[Supabase] Delete match error:', error.message);
    return false;
  }

  return true;
}

/* -------------------------------------------------------
   REAL-TIME MESSAGE SUBSCRIPTION
------------------------------------------------------- */
export function subscribeToMessages(
  matchId: string,
  onNewMessage: (message: Message) => void
) {
  console.log('[Supabase] Subscribing to messages for match:', matchId);

  const channel = supabase
    .channel(`messages:${matchId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `match_id=eq.${matchId}`,
      },
      (payload) => {
        console.log('[Supabase] New message received:', payload.new);
        onNewMessage(payload.new as Message);
      }
    )
    .subscribe();

  return () => {
    console.log('[Supabase] Unsubscribing from messages for match:', matchId);
    supabase.removeChannel(channel);
  };
}

/* -------------------------------------------------------
   REAL-TIME MATCH SUBSCRIPTION
------------------------------------------------------- */
export function subscribeToMatches(
  userId: string,
  onNewMatch: (match: Match) => void
) {
  console.log('[Supabase] Subscribing to matches for user:', userId);

  const channel = supabase
    .channel(`matches:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'matches',
      },
      (payload) => {
        const match = payload.new as Match;

        if (match.user1 === userId || match.user2 === userId) {
          console.log('[Supabase] New match received:', match.id);
          onNewMatch(match);
        }
      }
    )
    .subscribe();

  return () => {
    console.log('[Supabase] Unsubscribing from matches for user:', userId);
    supabase.removeChannel(channel);
  };
}

