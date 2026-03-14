import * as React from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native-unistyles';

import { Avatar } from '@/components/avatar/Avatar';
import { EmptyMainScreen } from '@/components/layout/EmptyMainScreen';
import { StatusDot } from '@/components/ui/StatusDot';
import { Text } from '@/components/ui/StyledText';
import { useVisibleSessionListViewData } from '@/hooks/useVisibleSessionListViewData';
import { useNavigateToSession } from '@/hooks/useNavigateToSession';
import { SessionListViewItem } from '@/sync/storage';
import type { Session } from '@/sync/storageTypes';
import {
    getSessionAvatarId,
    getSessionName,
    getSessionSubtitle,
    useSessionStatus,
} from '@/utils/sessionUtils';
import { getThreeColumnShellTokens, ThreeColumnShellVariant } from './ThreeColumnShell';

const styles = StyleSheet.create(() => ({
    container: {
        flex: 1,
        minHeight: 0,
    },
    header: {
        paddingHorizontal: 18,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    leading: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    info: {
        flex: 1,
        minWidth: 0,
    },
    eyebrow: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.7,
        marginBottom: 6,
    },
    title: {
        fontSize: 17,
        fontWeight: '700',
    },
    subtitle: {
        fontSize: 12,
        marginTop: 4,
    },
    action: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
    },
    actionText: {
        fontSize: 13,
        fontWeight: '600',
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 10,
    },
    chip: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
    },
    chipText: {
        fontSize: 11,
        fontWeight: '600',
    },
    body: {
        flex: 1,
        minHeight: 0,
    },
    scroll: {
        flex: 1,
        minHeight: 0,
    },
    scrollContent: {
        padding: 18,
        paddingBottom: 24,
    },
    sectionLabel: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        marginBottom: 10,
        marginTop: 4,
    },
    projectGroup: {
        borderRadius: 14,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 10,
    },
    projectTitle: {
        fontSize: 13,
        fontWeight: '700',
    },
    projectMeta: {
        fontSize: 11,
        marginTop: 4,
    },
    sessionCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        borderRadius: 18,
        borderWidth: 1,
        padding: 14,
        marginBottom: 10,
        shadowColor: '#7A8C9B',
        shadowOffset: { width: 0, height: 7 },
        shadowOpacity: 0.07,
        shadowRadius: 16,
        elevation: 2,
    },
    sessionContent: {
        flex: 1,
        minWidth: 0,
    },
    sessionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    sessionTitle: {
        flex: 1,
        fontSize: 14,
        fontWeight: '700',
    },
    sessionSubtitle: {
        fontSize: 12,
        lineHeight: 18,
    },
    sessionStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 10,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        alignSelf: 'flex-start',
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '700',
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
}));

function SessionPreviewCard({
    session,
    variant,
    onPress,
}: {
    session: Session;
    variant: ThreeColumnShellVariant;
    onPress: (sessionId: string) => void;
}) {
    const tokens = getThreeColumnShellTokens(variant);
    const sessionStatus = useSessionStatus(session);
    const sessionName = getSessionName(session);
    const sessionSubtitle = getSessionSubtitle(session);
    const avatarId = React.useMemo(() => getSessionAvatarId(session), [session]);

    return (
        <Pressable
            style={[
                styles.sessionCard,
                {
                    backgroundColor: sessionStatus.isConnected ? tokens.cardBackground : tokens.cardMutedBackground,
                    borderColor: tokens.cardBorder,
                },
            ]}
            onPress={() => onPress(session.id)}
        >
            <Avatar
                id={avatarId}
                size={42}
                monochrome={!sessionStatus.isConnected}
                flavor={session.metadata?.flavor}
            />
            <View style={styles.sessionContent}>
                <View style={styles.sessionTitleRow}>
                    <Text style={[styles.sessionTitle, { color: tokens.panelTitle }]} numberOfLines={1}>
                        {sessionName}
                    </Text>
                    {session.active ? (
                        <View style={[styles.badge, { backgroundColor: '#ECF3F7' }]}>
                            <Text style={[styles.badgeText, { color: tokens.chipText }]}>Live</Text>
                        </View>
                    ) : null}
                </View>
                <Text style={[styles.sessionSubtitle, { color: tokens.panelTextSecondary }]} numberOfLines={2}>
                    {sessionSubtitle}
                </Text>
                <View style={styles.sessionStatusRow}>
                    <StatusDot
                        color={sessionStatus.statusDotColor}
                        isPulsing={sessionStatus.isPulsing}
                        size={7}
                    />
                    <Text style={[styles.statusText, { color: sessionStatus.statusColor }]} numberOfLines={1}>
                        {sessionStatus.statusText}
                    </Text>
                </View>
            </View>
        </Pressable>
    );
}

function renderListItem(
    item: SessionListViewItem,
    index: number,
    variant: ThreeColumnShellVariant,
    navigateToSession: (sessionId: string) => void,
) {
    const tokens = getThreeColumnShellTokens(variant);

    if (item.type === 'header') {
        return (
            <Text key={`header-${item.title}-${index}`} style={[styles.sectionLabel, { color: tokens.panelEyebrow }]}>
                {item.title}
            </Text>
        );
    }

    if (item.type === 'active-sessions') {
        return (
            <View key={`active-${index}`}>
                <Text style={[styles.sectionLabel, { color: tokens.panelEyebrow }]}>Active Sessions</Text>
                {item.sessions.map((session) => (
                    <SessionPreviewCard
                        key={`active-${session.id}`}
                        session={session}
                        variant={variant}
                        onPress={navigateToSession}
                    />
                ))}
            </View>
        );
    }

    if (item.type === 'project-group') {
        const machineName = item.machine.metadata?.displayName
            || item.machine.metadata?.host
            || item.machine.id;

        return (
            <View
                key={`project-${item.machine.id}-${item.displayPath}-${index}`}
                style={[
                    styles.projectGroup,
                    {
                        backgroundColor: 'rgba(235,243,247,0.72)',
                        borderColor: tokens.panelDivider,
                    },
                ]}
            >
                <Text style={[styles.projectTitle, { color: tokens.panelTitle }]}>
                    {item.displayPath || 'Workspace'}
                </Text>
                <Text style={[styles.projectMeta, { color: tokens.panelTextSecondary }]}>
                    {machineName}
                </Text>
            </View>
        );
    }

    return (
        <SessionPreviewCard
            key={`session-${item.session.id}`}
            session={item.session}
            variant={variant}
            onPress={navigateToSession}
        />
    );
}

interface SidebarSessionsPanelProps {
    variant?: ThreeColumnShellVariant;
}

export const SidebarSessionsPanel = React.memo(({ variant = 'default' }: SidebarSessionsPanelProps) => {
    const tokens = getThreeColumnShellTokens(variant);
    const router = useRouter();
    const navigateToSession = useNavigateToSession();
    const sessionListData = useVisibleSessionListViewData();

    const sessionSummary = React.useMemo(() => {
        const visibleIds = new Set<string>();
        const activeIds = new Set<string>();

        for (const item of sessionListData ?? []) {
            if (item.type === 'session') {
                visibleIds.add(item.session.id);
                if (item.session.active) {
                    activeIds.add(item.session.id);
                }
            }

            if (item.type === 'active-sessions') {
                item.sessions.forEach((session) => {
                    visibleIds.add(session.id);
                    if (session.active) {
                        activeIds.add(session.id);
                    }
                });
            }
        }

        return {
            active: activeIds.size,
            total: visibleIds.size,
        };
    }, [sessionListData]);

    return (
        <View style={styles.container}>
            <View style={[styles.header, { borderBottomColor: tokens.panelDivider }]}>
                <View style={styles.headerRow}>
                    <View
                        style={[
                            styles.leading,
                            {
                                backgroundColor: tokens.strongIconBackground,
                                borderColor: tokens.panelBorder,
                            },
                        ]}
                    >
                        <Ionicons name="hardware-chip-outline" size={16} color={tokens.strongIconForeground} />
                    </View>
                    <View style={styles.info}>
                        <Text style={[styles.eyebrow, { color: tokens.panelEyebrow }]}>Agents</Text>
                        <Text style={[styles.title, { color: tokens.panelTitle }]}>Sessions</Text>
                        <Text style={[styles.subtitle, { color: tokens.panelTextSecondary }]}>
                            Active agents and visible workspaces.
                        </Text>
                    </View>
                    <Pressable
                        style={[
                            styles.action,
                            {
                                backgroundColor: tokens.actionBackground,
                                borderColor: tokens.actionBorder,
                            },
                        ]}
                        onPress={() => router.push('/new')}
                    >
                        <Text style={[styles.actionText, { color: tokens.actionText }]}>New Session</Text>
                    </Pressable>
                </View>
                <View style={styles.chipRow}>
                    <View
                        style={[
                            styles.chip,
                            {
                                backgroundColor: tokens.chipBackground,
                                borderColor: tokens.chipBorder,
                            },
                        ]}
                    >
                        <Text style={[styles.chipText, { color: tokens.chipText }]}>
                            {sessionSummary.active} active
                        </Text>
                    </View>
                    <View
                        style={[
                            styles.chip,
                            {
                                backgroundColor: tokens.chipBackground,
                                borderColor: tokens.chipBorder,
                            },
                        ]}
                    >
                        <Text style={[styles.chipText, { color: tokens.chipText }]}>
                            {sessionSummary.total} visible
                        </Text>
                    </View>
                </View>
            </View>

            <View style={styles.body}>
                {sessionListData === null ? (
                    <View style={styles.emptyState}>
                        <ActivityIndicator size="small" color={tokens.actionText} />
                        <Text style={{ color: tokens.panelTextSecondary, marginTop: 14 }}>
                            Loading agents...
                        </Text>
                    </View>
                ) : sessionSummary.total === 0 ? (
                    <View style={styles.emptyState}>
                        <EmptyMainScreen />
                    </View>
                ) : (
                    <ScrollView
                        style={styles.scroll}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {sessionListData.map((item, index) => renderListItem(item, index, variant, navigateToSession))}
                    </ScrollView>
                )}
            </View>
        </View>
    );
});
