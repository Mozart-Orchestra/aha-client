/**
 * R7 Team Stats Dashboard
 * Team Statistics Aggregation & Visualization Screen
 *
 * Features:
 * - Task completion metrics
 * - Token usage and cost estimates
 * - Active agents count
 * - Time range filtering (7d, 30d, 90d)
 * - Activity chart
 * - Export to JSON/CSV
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    ScrollView,
    ActivityIndicator,
    RefreshControl,
    Pressable,
    useWindowDimensions,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/StyledText';
import { StyleSheet } from 'react-native-unistyles';
import {
    fetchTeamStats,
    fetchTeamUsage,
    exportTeamStats,
    type TimeRange,
    type TeamStats,
    type UsageTimeline,
} from '@/sync/apiTeamStats';

// Re-export TimeRange for local use
type LocalTimeRange = TimeRange;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACCENT_GREEN = '#22C55E';
const ACCENT_BLUE = '#3B82F6';
const ACCENT_PURPLE = '#8B5CF6';
const ACCENT_ORANGE = '#F97316';
const ACCENT_RED = '#EF4444';

const TIME_RANGES: { value: TimeRange; label: string }[] = [
    { value: 'day', label: '7 days' },
    { value: 'week', label: '30 days' },
    { value: 'month', label: '90 days' },
];

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

function formatNumber(num: number): string {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    return num.toString();
}

function formatCurrency(num: number): string {
    return `$${num.toFixed(2)}`;
}

function formatPercentage(value: number, total: number): string {
    if (total === 0) return '0%';
    return `${Math.round((value / total) * 100)}%`;
}

function formatDate(isoString: string | null): string {
    if (!isoString) return 'Never';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

interface StatCardProps {
    title: string;
    value: string;
    subtitle?: string;
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    iconBg: string;
    testID: string;
}

const StatCard = React.memo(function StatCard({
    title,
    value,
    subtitle,
    icon,
    iconColor,
    iconBg,
    testID,
}: StatCardProps) {
    return (
        <View style={styles.card} testID={testID}>
            <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
                <Ionicons name={icon} size={20} color={iconColor} />
            </View>
            <View style={styles.cardContent}>
                <Text style={styles.cardValue}>{value}</Text>
                <Text style={styles.cardTitle}>{title}</Text>
                {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
            </View>
        </View>
    );
});

interface TimeFilterProps {
    selected: TimeRange;
    onChange: (range: TimeRange) => void;
}

const TimeFilter = React.memo(function TimeFilter({ selected, onChange }: TimeFilterProps) {
    return (
        <View style={styles.filterContainer} testID="stats-time-filter">
            {TIME_RANGES.map((range) => (
                <Pressable
                    key={range.value}
                    style={[
                        styles.filterButton,
                        selected === range.value && styles.filterButtonActive,
                    ]}
                    onPress={() => onChange(range.value)}
                >
                    <Text
                        style={[
                            styles.filterText,
                            selected === range.value && styles.filterTextActive,
                        ]}
                    >
                        {range.label}
                    </Text>
                </Pressable>
            ))}
        </View>
    );
});

interface ActivityChartProps {
    data: UsageDataPoint[];
    groupBy: 'hour' | 'day';
}

const ActivityChart = React.memo(function ActivityChart({ data, groupBy }: ActivityChartProps) {
    const { width } = useWindowDimensions();
    const chartWidth = Math.min(width - 64, 800);
    const chartHeight = 200;

    if (data.length === 0) {
        return (
            <View style={styles.chartEmpty} testID="stats-activity-chart">
                <Text style={styles.chartEmptyText}>No activity data</Text>
            </View>
        );
    }

    const maxTokens = Math.max(...data.map((d) => d.tokens), 1);
    const barWidth = Math.max((chartWidth - 32) / data.length - 4, 4);

    return (
        <View style={styles.chartContainer} testID="stats-activity-chart">
            <Text style={styles.chartTitle}>Token Usage</Text>
            <View style={[styles.chart, { width: chartWidth, height: chartHeight }]}>
                {data.map((point, index) => {
                    const barHeight = (point.tokens / maxTokens) * (chartHeight - 40);
                    const date = new Date(point.timestamp * 1000);
                    const label =
                        groupBy === 'hour'
                            ? date.getHours().toString().padStart(2, '0')
                            : date.getDate().toString();

                    return (
                        <View key={index} style={styles.barContainer}>
                            <View
                                style={[
                                    styles.bar,
                                    { height: barHeight, width: barWidth },
                                ]}
                            />
                            <Text style={styles.barLabel}>{label}</Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
});

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function TeamStatsScreen() {
    const { id: teamId } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const isWide = width >= 1280;

    const [timeRange, setTimeRange] = useState<TimeRange>('week');
    const [stats, setStats] = useState<TeamStats | null>(null);
    const [usage, setUsage] = useState<UsageTimeline | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [exportOpen, setExportOpen] = useState(false);

    const fetchStats = useCallback(async () => {
        if (!teamId) return;

        try {
            const [statsRes, usageRes] = await Promise.all([
                apiFetch<TeamStats>(`/v1/teams/${teamId}/stats?period=${timeRange}`),
                apiFetch<UsageTimeline>(
                    `/v1/teams/${teamId}/usage?period=${timeRange}&groupBy=day`
                ),
            ]);

            if (statsRes.success && statsRes.data) {
                setStats(statsRes.data);
            }

            if (usageRes.success && usageRes.data) {
                setUsage(usageRes.data);
            }
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [teamId, timeRange]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        fetchStats();
    }, [fetchStats]);

    const handleExport = useCallback(
        async (format: 'json' | 'csv') => {
            if (!teamId) return;

            try {
                const response = await apiFetch(
                    `/v1/teams/${teamId}/export?format=${format}&period=${timeRange}`
                );

                if (response.success) {
                    // Trigger download via browser or share
                    const blob = new Blob([JSON.stringify(response.data, null, 2)], {
                        type: format === 'json' ? 'application/json' : 'text/csv',
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `team-${teamId}-stats-${timeRange}.${format}`;
                    a.click();
                    URL.revokeObjectURL(url);
                }
            } catch (error) {
                console.error('Export failed:', error);
            }

            setExportOpen(false);
        },
        [teamId, timeRange]
    );

    const completionRate = stats
        ? formatPercentage(stats.taskStats.done, stats.taskStats.total)
        : '0%';

    const totalCost = usage?.summary.totalCost ?? 0;

    if (loading) {
        return (
            <View style={styles.loadingContainer} testID="stats-loading">
                <ActivityIndicator size="large" color={ACCENT_GREEN} />
                <Text style={styles.loadingText}>Loading stats...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <Stack.Screen
                options={{
                    title: 'Team Stats',
                    headerLeft: () => (
                        <Pressable onPress={() => router.back()} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color="#000" />
                        </Pressable>
                    ),
                    headerRight: () => (
                        <View style={styles.headerActions}>
                            <Pressable
                                onPress={handleRefresh}
                                style={styles.iconButton}
                                accessibilityLabel="refresh"
                            >
                                <Ionicons name="refresh" size={20} color="#666" />
                            </Pressable>
                            <Pressable
                                onPress={() => setExportOpen(!exportOpen)}
                                style={styles.iconButton}
                                accessibilityLabel="export"
                            >
                                <Ionicons name="download-outline" size={20} color="#666" />
                            </Pressable>
                        </View>
                    ),
                }}
            />

            {exportOpen && (
                <View style={styles.exportMenu} testID="export-options">
                    <Pressable
                        style={styles.exportOption}
                        onPress={() => handleExport('json')}
                    >
                        <Ionicons name="code-outline" size={18} color={ACCENT_BLUE} />
                        <Text style={styles.exportText}>JSON</Text>
                    </Pressable>
                    <Pressable
                        style={styles.exportOption}
                        onPress={() => handleExport('csv')}
                    >
                        <Ionicons name="grid-outline" size={18} color={ACCENT_GREEN} />
                        <Text style={styles.exportText}>CSV</Text>
                    </Pressable>
                </View>
            )}

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[
                    styles.content,
                    isWide && styles.contentWide,
                ]}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                }
            >
                <TimeFilter selected={timeRange} onChange={setTimeRange} />

                <View
                    style={[
                        styles.cardsGrid,
                        isWide ? styles.cardsGridWide : styles.cardsGridMobile,
                    ]}
                    testID="stats-dashboard"
                >
                    <StatCard
                        title="Tasks Completed"
                        value={stats?.taskStats.done.toString() ?? '0'}
                        subtitle={`of ${stats?.taskStats.total ?? 0} total`}
                        icon="checkmark-circle"
                        iconColor={ACCENT_GREEN}
                        iconBg="#E8F5EE"
                        testID="stats-tasks-completed"
                    />

                    <StatCard
                        title="Completion Rate"
                        value={completionRate}
                        subtitle="Tasks done vs total"
                        icon="trending-up"
                        iconColor={ACCENT_BLUE}
                        iconBg="#E8F0F8"
                        testID="stats-completion-rate"
                    />

                    <StatCard
                        title="Active Agents"
                        value={stats?.activeMemberCount.toString() ?? '0'}
                        subtitle={`of ${stats?.memberCount ?? 0} members`}
                        icon="people"
                        iconColor={ACCENT_PURPLE}
                        iconBg="#F0E8F8"
                        testID="stats-active-agents"
                    />

                    <StatCard
                        title="Token Usage"
                        value={formatNumber(usage?.summary.totalTokens ?? 0)}
                        subtitle="Total tokens consumed"
                        icon="flash"
                        iconColor={ACCENT_ORANGE}
                        iconBg="#FEF3E8"
                        testID="stats-token-usage"
                    />

                    <StatCard
                        title="Estimated Cost"
                        value={formatCurrency(totalCost)}
                        subtitle="Total estimated spend"
                        icon="wallet"
                        iconColor={ACCENT_RED}
                        iconBg="#FDF0ED"
                        testID="stats-estimated-cost"
                    />

                    <StatCard
                        title="Messages"
                        value={formatNumber(stats?.messageCount ?? 0)}
                        subtitle="Team messages"
                        icon="chatbubbles"
                        iconColor={ACCENT_BLUE}
                        iconBg="#E8F0F8"
                        testID="stats-message-count"
                    />
                </View>

                {usage && (
                    <ActivityChart data={usage.data} groupBy={usage.groupBy} />
                )}

                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        Last activity: {formatDate(stats?.lastActivityAt ?? null)}
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const stylesheet = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background ?? '#F9FAFB',
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.background ?? '#F9FAFB',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: theme.colors.textSecondary ?? '#6B7280',
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: 16,
        gap: 16,
    },
    contentWide: {
        padding: 32,
        maxWidth: 1200,
        alignSelf: 'center',
        width: '100%',
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    headerActions: {
        flexDirection: 'row',
        gap: 8,
    },
    iconButton: {
        padding: 8,
    },
    exportMenu: {
        position: 'absolute',
        top: 60,
        right: 16,
        backgroundColor: theme.colors.surface ?? '#FFFFFF',
        borderRadius: 8,
        padding: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        zIndex: 100,
    },
    exportOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    exportText: {
        fontSize: 14,
        color: theme.colors.text ?? '#111827',
    },
    filterContainer: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 8,
    },
    filterButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: theme.colors.surface ?? '#FFFFFF',
        borderWidth: 1,
        borderColor: theme.colors.border ?? '#E5E7EB',
    },
    filterButtonActive: {
        backgroundColor: ACCENT_GREEN,
        borderColor: ACCENT_GREEN,
    },
    filterText: {
        fontSize: 14,
        color: theme.colors.textSecondary ?? '#6B7280',
    },
    filterTextActive: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    cardsGrid: {
        gap: 12,
    },
    cardsGridMobile: {
        flexDirection: 'column',
    },
    cardsGridWide: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    card: {
        backgroundColor: theme.colors.surface ?? '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        minWidth: 280,
        flex: 1,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardContent: {
        flex: 1,
    },
    cardValue: {
        fontSize: 24,
        fontWeight: '700',
        color: theme.colors.text ?? '#111827',
        marginBottom: 2,
    },
    cardTitle: {
        fontSize: 14,
        color: theme.colors.textSecondary ?? '#6B7280',
        marginBottom: 2,
    },
    cardSubtitle: {
        fontSize: 12,
        color: theme.colors.textMuted ?? '#9CA3AF',
    },
    chartContainer: {
        backgroundColor: theme.colors.surface ?? '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginTop: 8,
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text ?? '#111827',
        marginBottom: 16,
    },
    chart: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        paddingBottom: 24,
    },
    chartEmpty: {
        backgroundColor: theme.colors.surface ?? '#FFFFFF',
        borderRadius: 12,
        padding: 48,
        alignItems: 'center',
        marginTop: 8,
    },
    chartEmptyText: {
        fontSize: 14,
        color: theme.colors.textSecondary ?? '#6B7280',
    },
    barContainer: {
        alignItems: 'center',
        flex: 1,
    },
    bar: {
        backgroundColor: ACCENT_GREEN,
        borderRadius: 2,
        minHeight: 4,
    },
    barLabel: {
        fontSize: 10,
        color: theme.colors.textSecondary ?? '#6B7280',
        marginTop: 4,
    },
    footer: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 12,
        color: theme.colors.textSecondary ?? '#6B7280',
    },
}));

const styles = stylesheet.styles;
