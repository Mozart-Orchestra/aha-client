import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { StyleSheet as UnistylesStyleSheet, useUnistyles } from 'react-native-unistyles';
import { MaterialIcons } from '@expo/vector-icons';
import { WebShell } from '../WebShell';

interface TeamStats {
  teamId: string;
  period: string;
  memberCount: number;
  activeMemberCount: number;
  messageCount: number;
  taskStats: {
    total: number;
    todo: number;
    inProgress: number;
    review: number;
    done: number;
    blocked: number;
  };
  tokenUsage: {
    total: number;
    byModel: {
      opus: number;
      sonnet: number;
      haiku: number;
    };
  };
  costMetrics: {
    totalCost: number;
    estimatedBudget: number;
    budgetUtilization: number;
  };
  lastActivityAt: string;
}

export function W3TeamInfo() {
  const { theme } = useUnistyles();
  const [activeTab, setActiveTab] = useState<'stats' | 'evolution'>('stats');
  const [stats, setStats] = useState<TeamStats | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/teams/team-1/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const TabRow = (
    <View style={styles.tabRow}>
      <Pressable
        style={[styles.tab, activeTab === 'stats' && styles.tabActive]}
        onPress={() => setActiveTab('stats')}
      >
        <Text style={[styles.tabText, activeTab === 'stats' && styles.tabTextActive]}>
          Stats
        </Text>
      </Pressable>
      <Pressable
        style={[styles.tab, activeTab === 'evolution' && styles.tabActive]}
        onPress={() => setActiveTab('evolution')}
      >
        <Text style={[styles.tabText, activeTab === 'evolution' && styles.tabTextActive]}>
          Evolution
        </Text>
      </Pressable>
    </View>
  );

  return (
    <WebShell
      title="Team Stats & Evolution"
      showRightPanel={false}
      activeNavItem="stats"
      rightContent={TabRow}
    >
      <ScrollView style={styles.container}>
        <View style={styles.columns}>
          {/* Left Column - Stats */}
          <View style={styles.leftColumn}>
            {/* Task Stats */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Task Progress</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats?.taskStats.total || 0}</Text>
                  <Text style={styles.statLabel}>Total</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: '#3B82F6' }]}>
                    {stats?.taskStats.inProgress || 0}
                  </Text>
                  <Text style={styles.statLabel}>In Progress</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: '#F59E0B' }]}>
                    {stats?.taskStats.review || 0}
                  </Text>
                  <Text style={styles.statLabel}>Review</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: '#10B981' }]}>
                    {stats?.taskStats.done || 0}
                  </Text>
                  <Text style={styles.statLabel}>Done</Text>
                </View>
              </View>
            </View>

            {/* Token Usage */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Token Usage (7d)</Text>
              <View style={styles.usageBar}>
                <View style={styles.usageRow}>
                  <Text style={styles.usageLabel}>Opus</Text>
                  <View style={styles.usageTrack}>
                    <View
                      style={[
                        styles.usageFill,
                        {
                          width: `${((stats?.tokenUsage.byModel.opus || 0) / (stats?.tokenUsage.total || 1)) * 100}%`,
                          backgroundColor: '#8B5CF6',
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.usageValue}>
                    {formatNumber(stats?.tokenUsage.byModel.opus || 0)}
                  </Text>
                </View>
                <View style={styles.usageRow}>
                  <Text style={styles.usageLabel}>Sonnet</Text>
                  <View style={styles.usageTrack}>
                    <View
                      style={[
                        styles.usageFill,
                        {
                          width: `${((stats?.tokenUsage.byModel.sonnet || 0) / (stats?.tokenUsage.total || 1)) * 100}%`,
                          backgroundColor: '#3B82F6',
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.usageValue}>
                    {formatNumber(stats?.tokenUsage.byModel.sonnet || 0)}
                  </Text>
                </View>
                <View style={styles.usageRow}>
                  <Text style={styles.usageLabel}>Haiku</Text>
                  <View style={styles.usageTrack}>
                    <View
                      style={[
                        styles.usageFill,
                        {
                          width: `${((stats?.tokenUsage.byModel.haiku || 0) / (stats?.tokenUsage.total || 1)) * 100}%`,
                          backgroundColor: '#10B981',
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.usageValue}>
                    {formatNumber(stats?.tokenUsage.byModel.haiku || 0)}
                  </Text>
                </View>
              </View>
              <View style={styles.totalUsage}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>
                  {formatNumber(stats?.tokenUsage.total || 0)} tokens
                </Text>
              </View>
            </View>

            {/* Member Stats */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Team Members</Text>
              <View style={styles.memberStats}>
                <View style={styles.memberStatRow}>
                  <MaterialIcons name="people" size={20} color={theme.colors.primary} />
                  <Text style={styles.memberStatText}>
                    {stats?.activeMemberCount || 0} / {stats?.memberCount || 0} active
                  </Text>
                </View>
                <View style={styles.memberStatRow}>
                  <MaterialIcons name="chat" size={20} color={theme.colors.primary} />
                  <Text style={styles.memberStatText}>
                    {stats?.messageCount || 0} messages
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Right Column - Cost Dashboard */}
          <View style={styles.rightColumn}>
            {/* Cost Overview */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Cost Dashboard</Text>
              <View style={styles.costHighlight}>
                <Text style={styles.costValue}>${stats?.costMetrics.totalCost.toFixed(2) || '0.00'}</Text>
                <Text style={styles.costLabel}>Total Cost (7d)</Text>
              </View>
              <View style={styles.budgetInfo}>
                <View style={styles.budgetRow}>
                  <Text style={styles.budgetLabel}>Budget</Text>
                  <Text style={styles.budgetValue}>
                    ${stats?.costMetrics.estimatedBudget.toFixed(2) || '0.00'}
                  </Text>
                </View>
                <View style={styles.budgetRow}>
                  <Text style={styles.budgetLabel}>Utilization</Text>
                  <Text style={styles.budgetValue}>
                    {stats?.costMetrics.budgetUtilization.toFixed(1) || 0}%
                  </Text>
                </View>
                <View style={styles.budgetProgress}>
                  <View
                    style={[
                      styles.budgetFill,
                      { width: `${Math.min(stats?.costMetrics.budgetUtilization || 0, 100)}%` },
                    ]}
                  />
                </View>
              </View>
            </View>

            {/* Activity Feed */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Recent Activity</Text>
              <View style={styles.activityList}>
                <View style={styles.activityItem}>
                  <MaterialIcons name="check-circle" size={16} color="#10B981" />
                  <Text style={styles.activityText}>Code review completed</Text>
                  <Text style={styles.activityTime}>2m ago</Text>
                </View>
                <View style={styles.activityItem}>
                  <MaterialIcons name="create" size={16} color="#3B82F6" />
                  <Text style={styles.activityText}>New task created</Text>
                  <Text style={styles.activityTime}>15m ago</Text>
                </View>
                <View style={styles.activityItem}>
                  <MaterialIcons name="trending-up" size={16} color="#8B5CF6" />
                  <Text style={styles.activityText}>Agent evolved to L2</Text>
                  <Text style={styles.activityTime}>1h ago</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </WebShell>
  );
}

const styles = UnistylesStyleSheet.create((theme) => ({
  container: {
    flex: 1,
    padding: 20,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 4,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: theme.colors.primaryLight,
  },
  tabText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  tabTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  columns: {
    flexDirection: 'row',
    gap: 20,
  },
  leftColumn: {
    width: 420,
    gap: 12,
  },
  rightColumn: {
    flex: 1,
    gap: 12,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  usageBar: {
    gap: 12,
  },
  usageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  usageLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    width: 60,
  },
  usageTrack: {
    flex: 1,
    height: 8,
    backgroundColor: theme.colors.background,
    borderRadius: 4,
    overflow: 'hidden',
  },
  usageFill: {
    height: '100%',
    borderRadius: 4,
  },
  usageValue: {
    fontSize: 13,
    color: theme.colors.text,
    width: 60,
    textAlign: 'right',
  },
  totalUsage: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  totalLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  memberStats: {
    gap: 12,
  },
  memberStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memberStatText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  costHighlight: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: 12,
    marginBottom: 16,
  },
  costValue: {
    fontSize: 36,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  costLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  budgetInfo: {
    gap: 12,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  budgetLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  budgetValue: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
  },
  budgetProgress: {
    height: 8,
    backgroundColor: theme.colors.background,
    borderRadius: 4,
    overflow: 'hidden',
  },
  budgetFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
  },
  activityList: {
    gap: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activityText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text,
  },
  activityTime: {
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
}));