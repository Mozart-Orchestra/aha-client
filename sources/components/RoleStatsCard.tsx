import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface RoleStats {
  roleId: string;
  roleName: string;
  avgRating: number;
  tasksCompleted: number;
  successRate: number;
  totalReviews: number;
  userReviews: number;
  masterReviews: number;
  systemReviews: number;
  trend7d: 'up' | 'down' | 'stable';
  trend30d: 'up' | 'down' | 'stable';
}

export interface RoleStatsCardProps {
  stats: RoleStats;
  onPress?: () => void;
}

/**
 * RoleStatsCard Component
 *
 * V4-UX-004: 角色统计数据展示
 *
 * 验收标准:
 * - [x] 角色详情显示平均评分
 * - [x] 显示完成任务数
 * - [x] 显示成功率
 * - [x] 统计数据实时更新
 * - [x] Typecheck passes
 *
 * 使用示例:
 * ```tsx
 * <RoleStatsCard
 *   stats={{
 *     roleId: 'dev-001',
 *     roleName: '前端开发',
 *     avgRating: 4.5,
 *     tasksCompleted: 23,
 *     successRate: 87,
 *     totalReviews: 45,
 *     userReviews: 20,
 *     masterReviews: 15,
 *     systemReviews: 10,
 *     trend7d: 'up',
 *     trend30d: 'stable',
 *   }}
 * />
 * ```
 */
export function RoleStatsCard({ stats, onPress }: RoleStatsCardProps) {
  // Get trend icon
  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return { icon: 'trending-up', color: '#4CAF50' };
      case 'down':
        return { icon: 'trending-down', color: '#F44336' };
      case 'stable':
      default:
        return { icon: 'remove', color: '#999' };
    }
  };

  const trend7dInfo = getTrendIcon(stats.trend7d);
  const trend30dInfo = getTrendIcon(stats.trend30d);

  return (
    <Pressable style={styles.container} onPress={onPress}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.roleInfo}>
          <Ionicons name="person-circle-outline" size={40} color="#2196F3" />
          <View style={styles.roleTextContainer}>
            <Text style={styles.roleName}>{stats.roleName}</Text>
            <Text style={styles.roleId}>ID: {stats.roleId}</Text>
          </View>
        </View>
        <View style={styles.ratingBadge}>
          <Text style={styles.ratingValue}>{stats.avgRating.toFixed(1)}</Text>
          <Text style={styles.ratingMax}>/5</Text>
        </View>
      </View>

      {/* Main Stats */}
      <View style={styles.mainStatsContainer}>
        <View style={styles.statItem}>
          <Ionicons name="checkmark-done-circle" size={24} color="#4CAF50" />
          <Text style={styles.statValue}>{stats.tasksCompleted}</Text>
          <Text style={styles.statLabel}>完成任务</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <Ionicons name="trophy" size={24} color="#FFC107" />
          <Text style={styles.statValue}>{stats.successRate}%</Text>
          <Text style={styles.statLabel}>成功率</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <Ionicons name="star" size={24} color="#FF9800" />
          <Text style={styles.statValue}>{stats.totalReviews}</Text>
          <Text style={styles.statLabel}>总评分</Text>
        </View>
      </View>

      {/* Review Sources */}
      <View style={styles.sourcesContainer}>
        <Text style={styles.sourcesTitle}>评分来源分布</Text>
        <View style={styles.sourcesRow}>
          <View style={styles.sourceItem}>
            <View style={[styles.sourceDot, { backgroundColor: '#2196F3' }]} />
            <Text style={styles.sourceLabel}>用户</Text>
            <Text style={styles.sourceValue}>{stats.userReviews}</Text>
          </View>
          <View style={styles.sourceItem}>
            <View style={[styles.sourceDot, { backgroundColor: '#9C27B0' }]} />
            <Text style={styles.sourceLabel}>主控</Text>
            <Text style={styles.sourceValue}>{stats.masterReviews}</Text>
          </View>
          <View style={styles.sourceItem}>
            <View style={[styles.sourceDot, { backgroundColor: '#00BCD4' }]} />
            <Text style={styles.sourceLabel}>系统</Text>
            <Text style={styles.sourceValue}>{stats.systemReviews}</Text>
          </View>
        </View>
      </View>

      {/* Trends */}
      <View style={styles.trendsContainer}>
        <Text style={styles.trendsTitle}>趋势变化</Text>
        <View style={styles.trendsRow}>
          <View style={styles.trendItem}>
            <Text style={styles.trendLabel}>7天趋势</Text>
            <View style={styles.trendValue}>
              <Ionicons
                name={trend7dInfo.icon as any}
                size={20}
                color={trend7dInfo.color}
              />
              <Text style={[styles.trendText, { color: trend7dInfo.color }]}>
                {stats.trend7d === 'up'
                  ? '上升'
                  : stats.trend7d === 'down'
                  ? '下降'
                  : '持平'}
              </Text>
            </View>
          </View>
          <View style={styles.trendDivider} />
          <View style={styles.trendItem}>
            <Text style={styles.trendLabel}>30天趋势</Text>
            <View style={styles.trendValue}>
              <Ionicons
                name={trend30dInfo.icon as any}
                size={20}
                color={trend30dInfo.color}
              />
              <Text style={[styles.trendText, { color: trend30dInfo.color }]}>
                {stats.trend30d === 'up'
                  ? '上升'
                  : stats.trend30d === 'down'
                  ? '下降'
                  : '持平'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>点击查看详细评分数据</Text>
        <Ionicons name="chevron-forward" size={20} color="#CCC" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  roleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleTextContainer: {
    marginLeft: 12,
  },
  roleName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  roleId: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  ratingValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  ratingMax: {
    fontSize: 14,
    color: '#64B5F6',
    marginBottom: 4,
  },
  mainStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#F0F0F0',
  },
  sourcesContainer: {
    marginBottom: 16,
  },
  sourcesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  sourcesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  sourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sourceDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  sourceLabel: {
    fontSize: 12,
    color: '#666',
    marginRight: 4,
  },
  sourceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  trendsContainer: {
    marginBottom: 16,
  },
  trendsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  trendsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  trendItem: {
    alignItems: 'center',
    flex: 1,
  },
  trendLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 6,
  },
  trendValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  trendDivider: {
    width: 1,
    backgroundColor: '#F0F0F0',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  footerText: {
    fontSize: 14,
    color: '#2196F3',
  },
});
