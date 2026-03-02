import React from 'react';
import { View, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Text } from '@/components/StyledText';
import { Ionicons } from '@expo/vector-icons';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  category: 'performance' | 'consistency' | 'mastery' | 'collaboration' | 'special';
  unlockedAt?: number;
  progress?: number; // 0-100 for locked badges
  maxProgress?: number;
  rarity: number; // 0-100, percentage of users who have this badge
}

export interface BadgeDisplayProps {
  /** Role ID */
  roleId: string;
  /** Role title */
  roleTitle: string;
  /** All available badges for this role */
  badges: Badge[];
  /** Callback when badge is pressed */
  onBadgePress?: (badge: Badge) => void;
  /** Show locked badges */
  showLocked?: boolean;
  /** Compact mode for small spaces */
  compact?: boolean;
  /** Maximum number of badges to show in compact mode */
  maxBadges?: number;
}

/**
 * BadgeDisplay Component
 *
 * V5-GAMIFICATION-001: Achievement Badge System
 *
 * Displays achievement badges for roles with progress tracking and unlock animations.
 * Gamifies the role rating experience with visual rewards.
 *
 * Usage:
 * ```tsx
 * <BadgeDisplay
 *   roleId="role-123"
 *   roleTitle="Frontend Architect"
 *   badges={badges}
 *   showLocked={true}
 * />
 * ```
 */
export function BadgeDisplay({
  roleId,
  roleTitle,
  badges,
  onBadgePress,
  showLocked = true,
  compact = false,
  maxBadges = 6,
}: BadgeDisplayProps) {
  const unlockedBadges = React.useMemo(
    () => badges.filter((b) => b.unlockedAt),
    [badges]
  );

  const lockedBadges = React.useMemo(
    () => badges.filter((b) => !b.unlockedAt),
    [badges]
  );

  const displayBadges = React.useMemo(() => {
    if (compact) {
      return unlockedBadges.slice(0, maxBadges);
    }
    return showLocked ? [...unlockedBadges, ...lockedBadges] : unlockedBadges;
  }, [unlockedBadges, lockedBadges, compact, showLocked, maxBadges]);

  const getTierStyle = (tier: Badge['tier']) => {
    switch (tier) {
      case 'bronze':
        return {
          backgroundColor: '#8D6E63',
          shadowColor: '#8D6E63',
          gradient: ['#A1887F', '#8D6E63'],
        };
      case 'silver':
        return {
          backgroundColor: '#90A4AE',
          shadowColor: '#90A4AE',
          gradient: ['#B0BEC5', '#90A4AE'],
        };
      case 'gold':
        return {
          backgroundColor: '#FFD700',
          shadowColor: '#FFD700',
          gradient: ['#FFE082', '#FFD700'],
        };
      case 'platinum':
        return {
          backgroundColor: '#E0E0E0',
          shadowColor: '#E0E0E0',
          gradient: ['#F5F5F5', '#E0E0E0'],
        };
      case 'diamond':
        return {
          backgroundColor: '#00BCD4',
          shadowColor: '#00BCD4',
          gradient: ['#4DD0E1', '#00BCD4'],
        };
    }
  };

  const getCategoryLabel = (category: Badge['category']) => {
    switch (category) {
      case 'performance':
        return 'Performance';
      case 'consistency':
        return 'Consistency';
      case 'mastery':
        return 'Mastery';
      case 'collaboration':
        return 'Collaboration';
      case 'special':
        return 'Special';
    }
  };

  const getRarityLabel = (rarity: number) => {
    if (rarity < 5) return { text: 'Legendary', color: '#FF5722' };
    if (rarity < 15) return { text: 'Epic', color: '#9C27B0' };
    if (rarity < 30) return { text: 'Rare', color: '#2196F3' };
    if (rarity < 60) return { text: 'Uncommon', color: '#4CAF50' };
    return { text: 'Common', color: '#9E9E9E' };
  };

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {displayBadges.map((badge) => {
            const tierStyle = getTierStyle(badge.tier);
            return (
              <Pressable
                key={badge.id}
                style={[
                  styles.compactBadge,
                  { backgroundColor: tierStyle.backgroundColor },
                ]}
                onPress={() => onBadgePress?.(badge)}
              >
                <Ionicons name={badge.icon as any} size={20} color="#FFF" />
              </Pressable>
            );
          })}
          {unlockedBadges.length > maxBadges && (
            <View style={styles.moreBadge}>
              <Text style={styles.moreText}>+{unlockedBadges.length - maxBadges}</Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="trophy" size={24} color="#FFD700" />
        <View style={styles.headerText}>
          <Text style={styles.title}>Achievements</Text>
          <Text style={styles.subtitle}>
            {unlockedBadges.length} of {badges.length} unlocked
          </Text>
        </View>
      </View>

      {/* Progress Overview */}
      <View style={styles.progressOverview}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${(unlockedBadges.length / badges.length) * 100}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {Math.round((unlockedBadges.length / badges.length) * 100)}% Complete
        </Text>
      </View>

      {/* Badges Grid */}
      <View style={styles.badgesGrid}>
        {displayBadges.map((badge) => {
          const tierStyle = getTierStyle(badge.tier);
          const rarityLabel = getRarityLabel(badge.rarity);
          const isLocked = !badge.unlockedAt;

          return (
            <Pressable
              key={badge.id}
              style={[
                styles.badgeCard,
                isLocked && styles.badgeCardLocked,
              ]}
              onPress={() => onBadgePress?.(badge)}
            >
              <View
                style={[
                  styles.badgeIcon,
                  { backgroundColor: tierStyle.backgroundColor },
                  isLocked && styles.badgeIconLocked,
                ]}
              >
                <Ionicons
                  name={badge.icon as any}
                  size={32}
                  color={isLocked ? '#999' : '#FFF'}
                />
                {badge.tier === 'diamond' && !isLocked && (
                  <View style={styles.sparkle}>
                    <Ionicons name="sparkles" size={12} color="#FFF" />
                  </View>
                )}
              </View>

              <Text
                style={[styles.badgeName, isLocked && styles.badgeNameLocked]}
                numberOfLines={1}
              >
                {badge.name}
              </Text>

              <Text style={styles.badgeCategory}>
                {getCategoryLabel(badge.category)}
              </Text>

              {isLocked ? (
                <View style={styles.lockedProgress}>
                  <View style={styles.progressBarSmall}>
                    <View
                      style={[
                        styles.progressFillSmall,
                        { width: `${badge.progress || 0}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressTextSmall}>
                    {badge.progress || 0}%
                  </Text>
                </View>
              ) : (
                <View style={styles.unlockedInfo}>
                  <Text style={[styles.rarityText, { color: rarityLabel.color }]}

>
                    {rarityLabel.text}
                  </Text>
                  {badge.unlockedAt && (
                    <Text style={styles.unlockDate}>
                      {new Date(badge.unlockedAt).toLocaleDateString()}
                    </Text>
                  )}
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerText: {
    marginLeft: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  progressOverview: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
    marginTop: 8,
    textAlign: 'right',
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
  },
  badgeCard: {
    width: '33.33%',
    padding: 8,
    alignItems: 'center',
  },
  badgeCardLocked: {
    opacity: 0.6,
  },
  badgeIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  badgeIconLocked: {
    backgroundColor: '#E0E0E0',
    shadowOpacity: 0,
    elevation: 0,
  },
  sparkle: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  badgeName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  badgeNameLocked: {
    color: '#999',
  },
  badgeCategory: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  lockedProgress: {
    marginTop: 8,
    width: '100%',
    alignItems: 'center',
  },
  progressBarSmall: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    width: '80%',
    overflow: 'hidden',
  },
  progressFillSmall: {
    height: '100%',
    backgroundColor: '#2196F3',
    borderRadius: 2,
  },
  progressTextSmall: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  unlockedInfo: {
    marginTop: 8,
    alignItems: 'center',
  },
  rarityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  unlockDate: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  // Compact mode styles
  compactContainer: {
    flexDirection: 'row',
  },
  compactBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  moreBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
});
