import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RatingRadarChart, RatingDimension } from './RatingRadarChart';

export interface RoleComparisonData {
  roleId: string;
  roleName: string;
  dimensions: RatingDimension[];
  totalScore: number;
}

export interface RoleComparisonProps {
  roles: RoleComparisonData[];
  onRemoveRole?: (roleId: string) => void;
  maxCompare?: number;
}

/**
 * RoleComparison Component
 *
 * V4-FEATURE-001: 角色对比功能
 *
 * 验收标准:
 * - [x] 支持选择 2-3 个角色对比
 * - [x] 并排显示评分雷达图
 * - [x] 显示评分差异对比
 * - [ ] Typecheck passes
 *
 * 使用示例:
 * ```tsx
 * <RoleComparison
 *   roles={[
 *     {
 *       roleId: 'frontend',
 *       roleName: '前端开发',
 *       dimensions: [...],
 *       totalScore: 4.5,
 *     },
 *     {
 *       roleId: 'backend',
 *       roleName: '后端开发',
 *       dimensions: [...],
 *       totalScore: 4.2,
 *     },
 *   ]}
 *   onRemoveRole={(id) => removeFromComparison(id)}
 * />
 * ```
 */
export function RoleComparison({
  roles,
  onRemoveRole,
  maxCompare = 3,
}: RoleComparisonProps) {
  if (roles.length < 2) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="git-compare-outline" size={48} color="#CCC" />
        <Text style={styles.emptyTitle}>请选择至少 2 个角色进行对比</Text>
        <Text style={styles.emptySubtitle}>
          最多可选择 {maxCompare} 个角色
        </Text>
      </View>
    );
  }

  // Calculate differences
  const baseRole = roles[0];
  const comparisons = roles.slice(1).map((role) => ({
    ...role,
    scoreDiff: role.totalScore - baseRole.totalScore,
    dimensionDiffs: role.dimensions.map((dim, idx) => ({
      dimension: dim.dimension,
      diff: dim.score - baseRole.dimensions[idx].score,
    })),
  }));

  // Find best role in each dimension
  const dimensionWinners = baseRole.dimensions.map((dim, idx) => {
    let winner = baseRole;
    let maxScore = dim.score;
    roles.forEach((role) => {
      if (role.dimensions[idx].score > maxScore) {
        winner = role;
        maxScore = role.dimensions[idx].score;
      }
    });
    return winner.roleId;
  });

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="git-compare" size={24} color="#2196F3" />
          <Text style={styles.title}>角色对比</Text>
        </View>
        <Text style={styles.subtitle}>
          已选择 {roles.length}/{maxCompare} 个角色
        </Text>
      </View>

      {/* Selected Roles */}
      <View style={styles.rolesContainer}>
        {roles.map((role, index) => (
          <View
            key={role.roleId}
            style={[
              styles.roleCard,
              index === 0 && styles.baseRoleCard,
            ]}
          >
            <View style={styles.roleHeader}>
              <View
                style={[
                  styles.roleColorIndicator,
                  { backgroundColor: getRoleColor(index) },
                ]}
              />
              <Text style={styles.roleName}>{role.roleName}</Text>
              {index > 0 && onRemoveRole && (
                <Pressable
                  style={styles.removeButton}
                  onPress={() => onRemoveRole(role.roleId)}
                >
                  <Ionicons name="close-circle" size={20} color="#F44336" />
                </Pressable>
              )}
            </View>
            <View style={styles.roleScore}>
              <Text style={styles.scoreValue}>{role.totalScore.toFixed(1)}</Text>
              <Text style={styles.scoreLabel}>综合评分</Text>
            </View>
            {index === 0 && (
              <View style={styles.baseBadge}>
                <Text style={styles.baseBadgeText}>基准</Text>
              </View>
            )}
          </View>
        ))}
      </View>

      {/* Comparison Radar Charts */}
      <View style={styles.chartsContainer}>
        <Text style={styles.sectionTitle}>雷达图对比</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {roles.map((role, index) => (
            <View key={role.roleId} style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <View
                  style={[
                    styles.chartColorIndicator,
                    { backgroundColor: getRoleColor(index) },
                  ]}
                />
                <Text style={styles.chartRoleName}>{role.roleName}</Text>
              </View>
              <RatingRadarChart
                dimensions={role.dimensions}
                size={200}
                showTeamAvg={false}
              />
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Score Comparison */}
      <View style={styles.comparisonContainer}>
        <Text style={styles.sectionTitle}>评分对比</Text>

        {/* Total Score Comparison */}
        <View style={styles.totalScoreComparison}>
          <Text style={styles.comparisonLabel}>综合评分对比</Text>
          <View style={styles.scoreBars}>
            {roles.map((role, index) => (
              <View key={role.roleId} style={styles.scoreBarRow}>
                <View style={styles.scoreBarLabel}>
                  <View
                    style={[
                      styles.scoreBarColor,
                      { backgroundColor: getRoleColor(index) },
                    ]}
                  />
                  <Text style={styles.scoreBarRoleName}>{role.roleName}</Text>
                </View>
                <View style={styles.scoreBarContainer}>
                  <View
                    style={[
                      styles.scoreBarFill,
                      {
                        width: `${(role.totalScore / 5) * 100}%`,
                        backgroundColor: getRoleColor(index),
                      },
                    ]}
                  />
                </View>
                <Text style={styles.scoreBarValue}>
                  {role.totalScore.toFixed(1)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Dimension Comparison */}
        <View style={styles.dimensionComparison}>
          <Text style={styles.comparisonLabel}>维度对比</Text>
          {baseRole.dimensions.map((dim, idx) => (
            <View key={dim.dimension} style={styles.dimensionRow}>
              <Text style={styles.dimensionName}>{dim.dimension}</Text>
              <View style={styles.dimensionScores}>
                {roles.map((role, roleIdx) => (
                  <View
                    key={role.roleId}
                    style={[
                      styles.dimensionScore,
                      dimensionWinners[idx] === role.roleId &&
                        styles.dimensionScoreWinner,
                    ]}
                  >
                    <View
                      style={[
                        styles.dimensionColor,
                        { backgroundColor: getRoleColor(roleIdx) },
                      ]}
                    />
                    <Text
                      style={[
                        styles.dimensionValue,
                        dimensionWinners[idx] === role.roleId &&
                          styles.dimensionValueWinner,
                      ]}
                    >
                      {role.dimensions[idx].score.toFixed(1)}
                    </Text>
                    {dimensionWinners[idx] === role.roleId && (
                      <Ionicons name="trophy" size={14} color="#FFC107" />
                    )}
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* Difference Analysis */}
        {comparisons.length > 0 && (
          <View style={styles.differenceContainer}>
            <Text style={styles.comparisonLabel}>差异分析 (vs {baseRole.roleName})</Text>
            {comparisons.map((comp) => (
              <View key={comp.roleId} style={styles.differenceCard}>
                <View style={styles.differenceHeader}>
                  <Text style={styles.differenceRoleName}>{comp.roleName}</Text>
                  <View
                    style={[
                      styles.differenceBadge,
                      comp.scoreDiff > 0
                        ? styles.differencePositive
                        : comp.scoreDiff < 0
                        ? styles.differenceNegative
                        : styles.differenceNeutral,
                    ]}
                  >
                    <Text style={styles.differenceBadgeText}>
                      {comp.scoreDiff > 0 ? '+' : ''}
                      {comp.scoreDiff.toFixed(1)}
                    </Text>
                  </View>
                </View>
                <View style={styles.dimensionDiffs}>
                  {comp.dimensionDiffs.map((diff) => (
                    <View key={diff.dimension} style={styles.dimensionDiff}>
                      <Text style={styles.dimensionDiffName}>
                        {diff.dimension}
                      </Text>
                      <Text
                        style={[
                          styles.dimensionDiffValue,
                          diff.diff > 0
                            ? styles.diffPositive
                            : diff.diff < 0
                            ? styles.diffNegative
                            : styles.diffNeutral,
                        ]}
                      >
                        {diff.diff > 0 ? '+' : ''}
                        {diff.diff.toFixed(1)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Summary */}
      <View style={styles.summaryContainer}>
        <Text style={styles.sectionTitle}>对比总结</Text>
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Ionicons name="trophy" size={20} color="#FFC107" />
            <Text style={styles.summaryText}>
              综合评分最高: {' '}
              {
                roles.reduce((max, role) =>
                  role.totalScore > max.totalScore ? role : max
                ).roleName
              }
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Ionicons name="star" size={20} color="#2196F3" />
            <Text style={styles.summaryText}>
              维度优势最多: {' '}
              {
                (() => {
                  const wins: Record<string, number> = {};
                  dimensionWinners.forEach((winner) => {
                    wins[winner] = (wins[winner] || 0) + 1;
                  });
                  const maxWins = Math.max(...Object.values(wins));
                  const winnerId = Object.keys(wins).find(
                    (id) => wins[id] === maxWins
                  );
                  return roles.find((r) => r.roleId === winnerId)?.roleName;
                })()
              }
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

// Helper function to get consistent colors for roles
function getRoleColor(index: number): string {
  const colors = ['#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#00BCD4'];
  return colors[index % colors.length];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#FFF',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  header: {
    backgroundColor: '#FFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  rolesContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#FFF',
    marginBottom: 8,
  },
  roleCard: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
  },
  baseRoleCard: {
    backgroundColor: '#E3F2FD',
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  roleColorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  roleName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  removeButton: {
    padding: 4,
  },
  roleScore: {
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  baseBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#2196F3',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  baseBadgeText: {
    fontSize: 10,
    color: '#FFF',
    fontWeight: '600',
  },
  chartsContainer: {
    backgroundColor: '#FFF',
    padding: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  chartCard: {
    marginRight: 16,
    alignItems: 'center',
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  chartColorIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  chartRoleName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  comparisonContainer: {
    backgroundColor: '#FFF',
    padding: 16,
    marginBottom: 8,
  },
  totalScoreComparison: {
    marginBottom: 24,
  },
  comparisonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  scoreBars: {
    gap: 12,
  },
  scoreBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreBarLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 100,
  },
  scoreBarColor: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  scoreBarRoleName: {
    fontSize: 12,
    color: '#666',
  },
  scoreBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    marginHorizontal: 8,
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  scoreBarValue: {
    width: 40,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'right',
  },
  dimensionComparison: {
    marginBottom: 24,
  },
  dimensionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dimensionName: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  dimensionScores: {
    flexDirection: 'row',
    gap: 16,
  },
  dimensionScore: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  dimensionScoreWinner: {
    backgroundColor: '#FFF9E6',
  },
  dimensionColor: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  dimensionValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginRight: 4,
  },
  dimensionValueWinner: {
    color: '#F9A825',
    fontWeight: '600',
  },
  differenceContainer: {
    marginBottom: 16,
  },
  differenceCard: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  differenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  differenceRoleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  differenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  differencePositive: {
    backgroundColor: '#E8F5E9',
  },
  differenceNegative: {
    backgroundColor: '#FFEBEE',
  },
  differenceNeutral: {
    backgroundColor: '#F5F5F5',
  },
  differenceBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dimensionDiffs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dimensionDiff: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  dimensionDiffName: {
    fontSize: 12,
    color: '#666',
    marginRight: 4,
  },
  dimensionDiffValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  diffPositive: {
    color: '#4CAF50',
  },
  diffNegative: {
    color: '#F44336',
  },
  diffNeutral: {
    color: '#999',
  },
  summaryContainer: {
    backgroundColor: '#FFF',
    padding: 16,
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
});
