import React from 'react';
import { View, ScrollView, TextInput, Pressable, KeyboardAvoidingView, Platform, Image, ActivityIndicator, Modal as RNModal, Dimensions } from 'react-native';
import { Text } from '@/components/StyledText';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
  type TaskCommandResult,
  type ParsedCommand
} from '@/utils/teamCommandParser';
import { useTaskChatSync } from '@/hooks/useTaskChatSync';
import type { KanbanTask } from '@/sync/kanbanTypes';
import { parseTaskCommand, createTaskFromCommand } from '@/utils/taskHelpers';
import { extractTaskIds } from '@/utils/taskChatSync';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Modal } from '@/modal';

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
        borderWidth: 2,
        borderColor: theme.colors.divider,
        marginRight: 8,
        marginBottom: 4, // Align with bubble bottom
        shadowColor: theme.colors.shadow.color || '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: theme.colors.shadow.opacity || 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    myAvatarContainer: {
        marginRight: 0,
        marginLeft: 8,
        backgroundColor: theme.colors.button.primary.background,
        borderColor: theme.colors.button.primary.background,
    },
    // 🆕 Online status indicator
    onlineIndicator: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: theme.colors.success || '#10B981',
        borderWidth: 2,
        borderColor: theme.colors.surface,
        shadowColor: theme.colors.shadow.color || '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
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
        shadowColor: theme.colors.shadow.color || '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: theme.colors.shadow.opacity || 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    myMessageBubble: {
        backgroundColor: theme.colors.button.primary.background,
        borderRadius: 18,
        borderBottomRightRadius: 4,
        borderBottomLeftRadius: 18, // Reset
        shadowColor: theme.colors.button.primary.background,
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 3,
    },
    senderName: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        marginBottom: 4,
        marginLeft: 48, // Align with bubble (updated for larger avatar)
    },
    mySenderName: {
        alignSelf: 'flex-end',
        marginRight: 48,
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
    copiedIndicator: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        fontWeight: '600',
        marginTop: 6,
        marginLeft: 8,
    },
    myCopiedIndicator: {
        color: 'rgba(255,255,255,0.9)',
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
        shadowColor: theme.colors.shadow.color || '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: theme.colors.shadow.opacity || 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    inputWrapper: {
        flex: 1,
        backgroundColor: theme.colors.groupped.background,
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 8,
        maxHeight: 120,
        borderWidth: 2,
        borderColor: theme.colors.divider,
        shadowColor: theme.colors.shadow.color || '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    // 🆕 Focused input state
    inputWrapperFocused: {
        borderColor: theme.colors.button.primary.background,
        shadowColor: theme.colors.button.primary.background,
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    input: {
        fontSize: 15,
        color: theme.colors.text,
        minHeight: 24,
        paddingTop: 0, // Fix alignment on Android
        paddingBottom: 0,
    } as any,
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 2, // Align with input bottom
        shadowColor: theme.colors.shadow.color || '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: theme.colors.shadow.opacity || 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    sendButtonDisabled: {
        opacity: 0.5,
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
    // 🆕 Vertical container for image and history buttons
    verticalButtonContainer: {
        flexDirection: 'column',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 4,
        marginBottom: 2,
    },
    // 🆕 Smaller buttons for vertical layout
    attachButtonSmall: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
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
    // 🆕 历史消息选择器样式
    historyContainer: {
        backgroundColor: theme.colors.surface,
        borderTopWidth: 1,
        borderTopColor: theme.colors.divider,
        maxHeight: 200,
    },
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.divider,
    },
    historyTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    historyList: {
        maxHeight: 150,
    },
    historyItem: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.divider,
    },
    historyItemPressed: {
        backgroundColor: theme.colors.groupped.background,
    },
    historyItemText: {
        fontSize: 14,
        color: theme.colors.text,
        lineHeight: 20,
    },
    // 🆕 Image message styles
    imageContainer: {
        borderRadius: 12,
        overflow: 'hidden',
        marginVertical: 4,
    },
    messageImage: {
        width: 200,
        height: 200,
        borderRadius: 12,
    },
    imageLoading: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.groupped.background,
        borderRadius: 12,
    },
    // 🆕 Image preview container
    imagePreviewContainer: {
        backgroundColor: theme.colors.surface,
        borderTopWidth: 1,
        borderTopColor: theme.colors.divider,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    imagePreview: {
        width: 60,
        height: 60,
        borderRadius: 8,
    },
    imagePreviewInfo: {
        flex: 1,
    },
    imagePreviewText: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.colors.text,
    },
    imagePreviewSize: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    removeImageButton: {
        padding: 8,
    },
    uploadProgress: {
        height: 3,
        backgroundColor: theme.colors.divider,
        borderRadius: 2,
        marginTop: 6,
        overflow: 'hidden',
    },
    uploadProgressBar: {
        height: '100%',
        backgroundColor: theme.colors.button.primary.background,
        borderRadius: 2,
    },
    // 🆕 Clipboard paste prompt styles
    clipboardPrompt: {
        backgroundColor: theme.colors.surface,
        borderTopWidth: 1,
        borderTopColor: theme.colors.divider,
        paddingHorizontal: 16,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    clipboardPromptContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    clipboardPromptIcon: {
        marginRight: 10,
    },
    clipboardPromptText: {
        fontSize: 14,
        color: theme.colors.text,
        flex: 1,
    },
    clipboardPasteButton: {
        backgroundColor: theme.colors.button.primary.background,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 16,
        marginLeft: 12,
    },
    clipboardPasteButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    clipboardDismissButton: {
        padding: 6,
        marginLeft: 8,
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
    const [copied, setCopied] = React.useState(false);
    const [imageLoading, setImageLoading] = React.useState(true);
    const [showFullImage, setShowFullImage] = React.useState(false);

    // 🆕 Get image from metadata
    const imageData = message.metadata?.image as {
        base64?: string;
        width?: number;
        height?: number;
        mimeType?: string;
    } | undefined;

    // 🆕 复制消息内容
    const handleCopyMessage = React.useCallback(async () => {
        try {
            await Clipboard.setStringAsync(message.content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy message:', error);
        }
    }, [message.content]);

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

    // Get short text for collapsed view
    const getShortText = React.useCallback(() => {
        if (message.shortContent) return message.shortContent;
        return message.content.substring(0, MAX_LENGTH) + '...';
    }, [message.shortContent, message.content]);

    const renderContent = () => {
        // 🆕 Render image if present
        const renderImage = () => {
            if (!imageData?.base64) return null;

            const aspectRatio = (imageData.width && imageData.height)
                ? imageData.width / imageData.height
                : 1;
            const displayWidth = Math.min(200, imageData.width || 200);
            const displayHeight = displayWidth / aspectRatio;

            return (
                <Pressable
                    onPress={() => setShowFullImage(true)}
                    style={styles.imageContainer}
                >
                    <Image
                        source={{ uri: `data:${imageData.mimeType || 'image/jpeg'};base64,${imageData.base64}` }}
                        style={[styles.messageImage, { width: displayWidth, height: displayHeight }]}
                        resizeMode="cover"
                        onLoadStart={() => setImageLoading(true)}
                        onLoadEnd={() => setImageLoading(false)}
                    />
                    {imageLoading && (
                        <View style={[styles.imageLoading, { width: displayWidth, height: displayHeight }]}>
                            <ActivityIndicator size="small" />
                        </View>
                    )}
                </Pressable>
            );
        };

        if (!shouldShowExpand || expanded) {
            // Show full content
            return (
                <View style={isMyMessage ? { opacity: 0.95 } : {}}>
                    {renderImage()}
                    {message.content !== '📷 Image' && (
                        <MarkdownView markdown={message.content} textColor={isMyMessage ? '#FFFFFF' : undefined} />
                    )}
                </View>
            );
        } else {
            // Show short content with Markdown support
            const shortText = getShortText();
            return (
                <View style={isMyMessage ? { opacity: 0.95 } : {}}>
                    {renderImage()}
                    {message.content !== '📷 Image' && (
                        <MarkdownView markdown={shortText} textColor={isMyMessage ? '#FFFFFF' : undefined} />
                    )}
                </View>
            );
        }
    };

    // 🆕 Check if user is online (placeholder - needs real implementation)
    const isOnline = message.fromSessionId ? Math.random() > 0.5 : false;

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
                    {/* 🆕 Online status indicator */}
                    {!isMyMessage && isOnline && (
                        <View style={styles.onlineIndicator} />
                    )}
                </Pressable>

                <View style={styles.messageBubbleContainer}>
                    <Pressable
                        style={[styles.messageBubble, isMyMessage && styles.myMessageBubble]}
                        onPress={() => shouldShowExpand && setExpanded(!expanded)}
                        onLongPress={handleCopyMessage}
                        delayLongPress={500}
                    >
                        {renderContent()}

                        {shouldShowExpand && (
                            <Text style={[styles.expandText, isMyMessage && styles.myExpandText]}>
                                {expanded ? 'Show Less' : 'Show More'}
                            </Text>
                        )}

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={[styles.messageTime, isMyMessage && styles.myMessageTime]}>
                                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                            {copied && (
                                <Text style={[styles.copiedIndicator, isMyMessage && styles.myCopiedIndicator]}>
                                    Copied
                                </Text>
                            )}
                        </View>
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

            {/* 🆕 Full-screen image viewer modal */}
            {imageData?.base64 && (
                <RNModal
                    visible={showFullImage}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowFullImage(false)}
                >
                    <Pressable
                        style={{
                            flex: 1,
                            backgroundColor: 'rgba(0,0,0,0.9)',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                        onPress={() => setShowFullImage(false)}
                    >
                        <Image
                            source={{ uri: `data:${imageData.mimeType || 'image/jpeg'};base64,${imageData.base64}` }}
                            style={{
                                width: Dimensions.get('window').width - 32,
                                height: Dimensions.get('window').height * 0.7,
                            }}
                            resizeMode="contain"
                        />
                        <Pressable
                            style={{
                                position: 'absolute',
                                top: 60,
                                right: 20,
                                padding: 8,
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                borderRadius: 20,
                            }}
                            onPress={() => setShowFullImage(false)}
                        >
                            <Ionicons name="close" size={24} color="#FFF" />
                        </Pressable>
                    </Pressable>
                </RNModal>
            )}
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
    const isNearBottomRef = React.useRef(true);  // Track if user is near bottom for auto-scroll
    const router = useRouter();

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
    const [isInputFocused, setIsInputFocused] = React.useState(false);
    const [showHistory, setShowHistory] = React.useState(false);
    // 🆕 Image selection state
    const [selectedImage, setSelectedImage] = React.useState<{
        uri: string;
        base64?: string;
        width: number;
        height: number;
        fileSize?: number;
    } | null>(null);
    const [uploadProgress, setUploadProgress] = React.useState(0);
    const [isCompressing, setIsCompressing] = React.useState(false);
    // 🆕 Clipboard image detection state
    const [clipboardHasImage, setClipboardHasImage] = React.useState(false);
    const [isCheckingClipboard, setIsCheckingClipboard] = React.useState(false);

    // 🆕 获取我发送过的消息历史（用于历史选取）
    // FIX: User messages have fromSessionId=undefined and fromRole='user'
    // We need to match both: session messages AND user messages from mobile app
    const myMessageHistory = React.useMemo(() => {
        return messages
            .filter(m =>
                m.type === 'chat' &&
                m.content.trim().length > 0 &&
                (
                    // Match messages from my session (if I'm an agent)
                    m.fromSessionId === mySessionId ||
                    // Match user messages from mobile app (fromSessionId is undefined, fromRole is 'user')
                    (!m.fromSessionId && m.fromRole === 'user')
                )
            )
            .map(m => m.content)
            .filter((content, index, arr) => arr.indexOf(content) === index) // 去重
            .slice(-20) // 最近20条
            .reverse(); // 最新的在前
    }, [messages, mySessionId]);

    // 🆕 Image picker and compression function
    const handlePickImage = React.useCallback(async () => {
        try {
            // Request permission
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Modal.alert('Permission Required', 'Please grant photo library access to send images.');
                return;
            }

            // Launch image picker
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: 'images',
                allowsEditing: true,
                quality: 1,
                base64: false, // We'll get base64 after compression
            });

            if (result.canceled || !result.assets?.[0]) {
                return;
            }

            const asset = result.assets[0];
            setIsCompressing(true);

            // Compress image with aggressive settings for mobile/WebSocket
            const MAX_WIDTH = 800;
            const MAX_SIZE_KB = 150; // Max 150KB to ensure fast transmission
            let quality = 0.6;

            // Calculate new dimensions maintaining aspect ratio
            let width = asset.width;
            let height = asset.height;
            if (width > MAX_WIDTH) {
                height = Math.round((height * MAX_WIDTH) / width);
                width = MAX_WIDTH;
            }

            let manipulatorResult = await ImageManipulator.manipulateAsync(
                asset.uri,
                [{ resize: { width, height } }],
                {
                    compress: quality,
                    format: ImageManipulator.SaveFormat.JPEG,
                    base64: true,
                }
            );

            // Check size and compress further if needed
            let estimatedSize = manipulatorResult.base64
                ? Math.round((manipulatorResult.base64.length * 3) / 4)
                : 0;

            // If still too large, compress more aggressively
            while (estimatedSize > MAX_SIZE_KB * 1024 && quality > 0.3) {
                quality -= 0.1;
                width = Math.round(width * 0.8);
                height = Math.round(height * 0.8);

                manipulatorResult = await ImageManipulator.manipulateAsync(
                    asset.uri,
                    [{ resize: { width, height } }],
                    {
                        compress: quality,
                        format: ImageManipulator.SaveFormat.JPEG,
                        base64: true,
                    }
                );

                estimatedSize = manipulatorResult.base64
                    ? Math.round((manipulatorResult.base64.length * 3) / 4)
                    : 0;
            }

            setSelectedImage({
                uri: manipulatorResult.uri,
                base64: manipulatorResult.base64,
                width: manipulatorResult.width,
                height: manipulatorResult.height,
                fileSize: estimatedSize,
            });
        } catch (error) {
            console.error('Failed to pick/compress image:', error);
            Modal.alert('Error', 'Failed to process image. Please try again.');
        } finally {
            setIsCompressing(false);
        }
    }, []);

    // 🆕 Check clipboard for images (called on input focus)
    const checkClipboardForImage = React.useCallback(async () => {
        if (selectedImage || isCheckingClipboard) return; // Don't check if already have image selected

        try {
            setIsCheckingClipboard(true);
            const hasImage = await Clipboard.hasImageAsync();
            setClipboardHasImage(hasImage);
        } catch (error) {
            console.error('Failed to check clipboard:', error);
            setClipboardHasImage(false);
        } finally {
            setIsCheckingClipboard(false);
        }
    }, [selectedImage, isCheckingClipboard]);

    // 🆕 Paste image from clipboard (direct use without ImageManipulator - iOS doesn't support data URI)
    const handlePasteFromClipboard = React.useCallback(async () => {
        try {
            setIsCompressing(true);
            setClipboardHasImage(false);

            // Request JPEG format for smaller size
            const image = await Clipboard.getImageAsync({ format: 'jpeg' });
            if (!image || !image.data) {
                Modal.alert('No Image', 'No image found in clipboard.');
                return;
            }

            // Get dimensions from image size if available
            const width = image.size?.width || 800;
            const height = image.size?.height || 600;

            // Estimate file size (base64 is ~33% larger than binary)
            const estimatedSize = Math.round((image.data.length * 3) / 4);

            // Check if image is too large (> 500KB)
            const MAX_SIZE_KB = 500;
            if (estimatedSize > MAX_SIZE_KB * 1024) {
                Modal.alert(
                    'Image Too Large',
                    `The clipboard image is ${Math.round(estimatedSize / 1024)}KB. Please use the image picker button to select and compress the image.`
                );
                return;
            }

            setSelectedImage({
                uri: `data:image/jpeg;base64,${image.data}`,
                base64: image.data,
                width,
                height,
                fileSize: estimatedSize,
            });
        } catch (error) {
            console.error('Failed to paste image from clipboard:', error);
            Modal.alert('Error', 'Failed to paste image. Please try again.');
        } finally {
            setIsCompressing(false);
        }
    }, []);

    // 🆕 Format file size for display
    const formatFileSize = React.useCallback((bytes?: number) => {
        if (!bytes) return 'Unknown size';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

    const handleSend = async () => {
        const content = inputText.trim();
        const hasImage = !!selectedImage?.base64;

        // Allow sending if there's text or an image
        if ((!content && !hasImage) || isSending) return;

        try {
            setIsSending(true);

            // 🆕 Handle image message
            if (hasImage && selectedImage) {
                setUploadProgress(0);

                // Simulate upload progress (real implementation would track actual upload)
                const progressInterval = setInterval(() => {
                    setUploadProgress(prev => Math.min(prev + 10, 90));
                }, 100);

                const messageId = randomUUID();
                const imageContent = content || '📷 Image';

                // Send message with image data
                const request: SendTeamMessageRequest = {
                    id: messageId,
                    teamId,
                    content: imageContent,
                    type: 'chat',
                    fromSessionId: undefined,
                    fromRole: 'user',
                    fromDisplayName: 'User',
                    metadata: {
                        image: {
                            base64: selectedImage.base64,
                            width: selectedImage.width,
                            height: selectedImage.height,
                            mimeType: 'image/jpeg',
                        },
                    },
                };

                await sync.sendTeamMessage(request);

                clearInterval(progressInterval);
                setUploadProgress(100);

                // Clear states
                setTimeout(() => {
                    setSelectedImage(null);
                    setUploadProgress(0);
                    setInputText('');
                }, 200);

                return;
            }

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
                                field: 'status',
                                oldValue: null,
                                newValue: 'created'
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
                                    field: 'assigneeId',
                                    oldValue: null,
                                    newValue: newTask.assigneeId
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
                // Track user scroll position to determine if near bottom
                onScroll={(event) => {
                    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
                    const paddingToBottom = 100;  // Threshold for "near bottom"
                    isNearBottomRef.current = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
                }}
                scrollEventThrottle={16}
                // Only auto-scroll when user is near bottom (respecting user intent)
                onContentSizeChange={() => {
                    if (isNearBottomRef.current) {
                        scrollViewRef.current?.scrollToEnd({ animated: true });
                    }
                }}
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

            {/* 🆕 历史消息选择器 */}
            {showHistory && myMessageHistory.length > 0 && (
                <View style={styles.historyContainer}>
                    <View style={styles.historyHeader}>
                        <Text style={styles.historyTitle}>Recent Messages</Text>
                        <Pressable onPress={() => setShowHistory(false)} hitSlop={8}>
                            <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
                        </Pressable>
                    </View>
                    <ScrollView
                        style={styles.historyList}
                        showsVerticalScrollIndicator={true}
                        keyboardShouldPersistTaps="handled"
                    >
                        {myMessageHistory.map((content, index) => (
                            <Pressable
                                key={index}
                                style={({ pressed }) => [
                                    styles.historyItem,
                                    pressed && styles.historyItemPressed
                                ]}
                                onPress={() => {
                                    setInputText(content);
                                    setShowHistory(false);
                                }}
                            >
                                <Text style={styles.historyItemText} numberOfLines={2}>
                                    {content}
                                </Text>
                            </Pressable>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* 🆕 Image preview before sending */}
            {selectedImage && (
                <View style={styles.imagePreviewContainer}>
                    <Image
                        source={{ uri: selectedImage.uri }}
                        style={styles.imagePreview}
                        resizeMode="cover"
                    />
                    <View style={styles.imagePreviewInfo}>
                        <Text style={styles.imagePreviewText}>
                            {selectedImage.width} × {selectedImage.height}
                        </Text>
                        <Text style={styles.imagePreviewSize}>
                            {formatFileSize(selectedImage.fileSize)}
                        </Text>
                        {uploadProgress > 0 && uploadProgress < 100 && (
                            <View style={styles.uploadProgress}>
                                <View style={[styles.uploadProgressBar, { width: `${uploadProgress}%` }]} />
                            </View>
                        )}
                    </View>
                    <Pressable
                        style={styles.removeImageButton}
                        onPress={() => setSelectedImage(null)}
                        disabled={isSending}
                    >
                        <Ionicons
                            name="close-circle"
                            size={24}
                            color={isSending ? theme.colors.textSecondary + '50' : theme.colors.textSecondary}
                        />
                    </Pressable>
                </View>
            )}

            {/* 🆕 Compressing indicator */}
            {isCompressing && (
                <View style={[styles.imagePreviewContainer, { justifyContent: 'center' }]}>
                    <ActivityIndicator size="small" color={theme.colors.button.primary.background} />
                    <Text style={[styles.imagePreviewText, { marginLeft: 12 }]}>
                        Compressing image...
                    </Text>
                </View>
            )}

            {/* 🆕 Clipboard paste prompt - shows when clipboard has image */}
            {clipboardHasImage && !selectedImage && !isCompressing && (
                <View style={styles.clipboardPrompt}>
                    <View style={styles.clipboardPromptContent}>
                        <Ionicons
                            name="clipboard-outline"
                            size={20}
                            color={theme.colors.button.primary.background}
                            style={styles.clipboardPromptIcon}
                        />
                        <Text style={styles.clipboardPromptText}>
                            Image detected in clipboard
                        </Text>
                    </View>
                    <Pressable
                        style={({ pressed }) => [
                            styles.clipboardPasteButton,
                            pressed && { opacity: 0.8 }
                        ]}
                        onPress={handlePasteFromClipboard}
                    >
                        <Text style={styles.clipboardPasteButtonText}>Paste</Text>
                    </Pressable>
                    <Pressable
                        style={styles.clipboardDismissButton}
                        onPress={() => setClipboardHasImage(false)}
                        hitSlop={8}
                    >
                        <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
                    </Pressable>
                </View>
            )}

            <View style={styles.inputContainer}>
                {/* 🆕 Vertical button container for image and history buttons */}
                <View style={styles.verticalButtonContainer}>
                    {/* Image picker button */}
                    <Pressable
                        style={({ pressed }) => [
                            styles.attachButtonSmall,
                            pressed && { opacity: 0.6 }
                        ]}
                        onPress={handlePickImage}
                        disabled={isSending || isCompressing}
                        hitSlop={8}
                    >
                        <Ionicons
                            name="image-outline"
                            size={20}
                            color={(isSending || isCompressing) ? theme.colors.textSecondary + '50' : theme.colors.textSecondary}
                        />
                    </Pressable>

                    {/* 历史消息按钮 */}
                    <Pressable
                        style={({ pressed }) => [
                            styles.attachButtonSmall,
                            pressed && { opacity: 0.6 }
                        ]}
                        onPress={() => setShowHistory(!showHistory)}
                        disabled={myMessageHistory.length === 0}
                        hitSlop={8}
                    >
                        <Ionicons
                            name={showHistory ? "time" : "time-outline"}
                            size={20}
                            color={myMessageHistory.length === 0 ? theme.colors.textSecondary + '50' : theme.colors.textSecondary}
                        />
                    </Pressable>
                </View>

                <View style={[styles.inputWrapper, isInputFocused && styles.inputWrapperFocused]}>
                    <TextInput
                        style={styles.input}
                        value={inputText}
                        onChangeText={setInputText}
                        placeholder={selectedImage ? "Add a caption (optional)..." : "Type a message, /task to create tasks, or /help for commands..."}
                        placeholderTextColor={theme.colors.input.placeholder}
                        multiline
                        maxLength={2000}
                        editable={!isSending}
                        onFocus={() => {
                            setIsInputFocused(true);
                            // 🆕 Check clipboard for images on focus
                            checkClipboardForImage();
                        }}
                        onBlur={() => {
                            setIsInputFocused(false);
                            // 🆕 Hide clipboard prompt on blur (with delay to allow tap)
                            setTimeout(() => setClipboardHasImage(false), 200);
                        }}
                    />
                </View>

                <Pressable
                    style={[
                        styles.sendButton,
                        ((!inputText.trim() && !selectedImage) || isSending) && styles.sendButtonDisabled
                    ]}
                    onPress={handleSend}
                    disabled={(!inputText.trim() && !selectedImage) || isSending}
                >
                    {((!inputText.trim() && !selectedImage) || isSending) ? (
                        <Ionicons name="arrow-up" size={20} color={theme.colors.textSecondary} />
                    ) : (
                        <LinearGradient
                            colors={[theme.colors.button.primary.background, theme.colors.button.primary.background]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={{
                                width: 44,
                                height: 44,
                                borderRadius: 22,
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Ionicons name="arrow-up" size={20} color="#FFF" />
                        </LinearGradient>
                    )}
                </Pressable>
            </View>
        </KeyboardAvoidingView>
    );
}
