import React from 'react';
import { View, ScrollView, TextInput, Pressable, KeyboardAvoidingView, Platform, Image, ActivityIndicator } from 'react-native';
import { Text } from '@/components/StyledText';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import { TeamMessage, SendTeamMessageRequest } from '@/sync/teamMessageTypes';
import { sync } from '@/sync/sync';
import { MarkdownView } from './markdown/MarkdownView';
import { useRouter } from 'expo-router';
import {
  parseCommand,
  executeCreateTask,
  executeUpdateTask,
  executeCompleteTask,
  getCommandHelp,
  type TaskCommandResult
} from '@/utils/teamCommandParser';

const stylesheet = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.colors.groupped.background,
    },
    messageList: {
        flex: 1,
    },
    messageListContent: {
        padding: 16,
        paddingBottom: 24,
    },
    messageRow: {
        flexDirection: 'row',
        marginBottom: 16,
        alignItems: 'flex-end', // Align avatars to bottom
    },
    myMessageRow: {
        flexDirection: 'row-reverse',
    },
    avatarContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: theme.colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: theme.colors.divider,
        marginRight: 8,
        marginBottom: 4, // Align with bubble bottom
    },
    myAvatarContainer: {
        marginRight: 0,
        marginLeft: 8,
        backgroundColor: theme.colors.button.primary.background,
        borderColor: theme.colors.button.primary.background,
    },
    avatarText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    myAvatarText: {
        color: '#FFF',
    },
    messageBubbleContainer: {
        flex: 1,
        maxWidth: '75%',
    },
    messageBubble: {
        backgroundColor: theme.colors.surface,
        borderRadius: 18,
        padding: 12,
        borderBottomLeftRadius: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    myMessageBubble: {
        backgroundColor: theme.colors.button.primary.background,
        borderRadius: 18,
        borderBottomRightRadius: 4,
        borderBottomLeftRadius: 18, // Reset
        shadowColor: theme.colors.button.primary.background,
        shadowOpacity: 0.2,
    },
    senderName: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        marginBottom: 4,
        marginLeft: 44, // Align with bubble
    },
    mySenderName: {
        alignSelf: 'flex-end',
        marginRight: 44,
        marginLeft: 0,
    },
    messageContent: {
        fontSize: 16,
        color: theme.colors.text,
        lineHeight: 24,
        fontWeight: '500',
    },
    myMessageContent: {
        color: '#FFFFFF',
        fontWeight: '500',
    },
    messageTime: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        marginTop: 6,
        alignSelf: 'flex-end',
        opacity: 0.8,
    },
    myMessageTime: {
        color: 'rgba(255,255,255,0.8)',
    },
    expandText: {
        fontSize: 13,
        marginTop: 8,
        fontWeight: '600',
        color: theme.colors.button.primary.background,
    },
    myExpandText: {
        color: '#FFFFFF',
        textDecorationLine: 'underline',
    },
    systemMessage: {
        alignSelf: 'center',
        paddingHorizontal: 12,
        paddingVertical: 4,
        marginBottom: 16,
        marginTop: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    systemMessageText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    inputContainer: {
        backgroundColor: theme.colors.surface,
        borderTopWidth: 1,
        borderTopColor: theme.colors.divider,
        paddingHorizontal: 12,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 10,
    },
    inputWrapper: {
        flex: 1,
        backgroundColor: theme.colors.groupped.background,
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 8,
        maxHeight: 120,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    input: {
        fontSize: 15,
        color: theme.colors.text,
        minHeight: 24,
        paddingTop: 0, // Fix alignment on Android
        paddingBottom: 0,
    } as any,
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.button.primary.background,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 2, // Align with input bottom
    },
    sendButtonDisabled: {
        opacity: 0.5,
        backgroundColor: theme.colors.groupped.background,
    },
    attachButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 2,
        backgroundColor: theme.colors.groupped.background,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        opacity: 0.5,
    },
    emptyStateText: {
        fontSize: 15,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginTop: 12,
    },
}));

// Helper to get avatar initials or icon based on role
const getAvatarContent = (roleId?: string, displayName?: string) => {
    if (roleId === 'master') return '👑';
    if (roleId === 'builder') return '🛠️';
    if (roleId === 'framer') return '🎨';
    if (roleId === 'reviewer') return '🔍';

    // Fallback to initials
    const name = displayName || roleId || '?';
    return name.substring(0, 2).toUpperCase();
};

interface MessageBubbleProps {
    message: TeamMessage;
    isMyMessage: boolean;
    styles: any;
    onAvatarPress: (sessionId: string) => void;
}

const MessageBubble = ({ message, isMyMessage, styles, onAvatarPress }: MessageBubbleProps) => {
    const [expanded, setExpanded] = React.useState(false);

    // Determine if we should show short or long content
    // If shortContent exists, use it as the summary.
    // Otherwise, truncate content.
    const hasShortContent = !!message.shortContent;
    const MAX_LENGTH = 150;
    const isLong = message.content.length > MAX_LENGTH || message.content.split('\n').length > 5;

    const shouldShowExpand = hasShortContent || isLong;

    const renderContent = () => {
        if (!shouldShowExpand || expanded) {
            // Show full content
            return (
                <View style={isMyMessage ? { opacity: 0.95 } : {}}>
                    <MarkdownView markdown={message.content} textColor={isMyMessage ? '#FFFFFF' : undefined} />
                </View>
            );
        } else {
            // Show short content
            const shortText = message.shortContent || (message.content.substring(0, MAX_LENGTH) + '...');
            return (
                <Text style={[styles.messageContent, isMyMessage && styles.myMessageContent]}>
                    {shortText}
                </Text>
            );
        }
    };

    return (
        <View style={{ marginBottom: 2 }}>
            {!isMyMessage && (
                <Text style={styles.senderName}>
                    {message.fromDisplayName || message.fromSessionId?.substring(0, 8) || 'User'}
                </Text>
            )}

            <View style={[styles.messageRow, isMyMessage && styles.myMessageRow]}>
                <Pressable
                    onPress={() => message.fromSessionId && onAvatarPress(message.fromSessionId)}
                    disabled={!message.fromSessionId}
                    style={[styles.avatarContainer, isMyMessage && styles.myAvatarContainer]}
                >
                    <Text style={[styles.avatarText, isMyMessage && styles.myAvatarText]}>
                        {getAvatarContent(message.fromRole, message.fromDisplayName)}
                    </Text>
                </Pressable>

                <View style={styles.messageBubbleContainer}>
                    <Pressable
                        style={[styles.messageBubble, isMyMessage && styles.myMessageBubble]}
                        onPress={() => shouldShowExpand && setExpanded(!expanded)}
                    >
                        {renderContent()}

                        {shouldShowExpand && (
                            <Text style={[styles.expandText, isMyMessage && styles.myExpandText]}>
                                {expanded ? 'Show Less' : 'Show More'}
                            </Text>
                        )}

                        <Text style={[styles.messageTime, isMyMessage && styles.myMessageTime]}>
                            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </Pressable>
                </View>
            </View>
        </View>
    );
};

interface TeamChatRoomProps {
    teamId: string;
    teamName: string;
    mySessionId?: string;
    myRole?: string;
    myDisplayName?: string;
    members?: Array<{
        member: { sessionId: string; displayName?: string; roleId?: string };
        session?: { active: boolean; updatedAt: number };
        role?: { title: string };
    }>;
}

export default function TeamChatRoom({ teamId, teamName, mySessionId, myRole, myDisplayName, members = [] }: TeamChatRoomProps) {
    const { theme } = useUnistyles();
    const styles = stylesheet;
    const scrollViewRef = React.useRef<ScrollView>(null);
    const router = useRouter();

    const [messages, setMessages] = React.useState<TeamMessage[]>([]);
    const [inputText, setInputText] = React.useState('');
    const [isSending, setIsSending] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(true);
    const [showStatus, setShowStatus] = React.useState(false);

    const formatRelativeTime = React.useCallback((timestamp?: number) => {
        if (!timestamp) return 'No activity';
        const diff = Date.now() - timestamp;
        if (diff < 60 * 1000) return 'Just now';
        if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}h ago`;
        return `${Math.floor(diff / (24 * 60 * 60 * 1000))}d ago`;
    }, []);

    React.useEffect(() => {
        setMessages([]);
    }, [teamId]);

    // Filter active members for status display
    const activeMembers = React.useMemo(() => {
        return members.filter(m => m.session?.active);
    }, [members]);

    const lastResponseBySession = React.useMemo<Record<string, number>>(() => {
        const map: Record<string, number> = {};
        messages.forEach(message => {
            if (!message.fromSessionId) return;
            map[message.fromSessionId] = Math.max(map[message.fromSessionId] || 0, message.timestamp);
        });
        return map;
    }, [messages]);

    const handleAvatarPress = (sessionId: string) => {
        const member = members.find(m => m.member.sessionId === sessionId);
        router.push({
            pathname: '/(app)/session/[id]',
            params: {
                id: sessionId,
                teamName: teamName,
                roleName: member?.role?.title || member?.member.roleId || 'Agent'
            }
        });
    };

    const renderStatusHeader = () => (
        <Pressable
            onPress={() => setShowStatus(!showStatus)}
            style={{
                backgroundColor: theme.colors.surface,
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.divider,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                zIndex: 10,
            }}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.success }} />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.text }}>
                        {activeMembers.length} Online
                    </Text>
                </View>
                <Text style={{ fontSize: 13, color: theme.colors.textSecondary }}>
                    / {members.length} Total
                </Text>
            </View>
            <Ionicons name={showStatus ? "chevron-up" : "chevron-down"} size={16} color={theme.colors.textSecondary} />
        </Pressable>
    );

    const renderStatusList = () => {
        if (!showStatus) return null;

        return (
            <View style={{ backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.divider }}>
                {members.map((m) => {
                    const isOnline = m.session?.active;
                    const lastActive = m.session?.updatedAt ? new Date(m.session.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never';
                    const lastResponse = lastResponseBySession[m.member.sessionId];
                    const lastResponseLabel = formatRelativeTime(lastResponse);

                    return (
                        <Pressable
                            key={m.member.sessionId}
                            onPress={() => handleAvatarPress(m.member.sessionId)}
                            style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                paddingHorizontal: 16,
                                paddingVertical: 12,
                                borderBottomWidth: 1,
                                borderBottomColor: theme.colors.groupped.background
                            }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                <View style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 16,
                                    backgroundColor: theme.colors.groupped.background,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderWidth: 1,
                                    borderColor: isOnline ? theme.colors.success : theme.colors.divider
                                }}>
                                    <Text style={{ fontSize: 14 }}>
                                        {getAvatarContent(m.member.roleId, m.member.displayName)}
                                    </Text>
                                </View>
                                <View>
                                    <Text style={{ fontSize: 14, fontWeight: '500', color: theme.colors.text }}>
                                        {m.member.displayName || m.member.sessionId.substring(0, 8)}
                                    </Text>
                                    <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                                        {m.role?.title || m.member.roleId || 'Unknown Role'}
                                    </Text>
                                </View>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={{ fontSize: 12, color: isOnline ? theme.colors.success : theme.colors.textSecondary, fontWeight: isOnline ? '600' : '400' }}>
                                    {isOnline ? 'Online' : 'Offline'}
                                </Text>
                                <Text style={{ fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 }}>
                                    Active: {lastResponseLabel}
                                </Text>
                            </View>
                        </Pressable>
                    );
                })}
            </View>
        );
    };

    // Load messages
    React.useEffect(() => {
        loadMessages();
    }, [teamId]);

    // Subscribe to real-time messages
    React.useEffect(() => {
        const unsubscribe = sync.subscribeToTeamMessages(teamId, (message) => {
            setMessages(prev => {
                // O(1) deduplication check using Set (replaced O(n) Array.some)
                const messageIds = new Set(prev.map(m => m.id));
                if (messageIds.has(message.id)) {
                    return prev;
                }
                return [...prev, message].sort((a, b) => a.timestamp - b.timestamp);
            });

            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
        });

        return unsubscribe;
    }, [teamId]);

    // Deduplicate and sort
    const uniqueMessages = React.useMemo(() => {
        const seen = new Set();
        return messages.filter(m => {
            if (seen.has(m.id)) return false;
            seen.add(m.id);
            return true;
        }).sort((a, b) => a.timestamp - b.timestamp);
    }, [messages]);

    const loadMessages = async () => {
        try {
            setIsLoading(true);
            const result = await sync.getTeamMessages(teamId);

            setMessages(prev => {
                const combined = [...prev, ...result.messages];
                const unique = Array.from(new Map(combined.map(m => [m.id, m])).values());
                return unique.sort((a, b) => a.timestamp - b.timestamp);
            });

            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: false });
            }, 100);
        } catch (error) {
            console.error('Failed to load team messages:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSend = async () => {
        const content = inputText.trim();
        if (!content || isSending) return;

        try {
            setIsSending(true);

            // 检查是否是命令
            const command = parseCommand(content);

            if (command) {
                // 执行命令
                const result = await executeCommand(command);

                // 发送系统消息显示结果
                const resultMessage: TeamMessage = {
                    id: `cmd_result_${Date.now()}`,
                    teamId,
                    content: result.message,
                    type: 'system',
                    timestamp: Date.now(),
                    fromRole: 'system',
                    fromDisplayName: 'System'
                };

                setMessages(prev => [...prev, resultMessage]);

                // 如果是帮助命令，不保存到聊天记录
                if (command.type === 'unknown' && content.trim() === '/help') {
                    // 显示帮助信息
                }

                setInputText('');
                return;
            }

            // 普通聊天消息
            const mentions = extractMentions(content);

            // User messages should NOT use team member's session ID
            // Leave fromSessionId undefined so Happy-CLI recognizes this as a user message
            const request: SendTeamMessageRequest = {
                teamId,
                content,
                type: 'chat',
                mentions: mentions.length > 0 ? mentions : undefined,
                fromSessionId: undefined,  // User message, not from a team member session
                fromRole: 'user',           // Always 'user' for messages from the user
                fromDisplayName: 'User'     // Can be improved to use actual user name
            };

            await sync.sendTeamMessage(request);
            setInputText('');
        } catch (error) {
            console.error('Failed to send message:', error);
        } finally {
            setIsSending(false);
        }
    };

    /**
     * 执行命令
     */
    const executeCommand = async (command: ParsedCommand): Promise<TaskCommandResult> => {
        if (!mySessionId) {
            return {
                success: false,
                message: '❌ Cannot execute command: No active session'
            };
        }

        switch (command.type) {
            case 'createTask':
                return await executeCreateTask(
                    command.params,
                    mySessionId,
                    teamId,
                    myDisplayName || 'User'
                );

            case 'updateTask':
                return await executeUpdateTask(command.params);

            case 'assignTask':
                // TODO: 实现分配逻辑
                return {
                    success: false,
                    message: '⚠️ Task assignment feature coming soon'
                };

            case 'completeTask':
                return await executeCompleteTask(command.params.taskId);

            default:
                return {
                    success: false,
                    message: `❌ Unknown command. Type /help for available commands.`
                };
        }
    };

    const extractMentions = (text: string): string[] => {
        const mentionRegex = /@([a-zA-Z0-9-]+)/g;
        const matches = [...text.matchAll(mentionRegex)];
        return matches.map(m => {
            const name = m[1].toLowerCase();
            const member = members.find(mem =>
                (mem.member.displayName && mem.member.displayName.toLowerCase() === name) ||
                (mem.member.roleId && mem.member.roleId.toLowerCase() === name)
            );
            return member ? member.member.sessionId : null;
        }).filter(id => id !== null) as string[];
    };

    if (isLoading) {
        return (
            <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
                <ActivityIndicator size="small" color={theme.colors.textSecondary} />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={90}
        >
            {renderStatusHeader()}
            {renderStatusList()}
            <ScrollView
                ref={scrollViewRef}
                style={styles.messageList}
                contentContainerStyle={[
                    styles.messageListContent,
                    uniqueMessages.length === 0 && { flex: 1 }
                ]}
            >
                {uniqueMessages.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="chatbubbles-outline" size={48} color={theme.colors.textSecondary} />
                        <Text style={styles.emptyStateText}>
                            Start the conversation
                        </Text>
                    </View>
                ) : (
                    uniqueMessages.map(message => {
                        if (message.type === 'system') {
                            return (
                                <View key={message.id} style={styles.systemMessage}>
                                    <Ionicons name="information-circle-outline" size={12} color={theme.colors.textSecondary} />
                                    <Text style={styles.systemMessageText}>{message.content}</Text>
                                </View>
                            );
                        }
                        return (
                            <MessageBubble
                                key={message.id}
                                message={message}
                                isMyMessage={message.fromRole === 'user' && (!message.fromSessionId || message.fromSessionId === mySessionId)}
                                styles={styles}
                                onAvatarPress={handleAvatarPress}
                            />
                        );
                    })
                )}
            </ScrollView>

            <View style={styles.inputContainer}>
                <Pressable style={styles.attachButton}>
                    <Ionicons name="add" size={24} color={theme.colors.textSecondary} />
                </Pressable>

                <View style={styles.inputWrapper}>
                    <TextInput
                        style={styles.input}
                        value={inputText}
                        onChangeText={setInputText                        placeholder="Type a message or /create task... (Type /help for commands)"
                        placeholderTextColor={theme.colors.input.placeholder}
                        multiline
                        maxLength={2000}
                        editable={!isSending}
                    />
                </View>

                <Pressable
                    style={[
                        styles.sendButton,
                        (!inputText.trim() || isSending) && styles.sendButtonDisabled
                    ]}
                    onPress={handleSend}
                    disabled={!inputText.trim() || isSending}
                >
                    <Ionicons name="arrow-up" size={20} color={(!inputText.trim() || isSending) ? theme.colors.textSecondary : "#FFF"} />
                </Pressable>
            </View>
        </KeyboardAvoidingView>
    );
}
