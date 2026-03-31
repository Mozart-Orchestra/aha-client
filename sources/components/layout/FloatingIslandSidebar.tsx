import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import type { DimensionValue } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { t } from '@/text';
import {
    useSession,
    useSessionGitStatus,
    useSessionMessages,
    useSessionMessageCount,
    useSessionProjectGitStatus,
    useSessionUsage,
} from '@/sync/storage';

import { Text } from '@/components/ui/StyledText';
import { useElapsedTime } from '@/hooks/useElapsedTime';
import { getModifiedFileCount } from '@/utils/sessionModifiedFiles';

import {
    getThreeColumnShellTokens,
    ThreeColumnShellVariant,
} from './ThreeColumnShell';

type IconName = keyof typeof Ionicons.glyphMap;

interface FloatingIslandHeader {
    title: string;
    subtitle: string;
    icon?: IconName;
    iconLabel?: string;
    iconForeground?: string;
    iconBackground?: string;
    iconGradientColors?: readonly [string, string];
    trailingIcon?: IconName;
}

interface FloatingIslandAgentItem {
    id: string;
    name: string;
    dotColor: string;
    selected?: boolean;
    inactive?: boolean;
    dead?: boolean;
    description?: string;
    score?: number;
    scoreCount?: number;
    activityLabel?: string;
    activityColor?: string;
    activeTaskTitle?: string;
    activeTaskStartedAt?: number;
    avatarLabel?: string;
    avatarColor?: string;
    onPress?: () => void;
    onDoublePress?: () => void;
    onLongPress?: () => void;
    onDelete?: () => void;
    onInfo?: () => void;
}

interface FloatingIslandStatusItem {
    id: string;
    icon: IconName;
    label: string;
    color: string;
    backgroundColor: string;
    count?: number;
}

interface FloatingIslandConversationItem {
    id: string;
    name: string;
    lastMessage: string;
    time: string;
    avatarColor: string;
    avatarIcon?: IconName;
    avatarLabel?: string;
    unreadCount?: number;
    selected?: boolean;
    onPress?: () => void;
}

interface FloatingIslandSidebarProps {
    variant?: ThreeColumnShellVariant;
    header: FloatingIslandHeader;
    agentItems?: FloatingIslandAgentItem[];
    agentSectionLabel?: string;
    agentHeaderAction?: () => void;
    agentHeaderActionLabel?: string;
    corpsHeaderAction?: () => void;
    corpsHeaderActionLabel?: string;
    statusItems?: FloatingIslandStatusItem[];
    conversationItems?: FloatingIslandConversationItem[];
    conversationSectionLabel?: string;
    conversationHeaderAction?: () => void;
    conversationHeaderActionLabel?: string;
    agentEmptyText?: string;
    conversationEmptyText?: string;
}

const styles = StyleSheet.create(() => ({
    container: {
        flex: 1,
        minHeight: 0,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 18,
        paddingHorizontal: 20,
    },
    headerAvatar: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    headerInfo: {
        flex: 1,
        gap: 1,
        minWidth: 0,
    },
    headerName: {
        fontSize: 14,
        fontWeight: '600',
    },
    headerRole: {
        fontSize: 11,
    },
    divider: {
        height: 1,
    },
    sectionLabel: {
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderRadius: 8,
        padding: 8,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    rowSelected: {
        borderRadius: 12,
    },
    rowDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    rowText: {
        fontSize: 13,
    },
    rowTextSelected: {
        fontWeight: '600',
    },
    rowSpacer: {
        flex: 1,
    },
    badge: {
        borderRadius: 999,
        paddingVertical: 2,
        paddingHorizontal: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    statusCountWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statusMiniBarTrack: {
        width: 34,
        height: 6,
        borderRadius: 999,
        overflow: 'hidden',
        backgroundColor: 'rgba(255, 255, 255, 0.55)',
    },
    statusMiniBarFill: {
        height: '100%',
        borderRadius: 999,
        minWidth: 6,
    },
    statusIcon: {
        width: 16,
        height: 16,
    },
    convAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    convAvatarText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    convInfo: {
        flex: 1,
        gap: 1,
        minWidth: 0,
    },
    convName: {
        fontSize: 13,
    },
    convNameSelected: {
        fontWeight: '600',
    },
    convMsg: {
        fontSize: 11,
    },
    convTime: {
        fontSize: 11,
    },
    unreadBadge: {
        width: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
    },
    unreadText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    sectionWrapper: {
        flex: 1,
        minHeight: 0,
        paddingHorizontal: 12,
        paddingTop: 10,
        paddingBottom: 6,
        gap: 4,
    },
    sectionLabelRow: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        justifyContent: 'space-between' as const,
    },
    sectionAddButton: {
        padding: 2,
    },
    sectionActionButton: {
        marginTop: 8,
        minHeight: 34,
        borderRadius: 10,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    sectionActionText: {
        fontSize: 12,
        fontWeight: '600',
    },
    actionButtonRow: {
        flexDirection: 'row',
        gap: 6,
        marginTop: 8,
    },
    prominentActionButton: {
        flex: 1,
        minHeight: 34,
        borderRadius: 10,
        backgroundColor: '#000000',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    prominentActionText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    sectionScroll: {
        flex: 1,
        minHeight: 0,
    },
    sectionFixed: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        gap: 4,
    },
    sectionExpanded: {
        flex: 1,
        minHeight: 0,
        paddingHorizontal: 12,
        paddingTop: 10,
        paddingBottom: 6,
        gap: 4,
    },
    sectionCountBadge: {
        minWidth: 24,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionCountText: {
        fontSize: 11,
        fontWeight: '700',
    },
    subsectionLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        paddingTop: 10,
        paddingBottom: 4,
    },
    subsectionDivider: {
        height: 1,
        marginHorizontal: 8,
        marginTop: 8,
        marginBottom: 2,
    },
    emptyText: {
        fontSize: 13,
        padding: 8,
    },
    dotPressable: {
        width: 8,
        height: 8,
    },
    monitoringSection: {
        flex: 2,
        minHeight: 0,
    },
    workspaceSection: {
        flex: 1,
        minHeight: 0,
        paddingHorizontal: 12,
        paddingTop: 10,
        paddingBottom: 6,
        gap: 4,
    },
    agentRow: {
        alignItems: 'flex-start',
        paddingVertical: 10,
    },
    agentRowInactive: {
        opacity: 0.5,
    },
    agentRowDead: {
        opacity: 0.28,
    },
    agentBody: {
        flex: 1,
        minWidth: 0,
        gap: 6,
    },
    agentHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    agentName: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
    },
    agentMetaWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    agentMetaChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
    },
    agentMetaText: {
        fontSize: 11,
        fontWeight: '500',
    },
    agentTaskChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
    },
    agentTaskText: {
        flex: 1,
        fontSize: 11,
        fontWeight: '600',
    },
    agentTaskElapsed: {
        fontSize: 10,
        fontWeight: '700',
    },
    agentContextChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
    },
    agentContextTrack: {
        width: 34,
        height: 5,
        borderRadius: 999,
        overflow: 'hidden',
    },
    agentContextFill: {
        height: '100%',
        borderRadius: 999,
        minWidth: 5,
    },
    agentScoreBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
    },
    agentScoreText: {
        fontSize: 11,
        fontWeight: '700',
    },
    agentAvatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    agentAvatarText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    agentActionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    agentActionButton: {
        padding: 4,
        borderRadius: 6,
    },
}));

function formatCompactNumber(value: number): string {
    if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
        return value >= 10000 ? `${Math.round(value / 1000)}K` : `${(value / 1000).toFixed(1)}K`;
    }
    return String(value);
}

function getScoreColor(score: number): string {
    if (score >= 85) {
        return '#22c55e';
    }
    if (score >= 70) {
        return '#f59e0b';
    }
    return '#ef4444';
}

function getBarPercent(count: number, maxCount: number, minPercent: number = 18): DimensionValue {
    if (count <= 0 || maxCount <= 0) {
        return '0%';
    }

    return `${Math.min(100, Math.max(minPercent, Math.round((count / maxCount) * 100)))}%`;
}

const MAX_CONTEXT_WINDOW_TOKENS = 200000;

function getContextUtilization(inputTokens: number | undefined | null): { percent: number; width: DimensionValue; color: string } | null {
    if (!inputTokens || inputTokens <= 0 || !Number.isFinite(inputTokens)) {
        return null;
    }

    const ratio = Math.max(0, Math.min(1, inputTokens / MAX_CONTEXT_WINDOW_TOKENS));
    const percent = Math.round(ratio * 100);
    const color = percent >= 85 ? '#EF4444' : percent >= 70 ? '#F59E0B' : '#22C55E';

    return {
        percent,
        width: `${Math.max(2, Math.round(ratio * 100))}%`,
        color,
    };
}

function formatElapsedCompact(elapsedSeconds: number): string {
    if (elapsedSeconds >= 3600) {
        const hours = Math.floor(elapsedSeconds / 3600);
        const minutes = Math.floor((elapsedSeconds % 3600) / 60);
        return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }

    if (elapsedSeconds >= 60) {
        const minutes = Math.floor(elapsedSeconds / 60);
        const seconds = elapsedSeconds % 60;
        return seconds > 0 && minutes < 10 ? `${minutes}m ${seconds}s` : `${minutes}m`;
    }

    return `${elapsedSeconds}s`;
}

function areAgentRowPropsEqual(
    previous: {
        item: FloatingIslandAgentItem;
        tokens: ReturnType<typeof getThreeColumnShellTokens>;
    },
    next: {
        item: FloatingIslandAgentItem;
        tokens: ReturnType<typeof getThreeColumnShellTokens>;
    }
): boolean {
    return (
        previous.tokens.panelDivider === next.tokens.panelDivider
        && previous.tokens.panelTitle === next.tokens.panelTitle
        && previous.item.id === next.item.id
        && previous.item.name === next.item.name
        && previous.item.dotColor === next.item.dotColor
        && previous.item.selected === next.item.selected
        && previous.item.inactive === next.item.inactive
        && previous.item.dead === next.item.dead
        && previous.item.description === next.item.description
        && previous.item.score === next.item.score
        && previous.item.scoreCount === next.item.scoreCount
        && previous.item.activityLabel === next.item.activityLabel
        && previous.item.activityColor === next.item.activityColor
        && previous.item.activeTaskTitle === next.item.activeTaskTitle
        && previous.item.activeTaskStartedAt === next.item.activeTaskStartedAt
        && previous.item.avatarLabel === next.item.avatarLabel
        && previous.item.avatarColor === next.item.avatarColor
        && previous.item.onDelete === next.item.onDelete
        && previous.item.onInfo === next.item.onInfo
    );
}

const AgentRow = React.memo(function AgentRow({
    item,
    tokens,
}: {
    item: FloatingIslandAgentItem;
    tokens: ReturnType<typeof getThreeColumnShellTokens>;
}) {
    const { theme } = useUnistyles();
    const session = useSession(item.id);
    const latestUsage = useSessionUsage(item.id) ?? session?.latestUsage ?? null;
    const { messages: sessionMessages, isLoaded: sessionMessagesLoaded } = useSessionMessages(item.id);
    const { count: messageCount, isLoaded: messagesLoaded } = useSessionMessageCount(item.id);
    const projectGitStatus = useSessionProjectGitStatus(item.id);
    const sessionGitStatus = useSessionGitStatus(item.id);
    const gitStatus = projectGitStatus || sessionGitStatus;
    const lastPressMsRef = React.useRef(0);

    const contextSize = latestUsage?.contextSize ?? 0;
    const totalTokens = latestUsage
        ? latestUsage.inputTokens + latestUsage.outputTokens + latestUsage.cacheCreation + latestUsage.cacheRead
        : 0;
    const hasValidTotalTokens = Number.isFinite(totalTokens) && totalTokens > 0;
    const modifiedFileCount = React.useMemo(() => getModifiedFileCount(sessionMessages), [sessionMessages]);
    const contextUtilization = getContextUtilization(latestUsage?.contextSize ?? latestUsage?.inputTokens);
    const hasGitStats = !!gitStatus && gitStatus.lastUpdatedAt > 0;
    const lineChangeText = hasGitStats ? `${formatCompactNumber(gitStatus.linesChanged)} Δ` : null;
    const scoreColor = item.score !== undefined ? getScoreColor(item.score) : null;
    const activeTaskElapsed = useElapsedTime(item.activeTaskStartedAt);

    const handlePress = React.useCallback(() => {
        const now = Date.now();
        if (now - lastPressMsRef.current < 300 && item.onDoublePress) {
            lastPressMsRef.current = 0;
            item.onDoublePress();
        } else {
            lastPressMsRef.current = now;
            item.onPress?.();
        }
    }, [item]);

    const handleDotPress = React.useCallback(() => {
        (item.onDoublePress ?? item.onPress)?.();
    }, [item]);

    return (
        <View>
            <Pressable
                disabled={!item.onPress && !item.onDoublePress}
                style={[
                    styles.row,
                    styles.agentRow,
                    item.inactive ? styles.agentRowInactive : null,
                    item.dead ? styles.agentRowDead : null,
                    item.selected && [
                        styles.rowSelected,
                        { borderColor: tokens.panelDivider },
                    ],
                ]}
                onPress={handlePress}
                onLongPress={item.onLongPress}
            >
                {item.selected ? (
                    <LinearGradient
                        colors={[tokens.cardMutedBackground, tokens.cardBackground]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={[
                            StyleSheet.absoluteFillObject as never,
                            { borderRadius: 12 },
                        ]}
                    />
                ) : null}
                {item.avatarLabel ? (
                    <View style={[styles.agentAvatar, { backgroundColor: item.avatarColor || item.dotColor }]}>
                        <Text style={styles.agentAvatarText}>
                            {item.avatarLabel.slice(0, 1).toUpperCase()}
                        </Text>
                    </View>
                ) : (
                    <Pressable
                        onPress={handleDotPress}
                        hitSlop={10}
                        style={styles.dotPressable}
                    >
                        <View style={[styles.rowDot, { backgroundColor: item.dotColor }]} />
                    </Pressable>
                )}
                <View style={styles.agentBody}>
                    <View style={styles.agentHeaderRow}>
                        <Text
                            numberOfLines={1}
                            style={[
                                styles.agentName,
                                item.selected ? styles.rowTextSelected : null,
                                { color: item.selected ? tokens.panelTitle : theme.colors.text },
                            ]}
                        >
                            {item.name}
                        </Text>
                        {item.score !== undefined && scoreColor ? (
                            <View style={[styles.agentScoreBadge, { backgroundColor: scoreColor + '16' }]}>
                                <Ionicons name="people" size={11} color={scoreColor} />
                                <Text style={[styles.agentScoreText, { color: scoreColor }]}>
                                    {t('agents.crowd')} {Math.round(item.score)}
                                    {item.scoreCount ? ` · ${item.scoreCount}` : ''}
                                </Text>
                            </View>
                        ) : null}
                        <View style={styles.agentActionRow}>
                            {item.onInfo ? (
                                <Pressable
                                    onPress={item.onInfo}
                                    hitSlop={6}
                                    style={styles.agentActionButton}
                                >
                                    <Ionicons name="information-circle-outline" size={16} color={theme.colors.textSecondary} />
                                </Pressable>
                            ) : null}
                            {item.onDelete ? (
                                <Pressable
                                    onPress={item.onDelete}
                                    hitSlop={6}
                                    style={styles.agentActionButton}
                                >
                                    <Ionicons name="trash-outline" size={14} color={theme.colors.textSecondary} />
                                </Pressable>
                            ) : null}
                        </View>
                    </View>
                    {item.activeTaskTitle ? (
                        <View style={[styles.agentTaskChip, { backgroundColor: '#FFF4E5' }]}>
                            <Ionicons name="play-circle-outline" size={12} color="#C26A00" />
                            <Text numberOfLines={1} style={[styles.agentTaskText, { color: '#7A4A10' }]}>
                                {item.activeTaskTitle}
                            </Text>
                            <Text style={[styles.agentTaskElapsed, { color: '#C26A00' }]}>
                                {formatElapsedCompact(activeTaskElapsed)}
                            </Text>
                        </View>
                    ) : null}
                    <View style={styles.agentMetaWrap}>
                        {item.description ? (
                            <View style={[styles.agentMetaChip, { backgroundColor: theme.colors.surfaceHigh }]}>
                                <Ionicons name="sparkles-outline" size={11} color={theme.colors.textSecondary} />
                                <Text style={[styles.agentMetaText, { color: theme.colors.textSecondary }]}>
                                    {item.description}
                                </Text>
                            </View>
                        ) : null}
                        {item.inactive ? (
                            <View style={[styles.agentMetaChip, { backgroundColor: tokens.chipBackground }]}>
                                <Ionicons name="pause-circle-outline" size={11} color="#8A9BAA" />
                                <Text style={[styles.agentMetaText, { color: tokens.panelTextSecondary }]}>
                                    {t('status.offline')}
                                </Text>
                            </View>
                        ) : null}
                        {messagesLoaded ? (
                            <View style={[styles.agentMetaChip, { backgroundColor: theme.colors.surfaceHigh }]}>
                                <Ionicons name="chatbubble-ellipses-outline" size={11} color={theme.colors.textSecondary} />
                                <Text style={[styles.agentMetaText, { color: theme.colors.textSecondary }]}>
                                    {formatCompactNumber(messageCount)} msg
                                </Text>
                            </View>
                        ) : null}
                        {hasValidTotalTokens ? (
                            <View style={[styles.agentMetaChip, { backgroundColor: theme.colors.surfaceHigh }]}>
                                <Ionicons name="flash-outline" size={11} color={theme.colors.textSecondary} />
                                <Text style={[styles.agentMetaText, { color: theme.colors.textSecondary }]}>
                                    {formatCompactNumber(totalTokens)} tok
                                </Text>
                            </View>
                        ) : null}
                        {item.activityLabel ? (
                            <View
                                style={[
                                    styles.agentMetaChip,
                                    { backgroundColor: (item.activityColor || theme.colors.textSecondary) + '14' },
                                ]}
                            >
                                <Ionicons
                                    name="pulse-outline"
                                    size={11}
                                    color={item.activityColor || theme.colors.textSecondary}
                                />
                                <Text
                                    style={[
                                        styles.agentMetaText,
                                        { color: item.activityColor || theme.colors.textSecondary },
                                    ]}
                                >
                                    {item.activityLabel}
                                </Text>
                            </View>
                        ) : null}
                        {sessionMessagesLoaded && modifiedFileCount > 0 ? (
                            <View style={[styles.agentMetaChip, { backgroundColor: theme.colors.surfaceHigh }]}>
                                <Ionicons name="document-text-outline" size={11} color={theme.colors.textSecondary} />
                                <Text style={[styles.agentMetaText, { color: theme.colors.textSecondary }]}>
                                    {formatCompactNumber(modifiedFileCount)} {t('common.files').toLowerCase()}
                                </Text>
                            </View>
                        ) : null}
                        {latestUsage ? (
                            <View style={[styles.agentMetaChip, { backgroundColor: theme.colors.surfaceHigh }]}>
                                <Ionicons name="flash-outline" size={11} color={theme.colors.textSecondary} />
                                <Text style={[styles.agentMetaText, { color: theme.colors.textSecondary }]}>
                                    {formatCompactNumber(contextSize)} ctx
                                </Text>
                            </View>
                        ) : null}
                        {contextUtilization ? (
                            <View style={[styles.agentContextChip, { backgroundColor: theme.colors.surfaceHigh }]}>
                                <Ionicons name="speedometer-outline" size={11} color={contextUtilization.color} />
                                <View style={[styles.agentContextTrack, { backgroundColor: contextUtilization.color + '20' }]}>
                                    <View
                                        style={[
                                            styles.agentContextFill,
                                            {
                                                width: contextUtilization.width,
                                                backgroundColor: contextUtilization.color,
                                            },
                                        ]}
                                    />
                                </View>
                                <Text style={[styles.agentMetaText, { color: contextUtilization.color }]}>
                                    {contextUtilization.percent}%
                                </Text>
                            </View>
                        ) : null}
                        {lineChangeText ? (
                            <View style={[styles.agentMetaChip, { backgroundColor: theme.colors.surfaceHigh }]}>
                                <Ionicons name="git-branch-outline" size={11} color={theme.colors.textSecondary} />
                                <Text style={[styles.agentMetaText, { color: theme.colors.textSecondary }]}>
                                    {lineChangeText}
                                </Text>
                            </View>
                        ) : null}
                    </View>
                </View>
            </Pressable>
        </View>
    );
}, areAgentRowPropsEqual);

function StatusRow({
    item,
    maxCount,
}: {
    item: FloatingIslandStatusItem;
    maxCount: number;
}) {
    const { theme } = useUnistyles();
    const barWidth = item.count !== undefined ? getBarPercent(item.count, maxCount) : '0%';

    return (
        <View
            style={[
                styles.row,
                { backgroundColor: item.backgroundColor, borderRadius: 10 },
            ]}
        >
            <Ionicons name={item.icon} size={16} color={item.color} />
            <Text style={[styles.rowText, { color: theme.colors.text }]}>{item.label}</Text>
            <View style={styles.rowSpacer} />
            {item.count !== undefined ? (
                <View style={styles.statusCountWrap}>
                    <View style={styles.statusMiniBarTrack}>
                        <View
                            style={[
                                styles.statusMiniBarFill,
                                {
                                    backgroundColor: item.color,
                                    width: barWidth,
                                },
                            ]}
                        />
                    </View>
                    <View style={[styles.badge, { backgroundColor: item.color + '15' }]}>
                        <Text style={[styles.badgeText, { color: item.color }]}>{item.count}</Text>
                    </View>
                </View>
            ) : null}
        </View>
    );
}

function areConversationRowPropsEqual(
    previous: {
        item: FloatingIslandConversationItem;
        tokens: ReturnType<typeof getThreeColumnShellTokens>;
    },
    next: {
        item: FloatingIslandConversationItem;
        tokens: ReturnType<typeof getThreeColumnShellTokens>;
    }
): boolean {
    return (
        previous.tokens.panelDivider === next.tokens.panelDivider
        && previous.tokens.panelTitle === next.tokens.panelTitle
        && previous.item.id === next.item.id
        && previous.item.name === next.item.name
        && previous.item.lastMessage === next.item.lastMessage
        && previous.item.time === next.item.time
        && previous.item.avatarColor === next.item.avatarColor
        && previous.item.avatarIcon === next.item.avatarIcon
        && previous.item.avatarLabel === next.item.avatarLabel
        && previous.item.unreadCount === next.item.unreadCount
        && previous.item.selected === next.item.selected
    );
}

const ConversationRow = React.memo(function ConversationRow({
    item,
    tokens,
}: {
    item: FloatingIslandConversationItem;
    tokens: ReturnType<typeof getThreeColumnShellTokens>;
}) {
    return (
        <Pressable
            disabled={!item.onPress}
            style={[
                styles.row,
                item.selected && [
                    styles.rowSelected,
                    { borderColor: tokens.panelDivider },
                ],
            ]}
            onPress={item.onPress}
        >
            {item.selected ? (
                <LinearGradient
                    colors={[tokens.cardMutedBackground, tokens.cardBackground]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={[
                        StyleSheet.absoluteFillObject as never,
                        { borderRadius: 12 },
                    ]}
                />
            ) : null}
            <View style={[styles.convAvatar, { backgroundColor: item.avatarColor }]}>
                {item.avatarIcon ? (
                    <Ionicons name={item.avatarIcon} size={14} color="#FFFFFF" />
                ) : (
                    <Text style={styles.convAvatarText}>
                        {(item.avatarLabel || item.name || '?').slice(0, 1).toUpperCase()}
                    </Text>
                )}
            </View>
            <View style={styles.convInfo}>
                <Text
                    numberOfLines={1}
                    style={[
                        styles.convName,
                        item.selected ? styles.convNameSelected : null,
                        { color: item.selected ? tokens.panelTitle : tokens.panelTitle },
                    ]}
                >
                    {item.name}
                </Text>
                <Text
                    numberOfLines={1}
                    style={[
                        styles.convMsg,
                        { color: tokens.panelTextSecondary },
                    ]}
                >
                    {item.lastMessage}
                </Text>
            </View>
            <Text style={[styles.convTime, { color: tokens.panelTextSecondary }]}>{item.time}</Text>
            {item.unreadCount ? (
                <View style={[styles.unreadBadge, { backgroundColor: tokens.panelTextSecondary }]}>
                    <Text style={styles.unreadText}>{item.unreadCount}</Text>
                </View>
            ) : null}
        </Pressable>
    );
}, areConversationRowPropsEqual);

export function FloatingIslandSidebar({
    variant = 'default',
    header,
    agentItems = [],
    agentSectionLabel = t('sidebar.agents'),
    agentHeaderAction,
    agentHeaderActionLabel,
    corpsHeaderAction,
    corpsHeaderActionLabel,
    statusItems = [],
    conversationItems = [],
    conversationSectionLabel = t('sidebar.conversations'),
    conversationHeaderAction,
    conversationHeaderActionLabel,
    agentEmptyText = t('sidebar.noActiveAgents'),
    conversationEmptyText = t('sidebar.noConversationsYet'),
}: FloatingIslandSidebarProps) {
    const { theme } = useUnistyles();
    const tokens = getThreeColumnShellTokens(variant, theme);
    const maxStatusCount = React.useMemo(
        () => statusItems.reduce((max, item) => Math.max(max, item.count ?? 0), 0),
        [statusItems]
    );
    const { activeAgentItems, offlineAgentItems, deadAgentItems } = React.useMemo(() => {
        const active: FloatingIslandAgentItem[] = [];
        const offline: FloatingIslandAgentItem[] = [];
        const dead: FloatingIslandAgentItem[] = [];

        agentItems.forEach((item) => {
            if (item.dead) {
                dead.push(item);
            } else if (item.inactive) {
                offline.push(item);
            } else {
                active.push(item);
            }
        });

        return {
            activeAgentItems: active,
            offlineAgentItems: offline,
            deadAgentItems: dead,
        };
    }, [agentItems]);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                {header.iconGradientColors ? (
                    <LinearGradient
                        colors={header.iconGradientColors as [string, string]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={[styles.headerAvatar, { borderColor: tokens.panelDivider }]}
                    >
                        {header.iconLabel ? (
                            <Text style={[styles.convAvatarText, { color: header.iconForeground || '#FFFFFF' }]}>
                                {header.iconLabel}
                            </Text>
                        ) : (
                            <Ionicons
                                name={header.icon || 'person'}
                                size={16}
                                color={header.iconForeground || '#FFFFFF'}
                            />
                        )}
                    </LinearGradient>
                ) : (
                    <View
                        style={[
                            styles.headerAvatar,
                            {
                                backgroundColor: header.iconBackground || tokens.avatarBackground,
                                borderColor: tokens.panelDivider,
                            },
                        ]}
                    >
                        {header.iconLabel ? (
                            <Text style={[styles.convAvatarText, { color: header.iconForeground || '#FFFFFF' }]}>
                                {header.iconLabel}
                            </Text>
                        ) : (
                            <Ionicons
                                name={header.icon || 'person'}
                                size={16}
                                color={header.iconForeground || '#FFFFFF'}
                            />
                        )}
                    </View>
                )}
                <View style={styles.headerInfo}>
                    <Text numberOfLines={1} style={[styles.headerName, { color: tokens.panelTitle }]}>
                        {header.title}
                    </Text>
                    <Text numberOfLines={1} style={[styles.headerRole, { color: tokens.panelTextSecondary }]}>
                        {header.subtitle}
                    </Text>
                </View>
                {header.trailingIcon ? (
                    <Ionicons name={header.trailingIcon} size={14} color={tokens.panelTextSecondary} />
                ) : null}
            </View>

            <View style={[styles.divider, { backgroundColor: tokens.panelDivider }]} />

            {/* Teams section (above agents) */}
            <View style={styles.workspaceSection}>
                <View style={styles.sectionLabelRow}>
                    <Text style={[styles.sectionLabel, { color: tokens.panelEyebrow }]}>{conversationSectionLabel}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={[styles.sectionCountBadge, { backgroundColor: tokens.chipBackground }]}>
                            <Text style={[styles.sectionCountText, { color: tokens.panelTitle }]}>
                                {conversationItems.length}
                            </Text>
                        </View>
                        {conversationHeaderAction ? (
                            <Pressable onPress={conversationHeaderAction} hitSlop={8} style={styles.sectionAddButton}>
                                <Ionicons name="add" size={16} color={tokens.panelEyebrow} />
                            </Pressable>
                        ) : null}
                    </View>
                </View>
                {conversationHeaderAction && conversationHeaderActionLabel ? (
                    <View style={styles.actionButtonRow}>
                        <Pressable
                            onPress={conversationHeaderAction}
                            style={styles.prominentActionButton}
                        >
                            <Ionicons name="add" size={14} color="#FFFFFF" />
                            <Text style={styles.prominentActionText}>
                                {conversationHeaderActionLabel}
                            </Text>
                        </Pressable>
                    </View>
                ) : null}
                <ScrollView style={styles.sectionScroll} showsVerticalScrollIndicator={true}>
                    {conversationItems.length > 0 ? (
                        conversationItems.map((item) => (
                            <ConversationRow key={item.id} item={item} tokens={tokens} />
                        ))
                    ) : (
                        <Text style={[styles.emptyText, { color: tokens.panelTextSecondary }]}>{conversationEmptyText}</Text>
                    )}
                </ScrollView>
            </View>

            <View style={[styles.divider, { backgroundColor: tokens.panelDivider }]} />

            {/* Agents section (below teams) */}
            <View style={styles.monitoringSection}>
                <View style={styles.sectionExpanded}>
                    <View style={styles.sectionLabelRow}>
                        <Text style={[styles.sectionLabel, { color: tokens.panelEyebrow }]}>{agentSectionLabel}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <View style={[styles.sectionCountBadge, { backgroundColor: tokens.chipBackground }]}>
                                <Text style={[styles.sectionCountText, { color: tokens.panelTitle }]}>
                                    {agentItems.length}
                                </Text>
                            </View>
                            {agentHeaderAction ? (
                                <Pressable onPress={agentHeaderAction} hitSlop={8} style={styles.sectionAddButton}>
                                    <Ionicons name="add" size={16} color={tokens.panelEyebrow} />
                                </Pressable>
                            ) : null}
                        </View>
                    </View>
                    <View style={styles.actionButtonRow}>
                        {agentHeaderAction && agentHeaderActionLabel ? (
                            <Pressable
                                onPress={agentHeaderAction}
                                style={styles.prominentActionButton}
                            >
                                <Ionicons name="add" size={14} color="#FFFFFF" />
                                <Text style={styles.prominentActionText}>
                                    {agentHeaderActionLabel}
                                </Text>
                            </Pressable>
                        ) : null}
                        {corpsHeaderAction && corpsHeaderActionLabel ? (
                            <Pressable
                                onPress={corpsHeaderAction}
                                style={styles.prominentActionButton}
                            >
                                <Ionicons name="add" size={14} color="#FFFFFF" />
                                <Text style={styles.prominentActionText}>
                                    {corpsHeaderActionLabel}
                                </Text>
                            </Pressable>
                        ) : null}
                    </View>
                    <ScrollView style={styles.sectionScroll} showsVerticalScrollIndicator={true}>
                        {agentItems.length > 0 ? (
                            <>
                                {activeAgentItems.length > 0 ? (
                                    <>
                                        {activeAgentItems.map((item) => (
                                            <AgentRow key={item.id} item={item} tokens={tokens} />
                                        ))}
                                    </>
                                ) : null}
                                {(offlineAgentItems.length > 0 || deadAgentItems.length > 0) ? (
                                    <>
                                        {activeAgentItems.length > 0 ? (
                                            <View style={[styles.subsectionDivider, { backgroundColor: tokens.panelDivider }]} />
                                        ) : null}
                                        {offlineAgentItems.length > 0 ? (
                                            <>
                                                <View style={styles.subsectionLabelRow}>
                                                    <Text style={[styles.sectionLabel, { color: tokens.panelEyebrow }]}>
                                                        {t('status.offline')}
                                                    </Text>
                                                    <View style={[styles.sectionCountBadge, { backgroundColor: tokens.chipBackground }]}>
                                                        <Text style={[styles.sectionCountText, { color: tokens.panelTextSecondary }]}>
                                                            {offlineAgentItems.length}
                                                        </Text>
                                                    </View>
                                                </View>
                                                {offlineAgentItems.map((item) => (
                                                    <AgentRow key={item.id} item={item} tokens={tokens} />
                                                ))}
                                            </>
                                        ) : null}
                                        {deadAgentItems.length > 0 ? (
                                            <>
                                                {offlineAgentItems.length > 0 ? (
                                                    <View style={[styles.subsectionDivider, { backgroundColor: tokens.panelDivider }]} />
                                                ) : null}
                                                <View style={styles.subsectionLabelRow}>
                                                    <Text style={[styles.sectionLabel, { color: tokens.panelEyebrow }]}>
                                                        {t('status.ended')}
                                                    </Text>
                                                    <View style={[styles.sectionCountBadge, { backgroundColor: tokens.chipBackground }]}>
                                                        <Text style={[styles.sectionCountText, { color: tokens.panelTextSecondary }]}>
                                                            {deadAgentItems.length}
                                                        </Text>
                                                    </View>
                                                </View>
                                                {deadAgentItems.map((item) => (
                                                    <AgentRow key={item.id} item={item} tokens={tokens} />
                                                ))}
                                            </>
                                        ) : null}
                                    </>
                                ) : null}
                            </>
                        ) : (
                            <Text style={[styles.emptyText, { color: tokens.panelTextSecondary }]}>{agentEmptyText}</Text>
                        )}
                    </ScrollView>
                </View>
            </View>
        </View>
    );
}
