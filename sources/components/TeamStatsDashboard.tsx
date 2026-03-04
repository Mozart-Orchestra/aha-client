/**
 * R7 Team Stats Dashboard Component
 * Displays team statistics, usage metrics, and cost tracking
 */

import React from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { Text } from '@/components/StyledText';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import { useTeamStats, useTeamUsageTimeline, formatTokens, formatCost, calculatePercentage } from '@/hooks/useTeamStats';

interface TeamStatsDashboardProps {
  teamId: string;
}

export function TeamStatsDashboard({ teamId }: TeamStatsDashboardProps) {
  const { theme } = useUnistyles();
  const { stats, isLoading: statsLoading, error: statsError } = useTeamStats(teamId);
  const { timeline, isLoading: timelineLoading } = useTeamUsageTimeline(teamId, '7d');

  if (statsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.button.primary.background} />
        <Text style={styles.loadingText}>Loading team stats...</Text>
      </View>
    );
  }

  if (statsError || !stats) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color={theme.colors.error} />
        <Text style={styles.errorText}>
          {statsError || 'Failed to load team stats'}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Team Statistics</Text>
        <Text style={styles.subtitle}>
          Last updated: {stats.lastActivityAt ? new Date(stats.lastActivityAt).toLocaleString() : 'N/A'}
        </Text>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryGrid}>
        <SummaryCard
          icon="people"
          label="Members"
          value={`${stats.activeMemberCount}/${stats.memberCount}`}
          subtitle="Active"
          color="#3D8A5A"
        />
        <SummaryCard
          icon="chatbubbles"
          label="Messages"
          value={stats.messageCount.toString()}
          subtitle="This period"
          color="#2F7A9B"
        />
        <SummaryCard
          icon="cash"
          label="Cost"
          value={formatCost(stats.costMetrics.totalCost)}
          subtitle={`${stats.costMetrics.budgetUtilization.toFixed(1)}% of budget`}
          color={theme.colors.success}
        />
        <SummaryCard
          icon="document-text"
          label="Tokens"
          value={formatTokens(stats.tokenUsage.total)}
          subtitle="Total usage"
          color={theme.colors.warning}
        />
      </View>

      {/* Task Stats Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Task Overview</Text>
        <View style={styles.taskStatsContainer}>
          <TaskStatItem
            label="To Do"
            value={stats.taskStats.todo}
            total={stats.taskStats.total}
            color="#6B7280"
          />
          <TaskStatItem
            label="In Progress"
            value={stats.taskStats.inProgress}
            total={stats.taskStats.total}
            color="#2F7A9B"
          />
          <TaskStatItem
            label="Review"
            value={stats.taskStats.review}
            total={stats.taskStats.total}
            color={theme.colors.warning}
          />
          <TaskStatItem
            label="Done"
            value={stats.taskStats.done}
            total={stats.taskStats.total}
            color={theme.colors.success}
          />
          {stats.taskStats.blocked > 0 && (
            <TaskStatItem
              label="Blocked"
              value={stats.taskStats.blocked}
              total={stats.taskStats.total}
              color={theme.colors.error}
            />
          )}
        </View>
      </View>

      {/* Token Usage by Model */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Token Usage by Model</Text>
        <View style={styles.modelUsageContainer}>
          <ModelUsageBar
            label="Opus"
            value={stats.tokenUsage.byModel.opus}
            total={stats.tokenUsage.total}
            color="#8B5CF6"
          />
          <ModelUsageBar
            label="Sonnet"
            value={stats.tokenUsage.byModel.sonnet}
            total={stats.tokenUsage.total}
            color="#3B82F6"
          />
          <ModelUsageBar
            label="Haiku"
            value={stats.tokenUsage.byModel.haiku}
            total={stats.tokenUsage.total}
            color="#10B981"
          />
        </View>
      </View>

      {/* Code Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Code Activity</Text>
        <View style={styles.codeMetricsContainer}>
          <CodeMetricItem
            icon="git-commit"
            label="Commits"
            value={stats.codeMetrics.totalCommits}
          />
          <CodeMetricItem
            icon="document"
            label="Files Changed"
            value={stats.codeMetrics.totalFilesChanged}
          />
          <CodeMetricItem
            icon="code-slash"
            label="Lines Changed"
            value={stats.codeMetrics.totalLinesChanged}
          />
        </View>
      </View>

      {/* Usage Timeline */}
      {timeline && !timelineLoading && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Usage Timeline (7 Days)</Text>
          <View style={styles.timelineContainer}>
            {timeline.data.map((point, index) => (
              <TimelineBar
                key={index}
                day={new Date(point.timestamp).toLocaleDateString('en-US', { weekday: 'short' })}
                tokens={point.tokens}
                cost={point.cost}
                maxTokens={Math.max(...timeline.data.map(d => d.tokens))}
              />
            ))}
          </View>
          <View style={styles.timelineSummary}>
            <Text style={styles.timelineSummaryText}>
              Daily avg: {formatTokens(timeline.summary.avgTokensPerDay)} tokens · {formatCost(timeline.summary.avgCostPerDay)}
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

// Summary Card Component
interface SummaryCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  subtitle: string;
  color: string;
}

function SummaryCard({ icon, label, value, subtitle, color }: SummaryCardProps) {
  return (
    <View style={[styles.summaryCard, { borderLeftColor: color, borderLeftWidth: 4 }]}>
      <View style={styles.summaryCardHeader}>
        <Ionicons name={icon} size={20} color={color} />
        <Text style={styles.summaryCardLabel}>{label}</Text>
      </View>
      <Text style={styles.summaryCardValue}>{value}</Text>
      <Text style={styles.summaryCardSubtitle}>{subtitle}</Text>
    </View>
  );
}

// Task Stat Item Component
interface TaskStatItemProps {
  label: string;
  value: number;
  total: number;
  color: string;
}

function TaskStatItem({ label, value, total, color }: TaskStatItemProps) {
  const percentage = calculatePercentage(value, total);

  return (
    <View style={styles.taskStatItem}>
      <View style={styles.taskStatHeader}>
        <Text style={styles.taskStatLabel}>{label}</Text>
        <Text style={styles.taskStatValue}>{value}</Text>
      </View>
      <View style={styles.taskStatBar}>
        <View
          style={[
            styles.taskStatBarFill,
            { width: `${percentage}%`, backgroundColor: color },
          ]}
        />
      </View>
      <Text style={styles.taskStatPercentage}>{percentage}%</Text>
    </View>
  );
}

// Model Usage Bar Component
interface ModelUsageBarProps {
  label: string;
  value: number;
  total: number;
  color: string;
}

function ModelUsageBar({ label, value, total, color }: ModelUsageBarProps) {
  const percentage = calculatePercentage(value, total);

  return (
    <View style={styles.modelUsageItem}>
      <View style={styles.modelUsageHeader}>
        <Text style={styles.modelUsageLabel}>{label}</Text>
        <Text style={styles.modelUsageValue}>{formatTokens(value)}</Text>
      </View>
      <View style={styles.modelUsageBar}>
        <View
          style={[
            styles.modelUsageBarFill,
            { width: `${percentage}%`, backgroundColor: color },
          ]}
        />
      </View>
      <Text style={styles.modelUsagePercentage}>{percentage}%</Text>
    </View>
  );
}

// Code Metric Item Component
interface CodeMetricItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
}

function CodeMetricItem({ icon, label, value }: CodeMetricItemProps) {
  const { theme } = useUnistyles();

  return (
    <View style={styles.codeMetricItem}>
      <Ionicons name={icon} size={24} color={theme.colors.button.primary.background} />
      <Text style={styles.codeMetricValue}>{value.toLocaleString()}</Text>
      <Text style={styles.codeMetricLabel}>{label}</Text>
    </View>
  );
}

// Timeline Bar Component
interface TimelineBarProps {
  day: string;
  tokens: number;
  cost: number;
  maxTokens: number;
}

function TimelineBar({ day, tokens, cost, maxTokens }: TimelineBarProps) {
  const height = maxTokens > 0 ? (tokens / maxTokens) * 100 : 0;

  return (
    <View style={styles.timelineItem}>
      <View style={styles.timelineBarContainer}>
        <View style={[styles.timelineBar, { height: `${height}%` }]} />
      </View>
      <Text style={styles.timelineDay}>{day}</Text>
      <Text style={styles.timelineCost}>{formatCost(cost)}</Text>
    </View>
  );
}

const stylesheet = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.groupped?.background || theme.colors.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorText: {
    marginTop: 16,
    fontSize: 14,
    color: theme.colors.error,
    textAlign: 'center',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    minWidth: 140,
    flex: 1,
  },
  summaryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  summaryCardLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryCardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  summaryCardSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  section: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 16,
  },
  taskStatsContainer: {
    gap: 12,
  },
  taskStatItem: {
    gap: 8,
  },
  taskStatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskStatLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  taskStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  taskStatBar: {
    height: 8,
    backgroundColor: theme.colors.divider,
    borderRadius: 4,
    overflow: 'hidden',
  },
  taskStatBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  taskStatPercentage: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'right',
  },
  modelUsageContainer: {
    gap: 16,
  },
  modelUsageItem: {
    gap: 8,
  },
  modelUsageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modelUsageLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  modelUsageValue: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
  },
  modelUsageBar: {
    height: 8,
    backgroundColor: theme.colors.divider,
    borderRadius: 4,
    overflow: 'hidden',
  },
  modelUsageBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  modelUsagePercentage: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'right',
  },
  codeMetricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  codeMetricItem: {
    alignItems: 'center',
    gap: 8,
  },
  codeMetricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  codeMetricLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  timelineContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingVertical: 8,
  },
  timelineItem: {
    alignItems: 'center',
    flex: 1,
  },
  timelineBarContainer: {
    width: 24,
    height: 80,
    backgroundColor: theme.colors.divider,
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  timelineBar: {
    width: '100%',
    backgroundColor: theme.colors.button.primary.background,
    borderRadius: 4,
  },
  timelineDay: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  timelineCost: {
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  timelineSummary: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border || '#E5E7EB',
  },
  timelineSummaryText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
}));

const styles = stylesheet;
