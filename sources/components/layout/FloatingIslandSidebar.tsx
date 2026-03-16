import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { t } from '@/text';
import {
    useSession,
    useSessionGitStatus,
    useSessionMessageCount,
    useSessionProjectGitStatus,
    useSessionUsage,
} from '@/sync/storage';

import { Text } from '@/components/ui/StyledText';

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
    description?: string;
    score?: number;
    scoreCount?: number;
    onPress?: () => void;
    onDoublePress?: () => void;
    onLongPress?: () => void;
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
    statusItems?: FloatingIslandStatusItem[];
    conversationItems?: FloatingIslandConversationItem[];
    conversationSectionLabel?: string;
    conversationHeaderAction?: () => void;
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

function getBarPercent(count: number, maxCount: number, minPercent: number = 18): string {
    if (count <= 0 || maxCount <= 0) {
        return '0%';
    }

    return `${Math.min(100, Math.max(minPercent, Math.round((count / maxCount) * 100)))}%`;
}

function AgentRow({
    item,
    tokens,
}: {
    item: FloatingIslandAgentItem;
    tokens: ReturnType<typeof getThreeColumnShellTokens>;
}) {
    const { theme } = useUnistyles();
    const session = useSession(item.id);
    const latestUsage = useSessionUsage(item.id) ?? session?.latestUsage ?? null;
    const { count: messageCount, isLoaded: messagesLoaded } = useSessionMessageCount(item.id);
    const projectGitStatus = useSessionProjectGitStatus(item.id);
    const sessionGitStatus = useSessionGitStatus(item.id);
    const gitStatus = projectGitStatus || sessionGitStatus;
    const lastPressMsRef = React.useRef(0);

    const contextSize = latestUsage?.contextSize ?? 0;
    const hasGitStats = !!gitStatus && gitStatus.lastUpdatedAt > 0;
    const lineChangeText = hasGitStats ? `${formatCompactNumber(gitStatus.linesChanged)} Δ` : null;
    const scoreColor = item.score !== undefined ? getScoreColor(item.score) : null;

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
                        colors={['#F8FCFD', '#EEF5F8']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={[
                            StyleSheet.absoluteFillObject as never,
                            { borderRadius: 12 },
                        ]}
                    />
                ) : null}
                <Pressable
                    onPress={handleDotPress}
                    hitSlop={10}
                    style={styles.dotPressable}
                >
                    <View style={[styles.rowDot, { backgroundColor: item.dotColor }]} />
                </Pressable>
                <View style={styles.agentBody}>
                    <View style={styles.agentHeaderRow}>
                        <Text
                            numberOfLines={1}
                            style={[
                                styles.agentName,
                                item.selected ? styles.rowTextSelected : null,
                                { color: item.selected ? tokens.panelTitle : '#2D4154' },
                            ]}
                        >
                            {item.name}
                        </Text>
                        {item.score !== undefined && scoreColor ? (
                            <View style={[styles.agentScoreBadge, { backgroundColor: scoreColor + '16' }]}>
                                <Ionicons name="star" size={11} color={scoreColor} />
                                <Text style={[styles.agentScoreText, { color: scoreColor }]}>
                                    {Math.round(item.score)}
                                    {item.scoreCount ? ` · ${item.scoreCount}` : ''}
                                </Text>
                            </View>
                        ) : null}
                    </View>
                    <View style={styles.agentMetaWrap}>
                        {item.description ? (
                            <View style={[styles.agentMetaChip, { backgroundColor: '#EAF1F5' }]}>
                                <Ionicons name="sparkles-outline" size={11} color="#516575" />
                                <Text style={[styles.agentMetaText, { color: '#516575' }]}>
                                    {item.description}
                                </Text>
                            </View>
                        ) : null}
                        {item.inactive ? (
                            <View style={[styles.agentMetaChip, { backgroundColor: '#F2F4F6' }]}>
                                <Ionicons name="pause-circle-outline" size={11} color="#8A9BAA" />
                                <Text style={[styles.agentMetaText, { color: '#8A9BAA' }]}>
                                    offline
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
                        {latestUsage ? (
                            <View style={[styles.agentMetaChip, { backgroundColor: theme.colors.surfaceHigh }]}>
                                <Ionicons name="flash-outline" size={11} color={theme.colors.textSecondary} />
                                <Text style={[styles.agentMetaText, { color: theme.colors.textSecondary }]}>
                                    {formatCompactNumber(contextSize)} ctx
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
}

function StatusRow({
    item,
    maxCount,
}: {
    item: FloatingIslandStatusItem;
    maxCount: number;
}) {
    const barWidth = item.count !== undefined ? getBarPercent(item.count, maxCount) : '0%';

    return (
        <View
            style={[
                styles.row,
                { backgroundColor: item.backgroundColor, borderRadius: 10 },
            ]}
        >
            <Ionicons name={item.icon} size={16} color={item.color} />
            <Text style={[styles.rowText, { color: '#1A1209' }]}>{item.label}</Text>
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

function ConversationRow({
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
                    colors={['#F8FCFD', '#EEF5F8']}
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
                        { color: item.selected ? tokens.panelTitle : '#1A1209' },
                    ]}
                >
                    {item.name}
                </Text>
                <Text
                    numberOfLines={1}
                    style={[
                        styles.convMsg,
                        { color: item.selected ? '#93A4B1' : '#8A7F74' },
                    ]}
                >
                    {item.lastMessage}
                </Text>
            </View>
            <Text style={[styles.convTime, { color: '#9AA8B4' }]}>{item.time}</Text>
            {item.unreadCount ? (
                <View style={[styles.unreadBadge, { backgroundColor: '#7C95A9' }]}>
                    <Text style={styles.unreadText}>{item.unreadCount}</Text>
                </View>
            ) : null}
        </Pressable>
    );
}

export function FloatingIslandSidebar({
    variant = 'default',
    header,
    agentItems = [],
    agentSectionLabel = t('sidebar.agents'),
    statusItems = [],
    conversationItems = [],
    conversationSectionLabel = t('sidebar.conversations'),
    conversationHeaderAction,
    agentEmptyText = t('sidebar.noActiveAgents'),
    conversationEmptyText = t('sidebar.noConversationsYet'),
}: FloatingIslandSidebarProps) {
    const tokens = getThreeColumnShellTokens(variant);
    const maxStatusCount = React.useMemo(
        () => statusItems.reduce((max, item) => Math.max(max, item.count ?? 0), 0),
        [statusItems]
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                {header.iconGradientColors ? (
                    <LinearGradient
                        colors={header.iconGradientColors as [string, string]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={[styles.headerAvatar, { borderColor: '#DCE7EE' }]}
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
                                borderColor: '#DCE7EE',
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
                    <Text numberOfLines={1} style={[styles.headerRole, { color: '#93A4B1' }]}>
                        {header.subtitle}
                    </Text>
                </View>
                {header.trailingIcon ? (
                    <Ionicons name={header.trailingIcon} size={14} color="#8A7F74" />
                ) : null}
            </View>

            <View style={[styles.divider, { backgroundColor: tokens.panelDivider }]} />

            <View style={styles.monitoringSection}>
                <View style={styles.sectionFixed}>
                    <View style={styles.sectionLabelRow}>
                        <Text style={[styles.sectionLabel, { color: '#8C9CAA' }]}>Status</Text>
                        {statusItems.reduce((sum, item) => sum + (item.count || 0), 0) > 0 ? (
                            <View style={[styles.sectionCountBadge, { backgroundColor: '#EEF5F8' }]}>
                                <Text style={[styles.sectionCountText, { color: tokens.panelTitle }]}>
                                    {statusItems.reduce((sum, item) => sum + (item.count || 0), 0)}
                                </Text>
                            </View>
                        ) : null}
                    </View>
                    {statusItems.map((item) => (
                        <StatusRow key={item.id} item={item} maxCount={maxStatusCount} />
                    ))}
                </View>

                <View style={[styles.divider, { backgroundColor: tokens.panelDivider }]} />

                <View style={styles.sectionExpanded}>
                    <View style={styles.sectionLabelRow}>
                        <Text style={[styles.sectionLabel, { color: '#8C9CAA' }]}>{agentSectionLabel}</Text>
                        <View style={[styles.sectionCountBadge, { backgroundColor: '#EEF5F8' }]}>
                            <Text style={[styles.sectionCountText, { color: tokens.panelTitle }]}>
                                {agentItems.length}
                            </Text>
                        </View>
                    </View>
                    <ScrollView style={styles.sectionScroll} showsVerticalScrollIndicator={true}>
                        {agentItems.length > 0 ? (
                            agentItems.map((item) => (
                                <AgentRow key={item.id} item={item} tokens={tokens} />
                            ))
                        ) : (
                            <Text style={[styles.emptyText, { color: '#93A4B1' }]}>{agentEmptyText}</Text>
                        )}
                    </ScrollView>
                </View>
            </View>

            <View style={[styles.divider, { backgroundColor: tokens.panelDivider }]} />

            <View style={styles.workspaceSection}>
                <View style={styles.sectionLabelRow}>
                    <Text style={[styles.sectionLabel, { color: '#8C9CAA' }]}>{conversationSectionLabel}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={[styles.sectionCountBadge, { backgroundColor: '#EEF5F8' }]}>
                            <Text style={[styles.sectionCountText, { color: tokens.panelTitle }]}>
                                {conversationItems.length}
                            </Text>
                        </View>
                        {conversationHeaderAction ? (
                            <Pressable onPress={conversationHeaderAction} hitSlop={8} style={styles.sectionAddButton}>
                                <Ionicons name="add" size={16} color="#8C9CAA" />
                            </Pressable>
                        ) : null}
                    </View>
                </View>
                <ScrollView style={styles.sectionScroll} showsVerticalScrollIndicator={true}>
                    {conversationItems.length > 0 ? (
                        conversationItems.map((item) => (
                            <ConversationRow key={item.id} item={item} tokens={tokens} />
                        ))
                    ) : (
                        <Text style={[styles.emptyText, { color: '#93A4B1' }]}>{conversationEmptyText}</Text>
                    )}
                </ScrollView>
            </View>
        </View>
    );
}
