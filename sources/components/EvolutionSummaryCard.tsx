import * as React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import type { EvolutionEvidenceCategory, EvolutionSummary } from '@/hooks/useEvolutionSummary';

interface EvolutionSummaryCardProps {
    summary: EvolutionSummary | null;
    isLoading?: boolean;
    error?: string | null;
    title?: string;
    variant?: 'compact' | 'full';
    onRetry?: () => void;
    onOpenDetails?: () => void;
    detailLabel?: string;
}

const CATEGORY_STYLES: Record<EvolutionEvidenceCategory, { bg: string; text: string }> = {
    runtime: { bg: '#E8F0F8', text: '#2F7A9B' },
    code: { bg: '#EEF3FF', text: '#4F6BD9' },
    rating: { bg: '#F1ECFA', text: '#7F67C2' },
    review: { bg: '#FDF0ED', text: '#C95A43' },
    collaboration: { bg: '#EAF5EE', text: '#3D8A5A' },
};

function formatDelta(delta: number): string {
    return `${delta >= 0 ? '+' : ''}${delta.toFixed(2)}`;
}

export function EvolutionSummaryCard({
    summary,
    isLoading = false,
    error = null,
    title = 'Evolution Summary',
    variant = 'full',
    onRetry,
    onOpenDetails,
    detailLabel = 'Open evolution details',
}: EvolutionSummaryCardProps) {
    const isCompact = variant === 'compact';

    if (isLoading && !summary) {
        return (
            <View style={styles.card}>
                <ActivityIndicator size="small" color="#3D8A5A" />
                <Text style={styles.loadingText}>Refreshing evolution evidence…</Text>
            </View>
        );
    }

    if (error && !summary) {
        return (
            <View style={styles.card}>
                <Text style={styles.sectionTitle}>{title}</Text>
                <Text style={styles.bodyText}>{error}</Text>
                {onRetry ? (
                    <Pressable onPress={onRetry} style={styles.secondaryButton}>
                        <Text style={styles.secondaryButtonText}>Retry</Text>
                    </Pressable>
                ) : null}
            </View>
        );
    }

    if (!summary) {
        return (
            <View style={styles.card}>
                <Text style={styles.sectionTitle}>{title}</Text>
                <Text style={styles.bodyText}>Evolution evidence is still warming up for this team.</Text>
            </View>
        );
    }

    const recommendations = isCompact ? summary.recommendations.slice(0, 1) : summary.recommendations.slice(0, 3);
    const evidenceCounts = Object.entries(summary.evidenceCounts).filter(([, count]) => count > 0);

    return (
        <View style={styles.card}>
            <View style={styles.headerRow}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.sectionTitle}>{title}</Text>
                    <Text style={styles.bodyText}>{summary.memory.summary}</Text>
                </View>
                <View style={[styles.deltaBadge, summary.score.delta >= 0 ? styles.deltaPositive : styles.deltaNegative]}>
                    <Text style={[styles.deltaBadgeText, summary.score.delta >= 0 ? styles.deltaPositiveText : styles.deltaNegativeText]}>
                        {formatDelta(summary.score.delta)}
                    </Text>
                </View>
            </View>

            <View style={styles.metricRow}>
                <View style={styles.metricPill}>
                    <Text style={styles.metricLabel}>Current Score</Text>
                    <Text style={styles.metricValue}>{summary.score.current.toFixed(2)}</Text>
                </View>
                <View style={styles.metricPill}>
                    <Text style={styles.metricLabel}>Blocking</Text>
                    <Text style={styles.metricValue}>{summary.signals.blockingRate.toFixed(0)}%</Text>
                </View>
                <View style={styles.metricPill}>
                    <Text style={styles.metricLabel}>Idle</Text>
                    <Text style={styles.metricValue}>{summary.signals.idleRate.toFixed(0)}%</Text>
                </View>
            </View>

            {evidenceCounts.length > 0 ? (
                <View style={styles.chipRow}>
                    {evidenceCounts.map(([category, count]) => {
                        const style = CATEGORY_STYLES[category as EvolutionEvidenceCategory];
                        return (
                            <View key={category} style={[styles.chip, { backgroundColor: style.bg }]}>
                                <Text style={[styles.chipText, { color: style.text }]}>{category} {count}</Text>
                            </View>
                        );
                    })}
                </View>
            ) : null}

            {recommendations.map((recommendation) => (
                <View key={recommendation.id} style={styles.recommendationCard}>
                    <View style={styles.recommendationHeader}>
                        <Text style={styles.recommendationTitle}>{recommendation.title}</Text>
                        <View style={[styles.priorityBadge, recommendation.priority === 'high' ? styles.priorityHigh : recommendation.priority === 'medium' ? styles.priorityMedium : styles.priorityLow]}>
                            <Text style={styles.priorityText}>{recommendation.priority.toUpperCase()}</Text>
                        </View>
                    </View>
                    <Text style={styles.bodyText}>{recommendation.summary}</Text>
                    {recommendation.why.slice(0, isCompact ? 2 : 3).map((reason, index) => (
                        <Text key={`${recommendation.id}-why-${index}`} style={styles.whyText}>• {reason}</Text>
                    ))}
                    <Text style={styles.nextAction}>Next: {recommendation.nextAction}</Text>
                    <View style={styles.evidenceList}>
                        {recommendation.evidence.slice(0, isCompact ? 2 : 3).map((evidence) => {
                            const style = CATEGORY_STYLES[evidence.category];
                            return (
                                <View key={evidence.id} style={styles.evidenceItem}>
                                    <View style={[styles.evidenceCategoryDot, { backgroundColor: style.text }]} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.evidenceTitle}>{evidence.title}</Text>
                                        <Text style={styles.evidenceSummary}>{evidence.summary}</Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </View>
            ))}

            {summary.memory.highlights.length > 0 && !isCompact ? (
                <View style={styles.memoryBlock}>
                    <Text style={styles.memoryTitle}>Memory Digest</Text>
                    {summary.memory.highlights.slice(0, 3).map((item, index) => (
                        <Text key={`${index}-${item}`} style={styles.memoryItem}>• {item}</Text>
                    ))}
                </View>
            ) : null}

            {onOpenDetails ? (
                <Pressable onPress={onOpenDetails} style={styles.primaryButton}>
                    <Text style={styles.primaryButtonText}>{detailLabel}</Text>
                </Pressable>
            ) : null}
        </View>
    );
}

const styles = {
    card: {
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E8E7E4',
        backgroundColor: '#FFFFFF',
        padding: 16,
        gap: 12,
    },
    headerRow: {
        flexDirection: 'row' as const,
        gap: 12,
        alignItems: 'flex-start' as const,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700' as const,
        color: '#1A1918',
        fontFamily: 'Outfit',
        marginBottom: 4,
    },
    bodyText: {
        fontSize: 13,
        lineHeight: 20,
        color: '#6D6C6A',
        fontFamily: 'Outfit',
    },
    loadingText: {
        fontSize: 13,
        color: '#6D6C6A',
        fontFamily: 'Outfit',
    },
    metricRow: {
        flexDirection: 'row' as const,
        flexWrap: 'wrap' as const,
        gap: 8,
    },
    metricPill: {
        minWidth: 104,
        borderRadius: 10,
        backgroundColor: '#F7F6F3',
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    metricLabel: {
        fontSize: 11,
        color: '#6D6C6A',
        fontFamily: 'Outfit',
    },
    metricValue: {
        marginTop: 2,
        fontSize: 18,
        fontWeight: '700' as const,
        color: '#1A1918',
        fontFamily: 'Outfit',
    },
    chipRow: {
        flexDirection: 'row' as const,
        flexWrap: 'wrap' as const,
        gap: 8,
    },
    chip: {
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    chipText: {
        fontSize: 11,
        fontWeight: '700' as const,
        fontFamily: 'Outfit',
        textTransform: 'capitalize' as const,
    },
    recommendationCard: {
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#F0EFEB',
        padding: 12,
        gap: 8,
    },
    recommendationHeader: {
        flexDirection: 'row' as const,
        justifyContent: 'space-between' as const,
        gap: 12,
    },
    recommendationTitle: {
        flex: 1,
        fontSize: 15,
        fontWeight: '700' as const,
        color: '#1A1918',
        fontFamily: 'Outfit',
    },
    priorityBadge: {
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    priorityHigh: { backgroundColor: '#FBE4DC' },
    priorityMedium: { backgroundColor: '#FFF1D6' },
    priorityLow: { backgroundColor: '#EEF3FF' },
    priorityText: {
        fontSize: 10,
        fontWeight: '700' as const,
        color: '#6D6C6A',
        fontFamily: 'Outfit',
    },
    whyText: {
        fontSize: 12,
        lineHeight: 18,
        color: '#4A4947',
        fontFamily: 'Outfit',
    },
    nextAction: {
        fontSize: 12,
        lineHeight: 18,
        color: '#3D8A5A',
        fontFamily: 'Outfit',
        fontWeight: '600' as const,
    },
    evidenceList: {
        gap: 8,
    },
    evidenceItem: {
        flexDirection: 'row' as const,
        gap: 8,
        alignItems: 'flex-start' as const,
    },
    evidenceCategoryDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginTop: 5,
    },
    evidenceTitle: {
        fontSize: 12,
        fontWeight: '600' as const,
        color: '#1A1918',
        fontFamily: 'Outfit',
    },
    evidenceSummary: {
        marginTop: 2,
        fontSize: 12,
        lineHeight: 18,
        color: '#6D6C6A',
        fontFamily: 'Outfit',
    },
    memoryBlock: {
        borderTopWidth: 1,
        borderTopColor: '#F0EFEB',
        paddingTop: 12,
        gap: 6,
    },
    memoryTitle: {
        fontSize: 12,
        fontWeight: '700' as const,
        color: '#1A1918',
        fontFamily: 'Outfit',
        textTransform: 'uppercase' as const,
        letterSpacing: 0.5,
    },
    memoryItem: {
        fontSize: 12,
        lineHeight: 18,
        color: '#4A4947',
        fontFamily: 'Outfit',
    },
    primaryButton: {
        alignSelf: 'flex-start' as const,
        borderRadius: 10,
        backgroundColor: '#3D8A5A',
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    primaryButtonText: {
        fontSize: 13,
        fontWeight: '700' as const,
        color: '#FFFFFF',
        fontFamily: 'Outfit',
    },
    secondaryButton: {
        alignSelf: 'flex-start' as const,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#D4D2CC',
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    secondaryButtonText: {
        fontSize: 13,
        fontWeight: '700' as const,
        color: '#4A4947',
        fontFamily: 'Outfit',
    },
    deltaBadge: {
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    deltaPositive: { backgroundColor: '#EAF5EE' },
    deltaNegative: { backgroundColor: '#FBE4DC' },
    deltaBadgeText: {
        fontSize: 12,
        fontWeight: '700' as const,
        fontFamily: 'Outfit',
    },
    deltaPositiveText: { color: '#3D8A5A' },
    deltaNegativeText: { color: '#C95A43' },
};

export default EvolutionSummaryCard;
