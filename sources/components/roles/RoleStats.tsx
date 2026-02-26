import * as React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/StyledText';
import { StyleSheet } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import type { RoleStats as RoleStatsType, TeamScorecard } from '@/sync/apiRoles';

interface RoleStatsProps {
    stats?: RoleStatsType;
    scorecard?: TeamScorecard;
    compact?: boolean;
}

export function RoleStats({ stats, scorecard, compact = false }: RoleStatsProps) {
    const data = stats || scorecard;

    if (!data) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No stats available</Text>
            </View>
        );
    }

    const { reviewCount, averageRating, cumulativeCode, cumulativeQuality, sourceScoreTotals } = data;

    const RatingStars = ({ rating }: { rating: number }) => {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;

        return (
            <View style={styles.starsContainer}>
                {[...Array(5)].map((_, i) => (
                    <Ionicons
                        key={i}
                        name={
                            i < fullStars
                                ? 'star'
                                : i === fullStars && hasHalfStar
                                    ? 'star-half'
                                    : 'star-outline'
                        }
                        size={compact ? 12 : 14}
                        color="#FFD700"
                    />
                ))}
            </View>
        );
    };

    if (compact) {
        return (
            <View style={styles.compactContainer}>
                <View style={styles.compactItem}>
                    <RatingStars rating={averageRating || 0} />
                    <Text style={styles.compactValue}>{(averageRating || 0).toFixed(1)}</Text>
                </View>
                <View style={styles.compactDivider} />
                <View style={styles.compactItem}>
                    <Text style={styles.compactLabel}>Reviews</Text>
                    <Text style={styles.compactValue}>{reviewCount || 0}</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.mainRow}>
                <View style={styles.mainStat}>
                    <Text style={styles.mainValue}>{(averageRating || 0).toFixed(2)}</Text>
                    <RatingStars rating={averageRating || 0} />
                    <Text style={styles.mainLabel}>{reviewCount || 0} reviews</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.cumulativeStats}>
                    <View style={styles.cumulativeItem}>
                        <Ionicons name="code-slash" size={16} color="#4A90E2" />
                        <Text style={styles.cumulativeValue}>{cumulativeCode || 0}</Text>
                        <Text style={styles.cumulativeLabel}>Code Σ</Text>
                    </View>
                    <View style={styles.cumulativeItem}>
                        <Ionicons name="sparkles" size={16} color="#9B59B6" />
                        <Text style={styles.cumulativeValue}>{cumulativeQuality || 0}</Text>
                        <Text style={styles.cumulativeLabel}>Quality Σ</Text>
                    </View>
                </View>
            </View>

            {sourceScoreTotals && (
                <View style={styles.sourceRow}>
                    <View style={styles.sourceItem}>
                        <Text style={styles.sourceLabel}>User</Text>
                        <Text style={styles.sourceValue}>{sourceScoreTotals.user || 0}</Text>
                    </View>
                    <View style={styles.sourceItem}>
                        <Text style={styles.sourceLabel}>Master</Text>
                        <Text style={styles.sourceValue}>{sourceScoreTotals.master || 0}</Text>
                    </View>
                    <View style={styles.sourceItem}>
                        <Text style={styles.sourceLabel}>System</Text>
                        <Text style={styles.sourceValue}>{sourceScoreTotals.system || 0}</Text>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create((theme) => ({
    container: {
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        padding: 16,
    },
    emptyContainer: {
        padding: 16,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        fontStyle: 'italic',
    },
    mainRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    mainStat: {
        alignItems: 'center',
        flex: 1,
    },
    mainValue: {
        fontSize: 32,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    mainLabel: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    starsContainer: {
        flexDirection: 'row',
        gap: 2,
        marginTop: 4,
    },
    divider: {
        width: 1,
        height: 60,
        backgroundColor: theme.colors.divider,
        marginHorizontal: 16,
    },
    cumulativeStats: {
        flex: 1,
        gap: 12,
    },
    cumulativeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    cumulativeValue: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        minWidth: 40,
    },
    cumulativeLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    sourceRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: theme.colors.divider,
    },
    sourceItem: {
        alignItems: 'center',
    },
    sourceLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginBottom: 4,
    },
    sourceValue: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
    // Compact styles
    compactContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    compactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    compactDivider: {
        width: 1,
        height: 12,
        backgroundColor: theme.colors.divider,
    },
    compactLabel: {
        fontSize: 11,
        color: theme.colors.textSecondary,
    },
    compactValue: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.text,
    },
}));
