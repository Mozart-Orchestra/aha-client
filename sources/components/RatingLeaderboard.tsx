import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LeaderboardItem, LeaderboardItemProps } from './LeaderboardItem';

export interface RatingLeaderboardProps {
  items: LeaderboardItemProps[];
  myRoleId: string;
  title?: string;
  subtitle?: string;
  onItemPress?: (item: LeaderboardItemProps) => void;
  showFilters?: boolean;
}

/**
 * RatingLeaderboard Component
 *
 * V4-UX-003 + V4-UX-005: 完整排行榜 + "我的排名"高亮
 *
 * 验收标准:
 * - [x] 排行榜展示所有角色
 * - [x] "我的排名"金色边框高亮
 * - [x] 显示排名变化趋势（🔺/🔻/➡️）
 * - [x] 点击可查看详细数据
 * - [ ] Typecheck passes
 *
 * 使用示例:
 * ```tsx
 * <RatingLeaderboard
 *   items={leaderboardData}
 *   myRoleId="role-123"
 *   title="角色评分排行榜"
 *   subtitle="本周"
 *   onItemPress={(item) => navigation.navigate('RatingDetail', { roleId: item.roleId })}
 * />
 * ```
 */
export function RatingLeaderboard({
  items,
  myRoleId,
  title = '评分排行榜',
  subtitle,
  onItemPress,
  showFilters = true,
}: RatingLeaderboardProps) {
  // Find my rank
  const myIndex = items.findIndex((item) => item.roleId === myRoleId);
  const myRank = myIndex >= 0 ? myIndex + 1 : null;

  // Filter states (simplified for now)
  const [timeFilter, setTimeFilter] = React.useState<'week' | 'month' | 'all'>('week');
  const [sourceFilter, setSourceFilter] = React.useState<'all' | 'user' | 'master' | 'system'>('all');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="trophy-outline" size={24} color="#FFC107" />
          <Text style={styles.title}>{title}</Text>
        </View>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>

      {/* My Rank Summary */}
      {myRank && (
        <View style={styles.myRankContainer}>
          <Text style={styles.myRankLabel}>我的排名</Text>
          <View style={styles.myRankRow}>
            <Text style={styles.myRankValue}>#{myRank}</Text>
            <Text style={styles.myRankTotal}>/{items.length}</Text>
            {myIndex >= 0 && items[myIndex].trend && (
              <View style={styles.myTrendBadge}>
                <Text style={styles.myTrendIcon}>
                  {items[myIndex].trend === 'up'
                    ? '🔺'
                    : items[myIndex].trend === 'down'
                    ? '🔻'
                    : '➡️'}
                </Text>
                <Text style={styles.myTrendText}>
                  {items[myIndex].trendValue === 0
                    ? '持平'
                    : `${items[myIndex].trend === 'up' ? '上升' : '下降'} ${Math.abs(
                        items[myIndex].trendValue || 0
                      )} 位`}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Filters */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          {/* Time Filter */}
          <View style={styles.filterGroup}>
            <Pressable
              style={[styles.filterButton, timeFilter === 'week' && styles.filterButtonActive]}
              onPress={() => setTimeFilter('week')}
            >
              <Text style={[styles.filterText, timeFilter === 'week' && styles.filterTextActive]}>
                本周
              </Text>
            </Pressable>
            <Pressable
              style={[styles.filterButton, timeFilter === 'month' && styles.filterButtonActive]}
              onPress={() => setTimeFilter('month')}
            >
              <Text style={[styles.filterText, timeFilter === 'month' && styles.filterTextActive]}>
                本月
              </Text>
            </Pressable>
            <Pressable
              style={[styles.filterButton, timeFilter === 'all' && styles.filterButtonActive]}
              onPress={() => setTimeFilter('all')}
            >
              <Text style={[styles.filterText, timeFilter === 'all' && styles.filterTextActive]}>
                全部
              </Text>
            </Pressable>
          </View>

          {/* Source Filter */}
          <View style={styles.filterGroup}>
            <Pressable
              style={[styles.filterButton, sourceFilter === 'all' && styles.filterButtonActive]}
              onPress={() => setSourceFilter('all')}
            >
              <Text style={[styles.filterText, sourceFilter === 'all' && styles.filterTextActive]}>
                全部
              </Text>
            </Pressable>
            <Pressable
              style={[styles.filterButton, sourceFilter === 'user' && styles.filterButtonActive]}
              onPress={() => setSourceFilter('user')}
            >
              <Text style={[styles.filterText, sourceFilter === 'user' && styles.filterTextActive]}>
                用户评分
              </Text>
            </Pressable>
            <Pressable
              style={[styles.filterButton, sourceFilter === 'master' && styles.filterButtonActive]}
              onPress={() => setSourceFilter('master')}
            >
              <Text style={[styles.filterText, sourceFilter === 'master' && styles.filterTextActive]}>
                主控评分
              </Text>
            </Pressable>
            <Pressable
              style={[styles.filterButton, sourceFilter === 'system' && styles.filterButtonActive]}
              onPress={() => setSourceFilter('system')}
            >
              <Text style={[styles.filterText, sourceFilter === 'system' && styles.filterTextActive]}>
                系统评分
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Leaderboard List */}
      <ScrollView style={styles.listContainer}>
        {items.map((item, index) => (
          <LeaderboardItem
            key={item.roleId}
            {...item}
            rank={index + 1}
            isMe={item.roleId === myRoleId}
            onPress={() => onItemPress?.(item)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
  myRankContainer: {
    backgroundColor: '#FFF9E6',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE082',
  },
  myRankLabel: {
    fontSize: 14,
    color: '#F9A825',
    marginBottom: 4,
  },
  myRankRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  myRankValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F9A825',
  },
  myRankTotal: {
    fontSize: 18,
    color: '#F9A825',
    marginRight: 16,
  },
  myTrendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  myTrendIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  myTrendText: {
    fontSize: 14,
    color: '#666',
  },
  filtersContainer: {
    backgroundColor: '#FFF',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  filterGroup: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
  },
  filterButtonActive: {
    backgroundColor: '#2196F3',
  },
  filterText: {
    fontSize: 13,
    color: '#666',
  },
  filterTextActive: {
    color: '#FFF',
    fontWeight: '500',
  },
  listContainer: {
    flex: 1,
    padding: 12,
  },
});
