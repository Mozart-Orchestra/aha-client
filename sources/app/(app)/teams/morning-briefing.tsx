import React from 'react';
import {
    View,
    ScrollView,
    Pressable,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/StyledText';
import { layout } from '@/components/layout';
import { t } from '@/text';
import { useBriefing } from '@/hooks/useBriefing';
import {
    briefingStyles as styles,
    ACCENT_GREEN,
    ACCENT_RED,
    ACCENT_BLUE,
} from './briefingStyles';

// ---------------------------------------------------------------------------
// Confidence badge color helper
// ---------------------------------------------------------------------------

function getConfidenceColors(confidence: number): { bg: string; text: string } {
    if (confidence >= 0.9) return { bg: '#E8F5EE', text: ACCENT_GREEN };
    if (confidence >= 0.7) return { bg: '#E8F0F8', text: ACCENT_BLUE };
    return { bg: '#FDF0ED', text: ACCENT_RED };
}

// ---------------------------------------------------------------------------
// TaskRowItem sub-component
// ---------------------------------------------------------------------------

interface TaskRowItemProps {
    title: string;
    meta?: string;
    iconName: keyof typeof Ionicons.glyphMap;
    iconBg: string;
    iconColor: string;
    confidence?: number;
    isLast?: boolean;
}

const TaskRowItem = React.memo(function TaskRowItem({
    title,
    meta,
    iconName,
    iconBg,
    iconColor,
    confidence,
    isLast,
}: TaskRowItemProps) {
    const confidenceColors =
        confidence !== undefined ? getConfidenceColors(confidence) : null;

    return (
        <View style={[styles.taskRow, isLast ? styles.taskRowLast : undefined]}>
            <View style={[styles.taskIcon, { backgroundColor: iconBg }]}>
                <Ionicons name={iconName} size={16} color={iconColor} />
            </View>
            <View style={styles.taskContent}>
                <Text style={styles.taskTitle} numberOfLines={1}>
                    {title}
                </Text>
                {meta ? (
                    <Text style={styles.taskMeta} numberOfLines={1}>
                        {meta}
                    </Text>
                ) : null}
            </View>
            {confidence !== undefined && confidenceColors ? (
                <View
                    style={[
                        styles.confidenceBadge,
                        { backgroundColor: confidenceColors.bg },
                    ]}
                >
                    <Text
                        style={[
                            styles.confidenceText,
                            { color: confidenceColors.text },
                        ]}
                    >
                        {Math.round(confidence * 100)}%
                    </Text>
                </View>
            ) : null}
        </View>
    );
});

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default React.memo(function MorningBriefingScreen() {
    const { teamId } = useLocalSearchParams<{ teamId: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const { briefing, isLoading, refresh } = useBriefing(teamId ?? '');

    const handleResume = React.useCallback(() => {
        const sessionId = briefing?.contextResume?.lastActiveSession?.sessionId;
        if (sessionId) {
            router.push(`/sessions/${sessionId}`);
        }
    }, [briefing, router]);

    if (isLoading && !briefing) {
        return (
            <>
                <Stack.Screen
                    options={{
                        headerTitle: t('briefing.title') || 'Morning Briefing',
                        headerShown: true,
                    }}
                />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={ACCENT_GREEN} />
                    <Text style={styles.loadingText}>
                        {t('briefing.loading') || 'Preparing your briefing...'}
                    </Text>
                </View>
            </>
        );
    }

    const greetingMessage = briefing?.greeting?.message ?? 'Good morning';
    const greetingDate =
        briefing?.greeting?.date ??
        new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
        });

    return (
        <>
            <Stack.Screen
                options={{
                    headerTitle: t('briefing.title') || 'Morning Briefing',
                    headerShown: true,
                }}
            />
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={[
                    styles.content,
                    { paddingBottom: 40 + insets.bottom },
                    { maxWidth: layout.maxWidth, alignSelf: 'center', width: '100%' },
                ]}
                refreshControl={
                    <RefreshControl
                        refreshing={isLoading}
                        onRefresh={refresh}
                        tintColor={ACCENT_GREEN}
                    />
                }
            >
                {/* Header */}
                <View style={styles.headerSection}>
                    <Text style={styles.greeting}>{greetingMessage}</Text>
                    <Text style={styles.greetingDate}>{greetingDate}</Text>
                </View>

                {/* Overnight Summary */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>
                        {t('briefing.overnightSummary') || 'Overnight Summary'}
                    </Text>
                    {briefing?.summary ? (
                        <Text style={styles.summaryText}>{briefing.summary}</Text>
                    ) : null}
                    <View style={styles.metricsRow}>
                        <View style={styles.metricItem}>
                            <Text style={styles.metricValue}>
                                {briefing?.keyMetrics?.tasksCompleted ?? 0}
                            </Text>
                            <Text style={styles.metricLabel}>
                                {t('briefing.done') || 'done'}
                            </Text>
                        </View>
                        <View style={styles.metricDivider} />
                        <View style={styles.metricItem}>
                            <Text style={styles.metricValue}>
                                {briefing?.keyMetrics?.tokensUsed
                                    ? `${Math.round(briefing.keyMetrics.tokensUsed / 1000)}k`
                                    : '0'}
                            </Text>
                            <Text style={styles.metricLabel}>
                                {t('briefing.tokens') || 'tokens'}
                            </Text>
                        </View>
                        <View style={styles.metricDivider} />
                        <View style={styles.metricItem}>
                            <Text style={styles.metricValue}>
                                {briefing?.keyMetrics?.estimatedCost !== undefined
                                    ? `$${briefing.keyMetrics.estimatedCost.toFixed(2)}`
                                    : '$0.00'}
                            </Text>
                            <Text style={styles.metricLabel}>
                                {t('briefing.cost') || 'cost'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Blockers — highest urgency, red card */}
                {(briefing?.blockers?.length ?? 0) > 0 ? (
                    <View style={styles.blockersCard}>
                        <Text style={styles.blockersTitle}>
                            {t('briefing.blockers') || 'Blockers'}{' '}
                            ({briefing!.blockers.length})
                        </Text>
                        {briefing!.blockers.map((blocker, index) => (
                            <TaskRowItem
                                key={blocker.id}
                                title={blocker.taskTitle}
                                meta={blocker.description}
                                iconName="warning-outline"
                                iconBg="#FBE4DC"
                                iconColor={ACCENT_RED}
                                isLast={index === briefing!.blockers.length - 1}
                            />
                        ))}
                    </View>
                ) : null}

                {/* Pending Reviews */}
                {(briefing?.pendingReviews?.length ?? 0) > 0 ? (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>
                            {t('briefing.pendingReviews') || 'Pending Your Review'}{' '}
                            ({briefing!.pendingReviews.length})
                        </Text>
                        {briefing!.pendingReviews.map((task, index) => (
                            <TaskRowItem
                                key={task.id}
                                title={task.title}
                                meta={task.assigneeId ?? undefined}
                                iconName="git-pull-request-outline"
                                iconBg="#E8F5EE"
                                iconColor={ACCENT_GREEN}
                                confidence={task.confidence}
                                isLast={index === briefing!.pendingReviews.length - 1}
                            />
                        ))}
                    </View>
                ) : null}

                {/* In Progress */}
                {(briefing?.inProgressTasks?.length ?? 0) > 0 ? (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>
                            {t('briefing.inProgress') || 'In Progress'}{' '}
                            ({briefing!.inProgressTasks.length})
                        </Text>
                        {briefing!.inProgressTasks.map((task, index) => (
                            <TaskRowItem
                                key={task.id}
                                title={task.title}
                                meta={task.assigneeId ?? undefined}
                                iconName="ellipsis-horizontal-circle-outline"
                                iconBg="#E8F0F8"
                                iconColor={ACCENT_BLUE}
                                isLast={index === briefing!.inProgressTasks.length - 1}
                            />
                        ))}
                    </View>
                ) : null}

                {/* Continue Where You Left Off — primary CTA */}
                <View style={styles.continueCTA}>
                    <Text style={styles.continueCTATitle}>
                        {t('briefing.continueWhereLeftOff') || 'Continue Where You Left Off'}
                    </Text>
                    {briefing?.contextResume?.lastActiveSession ? (
                        <>
                            {briefing.contextResume.lastActiveSession.taskTitle ? (
                                <Text style={styles.continueTaskTitle} numberOfLines={2}>
                                    {briefing.contextResume.lastActiveSession.taskTitle}
                                </Text>
                            ) : null}
                            <Text style={styles.continueHint}>
                                {briefing.contextResume.continuationHint}
                            </Text>
                        </>
                    ) : (
                        <Text style={styles.continueHint}>
                            {t('briefing.noActiveSession') ||
                                'No active session found. Start a new task from the board.'}
                        </Text>
                    )}
                    {briefing?.contextResume?.lastActiveSession ? (
                        <Pressable style={styles.resumeButton} onPress={handleResume}>
                            <Text style={styles.resumeButtonText}>
                                {t('briefing.resumeSession') || 'Resume Session'}
                            </Text>
                        </Pressable>
                    ) : null}
                </View>

                {/* Next Actions */}
                {(briefing?.nextActions?.length ?? 0) > 0 ? (
                    <View style={styles.nextActionsCard}>
                        <Text style={styles.cardTitle}>
                            {t('briefing.nextActions') || 'Suggested Next Actions'}
                        </Text>
                        {briefing!.nextActions.map((action, index) => (
                            <View key={index} style={styles.actionRow}>
                                <View style={styles.actionNumber}>
                                    <Text style={styles.actionNumberText}>{index + 1}</Text>
                                </View>
                                <Text style={styles.actionText}>{action}</Text>
                            </View>
                        ))}
                    </View>
                ) : null}
            </ScrollView>
        </>
    );
});
