import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from '@/components/StyledText';
import { Ionicons } from '@expo/vector-icons';
import { useUnistyles } from 'react-native-unistyles';
import type { TeamEvoMap, TeamReleaseGate } from '@/sync/apiTeamComposition';
import { calculateGateReadiness } from '@/utils/versionGate';

export interface EvoMapDisplayProps {
  /** The EvoMap data to display */
  evoMap: TeamEvoMap;
  /** Show detailed breakdown */
  detailed?: boolean;
  /** Compact mode for small spaces */
  compact?: boolean;
}

/**
 * EvoMapDisplay Component
 *
 * V6: Multi-team Adaptive + EvoMap + Three-endpoint Version Gate
 *
 * Displays team evolution map with visual indicators:
 * - Tier badge (S/A/B/C) with color coding
 * - Score with progress indicator
 * - Trend arrow (up/flat/down)
 * - Highlights as bullet points
 *
 * Usage:
 * ```tsx
 * <EvoMapDisplay
 *   evoMap={{ score: 4.2, tier: 'A', trend: 'up', highlights: ['Fast delivery', 'High quality'] }}
 *   detailed={true}
 * />
 * ```
 */
export function EvoMapDisplay({ evoMap, detailed = false, compact = false }: EvoMapDisplayProps) {
  const { theme } = useUnistyles();

  const getTierColor = (tier: TeamEvoMap['tier']) => {
    switch (tier) {
      case 'S':
        return '#FFD700'; // Gold
      case 'A':
        return '#4CAF50'; // Green
      case 'B':
        return '#2196F3'; // Blue
      case 'C':
        return '#9E9E9E'; // Gray
      default:
        return theme.colors.textSecondary;
    }
  };

  const getTierBgColor = (tier: TeamEvoMap['tier']) => {
    switch (tier) {
      case 'S':
        return 'rgba(255, 215, 0, 0.15)';
      case 'A':
        return 'rgba(76, 175, 80, 0.15)';
      case 'B':
        return 'rgba(33, 150, 243, 0.15)';
      case 'C':
        return 'rgba(158, 158, 158, 0.15)';
      default:
        return theme.colors.groupped.background;
    }
  };

  const getTrendIcon = (trend: TeamEvoMap['trend']) => {
    switch (trend) {
      case 'up':
        return 'trending-up';
      case 'down':
        return 'trending-down';
      case 'flat':
        return 'remove';
      default:
        return 'remove';
    }
  };

  const getTrendColor = (trend: TeamEvoMap['trend']) => {
    switch (trend) {
      case 'up':
        return '#4CAF50';
      case 'down':
        return '#F44336';
      case 'flat':
        return '#9E9E9E';
      default:
        return theme.colors.textSecondary;
    }
  };

  const tierColor = getTierColor(evoMap.tier);
  const tierBgColor = getTierBgColor(evoMap.tier);
  const trendColor = getTrendColor(evoMap.trend);

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={[styles.tierBadge, { backgroundColor: tierBgColor, borderColor: tierColor }]}>
          <Text style={[styles.tierText, { color: tierColor }]}>{evoMap.tier}</Text>
        </View>
        <Text style={styles.compactScore}>{evoMap.score.toFixed(1)}</Text>
        <Ionicons name={getTrendIcon(evoMap.trend)} size={14} color={trendColor} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={[styles.tierBadge, { backgroundColor: tierBgColor, borderColor: tierColor }]}>
          <Text style={[styles.tierText, { color: tierColor }]}>Tier {evoMap.tier}</Text>
        </View>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreLabel}>Score</Text>
          <Text style={styles.scoreValue}>{evoMap.score.toFixed(1)}</Text>
        </View>
        <View style={styles.trendContainer}>
          <Ionicons name={getTrendIcon(evoMap.trend)} size={20} color={trendColor} />
          <Text style={[styles.trendText, { color: trendColor }]}>
            {evoMap.trend === 'up' ? 'Rising' : evoMap.trend === 'down' ? 'Declining' : 'Stable'}
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${(evoMap.score / 5) * 100}%`,
                backgroundColor: tierColor,
              },
            ]}
          />
        </View>
        <Text style={styles.progressLabel}>0</Text>
        <Text style={styles.progressLabel}>5</Text>
      </View>

      {/* Highlights */}
      {detailed && evoMap.highlights && evoMap.highlights.length > 0 && (
        <View style={styles.highlightsContainer}>
          <Text style={styles.highlightsTitle}>Strengths</Text>
          {evoMap.highlights.map((highlight, index) => (
            <View key={index} style={styles.highlightItem}>
              <Ionicons name="star" size={12} color={tierColor} />
              <Text style={styles.highlightText}>{highlight}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export interface ReleaseGateCardProps {
  /** The release gate data */
  gate: TeamReleaseGate;
  /** Callback when a check is pressed */
  onCheckPress?: (component: 'aha-cli' | 'happy-server' | 'kanban', status: string) => void;
  /** Show environment details */
  showEnvironments?: boolean;
}

/**
 * ReleaseGateCard Component
 *
 * V6: Multi-team Adaptive + EvoMap + Three-endpoint Version Gate
 *
 * Displays release gate as a visual checklist with:
 * - Version track and branch info
 * - Three-endpoint check status (aha-cli, happy-server, kanban)
 * - Environment flow (uv1 -> uv2 -> wow)
 * - Ready status indicator
 *
 * Usage:
 * ```tsx
 * <ReleaseGateCard
 *   gate={releaseGate}
 *   showEnvironments={true}
 * />
 * ```
 */
export function ReleaseGateCard({ gate, onCheckPress, showEnvironments = true }: ReleaseGateCardProps) {
  const { theme } = useUnistyles();
  const readiness = calculateGateReadiness(gate);

  const getComponentIcon = (component: string) => {
    switch (component) {
      case 'aha-cli':
        return 'terminal';
      case 'happy-server':
        return 'server';
      case 'kanban':
        return 'grid';
      default:
        return 'help-circle';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed':
        return '#4CAF50';
      case 'failed':
        return '#F44336';
      case 'pending':
      default:
        return '#9E9E9E';
    }
  };

  return (
    <View style={[styles.gateCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider }]}>
      {/* Header */}
      <View style={styles.gateHeader}>
        <View style={styles.gateTitleRow}>
          <View style={[styles.versionBadge, { backgroundColor: theme.colors.button.primary.background }]}>
            <Text style={styles.versionBadgeText}>{gate.versionTrack.toUpperCase()}</Text>
          </View>
          <Text style={[styles.branchName, { color: theme.colors.text }]} numberOfLines={1}>
            {gate.branch}
          </Text>
        </View>
        <View style={styles.readinessBadge}>
          {readiness.ready ? (
            <View style={[styles.readyBadge, { backgroundColor: 'rgba(76, 175, 80, 0.15)' }]}>
              <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
              <Text style={[styles.readyText, { color: '#4CAF50' }]}>Ready</Text>
            </View>
          ) : (
            <View style={[styles.pendingBadge, { backgroundColor: 'rgba(255, 152, 0, 0.15)' }]}>
              <Ionicons name="time" size={14} color="#FF9800" />
              <Text style={[styles.pendingText, { color: '#FF9800' }]}>
                {readiness.passed}/{readiness.total} Passed
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Three-endpoint Checklist */}
      <View style={styles.checklistContainer}>
        {gate.requiredChecks.map((check, index) => {
          const statusColor = getStatusColor(check.status);
          const isPassed = check.status === 'passed';

          return (
            <Pressable
              key={`${gate.branch}-${check.component}-${index}`}
              style={[styles.checkItem, { borderBottomColor: theme.colors.divider }]}
              onPress={() => onCheckPress?.(check.component, check.status)}
              disabled={!onCheckPress}
            >
              <View style={styles.checkLeft}>
                <View style={[styles.componentIcon, { backgroundColor: isPassed ? 'rgba(76, 175, 80, 0.15)' : theme.colors.groupped.background }]}>
                  <Ionicons
                    name={getComponentIcon(check.component) as any}
                    size={16}
                    color={isPassed ? '#4CAF50' : theme.colors.textSecondary}
                  />
                </View>
                <View style={styles.componentInfo}>
                  <Text style={[styles.componentName, { color: theme.colors.text }]}>
                    {check.component === 'aha-cli' ? 'CLI' : check.component === 'happy-server' ? 'Server' : 'Kanban'}
                  </Text>
                  {showEnvironments && (
                    <Text style={styles.envFlow}>
                      {check.environments.join(' → ')}
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.checkRight}>
                <Ionicons
                  name={isPassed ? 'checkmark-circle' : check.status === 'failed' ? 'close-circle' : 'time-outline'}
                  size={20}
                  color={statusColor}
                />
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Completion Rule */}
      <View style={[styles.ruleContainer, { backgroundColor: theme.colors.groupped.background }]}>
        <Ionicons name="information-circle-outline" size={14} color={theme.colors.textSecondary} />
        <Text style={styles.ruleText}>{gate.completionRule}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // EvoMapDisplay styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  tierText: {
    fontSize: 12,
    fontWeight: '700',
  },
  compactScore: {
    fontSize: 14,
    fontWeight: '600',
  },
  container: {
    marginTop: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  scoreContainer: {
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 10,
    color: '#9E9E9E',
    textTransform: 'uppercase',
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 10,
    color: '#9E9E9E',
  },
  highlightsContainer: {
    marginTop: 8,
    padding: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  highlightsTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  highlightText: {
    fontSize: 12,
    color: '#666',
  },

  // ReleaseGateCard styles
  gateCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginTop: 8,
  },
  gateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  gateTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  versionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  versionBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  branchName: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  readinessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  readyText: {
    fontSize: 11,
    fontWeight: '600',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingText: {
    fontSize: 11,
    fontWeight: '600',
  },
  checklistContainer: {
    marginBottom: 10,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  checkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  componentIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  componentInfo: {
    gap: 2,
  },
  componentName: {
    fontSize: 14,
    fontWeight: '600',
  },
  envFlow: {
    fontSize: 10,
    color: '#9E9E9E',
  },
  checkRight: {
    padding: 4,
  },
  ruleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 6,
  },
  ruleText: {
    fontSize: 11,
    color: '#666',
    flex: 1,
  },
});
