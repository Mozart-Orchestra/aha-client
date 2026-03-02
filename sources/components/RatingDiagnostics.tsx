import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text } from '@/components/StyledText';
import { Ionicons } from '@expo/vector-icons';

export interface RatingDiagnosticsProps {
  /** Role ID */
  roleId: string;
  /** Role title */
  roleTitle: string;
  /** Rating history data points */
  ratingHistory: Array<{
    timestamp: number;
    rating: number;
    source: 'user' | 'master' | 'system';
    codeScore?: number;
    qualityScore?: number;
  }>;
  /** Team average rating */
  teamAverageRating: number;
  /** Time period for analysis (days) */
  periodDays?: number;
}

interface DiagnosticInsight {
  type: 'strength' | 'weakness' | 'improvement' | 'trend';
  icon: string;
  title: string;
  description: string;
  recommendation?: string;
  priority: 'high' | 'medium' | 'low';
}

/**
 * RatingDiagnostics Component
 *
 * V5-INSIGHTS-001: Rating Diagnostics Report
 *
 * Analyzes rating data to generate insights and improvement recommendations.
 *
 * Usage:
 * ```tsx
 * <RatingDiagnostics
 *   roleId="role-123"
 *   roleTitle="Frontend Architect"
 *   ratingHistory={ratingData}
 *   teamAverageRating={4.2}
 *   periodDays={30}
 * />
 * ```
 */
export function RatingDiagnostics({
  roleId,
  roleTitle,
  ratingHistory,
  teamAverageRating,
  periodDays = 30,
}: RatingDiagnosticsProps) {
  const insights = React.useMemo(() => {
    const result: DiagnosticInsight[] = [];

    if (ratingHistory.length === 0) {
      return result;
    }

    // Calculate basic metrics
    const ratings = ratingHistory.map((r) => r.rating);
    const averageRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    const latestRating = ratings[ratings.length - 1];
    const earliestRating = ratings[0];
    const ratingTrend = latestRating - earliestRating;

    // 1. Team Comparison
    const ratingGap = averageRating - teamAverageRating;
    if (ratingGap >= 0.3) {
      result.push({
        type: 'strength',
        icon: 'trophy',
        title: 'Above Team Average',
        description: `Your average rating (${averageRating.toFixed(1)}) is ${ratingGap.toFixed(1)} points higher than team average (${teamAverageRating.toFixed(1)}).`,
        priority: 'low',
      });
    } else if (ratingGap <= -0.3) {
      result.push({
        type: 'weakness',
        icon: 'trending-down',
        title: 'Below Team Average',
        description: `Your average rating (${averageRating.toFixed(1)}) is ${Math.abs(ratingGap).toFixed(1)} points lower than team average (${teamAverageRating.toFixed(1)}).`,
        recommendation: 'Review recent low-rated tasks and identify common patterns.',
        priority: 'high',
      });
    }

    // 2. Rating Trend
    if (ratingTrend > 0.5) {
      result.push({
        type: 'trend',
        icon: 'trending-up',
        title: 'Improving Trend',
        description: `Your rating has improved by ${ratingTrend.toFixed(1)} points over the last ${periodDays} days.`,
        priority: 'low',
      });
    } else if (ratingTrend < -0.5) {
      result.push({
        type: 'weakness',
        icon: 'alert-circle',
        title: 'Declining Trend',
        description: `Your rating has declined by ${Math.abs(ratingTrend).toFixed(1)} points over the last ${periodDays} days.`,
        recommendation: 'Identify recent tasks with low ratings and focus on quality improvement.',
        priority: 'high',
      });
    }

    // 3. Source Analysis
    const systemRatings = ratingHistory.filter((r) => r.source === 'system');
    if (systemRatings.length > 0) {
      const avgSystemRating =
        systemRatings.reduce((sum, r) => sum + r.rating, 0) / systemRatings.length;

      if (avgSystemRating < 3.5) {
        result.push({
          type: 'weakness',
          icon: 'construct',
          title: 'Code Quality Needs Improvement',
          description: `System-rated code quality score is ${avgSystemRating.toFixed(1)}/5, indicating room for improvement.`,
          recommendation: 'Focus on reducing bugs, improving code readability, and adding comprehensive tests.',
          priority: 'high',
        });
      }
    }

    // 4. Quality vs Code Analysis
    const withScores = ratingHistory.filter((r) => r.codeScore && r.qualityScore);
    if (withScores.length > 0) {
      const avgCode =
        withScores.reduce((sum, r) => sum + (r.codeScore || 0), 0) / withScores.length;
      const avgQuality =
        withScores.reduce((sum, r) => sum + (r.qualityScore || 0), 0) / withScores.length;

      if (avgCode > avgQuality + 15) {
        result.push({
          type: 'improvement',
          icon: 'stats-chart',
          title: 'Quality Focus Needed',
          description: `Code quantity (${avgCode.toFixed(0)}) is high but quality score (${avgQuality.toFixed(0)}) could be improved.`,
          recommendation: 'Prioritize code reviews, testing, and documentation over speed.',
          priority: 'medium',
        });
      } else if (avgQuality > avgCode + 15) {
        result.push({
          type: 'improvement',
          icon: 'speedometer',
          title: 'Efficiency Opportunity',
          description: `Quality score (${avgQuality.toFixed(0)}) is excellent, but code quantity (${avgCode.toFixed(0)}) could be higher.`,
          recommendation: 'Consider optimizing workflow to increase output while maintaining quality.',
          priority: 'low',
        });
      }
    }

    // 5. Consistency Check
    const ratingVariance =
      ratings.reduce((sum, r) => sum + Math.pow(r - averageRating, 2), 0) / ratings.length;
    const ratingStdDev = Math.sqrt(ratingVariance);

    if (ratingStdDev > 1.0) {
      result.push({
        type: 'improvement',
        icon: 'analytics',
        title: 'Inconsistent Performance',
        description: `High rating variability (σ = ${ratingStdDev.toFixed(2)}) suggests inconsistent task performance.`,
        recommendation: 'Establish a consistent workflow and quality checklist for all tasks.',
        priority: 'medium',
      });
    } else if (ratingStdDev < 0.3) {
      result.push({
        type: 'strength',
        icon: 'checkmark-circle',
        title: 'Consistent Performance',
        description: `Low rating variability (σ = ${ratingStdDev.toFixed(2)}) shows reliable, consistent performance.`,
        priority: 'low',
      });
    }

    return result.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, [ratingHistory, teamAverageRating, periodDays]);

  const getInsightStyle = (type: DiagnosticInsight['type']) => {
    switch (type) {
      case 'strength':
        return { backgroundColor: '#E8F5E9', iconColor: '#4CAF50' };
      case 'weakness':
        return { backgroundColor: '#FFEBEE', iconColor: '#F44336' };
      case 'improvement':
        return { backgroundColor: '#FFF3E0', iconColor: '#FF9800' };
      case 'trend':
        return { backgroundColor: '#E3F2FD', iconColor: '#2196F3' };
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="analytics" size={24} color="#2196F3" />
        <Text style={styles.title}>Rating Diagnostics</Text>
        <Text style={styles.subtitle}>
          Analysis for {roleTitle} (Last {periodDays} days)
        </Text>
      </View>

      {insights.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="information-circle" size={48} color="#999" />
          <Text style={styles.emptyText}>
            Not enough data to generate diagnostics.
          </Text>
          <Text style={styles.emptyHint}>
            Complete more tasks and receive ratings to unlock insights.
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.insightsList}>
          {insights.map((insight, index) => {
            const style = getInsightStyle(insight.type);
            return (
              <View key={index} style={[styles.insightCard, { backgroundColor: style.backgroundColor }]}>
                <View style={styles.insightHeader}>
                  <Ionicons name={insight.icon as any} size={20} color={style.iconColor} />
                  <Text style={styles.insightTitle}>{insight.title}</Text>
                  {insight.priority === 'high' && (
                    <View style={styles.priorityBadge}>
                      <Text style={styles.priorityText}>HIGH</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.insightDescription}>{insight.description}</Text>
                {insight.recommendation && (
                  <View style={styles.recommendationBox}>
                    <Ionicons name="bulb" size={14} color="#FF9800" />
                    <Text style={styles.recommendationText}>{insight.recommendation}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
  },
  emptyHint: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  insightsList: {
    flex: 1,
    padding: 16,
  },
  insightCard: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  priorityBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFF',
  },
  insightDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  recommendationBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  recommendationText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
    flex: 1,
    lineHeight: 18,
  },
});
