import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native-unistyles';

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
    count?: number;
    description?: string;
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
    sectionScroll: {
        flex: 1,
        minHeight: 0,
    },
    sectionFixed: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        gap: 4,
    },
    sectionCapped: {
        maxHeight: 220,
        paddingHorizontal: 12,
        paddingTop: 10,
        paddingBottom: 6,
        gap: 4,
    },
    emptyText: {
        fontSize: 13,
        padding: 8,
    },
    expandedArea: {
        paddingHorizontal: 8,
        paddingBottom: 6,
        gap: 4,
    },
    expandedDesc: {
        fontSize: 11,
    },
    expandedAction: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        gap: 4,
        alignSelf: 'flex-start' as const,
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 6,
    },
    expandedActionText: {
        fontSize: 11,
        fontWeight: '600' as const,
    },
    dotPressable: {
        width: 8,
        height: 8,
    },
}));

function AgentRow({
    item,
    tokens,
}: {
    item: FloatingIslandAgentItem;
    tokens: ReturnType<typeof getThreeColumnShellTokens>;
}) {
    const [expanded, setExpanded] = React.useState(false);
    const lastPressMsRef = React.useRef(0);

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

    const handleLongPress = React.useCallback(() => {
        if (item.onLongPress) {
            item.onLongPress();
        } else {
            setExpanded((prev) => !prev);
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
                    item.selected && [
                        styles.rowSelected,
                        { borderColor: tokens.panelDivider },
                    ],
                ]}
                onPress={handlePress}
                onLongPress={handleLongPress}
                delayLongPress={500}
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
                <Text
                    style={[
                        styles.rowText,
                        item.selected ? styles.rowTextSelected : null,
                        { color: item.selected ? tokens.panelTitle : '#2D4154' },
                    ]}
                >
                    {item.name}
                </Text>
                <View style={styles.rowSpacer} />
                {item.count !== undefined ? (
                    <View style={[styles.badge, { backgroundColor: '#7C95A9' }]}>
                        <Text style={[styles.badgeText, { color: '#FFFFFF' }]}>{item.count}</Text>
                    </View>
                ) : null}
            </Pressable>
            {expanded ? (
                <View style={styles.expandedArea}>
                    {item.description ? (
                        <Text style={[styles.expandedDesc, { color: '#8A9BAA' }]}>
                            {item.description}
                        </Text>
                    ) : null}
                    {item.onDoublePress ? (
                        <Pressable
                            onPress={item.onDoublePress}
                            style={[styles.expandedAction, { backgroundColor: '#E8F0F6' }]}
                        >
                            <Ionicons name="arrow-forward-circle-outline" size={13} color="#2D5A7A" />
                            <Text style={[styles.expandedActionText, { color: '#2D5A7A' }]}>
                                Go to session
                            </Text>
                        </Pressable>
                    ) : null}
                </View>
            ) : null}
        </View>
    );
}

function StatusRow({
    item,
}: {
    item: FloatingIslandStatusItem;
}) {
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
                <View style={[styles.badge, { backgroundColor: item.color + '15' }]}>
                    <Text style={[styles.badgeText, { color: item.color }]}>{item.count}</Text>
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
    agentSectionLabel = 'Agents',
    statusItems = [],
    conversationItems = [],
    conversationSectionLabel = 'Conversations',
    agentEmptyText = 'No active agents',
    conversationEmptyText = 'No conversations yet',
}: FloatingIslandSidebarProps) {
    const tokens = getThreeColumnShellTokens(variant);

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

            {/* Teams / Conversations — top section, takes all available space with scroll */}
            <View style={styles.sectionWrapper}>
                <Text style={[styles.sectionLabel, { color: '#8C9CAA' }]}>{conversationSectionLabel}</Text>
                <ScrollView style={styles.sectionScroll} showsVerticalScrollIndicator={false}>
                    {conversationItems.length > 0 ? (
                        conversationItems.map((item) => (
                            <ConversationRow key={item.id} item={item} tokens={tokens} />
                        ))
                    ) : (
                        <Text style={[styles.emptyText, { color: '#93A4B1' }]}>{conversationEmptyText}</Text>
                    )}
                </ScrollView>
            </View>

            <View style={[styles.divider, { backgroundColor: tokens.panelDivider }]} />

            {/* Status — fixed, no scroll */}
            <View style={styles.sectionFixed}>
                <Text style={[styles.sectionLabel, { color: '#8C9CAA' }]}>Status</Text>
                {statusItems.map((item) => (
                    <StatusRow key={item.id} item={item} />
                ))}
            </View>

            <View style={[styles.divider, { backgroundColor: tokens.panelDivider }]} />

            {/* Agents — fixed at bottom, capped height with scroll for overflow */}
            <View style={styles.sectionCapped}>
                <Text style={[styles.sectionLabel, { color: '#8C9CAA' }]}>{agentSectionLabel}</Text>
                <ScrollView style={styles.sectionScroll} showsVerticalScrollIndicator={false}>
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
    );
}
