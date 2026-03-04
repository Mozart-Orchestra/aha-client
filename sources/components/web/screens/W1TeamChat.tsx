import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Image,
  StyleSheet,
} from 'react-native';
import { StyleSheet as UnistylesStyleSheet, useUnistyles } from 'react-native-unistyles';
import { MaterialIcons } from '@expo/vector-icons';
import { WebShell } from '../WebShell';

interface Message {
  id: string;
  content: string;
  sender: {
    id: string;
    name: string;
    type: 'user' | 'agent';
    avatar?: string;
  };
  timestamp: string;
}

interface Member {
  id: string;
  name: string;
  avatar?: string;
  status: 'online' | 'away' | 'offline';
  role: string;
}

export function W1TeamChat() {
  const { theme } = useUnistyles();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    fetchMessages();
    fetchMembers();
  }, []);

  const fetchMessages = async () => {
    try {
      const response = await fetch('/api/teams/team-1/messages');
      const data = await response.json();
      if (data.success) {
        setMessages(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const fetchMembers = async () => {
    try {
      const response = await fetch('/api/teams/team-1/members');
      const data = await response.json();
      if (data.success) {
        setMembers(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch members:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    try {
      const response = await fetch('/api/teams/team-1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: inputText,
          senderId: 'user-1',
        }),
      });
      const data = await response.json();
      if (data.success) {
        setMessages([...messages, data.data]);
        setInputText('');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const RightPanel = (
    <>
      <View style={styles.membersHeader}>
        <Text style={styles.membersTitle}>Team Members</Text>
        <Text style={styles.membersCount}>{members.length} active</Text>
      </View>
      <ScrollView style={styles.membersList}>
        {members.map((member) => (
          <View key={member.id} style={styles.memberItem}>
            <View style={styles.memberAvatar}>
              <Text style={styles.memberAvatarText}>
                {member.name.charAt(0).toUpperCase()}
              </Text>
              <View
                style={[
                  styles.statusIndicator,
                  {
                    backgroundColor:
                      member.status === 'online'
                        ? '#10B981'
                        : member.status === 'away'
                        ? '#F59E0B'
                        : '#9CA3AF',
                  },
                ]}
              />
            </View>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{member.name}</Text>
              <Text style={styles.memberRole}>{member.role}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </>
  );

  return (
    <WebShell
      title="Frontend Legion"
      showRightPanel={true}
      rightPanelContent={RightPanel}
      activeNavItem="chat"
    >
      <View style={styles.container}>
        {/* Agent Row */}
        <View style={styles.agentRow}>
          <View style={styles.agentBadge}>
            <MaterialIcons name="smart-toy" size={16} color={theme.colors.primary} />
            <Text style={styles.agentText}>Code Reviewer</Text>
          </View>
          <View style={[styles.agentBadge, styles.agentOffline]}>
            <MaterialIcons name="smart-toy" size={16} color={theme.colors.textTertiary} />
            <Text style={[styles.agentText, styles.agentTextOffline]}>Test Writer</Text>
          </View>
          <View style={[styles.agentBadge, styles.agentOffline]}>
            <MaterialIcons name="smart-toy" size={16} color={theme.colors.textTertiary} />
            <Text style={[styles.agentText, styles.agentTextOffline]}>Docs Helper</Text>
          </View>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
        >
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageRow,
                message.sender.type === 'user' && styles.messageRowUser,
              ]}
            >
              <View style={styles.messageAvatar}>
                <Text style={styles.messageAvatarText}>
                  {message.sender.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View
                style={[
                  styles.messageBubble,
                  message.sender.type === 'user' && styles.messageBubbleUser,
                ]}
              >
                <View style={styles.messageHeader}>
                  <Text style={styles.messageSender}>{message.sender.name}</Text>
                  <Text style={styles.messageTime}>{formatTime(message.timestamp)}</Text>
                </View>
                <Text style={styles.messageContent}>{message.content}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor={theme.colors.textTertiary}
            multiline
          />
          <Pressable style={styles.sendButton} onPress={sendMessage}>
            <MaterialIcons name="send" size={20} color="#fff" />
          </Pressable>
        </View>
      </View>
    </WebShell>
  );
}

const styles = UnistylesStyleSheet.create((theme) => ({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  agentRow: {
    flexDirection: 'row',
    gap: 16,
    padding: 12,
    paddingHorizontal: 20,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  agentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  agentOffline: {
    opacity: 0.6,
  },
  agentText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  agentTextOffline: {
    color: theme.colors.textTertiary,
  },
  messagesContainer: {
    flex: 1,
    padding: 20,
  },
  messageRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  messageRowUser: {
    flexDirection: 'row-reverse',
  },
  messageAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageAvatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  messageBubble: {
    flex: 1,
    maxWidth: '70%',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 12,
  },
  messageBubbleUser: {
    backgroundColor: theme.colors.primaryLight,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  messageSender: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
  },
  messageTime: {
    fontSize: 11,
    color: theme.colors.textTertiary,
  },
  messageContent: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    paddingHorizontal: 20,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 14,
    fontSize: 14,
    color: theme.colors.text,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  membersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  membersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  membersCount: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  membersList: {
    flex: 1,
    padding: 8,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    paddingHorizontal: 16,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  memberAvatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
  },
  memberRole: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
}));
