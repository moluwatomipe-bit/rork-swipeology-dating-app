import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { Send, Flag, Ban } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Message } from '@/types';
import Colors from '@/constants/colors';

const theme = Colors.dark;

export default function ChatScreen() {
  const { matchId, userName, context } = useLocalSearchParams<{
    matchId: string;
    userName: string;
    context: string;
  }>();
  const { currentUser, blockUser, reportUser } = useAuth();
  const { getMessagesForMatch, sendMessage, getOtherUserForMatch, removeMatch } = useData();
  const [inputText, setInputText] = useState<string>('');
  const flatListRef = useRef<FlatList<Message>>(null);

  const otherUser = useMemo(
    () => getOtherUserForMatch(matchId || ''),
    [matchId, getOtherUserForMatch]
  );

  const chatMessages = useMemo(
    () => getMessagesForMatch(matchId || ''),
    [matchId, getMessagesForMatch]
  );

  const isBlocked = useMemo(() => {
    if (!currentUser || !otherUser) return false;
    return (currentUser.blocked_users || []).includes(otherUser.id);
  }, [currentUser, otherUser]);

  useEffect(() => {
    if (chatMessages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [chatMessages.length]);

  const handleSend = useCallback(() => {
    if (!inputText.trim() || !matchId || isBlocked) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    sendMessage(matchId, inputText.trim());
    setInputText('');
  }, [inputText, matchId, sendMessage, isBlocked]);

  const handleReport = useCallback(() => {
    Alert.alert(
      'Report User',
      'Why are you reporting this user?',
      [
        {
          text: 'Harassment',
          onPress: async () => {
            await reportUser(otherUser?.id || '', 'Harassment', matchId || null);
            Alert.alert('Reported', 'Thank you for your report. We will review it.');
          },
        },
        {
          text: 'Fake Profile',
          onPress: async () => {
            await reportUser(otherUser?.id || '', 'Fake Profile', matchId || null);
            Alert.alert('Reported', 'Thank you for your report. We will review it.');
          },
        },
        {
          text: 'Inappropriate',
          onPress: async () => {
            await reportUser(otherUser?.id || '', 'Inappropriate', matchId || null);
            Alert.alert('Reported', 'Thank you for your report. We will review it.');
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, [otherUser, matchId, reportUser]);

  const handleBlock = useCallback(() => {
    Alert.alert(
      'Block User',
      `Are you sure you want to block ${userName}? They won't be able to see your profile, message you, or appear in your feed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              await blockUser(otherUser?.id || '');
              if (matchId) {
                removeMatch(matchId);
              }
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              Alert.alert('Blocked', `${userName} has been blocked.`, [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch (e) {
              console.log('Block error:', e);
              Alert.alert('Error', 'Failed to block user. Please try again.');
            }
          },
        },
      ]
    );
  }, [userName, otherUser, matchId, blockUser, removeMatch]);

  const contextLabel = context === 'friends' ? 'Friends' : 'Dating';
  const headerTitle = `${userName || ''} · ${contextLabel}`;

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    const isMine = item.sender_id === currentUser?.id;
    return (
      <View
        style={[
          styles.messageBubble,
          isMine ? styles.myMessage : styles.theirMessage,
        ]}
      >
        <Text style={[styles.messageText, isMine ? styles.myMessageText : styles.theirMessageText]}>
          {item.message_text}
        </Text>
        <Text style={[styles.messageTime, isMine ? styles.myMessageTime : styles.theirMessageTime]}>
          {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  }, [currentUser]);

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          title: headerTitle,
          headerRight: () => (
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={handleReport} style={styles.headerBtn} activeOpacity={0.7}>
                <Flag size={18} color={theme.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleBlock} style={styles.headerBtn} activeOpacity={0.7}>
                <Ban size={18} color={theme.error} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {chatMessages.length === 0 ? (
          <View style={styles.emptyChat}>
            <Text style={styles.emptyChatText}>
              Say hi to {userName}! 👋
            </Text>
            <Text style={styles.emptyChatSubtext}>
              This is the beginning of your {context === 'friends' ? 'friendship' : 'conversation'}.
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={chatMessages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {isBlocked ? (
          <View style={styles.blockedBar}>
            <Ban size={16} color={theme.error} />
            <Text style={styles.blockedText}>You have blocked this user</Text>
          </View>
        ) : (
          <View style={styles.inputBar}>
            <TextInput
              style={styles.textInput}
              placeholder="Type a message..."
              placeholderTextColor={theme.textMuted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              testID="chat-input"
            />
            <TouchableOpacity
              style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!inputText.trim()}
              activeOpacity={0.7}
              testID="send-btn"
            >
              <Send size={20} color={inputText.trim() ? '#fff' : theme.textMuted} />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.background,
  },
  flex: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerBtn: {
    padding: 6,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 6,
  },
  messageBubble: {
    maxWidth: '78%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 2,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: theme.messageSent,
    borderBottomRightRadius: 6,
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: theme.messageReceived,
    borderBottomLeftRadius: 6,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  myMessageText: {
    color: '#fff',
  },
  theirMessageText: {
    color: theme.text,
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
  },
  myMessageTime: {
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'right' as const,
  },
  theirMessageTime: {
    color: theme.textMuted,
  },
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 8,
  },
  emptyChatText: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: theme.text,
  },
  emptyChatSubtext: {
    fontSize: 14,
    color: theme.textSecondary,
    textAlign: 'center',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    backgroundColor: theme.background,
  },
  textInput: {
    flex: 1,
    backgroundColor: theme.inputBg,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.text,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: theme.border,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: theme.surface,
  },
  blockedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    backgroundColor: theme.surface,
  },
  blockedText: {
    fontSize: 14,
    color: theme.error,
    fontWeight: '500' as const,
  },
});
