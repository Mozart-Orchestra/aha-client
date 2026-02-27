import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface LeaderboardItemProps {
  rank: number;
  roleId: string;
  roleName: string;
  score: number;
  maxScore?: number;
  isMe?: boolean;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
  avatarUrl?: string;
  onPress?: () => void;
}

/**
 * LeaderboardItem Component
 *
 * V4-UX-003 + V4-UX-005: "我的排名"高亮显示 + 排名变化趋势
 *
 * 验收标准:
 * - [x] "我的排名"金色边框高亮
 * - [x] 显示排名变化趋势（🔺/🔻/➡️）
 * - [x] 点击可查看详细数据
 * - [ ] Typecheck passes
 */
export function LeaderboardItem({
  rank,
  roleId,
  roleName,
  score,
  maxScore = 5,
  isMe = false,
  trend = 'stable',
  trendValue = 0,
  onPress,
}: LeaderboardItemProps) {
  // Get medal icon for top 3
  const getMedalIcon = () => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return null;
  };

  // Get trend icon
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return '🔺';
      case 'down':
        return '🔻';
      case 'stable':
      default:
        return '➡️';
    }
  };

  // Get trend color
  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return '#4CAF50';
      case 'down':
        return '#F44336';
      case 'stable':
      default:
        return '#999';
    }
  };

  // Get trend text
  const getTrendText = () => {
    if (trendValue === 0) return '持平';
    const direction = trend === 'up' ? '上升' : '下降';
    return `${direction} ${Math.abs(trendValue)} 位`;
  };

  const medal = getMedalIcon();

  return (
    <Pressable
      style={[styles.container, isMe && styles.highlightedContainer]}
      onPress={onPress}
    >
      {/* Rank */}
      <View style={styles.rankContainer}>
        {medal ? (
          <Text style={styles.medal}>{medal}</Text>
        ) : (
          <Text style={[styles.rank, isMe && styles.highlightedRank]}>
            {rank}
          </Text>
        )}
      </View>

      {/* Role Info */}
      <View style={styles.roleContainer}>
        <Text style={[styles.roleName, isMe && styles.highlightedText]}>
          {roleName}
        </Text>
        {isMe && (
          <View style={styles.meBadge}>
            <Text style={styles.meBadgeText}>我</Text>
          </View>
        )}
      </View>

      {/* Score */}
      <View style={styles.scoreContainer}>
        {/* Stars */}
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Ionicons
              key={star}
              name={star <= Math.round(score) ? 'star' : 'star-outline'}
              size={14}
              color="#FFD700"
              style={styles.starIcon}
            />
          ))}
        </View>
        <Text style={[styles.score, isMe && styles.highlightedText]}>
          {score.toFixed(1)}/{maxScore}
        </Text>
      </View>

      {/* Trend */}
      <View style={styles.trendContainer}>
        <Text style={styles.trendIcon}>{getTrendIcon()}</Text>
        <Text style={[styles.trendText, { color: getTrendColor() }]}>
          {getTrendText()}
        </Text>
      </View>

      {/* Arrow */}
      <Ionicons name="chevron-forward" size={20} color="#CCC" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  highlightedContainer: {
    backgroundColor: '#FFF9E6',
    borderWidth: 2,
    borderColor: '#FFC107',
    shadowColor: '#FFC107',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
  },
  rank: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  highlightedRank: {
    color: '#FFC107',
    fontSize: 20,
  },
  medal: {
    fontSize: 24,
  },
  roleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  roleName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  highlightedText: {
    fontWeight: '700',
    color: '#333',
  },
  meBadge: {
    backgroundColor: '#FFC107',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  meBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  scoreContainer: {
    alignItems: 'center',
    marginRight: 16,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  starIcon: {
    marginHorizontal: 1,
  },
  score: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  trendContainer: {
    alignItems: 'center',
    minWidth: 80,
  },
  trendIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
