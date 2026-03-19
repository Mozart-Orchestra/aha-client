import React from 'react';
import { View, FlatList } from 'react-native';
import { Text } from '@/components/ui/StyledText';
import { useAllSessions, useSessionGitStatus } from '@/sync/storage';
import { Session } from '@/sync/storageTypes';
import { Avatar } from '@/components/avatar/Avatar';
import { getSessionName, getSessionSubtitle, getSessionAvatarId } from '@/utils/sessionUtils';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native-unistyles';
import { Typography } from '@/constants/Typography';
import { layout } from '@/utils/layout';
import { useNavigateToSession } from '@/hooks/useNavigateToSession';
import { Pressable } from 'react-native';
import { t } from '@/text';
import { useRouter } from 'expo-router';

interface SessionHistoryItem {
    type: 'session' | 'date-header';
    session?: Session;
    date?: string;
}

const styles = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'stretch',
        backgroundColor: theme.colors.groupped.background,
    },
    contentContainer: {
        flex: 1,
        maxWidth: layout.maxWidth,
    },
    dateHeader: {
        backgroundColor: theme.colors.groupped.background,
        paddingTop: 20,
        paddingBottom: 8,
        paddingHorizontal: 24,
    },
    dateHeaderText: {
        ...Typography.default('semiBold'),
        color: theme.colors.groupped.sectionTitle,
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: 0.1,
    },
    sessionCard: {
        backgroundColor: theme.colors.surface,
        marginHorizontal: 16,
        marginBottom: 1,
        paddingVertical: 16,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
    },
    sessionCardFirst: {
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
    },
    sessionCardLast: {
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        marginBottom: 12,
    },
    sessionCardSingle: {
        borderRadius: 12,
        marginBottom: 12,
    },
    sessionContent: {
        flex: 1,
        marginLeft: 16,
    },
    sessionTitle: {
        fontSize: 15,
        fontWeight: '500',
        color: theme.colors.text,
        marginBottom: 2,
        ...Typography.default('semiBold'),
    },
    sessionSubtitle: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        ...Typography.default(),
    },
    sessionMeta: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 4,
        alignItems: 'center',
    },
    sessionMetaChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.groupped.background,
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    sessionMetaText: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        ...Typography.default(),
    },
    usageStatsBar: {
        marginHorizontal: 16,
        marginBottom: 8,
        paddingVertical: 10,
        paddingHorizontal: 16,
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        justifyContent: 'space-between' as const,
    },
    usageStatsText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        ...Typography.default(),
    },
    usageStatsLink: {
        fontSize: 13,
        color: theme.colors.textLink,
        ...Typography.default('semiBold'),
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    emptyText: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        ...Typography.default(),
    },
}));

function formatDateHeader(date: Date): string {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const sessionDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (sessionDate.getTime() === today.getTime()) {
        return t('sessionHistory.today');
    } else if (sessionDate.getTime() === yesterday.getTime()) {
        return t('sessionHistory.yesterday');
    } else {
        const diffTime = today.getTime() - sessionDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return t('sessionHistory.daysAgo', { count: diffDays });
    }
}

function groupSessionsByDate(sessions: Session[]): SessionHistoryItem[] {
    const sortedSessions = sessions
        .slice()
        .sort((a, b) => b.updatedAt - a.updatedAt);
    
    const items: SessionHistoryItem[] = [];
    let currentDateGroup: Session[] = [];
    let currentDateString: string | null = null;
    
    for (const session of sortedSessions) {
        const sessionDate = new Date(session.updatedAt);
        const dateString = sessionDate.toDateString();
        
        if (currentDateString !== dateString) {
            // Process previous group
            if (currentDateGroup.length > 0) {
                items.push({
                    type: 'date-header',
                    date: formatDateHeader(new Date(currentDateString!)),
                });
                currentDateGroup.forEach(sess => {
                    items.push({ type: 'session', session: sess });
                });
            }
            
            // Start new group
            currentDateString = dateString;
            currentDateGroup = [session];
        } else {
            currentDateGroup.push(session);
        }
    }
    
    // Process final group
    if (currentDateGroup.length > 0) {
        items.push({
            type: 'date-header',
            date: formatDateHeader(new Date(currentDateString!)),
        });
        currentDateGroup.forEach(sess => {
            items.push({ type: 'session', session: sess });
        });
    }
    
    return items;
}

function formatTokens(tokens: number): string {
    if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M tok`;
    if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}k tok`;
    return `${tokens} tok`;
}

function UsageStatsBar({ sessions }: { sessions: Session[] }) {
    const router = useRouter();
    const totalTokens = sessions.reduce((sum, s) => {
        const u = s.latestUsage;
        return sum + (u ? u.inputTokens + u.outputTokens : 0);
    }, 0);

    if (totalTokens === 0) return null;

    return (
        <Pressable onPress={() => router.push('/settings/usage')} style={styles.usageStatsBar}>
            <Text style={styles.usageStatsText}>
                {t('sessionHistory.totalTokensLabel', { tokens: formatTokens(totalTokens) })}
            </Text>
            <Text style={styles.usageStatsLink}>
                {t('sessionHistory.viewUsageStats')}
            </Text>
        </Pressable>
    );
}

interface SessionCardProps {
    session: Session;
    isFirst: boolean;
    isLast: boolean;
    isSingle: boolean;
}

function SessionCard({ session, isFirst, isLast, isSingle }: SessionCardProps) {
    const navigateToSession = useNavigateToSession();
    const gitStatus = useSessionGitStatus(session.id);

    const sessionName = getSessionName(session);
    const sessionSubtitle = getSessionSubtitle(session);
    const avatarId = getSessionAvatarId(session);

    const usage = session.latestUsage;
    const totalTokens = usage ? usage.inputTokens + usage.outputTokens : null;
    const linesChanged = gitStatus?.linesChanged ?? 0;
    const showMeta = (totalTokens !== null && totalTokens > 0) || linesChanged > 0;

    return (
        <Pressable
            style={[
                styles.sessionCard,
                isSingle ? styles.sessionCardSingle :
                isFirst ? styles.sessionCardFirst :
                isLast ? styles.sessionCardLast : {}
            ]}
            onPress={() => navigateToSession(session.id)}
        >
            <Avatar id={avatarId} size={48} />
            <View style={styles.sessionContent}>
                <Text style={styles.sessionTitle} numberOfLines={1}>
                    {sessionName}
                </Text>
                <Text style={styles.sessionSubtitle} numberOfLines={1}>
                    {sessionSubtitle}
                </Text>
                {showMeta && (
                    <View style={styles.sessionMeta}>
                        {totalTokens !== null && totalTokens > 0 && (
                            <View style={styles.sessionMetaChip}>
                                <Text style={styles.sessionMetaText}>{formatTokens(totalTokens)}</Text>
                            </View>
                        )}
                        {linesChanged > 0 && (
                            <View style={styles.sessionMetaChip}>
                                <Text style={styles.sessionMetaText}>±{linesChanged}</Text>
                            </View>
                        )}
                    </View>
                )}
            </View>
        </Pressable>
    );
}

export default function SessionHistory() {
    const safeArea = useSafeAreaInsets();
    const allSessions = useAllSessions();

    const groupedItems = React.useMemo(() => {
        return groupSessionsByDate(allSessions);
    }, [allSessions]);

    const renderItem = React.useCallback(({ item, index }: { item: SessionHistoryItem, index: number }) => {
        if (item.type === 'date-header') {
            return (
                <View style={styles.dateHeader}>
                    <Text style={styles.dateHeaderText}>
                        {item.date}
                    </Text>
                </View>
            );
        }

        if (item.type === 'session' && item.session) {
            const session = item.session;

            // Determine card styling based on position within date group
            const prevItem = index > 0 ? groupedItems[index - 1] : null;
            const nextItem = index < groupedItems.length - 1 ? groupedItems[index + 1] : null;

            const isFirst = prevItem?.type === 'date-header';
            const isLast = nextItem?.type === 'date-header' || nextItem == null;
            const isSingle = isFirst && isLast;

            return (
                <SessionCard
                    session={session}
                    isFirst={isFirst}
                    isLast={isLast}
                    isSingle={isSingle}
                />
            );
        }

        return null;
    }, [groupedItems]);
    
    const keyExtractor = React.useCallback((item: SessionHistoryItem, index: number) => {
        if (item.type === 'date-header') {
            return `date-${item.date}-${index}`;
        }
        if (item.type === 'session' && item.session) {
            return `session-${item.session.id}`;
        }
        return `item-${index}`;
    }, []);
    
    if (!allSessions) {
        return (
            <View style={styles.container}>
                <View style={styles.contentContainer} />
            </View>
        );
    }
    
    if (groupedItems.length === 0) {
        return (
            <View style={styles.container}>
                <View style={styles.contentContainer}>
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>
                            {t('sessionHistory.empty')}
                        </Text>
                    </View>
                </View>
            </View>
        );
    }
    
    return (
        <View style={styles.container}>
            <View style={styles.contentContainer}>
                <FlatList
                    data={groupedItems}
                    renderItem={renderItem}
                    keyExtractor={keyExtractor}
                    ListHeaderComponent={<UsageStatsBar sessions={allSessions} />}
                    contentContainerStyle={{
                        paddingBottom: safeArea.bottom + 16,
                        paddingTop: 8,
                    }}
                />
            </View>
        </View>
    );
}
