import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text } from '@/components/StyledText';
import { RatingRadarChart, RatingDimension } from './RatingRadarChart';
import { Ionicons } from '@expo/vector-icons';

export interface RatingDashboardProps {
  dimensions: RatingDimension[];
  teamName?: string;
  showComparison?: boolean;
}

/**
 * RatingDashboard Component
 *
 * V4-UX-002: 评分仪表盘可视化
 *
 * 完整仪表盘，包含雷达图、评分解读、团队对比
 *
 * 使用示例:
 * ```tsx
 * <RatingDashboard
 *   dimensions={[
 *     { dimension: '代码质量', score: 4.5, teamAvg: 4.2 },
 *     { dimension: '协作沟通', score: 4.8, teamAvg: 4.3 },
 *     { dimension: '交付效率', score: 4.2, teamAvg: 4.1 },
 *     { dimension: '创新能力', score: 4.0, teamAvg: 3.8 },
 *   ]}
 *   teamName="前端团队"
 *   showComparison={true}
 * />
 * ```
 */
export function RatingDashboard({
  dimensions,
  teamName = '团队',
  showComparison = true,
}: RatingDashboardProps) {
  // Calculate total score
  const totalScore =
    dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length;
  const teamAvgTotal =
    dimensions.reduce((sum, d) => sum + d.teamAvg, 0) / dimensions.length;

  // Find strengths and weaknesses
  const sortedByScore = [...dimensions].sort((a, b) => b.score - a.score);
  const strengths = sortedByScore.slice(0, 2);
  const weaknesses = sortedByScore.slice(-2).reverse();

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="analytics-outline" size={24} color="#2196F3" />
        <Text style={styles.headerText}>评分仪表盘</Text>
      </View>

      {/* Radar Chart */}
      <RatingRadarChart
        dimensions={dimensions}
        showTeamAvg={showComparison}
      />

      {/* Insights Section */}
      <View style={styles.insightsContainer}>
        <Text style={styles.insightsTitle}>💡 评分洞察</Text>

        {/* Strengths */}
        <View style={styles.insightSection}>
          <Text style={styles.insightLabel}>🏆 优势维度</Text>
          {strengths.map((item, index) => (
            <View key={`strength-${index}`} style={styles.insightItem}>
              <Text style={styles.insightDimension}>{item.dimension}</Text>
              <Text style={styles.insightScore}>{item.score.toFixed(1)}</Text>
            </View>
          ))}
        </View>

        {/* Weaknesses */}
        <View style={styles.insightSection}>
          <Text style={styles.insightLabel}>📈 提升空间</Text>
          {weaknesses.map((item, index) => (
            <View key={`weakness-${index}`} style={styles.insightItem}>
              <Text style={styles.insightDimension}>{item.dimension}</Text>
              <Text style={styles.insightScoreWeak}>{item.score.toFixed(1)}</Text>
            </View>
          ))}
        </View>

        {/* Comparison */}
        {showComparison && (
          <View style={styles.comparisonSection}>
            <Text style={styles.insightLabel}>👥 与{teamName}对比</Text>
            <View style={styles.comparisonRow}>
              <Text style={styles.comparisonText}>
                您的综合评分: <Text style={styles.userScore}>{totalScore.toFixed(1)}</Text>
              </Text>
              <Text style={styles.comparisonText}>
                {teamName}平均: <Text style={styles.teamScore}>{teamAvgTotal.toFixed(1)}</Text>
              </Text>
            </View>
            {totalScore > teamAvgTotal ? (
              <Text style={styles.comparisonPositive}>
                ✅ 高于团队平均 {(totalScore - teamAvgTotal).toFixed(1)} 分
              </Text>
            ) : totalScore < teamAvgTotal ? (
              <Text style={styles.comparisonNegative}>
                📊 低于团队平均 {(teamAvgTotal - totalScore).toFixed(1)} 分
              </Text>
            ) : (
              <Text style={styles.comparisonNeutral}>
                ➡️ 与团队平均持平
              </Text>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    marginBottom: 8,
  },
  headerText: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
    color: '#333',
  },
  insightsContainer: {
    padding: 16,
    backgroundColor: '#FFF',
    marginTop: 8,
    marginBottom: 16,
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  insightSection: {
    marginBottom: 16,
  },
  insightLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  insightItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    marginBottom: 8,
  },
  insightDimension: {
    fontSize: 14,
    color: '#333',
  },
  insightScore: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  insightScoreWeak: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9800',
  },
  comparisonSection: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  comparisonText: {
    fontSize: 14,
    color: '#666',
  },
  userScore: {
    fontWeight: '600',
    color: '#2196F3',
  },
  teamScore: {
    fontWeight: '600',
    color: '#FFC107',
  },
  comparisonPositive: {
    fontSize: 14,
    color: '#4CAF50',
    marginTop: 8,
  },
  comparisonNegative: {
    fontSize: 14,
    color: '#FF9800',
    marginTop: 8,
  },
  comparisonNeutral: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
});
