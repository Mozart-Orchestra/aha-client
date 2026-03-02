import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text } from '@/components/StyledText';
import { Ionicons } from '@expo/vector-icons';

export interface AnalyticsData {
  period: string;
  totalRoles: number;
  activeRoles: number;
  totalRatings: number;
  averageRating: number;
  ratingDistribution: {
    '5': number;
    '4': number;
    '3': number;
    '2': number;
    '1': number;
  };
  topPerformingRoles: Array<{
    id: string;
    title: string;
    averageRating: number;
    completedTasks: number;
  }>;
  bottomPerformingRoles: Array<{
    id: string;
    title: string;
    averageRating: number;
    completedTasks: number;
  }>;
  ratingTrend: Array<{
    date: string;
    averageRating: number;
    count: number;
  }>;
  categoryDistribution: Array<{
    category: string;
    count: number;
    averageRating: number;
  }>;
}

export interface AnalyticsDashboardProps {
  data: AnalyticsData;
  onRolePress?: (roleId: string) => void;
  onExport?: () => void;
}

export function AnalyticsDashboard({
  data,
  onRolePress,
  onExport,
}: AnalyticsDashboardProps) {
  const totalPossible =
    data.ratingDistribution['5'] +
    data.ratingDistribution['4'] +
    data.ratingDistribution['3'] +
    data.ratingDistribution['2'] +
    data.ratingDistribution['1'];

  const getRatingPercentage = (count: number) =>
    totalPossible > 0 ? (count / totalPossible) * 100 : 0;

  const renderStatCard = (
    icon: string,
    value: string | number,
    label: string,
    color: string
  ) => (
    <View key={label} style={styles.statCard}>
      <View style={[styles.statIconContainer, { backgroundColor: color }]}>
        <Ionicons name={icon as any} size={20} color="#FFF" />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="analytics" size={28} color="#2196F3" />
        <View style={styles.headerText}>
          <Text style={styles.title}>Analytics Dashboard</Text>
          <Text style={styles.subtitle}>{data.period}</Text>
        </View>
      </View>

      {/* Overview Stats */}
      <View style={styles.statsGrid}>
        {renderStatCard('people', data.totalRoles, 'Total Roles', '#2196F3')}
        {renderStatCard('checkmark-circle', data.activeRoles, 'Active Roles', '#4CAF50')}
        {renderStatCard('star', data.totalRatings, 'Total Ratings', '#FF9800')}
        {renderStatCard(
          'trending-up',
          data.averageRating.toFixed(1),
          'Avg Rating',
          '#9C27B0'
        )}
      </View>

      {/* Rating Distribution */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Rating Distribution</Text>
        <View style={styles.distributionContainer}>
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = data.ratingDistribution[rating.toString() as keyof typeof data.ratingDistribution];
            const percentage = getRatingPercentage(count);
            return (
              <View key={rating} style={styles.distributionRow}>
                <Text style={styles.distributionLabel}>{rating}★</Text>
                <View style={styles.distributionBar}>
                  <View
                    style={[
                      styles.distributionFill,
                      {
                        width: `${percentage}%`,
                        backgroundColor:
                          rating >= 4
                            ? '#4CAF50'
                            : rating === 3
                            ? '#FF9800'
                            : '#F44336',
                      },
                    ]}
                  />
                </View>
                <Text style={styles.distributionCount}>{count}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Top Performing Roles */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="trophy" size={20} color="#FFD700" />
          <Text style={styles.sectionTitle}>Top Performing Roles</Text>
        </View>
        {data.topPerformingRoles.map((role, index) => (
          <View
            key={role.id}
            style={styles.roleItem}
            onTouchEnd={() => onRolePress?.(role.id)}
          >
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>#{index + 1}</Text>
            </View>
            <View style={styles.roleInfo}>
              <Text style={styles.roleName}>{role.title}</Text>
              <Text style={styles.roleStats}>
                {role.completedTasks} tasks completed
              </Text>
            </View>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={14} color="#FFD700" />
              <Text style={styles.ratingText}>
                {role.averageRating.toFixed(1)}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Category Distribution */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="pie-chart" size={20} color="#2196F3" />
          <Text style={styles.sectionTitle}>Categories</Text>
        </View>
        <View style={styles.categoryGrid}>
          {data.categoryDistribution.map((cat) => (
            <View key={cat.category} style={styles.categoryItem}>
              <Text style={styles.categoryName}>{cat.category}</Text>
              <Text style={styles.categoryCount}>{cat.count} roles</Text>
              <View style={styles.categoryRating}>
                <Ionicons name="star" size={12} color="#FFD700" />
                <Text style={styles.categoryRatingText}>
                  {cat.averageRating.toFixed(1)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Export Button */}
      {onExport && (
        <View style={styles.exportSection}>
          <View
            style={styles.exportButton}
            onTouchEnd={onExport}
          >
            <Ionicons name="download" size={18} color="#2196F3" />
            <Text style={styles.exportText}>Export Report</Text>
          </View>
        </View>
      )}
    </ScrollView>
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
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 8,
  },
  statCard: {
    width: '23%',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  distributionContainer: {
    gap: 8,
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distributionLabel: {
    width: 30,
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  distributionBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  distributionFill: {
    height: '100%',
    borderRadius: 4,
  },
  distributionCount: {
    width: 40,
    fontSize: 13,
    color: '#666',
    textAlign: 'right',
  },
  roleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  roleInfo: {
    flex: 1,
    marginLeft: 12,
  },
  roleName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  roleStats: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF9800',
    marginLeft: 4,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryItem: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    minWidth: '30%',
    alignItems: 'center',
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  categoryCount: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  categoryRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  categoryRatingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF9800',
    marginLeft: 2,
  },
  exportSection: {
    padding: 16,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3F2FD',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  exportText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
  },
});
