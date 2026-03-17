import * as React from 'react';
import {
    View,
    Text,
    Pressable,
    ScrollView,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Image } from 'expo-image';

import { useArtifacts, useAllSessions, useIsDataReady } from '@/sync/storage';
import { sync } from '@/sync/sync';
import type { KanbanTask } from '@/sync/kanbanTypes';
import type { Session } from '@/sync/storageTypes';
import { UsageBar } from '@/components/usage/UsageBar';
import { t } from '@/text';
import { Typography } from '@/constants/Typography';
import { getSessionName } from '@/utils/sessionUtils';

function useIsExperiencedUser(): boolean {
    const artifacts = useArtifacts();
    const sessions = useAllSessions();
    const hasTeam = artifacts.some(a => a.type === 'team');
    const hasSession = sessions.length > 0;
    return hasTeam || hasSession;
}

interface ActionCardProps {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle: string;
    onPress: () => void;
    accent?: boolean;
}

function ActionCard({ icon, title, subtitle, onPress, accent = false }: ActionCardProps) {
    const styles = stylesheet;
    const { theme } = useUnistyles();

    return (
        <Pressable
            style={({ pressed }) => [
                styles.card,
                accent && styles.cardAccent,
                pressed && styles.cardPressed,
            ]}
            onPress={onPress}
        >
            <View style={[styles.cardIconWrap, accent && styles.cardIconWrapAccent]}>
                <Ionicons
                    name={icon}
                    size={22}
                    color={accent ? '#FFFFFF' : theme.colors.text}
                />
            </View>
            <View style={styles.cardBody}>
                <Text style={[styles.cardTitle, accent && styles.cardTitleAccent]} numberOfLines={1}>
                    {title}
                </Text>
                <Text style={[styles.cardSubtitle, accent && styles.cardSubtitleAccent]} numberOfLines={2}>
                    {subtitle}
                </Text>
            </View>
            <Ionicons
                name="chevron-forward"
                size={16}
                color={accent ? 'rgba(255,255,255,0.6)' : theme.colors.textSecondary}
            />
        </Pressable>
    );
}

function HelpCard() {
    const styles = stylesheet;
    const { theme } = useUnistyles();
    const [expanded, setExpanded] = React.useState(false);

    const keywords = [
        t('home.helpKeywordCrossDevice'),
        t('home.helpKeywordRemote'),
        t('home.helpKeywordCluster'),
        t('home.helpKeywordEvolution'),
    ];

    const faqItems = [
        {
            question: t('home.helpQuestionWhat'),
            answer: t('home.helpAnswerWhat'),
        },
        {
            question: t('home.helpQuestionStart'),
            answer: t('home.helpAnswerStart'),
        },
        {
            question: t('home.helpQuestionDevices'),
            answer: t('home.helpAnswerDevices'),
        },
        {
            question: t('home.helpQuestionCluster'),
            answer: t('home.helpAnswerCluster'),
        },
    ];

    return (
        <View style={styles.helpCard}>
            <Pressable
                style={({ pressed }) => [
                    styles.helpHeader,
                    pressed && styles.cardPressed,
                ]}
                onPress={() => setExpanded(value => !value)}
            >
                <View style={styles.helpIconWrap}>
                    <Ionicons name="help-buoy-outline" size={20} color={theme.colors.text} />
                </View>
                <View style={styles.helpHeaderBody}>
                    <Text style={styles.helpTitle}>{t('home.helpTitle')}</Text>
                    <Text style={styles.helpSubtitle}>{t('home.helpSubtitle')}</Text>
                </View>
                <View style={styles.helpToggle}>
                    <Text style={styles.helpToggleText}>
                        {expanded ? t('home.helpCollapse') : t('home.helpExpand')}
                    </Text>
                    <Ionicons
                        name={expanded ? 'chevron-up-outline' : 'chevron-down-outline'}
                        size={16}
                        color={theme.colors.textSecondary}
                    />
                </View>
            </Pressable>

            <View style={styles.keywordRow}>
                {keywords.map((keyword) => (
                    <View key={keyword} style={styles.keywordChip}>
                        <Text style={styles.keywordChipText}>{keyword}</Text>
                    </View>
                ))}
            </View>

            {expanded && (
                <View style={styles.faqList}>
                    {faqItems.map((item) => (
                        <View key={item.question} style={styles.faqItem}>
                            <Text style={styles.faqQuestion}>{item.question}</Text>
                            <Text style={styles.faqAnswer}>{item.answer}</Text>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
}

function isTeamAgentSession(session: Session): boolean {
    return Boolean(session.metadata?.teamId || session.metadata?.role);
}

function formatCompactTokens(tokens: number): string {
    if (tokens >= 1_000_000) {
        return `${(tokens / 1_000_000).toFixed(1)}M`;
    }
    if (tokens >= 1_000) {
        return tokens >= 10_000 ? `${Math.round(tokens / 1_000)}K` : `${(tokens / 1_000).toFixed(1)}K`;
    }
    return tokens.toLocaleString();
}

function getSessionTokenTotal(session: Session): number {
    if (!session.latestUsage) {
        return 0;
    }

    return session.latestUsage.inputTokens +
        session.latestUsage.outputTokens +
        session.latestUsage.cacheCreation +
        session.latestUsage.cacheRead;
}

function parseTeamTasks(body?: string | null): KanbanTask[] {
    if (!body) {
        return [];
    }

    try {
        const parsed = JSON.parse(body);
        return Array.isArray(parsed?.tasks) ? parsed.tasks : [];
    } catch {
        return [];
    }
}

interface StatsBarSectionProps {
    title: string;
    items: Array<{
        id: string;
        label: string;
        value: number;
    }>;
    color: string;
    formatValue?: (value: number) => string;
    loading?: boolean;
}

function StatsBarSection({
    title,
    items,
    color,
    formatValue,
    loading = false,
}: StatsBarSectionProps) {
    const styles = stylesheet;

    if (items.length === 0 && !loading) {
        return null;
    }

    const maxValue = Math.max(...items.map((item) => item.value), 1);

    return (
        <View style={styles.statsSection}>
            <Text style={styles.statsSectionTitle}>{title}</Text>
            {loading && items.length === 0 ? (
                <Text style={styles.statsSectionLoading}>{t('common.loading')}</Text>
            ) : (
                items.map((item) => (
                    <UsageBar
                        key={item.id}
                        label={item.label}
                        value={item.value}
                        maxValue={maxValue}
                        color={color}
                        height={10}
                        formatValue={formatValue}
                    />
                ))
            )}
        </View>
    );
}

function WorkspaceStatsCard() {
    const styles = stylesheet;
    const { theme } = useUnistyles();
    const artifacts = useArtifacts();
    const sessions = useAllSessions();
    const requestedTeamBodiesRef = React.useRef<Set<string>>(new Set());

    const teamArtifacts = React.useMemo(() => {
        return artifacts
            .filter((artifact) => artifact.type === 'team' && !artifact.draft)
            .sort((a, b) => b.updatedAt - a.updatedAt);
    }, [artifacts]);

    React.useEffect(() => {
        const missingTeamBodies = teamArtifacts
            .filter((artifact) => artifact.body === undefined)
            .filter((artifact) => !requestedTeamBodiesRef.current.has(artifact.id));

        if (missingTeamBodies.length === 0) {
            return;
        }

        missingTeamBodies.forEach((artifact) => {
            requestedTeamBodiesRef.current.add(artifact.id);
            sync.fetchArtifactWithBody(artifact.id).catch((error) => {
                console.error(`Failed to load team body for home stats (${artifact.id})`, error);
            });
        });
    }, [teamArtifacts]);

    const stats = React.useMemo(() => {
        const agentSessions = sessions.filter(isTeamAgentSession);
        const sessionMap = new Map(sessions.map((session) => [session.id, session]));

        const teamUsageItems = teamArtifacts.map((artifact) => {
            const linkedSessionIds = new Set<string>(artifact.sessions ?? []);
            sessions.forEach((session) => {
                if (session.metadata?.teamId === artifact.id) {
                    linkedSessionIds.add(session.id);
                }
            });

            const linkedSessions = Array.from(linkedSessionIds)
                .map((sessionId) => sessionMap.get(sessionId))
                .filter((session): session is Session => !!session);

            const tokens = linkedSessions.reduce((total, session) => {
                return total + getSessionTokenTotal(session);
            }, 0);

            const tasks = parseTeamTasks(artifact.body);
            const visibleTasks = tasks.filter((task) => !task.isDeleted);
            const completedTasks = visibleTasks.filter((task) => task.status === 'done').length;

            return {
                id: artifact.id,
                label: artifact.title || t('teams.untitledTeam'),
                tokens,
                completedTasks,
            };
        });

        const agentUsageItems = agentSessions
            .map((session) => {
                const role = session.metadata?.role ?? session.metadata?.flavor;
                return {
                    id: session.id,
                    label: role ? `${getSessionName(session)} · ${role}` : getSessionName(session),
                    tokens: getSessionTokenTotal(session),
                };
            })
            .sort((a, b) => b.tokens - a.tokens);

        return {
            teamCount: teamArtifacts.length,
            teamTotalTokens: teamUsageItems.reduce((total, item) => total + item.tokens, 0),
            agentTotalTokens: agentUsageItems.reduce((total, item) => total + item.tokens, 0),
            completedTasksTotal: teamUsageItems.reduce((total, item) => total + item.completedTasks, 0),
            teamUsageItems: teamUsageItems
                .filter((item) => item.tokens > 0)
                .sort((a, b) => b.tokens - a.tokens)
                .slice(0, 4),
            agentUsageItems: agentUsageItems
                .filter((item) => item.tokens > 0)
                .slice(0, 4),
            completedTaskItems: teamUsageItems
                .filter((item) => item.completedTasks > 0)
                .sort((a, b) => b.completedTasks - a.completedTasks)
                .slice(0, 4),
            isLoadingTaskBodies: teamArtifacts.some((artifact) => artifact.body === undefined),
        };
    }, [sessions, teamArtifacts]);

    if (stats.teamCount === 0 && stats.agentTotalTokens === 0) {
        return null;
    }

    return (
        <View style={styles.statsCard}>
            <View style={styles.statsHeader}>
                <View style={[styles.statsIconWrap, { backgroundColor: theme.colors.surfaceHigh }]}>
                    <Ionicons name="analytics-outline" size={18} color={theme.colors.text} />
                </View>
                <View style={styles.statsHeaderBody}>
                    <Text style={styles.statsTitle}>{t('home.reportTitle')}</Text>
                    <Text style={styles.statsSubtitle}>{t('home.reportSubtitle')}</Text>
                </View>
            </View>

            <View style={styles.statsGrid}>
                <View style={styles.statsMetricCard}>
                    <Text style={styles.statsMetricLabel}>{t('teams.title')}</Text>
                    <Text style={styles.statsMetricValue}>{stats.teamCount}</Text>
                </View>

                <View style={styles.statsMetricCard}>
                    <Text style={styles.statsMetricLabel}>
                        {t('teams.title')} · {t('usage.totalTokens')}
                    </Text>
                    <Text style={styles.statsMetricValue}>{formatCompactTokens(stats.teamTotalTokens)} tok</Text>
                </View>

                <View style={styles.statsMetricCard}>
                    <Text style={styles.statsMetricLabel}>{t('sidebar.agents')} · {t('usage.totalTokens')}</Text>
                    <Text style={styles.statsMetricValue}>{formatCompactTokens(stats.agentTotalTokens)} tok</Text>
                </View>

                <View style={styles.statsMetricCard}>
                    <Text style={styles.statsMetricLabel}>{t('home.completedTasks')}</Text>
                    <Text style={[styles.statsMetricValue, { color: '#34C759' }]}>{stats.completedTasksTotal}</Text>
                </View>
            </View>

            <StatsBarSection
                title={`${t('teams.title')} · ${t('usage.totalTokens')}`}
                items={stats.teamUsageItems}
                color="#007AFF"
                formatValue={(value) => `${formatCompactTokens(value)} tok`}
            />

            <StatsBarSection
                title={`${t('sidebar.agents')} · ${t('usage.totalTokens')}`}
                items={stats.agentUsageItems}
                color="#7C3AED"
                formatValue={(value) => `${formatCompactTokens(value)} tok`}
            />

            <StatsBarSection
                title={t('home.completedTasks')}
                items={stats.completedTaskItems.map((item) => ({
                    id: item.id,
                    label: item.label,
                    value: item.completedTasks,
                }))}
                color="#34C759"
                loading={stats.isLoadingTaskBodies}
            />
        </View>
    );
}

function NewUserPanel() {
    const router = useRouter();
    const styles = stylesheet;
    const { theme, rt } = useUnistyles();
    const topInset = Platform.OS !== 'web' ? rt.insets.top : 0;

    const handleCreateTeam = React.useCallback(() => {
        router.push('/teams/new' as never);
    }, [router]);

    const handleSync = React.useCallback(() => {
        router.push('/restore' as never);
    }, [router]);

    return (
        <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, { paddingTop: 24 + topInset }]}
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.header}>
                <View style={styles.logoWrap}>
                    <Image
                        source={require('@/assets/images/logo-black.png')}
                        contentFit="contain"
                        style={{ width: 28, height: 28 }}
                        tintColor={theme.colors.header.tint}
                    />
                </View>
                <View style={styles.headerText}>
                    <Text style={styles.headerTitle}>{t('home.welcome')}</Text>
                    <Text style={styles.headerSubtitle}>{t('home.welcomeSubtitle')}</Text>
                </View>
            </View>

            <HelpCard />

            <ActionCard
                icon="add"
                title={t('home.createTeamTitle')}
                subtitle={t('home.createTeamSubtitle')}
                onPress={handleCreateTeam}
                accent
            />

            <ActionCard
                icon="book-outline"
                title={t('home.docsTitle')}
                subtitle={t('home.docsSubtitle')}
                onPress={() => router.push('/agents' as never)}
            />

            <ActionCard
                icon="phone-portrait-outline"
                title={t('home.syncDeviceTitle')}
                subtitle={t('home.syncDeviceSubtitle')}
                onPress={handleSync}
            />
        </ScrollView>
    );
}

function ExperiencedUserPanel() {
    const router = useRouter();
    const styles = stylesheet;
    const { rt } = useUnistyles();
    const topInset = Platform.OS !== 'web' ? rt.insets.top : 0;

    const handleReport = React.useCallback(() => {
        router.push('/teams' as never);
    }, [router]);

    const handleCreateTeam = React.useCallback(() => {
        router.push('/teams/new' as never);
    }, [router]);

    const handleSync = React.useCallback(() => {
        router.push('/restore' as never);
    }, [router]);

    const handleMarketplace = React.useCallback(() => {
        router.push('/agents' as never);
    }, [router]);

    return (
        <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, { paddingTop: 24 + topInset }]}
            showsVerticalScrollIndicator={false}
        >
            <HelpCard />

            <WorkspaceStatsCard />

            <ActionCard
                icon="add"
                title={t('home.createTeamTitle')}
                subtitle={t('home.createTeamSubtitle')}
                onPress={handleCreateTeam}
                accent
            />

            <ActionCard
                icon="bar-chart-outline"
                title={t('home.reportTitle')}
                subtitle={t('home.reportSubtitle')}
                onPress={handleReport}
            />

            <ActionCard
                icon="phone-portrait-outline"
                title={t('home.syncDeviceTitle')}
                subtitle={t('home.syncDeviceSubtitle')}
                onPress={handleSync}
            />

            <ActionCard
                icon="storefront-outline"
                title={t('home.marketplaceTitle')}
                subtitle={t('home.marketplaceSubtitle')}
                onPress={handleMarketplace}
            />
        </ScrollView>
    );
}

export const HomeMainPanel = React.memo(() => {
    const isDataReady = useIsDataReady();
    const isExperienced = useIsExperiencedUser();

    if (!isDataReady) {
        return <NewUserPanel />;
    }

    return isExperienced ? <ExperiencedUserPanel /> : <NewUserPanel />;
});

const stylesheet = StyleSheet.create((theme) => ({
    scroll: {
        flex: 1,
        backgroundColor: theme.colors.groupped.background,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 0,
        paddingBottom: 40,
        gap: 0,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        marginBottom: 32,
    },
    logoWrap: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerText: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 20,
        color: theme.colors.text,
        ...Typography.default('semiBold'),
    },
    headerSubtitle: {
        marginTop: 2,
        fontSize: 13,
        color: theme.colors.textSecondary,
        ...Typography.default(),
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        backgroundColor: theme.colors.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 10,
    },
    cardAccent: {
        backgroundColor: theme.colors.button.primary.background,
        borderColor: theme.colors.button.primary.background,
    },
    cardPressed: {
        opacity: 0.75,
    },
    cardIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: theme.colors.groupped.background,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardIconWrapAccent: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderColor: 'rgba(255,255,255,0.2)',
    },
    cardBody: {
        flex: 1,
        minWidth: 0,
    },
    cardTitle: {
        fontSize: 15,
        color: theme.colors.text,
        ...Typography.default('semiBold'),
    },
    cardTitleAccent: {
        color: '#FFFFFF',
    },
    cardSubtitle: {
        marginTop: 2,
        fontSize: 12,
        color: theme.colors.textSecondary,
        ...Typography.default(),
        lineHeight: 17,
    },
    cardSubtitleAccent: {
        color: 'rgba(255,255,255,0.75)',
    },
    helpCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        padding: 16,
        marginBottom: 10,
    },
    statsCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        padding: 16,
        marginBottom: 10,
    },
    statsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    statsIconWrap: {
        width: 42,
        height: 42,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statsHeaderBody: {
        flex: 1,
        minWidth: 0,
    },
    statsTitle: {
        fontSize: 16,
        color: theme.colors.text,
        ...Typography.default('semiBold'),
    },
    statsSubtitle: {
        marginTop: 4,
        fontSize: 13,
        lineHeight: 18,
        color: theme.colors.textSecondary,
        ...Typography.default(),
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 16,
    },
    statsMetricCard: {
        minWidth: 140,
        flexGrow: 1,
        flexBasis: '48%',
        backgroundColor: theme.colors.groupped.background,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    statsMetricLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        ...Typography.default('semiBold'),
    },
    statsMetricValue: {
        marginTop: 8,
        fontSize: 22,
        color: theme.colors.text,
        ...Typography.default('semiBold'),
    },
    statsSection: {
        marginTop: 18,
    },
    statsSectionTitle: {
        marginBottom: 6,
        fontSize: 13,
        color: theme.colors.textSecondary,
        ...Typography.default('semiBold'),
    },
    statsSectionLoading: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        ...Typography.default(),
    },
    helpHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    helpIconWrap: {
        width: 42,
        height: 42,
        borderRadius: 14,
        backgroundColor: theme.colors.groupped.background,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        alignItems: 'center',
        justifyContent: 'center',
    },
    helpHeaderBody: {
        flex: 1,
        minWidth: 0,
    },
    helpTitle: {
        fontSize: 16,
        color: theme.colors.text,
        ...Typography.default('semiBold'),
    },
    helpSubtitle: {
        marginTop: 4,
        fontSize: 13,
        lineHeight: 19,
        color: theme.colors.textSecondary,
        ...Typography.default(),
    },
    helpToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginLeft: 8,
    },
    helpToggleText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        ...Typography.default('semiBold'),
    },
    keywordRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 16,
    },
    keywordChip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: theme.colors.groupped.background,
        borderWidth: 1,
        borderColor: theme.colors.divider,
    },
    keywordChipText: {
        fontSize: 12,
        color: theme.colors.text,
        ...Typography.default('semiBold'),
    },
    faqList: {
        marginTop: 18,
        gap: 14,
    },
    faqItem: {
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: theme.colors.divider,
    },
    faqQuestion: {
        fontSize: 14,
        color: theme.colors.text,
        ...Typography.default('semiBold'),
    },
    faqAnswer: {
        marginTop: 6,
        fontSize: 13,
        lineHeight: 19,
        color: theme.colors.textSecondary,
        ...Typography.default(),
    },
}));
