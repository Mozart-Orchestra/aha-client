import React from 'react';
import { View, ScrollView, TextInput, Pressable, KeyboardAvoidingView, Platform, Image, ActivityIndicator } from 'react-native';
import { Text } from '@/components/StyledText';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import { TeamMessage, SendTeamMessageRequest } from '@/sync/teamMessageTypes';
import { sync } from '@/sync/sync';
import { MarkdownView } from './markdown/MarkdownView';
import { useRouter } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import {
  parseCommand,
  executeCreateTask,
  executeUpdateTask,
  executeCompleteTask,
  getCommandHelp,
  type TaskCommandResult
} from '@/utils/teamCommandParser';
import { useTaskChatSync } from '@/hooks/useTaskChatSync';
import type { KanbanTask } from '@/sync/kanbanTypes';
import { parseTaskCommand, createTaskFromCommand } from '@/utils/taskHelpers';
import { extractTaskIds } from '@/utils/taskChatSync';

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
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: theme.colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: theme.colors.divider,
        marginRight: 8,
        marginBottom: 4,
        shadowColor: theme.colors.shadowColor || '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: theme.colors.shadowOpacity || 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    myAvatarContainer: {
        marginRight: 0,
        marginLeft: 8,
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
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
        paddingBottom: 10,
        borderBottomLeftRadius: 4,
        shadowColor: theme.colors.shadowColor || '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: theme.colors.shadowOpacity || 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    myMessageBubble: {
        backgroundColor: theme.colors.primary,
        borderRadius: 18,
        padding: 12,
        paddingBottom: 10,
        borderBottomRightRadius: 4,
        borderBottomLeftRadius: 18,
        shadowColor: theme.colors.primary,
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 3,
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
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 10,
        shadowColor: theme.colors.shadowColor || '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: theme.colors.shadowOpacity || 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    inputWrapper: {
        flex: 1,
        backgroundColor: theme.colors.groupped.background,
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 10,
        maxHeight: 120,
        borderWidth: 1.5,
        borderColor: 'transparent',
        shadowColor: theme.colors.shadowColor || '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: theme.colors.shadowOpacity || 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    input: {
        fontSize: 15,
        color: theme.colors.text,
        minHeight: 24,
        paddingTop: 0,
        paddingBottom: 0,
    } as any,
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: theme.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 2,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    sendButtonDisabled: {
        opacity: 0.4,
        backgroundColor: theme.colors.groupped.background,
        shadowOpacity: 0,
    },
    attachButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
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
    if (!roleId) {
        const name = displayName || '?';
        return name.substring(0, 2).toUpperCase();
    }

    const normalizedRole = ({
        master: 'orchestrator',
        builder: 'implementer',
        framer: 'architect',
        scout: 'researcher',
        scribe: 'observer',
        qa: 'qa-engineer',
        reviewer: 'observer',
    } as const)[roleId] ?? roleId;

    if (normalizedRole === 'orchestrator') return '👑';
    if (normalizedRole === 'architect') return '🧭';
    if (normalizedRole === 'implementer') return '🛠️';
    if (normalizedRole === 'researcher') return '🔎';
    if (normalizedRole === 'qa-engineer') return '🧪';
    if (normalizedRole === 'observer') return '👁️';

    // Fallback to initials
    const name = displayName || normalizedRole || '?';
    return name.substring(0, 2).toUpperCase();
};

// 🆕 Task Card Component for displaying task references in chat
interface TaskCardProps {
    task: KanbanTask;
    onPress?: () => void;
    styles: any;
}

const TaskCard = ({ task, onPress, styles }: TaskCardProps) => {
    const statusColors: Record<string, string> = {
        'todo': '#888',
        'in-progress': '#007AFF',
        'review': '#FF9500',
        'done': '#34C759',
        'blocked': '#FF3B30'
    };

    const statusColor = statusColors[task.status] || '#888';
    const statusLabels: Record<string, string> = {
        'todo': 'To Do',
        'in-progress': 'In Progress',
        'review': 'Review',
        'done': 'Done',
        'blocked': 'Blocked'
    };

    return (
        <Pressable
            onPress={onPress}
            style={{
                backgroundColor: styles.messageBubble.backgroundColor,
                borderRadius: 12,
                padding: 12,
                marginTop: 8,
                borderWidth: 1,
                borderColor: statusColor,
                borderLeftWidth: 4,
                borderLeftColor: statusColor
            }}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: styles.messageContent.color }}>
                    {task.title}
                </Text>
                <View style={{
                    backgroundColor: statusColor + '20',
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 8
                }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: statusColor }}>
                        {statusLabels[task.status] || task.status}
                    </Text>
                </View>
            </View>
            {task.description && (
                <Text style={{ fontSize: 13, color: styles.messageContent.color, opacity: 0.8, marginTop: 4 }}>
                    {task.description.substring(0, 100)}
                    {task.description.length > 100 ? '...' : ''}
                </Text>
            )}
            {task.assigneeId && (
                <Text style={{ fontSize: 12, color: styles.messageTime.color, marginTop: 6 }}>
                    Assigned to: @{task.assigneeId.substring(0, 8)}
                </Text>
            )}
        </Pressable>
    );
};

interface MessageBubbleProps {
    message: TeamMessage;
    isMyMessage: boolean;
    styles: any;
    onAvatarPress: (sessionId: string) => void;
    // 🆕 Task references support
    taskChatSync?: ReturnType<typeof useTaskChatSync>;
}

const MessageBubble = ({ message, isMyMessage, styles, onAvatarPress, taskChatSync }: MessageBubbleProps) => {
    const [expanded, setExpanded] = React.useState(false);

    // 🆕 查找关联的任务
    const relatedTask = React.useMemo(() => {
        if (!taskChatSync || !message.metadata?.taskId) return null;
        const tasksForMessage = taskChatSync.getTasksForMessage(message.id);
        return tasksForMessage.find(t => t.id === message.metadata?.taskId) ?? null;
    }, [taskChatSync, message.id, message.metadata?.taskId]);

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

                    {/* 🆕 显示关联的任务卡片 */}
                    {relatedTask && (
                        <TaskCard
                            task={relatedTask}
                            styles={styles}
                            onPress={() => {
                                // TODO: Navigate to task detail or switch to board tab
                                console.log('Task pressed:', relatedTask.id);
                            }}
                        />
                    )}
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
    // 🆕 Chat-Board 同步相关 props
    messages?: TeamMessage[];
    onMessagesChange?: (messages: TeamMessage[]) => void;
    taskChatSync?: ReturnType<typeof useTaskChatSync>;
}

export default function TeamChatRoom({
    teamId,
    teamName,
    mySessionId,
    myRole,
    myDisplayName,
    members = [],
    messages: externalMessages,
    onMessagesChange,
    taskChatSync
}: TeamChatRoomProps) {
    const { theme } = useUnistyles();
    const styles = stylesheet;
    const scrollViewRef = React.useRef<ScrollView>(null);
    const router = useRouter();

    // 🆕 滚动控制状态
    const [isNearBottom, setIsNearBottom] = React.useState(true);
    const [showScrollButton, setShowScrollButton] = React.useState(false);

    // 🆕 使用外部 messages（如果提供），否则使用内部状态
    const [internalMessages, setInternalMessages] = React.useState<TeamMessage[]>([]);
    const messages = externalMessages ?? internalMessages;
    const messagesRef = React.useRef<TeamMessage[]>(messages);
    const messageIdsRef = React.useRef<Set<string>>(new Set());

    React.useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    const setMessages = React.useCallback((update: React.SetStateAction<TeamMessage[]>) => {
        if (onMessagesChange) {
            const nextMessages = typeof update === 'function'
                ? (update as (prev: TeamMessage[]) => TeamMessage[])(messagesRef.current)
                : update;
            onMessagesChange(nextMessages);
            return;
        }
        setInternalMessages(update);
    }, [onMessagesChange, setInternalMessages]);

    const setMessagesRef = React.useRef(setMessages);
    React.useEffect(() => {
        setMessagesRef.current = setMessages;
    }, [setMessages]);

    React.useEffect(() => {
        messageIdsRef.current = new Set(messages.map(message => message.id));
    }, [messages]);

    const [inputText, setInputText] = React.useState('');
    const [isSending, setIsSending] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(true);
    const [showStatus, setShowStatus] = React.useState(false);

    // 🆕 滚动处理函数
    const handleScrollToTop = React.useCallback(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }, []);

    const handleScrollToBottom = React.useCallback(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
    }, []);

    const handleScroll = React.useCallback((event: any) => {
        const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
        const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;

        // 判断是否接近底部（100像素以内）
        const nearBottom = distanceFromBottom < 100;
        setIsNearBottom(nearBottom);

        // 如果不在底部，显示滚动按钮
        setShowScrollButton(!nearBottom);
    }, []);

    const formatRelativeTime = React.useCallback((timestamp?: number) => {
        if (!timestamp) return 'No activity';
        const diff = Date.now() - timestamp;
        if (diff < 60 * 1000) return 'Just now';
        if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}h ago`;
        return `${Math.floor(diff / (24 * 60 * 60 * 1000))}d ago`;
    }, []);

    React.useEffect(() => {
        setMessagesRef.current([]);
        messageIdsRef.current = new Set();
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
        void loadMessages();
    }, [loadMessages]);

    // Subscribe to real-time messages
    React.useEffect(() => {
        let isActive = true;
        let cleanup: (() => void) | undefined;

        const subscribe = async () => {
            try {
                const unsubscribe = await sync.subscribeToTeamMessages(teamId, (message) => {
                    setMessages(prev => {
                        if (messageIdsRef.current.has(message.id)) {
                            return prev;
                        }
                        messageIdsRef.current.add(message.id);
                        return [...prev, message].sort((a, b) => a.timestamp - b.timestamp);
                    });

                    setTimeout(() => {
                        scrollViewRef.current?.scrollToEnd({ animated: true });
                    }, 100);
                });

                if (!isActive) {
                    unsubscribe();
                    return;
                }

                cleanup = unsubscribe;
            } catch (error) {
                console.error('Failed to subscribe to team messages:', error);
            }
        };

        void subscribe();

        return () => {
            isActive = false;
            cleanup?.();
        };
    }, [teamId, setMessages]);

    // Deduplicate and sort
    const uniqueMessages = React.useMemo(() => {
        const seen = new Set();
        return messages.filter(m => {
            if (seen.has(m.id)) return false;
            seen.add(m.id);
            return true;
        }).sort((a, b) => a.timestamp - b.timestamp);
    }, [messages]);

    const loadMessages = React.useCallback(async () => {
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
    }, [teamId, setMessages]);

    const handleSend = async () => {
        const content = inputText.trim();
        if (!content || isSending) return;

        try {
            setIsSending(true);

            // 🆕 1. 尝试从消息创建任务
            if (taskChatSync) {
                const createdTask = await taskChatSync.createTaskFromMessage(
                    content,
                    mySessionId || 'user',
                    myDisplayName || 'User'
                );

                if (createdTask) {
                    // 创建成功，Hook 已经自动发送了通知消息
                    setInputText('');
                    return;
                }
            }

            // 🆕 3. 检查是否是 /task 命令（Master要求的格式）
            const taskCommand = parseTaskCommand(content);
            if (taskCommand && taskChatSync) {
                try {
                    // 创建新任务
                    const taskId = randomUUID();
                    const sourceMessageId = randomUUID();
                    const newTask = createTaskFromCommand(
                        taskCommand,
                        taskId,
                        mySessionId || 'user',
                        sourceMessageId
                    );

                    // 调用 onTaskCreate 创建任务
                    await taskChatSync.onTaskCreate?.(newTask);

                    // 发送 task-created 通知到聊天
                    const notificationMessage: TeamMessage = {
                        id: `task_created_${randomUUID()}`,
                        teamId,
                        fromDisplayName: myDisplayName || 'User',
                        content: `✅ Created task: **${newTask.title}**\n\n${newTask.description ? `Description: ${newTask.description}\n\n` : ''}Priority: ${newTask.priority}\nStatus: ${newTask.status}\n\n#task-${newTask.id}`,
                        type: 'notification',
                        timestamp: Date.now(),
                        metadata: {
                            taskId: newTask.id,
                            taskChange: {
                                action: 'created',
                                task: newTask
                            }
                        },
                        shortContent: `Task created: ${newTask.title}`
                    };

                    await sync.sendTeamMessage({
                        teamId,
                        content: notificationMessage.content,
                        type: 'notification',
                        metadata: notificationMessage.metadata,
                        fromDisplayName: myDisplayName || 'User'
                    });

                    // 如果指定了 assignee，发送 @mention 通知
                    if (newTask.assigneeId) {
                        const assigneeMention = `@${newTask.assigneeId}`;
                        await sync.sendTeamMessage({
                            teamId,
                            content: `${assigneeMention} You have been assigned a new task: ${newTask.title}`,
                            type: 'notification',
                            mentions: [newTask.assigneeId],
                            metadata: {
                                taskId: newTask.id,
                                taskChange: {
                                    action: 'assigned',
                                    task: newTask
                                }
                            }
                        });
                    }

                    setInputText('');
                    return;
                } catch (error) {
                    console.error('Failed to create task from /task command:', error);
                    const errorMessage: TeamMessage = {
                        id: `task_error_${Date.now()}`,
                        teamId,
                        content: `❌ Failed to create task: ${error instanceof Error ? error.message : 'Unknown error'}`,
                        type: 'system',
                        timestamp: Date.now(),
                        fromRole: 'system',
                        fromDisplayName: 'System'
                    };
                    setMessages(prev => [...prev, errorMessage]);
                    setInputText('');
                    return;
                }
            }

            // 4. 检查是否是其他命令
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

                // 如果是帮助命令，显示帮助信息
                if (command.type === 'unknown' && content.trim() === '/help') {
                    const helpMessage: TeamMessage = {
                        id: `help-${Date.now()}`,
                        teamId,
                        content: getCommandHelp(),
                        type: 'chat',
                        timestamp: Date.now(),
                        fromDisplayName: 'System',
                    };
                    setMessages(prev => [...prev, helpMessage]);
                    setInputText('');
                    return;
                }

                setInputText('');
                return;
            }

            // 4. 普通聊天消息
            const mentions = extractMentions(content);
            const taskIds = taskChatSync ? extractTaskIds(content) : [];
            const messageId = randomUUID();
            const messageMetadata: TeamMessage['metadata'] = taskIds.length > 0
                ? {
                    taskId: taskIds[0],
                    action: 'task_referenced'
                }
                : undefined;

            if (taskIds.length > 0 && taskChatSync) {
                const messageTimestamp = Date.now();
                const outgoingMessage: TeamMessage = {
                    id: messageId,
                    teamId,
                    content,
                    type: 'chat',
                    mentions: mentions.length > 0 ? mentions : undefined,
                    fromRole: 'user',
                    fromDisplayName: 'User',
                    timestamp: messageTimestamp,
                    metadata: messageMetadata
                };

                await taskChatSync.linkMessageToTask(
                    messageId,
                    taskIds[0],
                    myDisplayName || 'User',
                    outgoingMessage
                );
            }

            // User messages should NOT use team member's session ID
            // Leave fromSessionId undefined so Happy-CLI recognizes this as a user message
            const request: SendTeamMessageRequest = {
                id: messageId,
                teamId,
                content,
                type: 'chat',
                mentions: mentions.length > 0 ? mentions : undefined,
                fromSessionId: undefined,  // User message, not from a team member session
                fromRole: 'user',           // Always 'user' for messages from the user
                fromDisplayName: 'User',    // Can be improved to use actual user name
                metadata: messageMetadata   // 🆕 包含任务链接信息
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
                onScroll={handleScroll}
                scrollEventThrottle={100}
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
                                taskChatSync={taskChatSync}
                            />
                        );
                    })
                )}
            </ScrollView>

            {/* 🆕 滚动控制按钮 */}
            {showScrollButton && (
                <Pressable
                    onPress={handleScrollToBottom}
                    style={{
                        position: 'absolute',
                        bottom: 90,
                        right: 16,
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        backgroundColor: theme.colors.button.primary.background,
                        alignItems: 'center',
                        justifyContent: 'center',
                        shadowColor: theme.colors.shadow.color,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: theme.colors.shadow.opacity,
                        shadowRadius: 4,
                        elevation: 3,
                        zIndex: 100,
                    }}
                >
                    <Ionicons name="chevron-down" size={24} color="#FFF" />
                </Pressable>
            )}

            {uniqueMessages.length > 0 && (
                <Pressable
                    onPress={handleScrollToTop}
                    style={{
                        position: 'absolute',
                        bottom: 90,
                        left: 16,
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        backgroundColor: theme.colors.surface,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: theme.colors.divider,
                        shadowColor: theme.colors.shadow.color,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: theme.colors.shadow.opacity,
                        shadowRadius: 4,
                        elevation: 3,
                        zIndex: 100,
                    }}
                >
                    <Ionicons name="chevron-up" size={24} color={theme.colors.textSecondary} />
                </Pressable>
            )}

            <View style={styles.inputContainer}>
                <Pressable style={styles.attachButton}>
                    <Ionicons name="add" size={24} color={theme.colors.textSecondary} />
                </Pressable>

                <View style={styles.inputWrapper}>
                    <TextInput
                        style={styles.input}
                        value={inputText}
                        onChangeText={setInputText}
                        placeholder="Type a message, /task to create tasks, or /help for commands..."
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
