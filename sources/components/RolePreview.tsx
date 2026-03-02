import React from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Text } from '@/components/StyledText';
import { Ionicons } from '@expo/vector-icons';
import { StarRating } from './StarRating';

export interface RolePreviewProps {
  /** Role ID */
  roleId: string;
  /** Role title */
  title: string;
  /** Role summary/description */
  summary: string;
  /** Role icon name (Ionicons) */
  icon?: string;
  /** Average rating (0-5) */
  averageRating?: number;
  /** Number of completed tasks */
  completedTasks?: number;
  /** Success rate (0-100) */
  successRate?: number;
  /** Skills array */
  skills?: string[];
  /** Responsibilities */
  responsibilities?: string[];
  /** Whether this role is currently in trial */
  isInTrial?: boolean;
  /** Trial end time (timestamp) */
  trialEndTime?: number;
  /** Compare with another role */
  compareWith?: {
    title: string;
    averageRating?: number;
    completedTasks?: number;
    successRate?: number;
  };
  /** Callback when user clicks "Try this role" */
  onTryRole?: () => void;
  /** Callback when user clicks "Add to team" */
  onAddToTeam?: () => void;
  /** Callback when modal is closed */
  onClose?: () => void;
}

/**
 * RolePreviewModal Component
 *
 * V5-UX-001: Role Preview Mode
 *
 * Allows users to preview a role's performance before adding it to the team.
 * Displays role statistics, simulated task scenarios, and comparison with existing roles.
 *
 * Usage:
 * ```tsx
 * <RolePreview
 *   roleId="role-123"
 *   title="Frontend Architect"
 *   summary="Expert in React, TypeScript, and modern frontend architecture"
 *   averageRating={4.5}
 *   completedTasks={23}
 *   successRate={87}
 *   onTryRole={() => handleTryRole('role-123')}
 *   onAddToTeam={() => handleAddRole('role-123')}
 * />
 * ```
 */
export function RolePreview({
  roleId,
  title,
  summary,
  icon = 'person-circle-outline',
  averageRating = 0,
  completedTasks = 0,
  successRate = 0,
  skills = [],
  responsibilities = [],
  isInTrial = false,
  trialEndTime,
  compareWith,
  onTryRole,
  onAddToTeam,
  onClose,
}: RolePreviewProps) {
  const [activeTab, setActiveTab] = React.useState<'stats' | 'scenario' | 'compare'>('stats');

  const formatTrialTime = (timestamp: number): string => {
    const now = Date.now();
    const remaining = timestamp - now;
    if (remaining <= 0) return 'Trial expired';
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m remaining`;
  };

  const renderStatsTab = () => (
    <View style={styles.tabContent}>
      {/* Rating Section */}
      <View style={styles.statSection}>
        <Text style={styles.sectionTitle}>Average Rating</Text>
        <View style={styles.ratingRow}>
          <StarRating value={averageRating} editable={false} size={28} />
          <Text style={styles.ratingValue}>{averageRating.toFixed(1)}</Text>
        </View>
      </View>

      {/* Performance Metrics */}
      <View style={styles.statSection}>
        <Text style={styles.sectionTitle}>Performance Metrics</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <Text style={styles.metricValue}>{completedTasks}</Text>
            <Text style={styles.metricLabel}>Completed Tasks</Text>
          </View>
          <View style={styles.metricCard}>
            <Ionicons name="trending-up" size={24} color="#2196F3" />
            <Text style={styles.metricValue}>{successRate}%</Text>
            <Text style={styles.metricLabel}>Success Rate</Text>
          </View>
        </View>
      </View>

      {/* Skills */}
      {skills.length > 0 && (
        <View style={styles.statSection}>
          <Text style={styles.sectionTitle}>Skills</Text>
          <View style={styles.skillsContainer}>
            {skills.map((skill, index) => (
              <View key={index} style={styles.skillBadge}>
                <Text style={styles.skillText}>{skill}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Responsibilities */}
      {responsibilities.length > 0 && (
        <View style={styles.statSection}>
          <Text style={styles.sectionTitle}>Responsibilities</Text>
          {responsibilities.map((item, index) => (
            <View key={index} style={styles.responsibilityItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.responsibilityText}>{item}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderScenarioTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Simulated Task Scenario</Text>
      <View style={styles.scenarioCard}>
        <Ionicons name="construct" size={32} color="#FF9800" />
        <Text style={styles.scenarioTitle}>Sample Task: Build React Component</Text>
        <Text style={styles.scenarioDescription}>
          This role would analyze requirements, design component architecture, implement
          with TypeScript, and ensure 80%+ test coverage.
        </Text>
        <View style={styles.scenarioMetrics}>
          <View style={styles.scenarioMetric}>
            <Text style={styles.scenarioMetricLabel}>Est. Time</Text>
            <Text style={styles.scenarioMetricValue}>2-3 hours</Text>
          </View>
          <View style={styles.scenarioMetric}>
            <Text style={styles.scenarioMetricLabel}>Est. Quality</Text>
            <Text style={styles.scenarioMetricValue}>⭐ 4.5/5</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderCompareTab = () => {
    if (!compareWith) {
      return (
        <View style={styles.tabContent}>
          <Text style={styles.emptyState}>No role selected for comparison</Text>
          <Text style={styles.emptyStateHint}>
            Select another role from your team to compare performance metrics.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.tabContent}>
        <Text style={styles.sectionTitle}>Role Comparison</Text>

        <View style={styles.compareRow}>
          <View style={styles.compareColumn}>
            <Text style={styles.compareTitle}>{title}</Text>
            <StarRating value={averageRating} editable={false} size={20} />
            <Text style={styles.compareMetric}>{averageRating.toFixed(1)} avg rating</Text>
            <Text style={styles.compareMetric}>{completedTasks} tasks</Text>
            <Text style={styles.compareMetric}>{successRate}% success</Text>
          </View>

          <View style={styles.compareDivider} />

          <View style={styles.compareColumn}>
            <Text style={styles.compareTitle}>{compareWith.title}</Text>
            <StarRating value={compareWith.averageRating || 0} editable={false} size={20} />
            <Text style={styles.compareMetric}>
              {(compareWith.averageRating || 0).toFixed(1)} avg rating
            </Text>
            <Text style={styles.compareMetric}>{compareWith.completedTasks || 0} tasks</Text>
            <Text style={styles.compareMetric}>{compareWith.successRate || 0}% success</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name={icon as any} size={40} color="#2196F3" />
          <View style={styles.headerText}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.summary}>{summary}</Text>
          </View>
        </View>
        {onClose && (
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#666" />
          </Pressable>
        )}
      </View>

      {/* Trial Banner */}
      {isInTrial && trialEndTime && (
        <View style={styles.trialBanner}>
          <Ionicons name="time" size={16} color="#FF9800" />
          <Text style={styles.trialText}>{formatTrialTime(trialEndTime)}</Text>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, activeTab === 'stats' && styles.activeTab]}
          onPress={() => setActiveTab('stats')}
        >
          <Text style={[styles.tabText, activeTab === 'stats' && styles.activeTabText]}>
            Statistics
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'scenario' && styles.activeTab]}
          onPress={() => setActiveTab('scenario')}
        >
          <Text style={[styles.tabText, activeTab === 'scenario' && styles.activeTabText]}>
            Scenario
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'compare' && styles.activeTab]}
          onPress={() => setActiveTab('compare')}
        >
          <Text style={[styles.tabText, activeTab === 'compare' && styles.activeTabText]}>
            Compare
          </Text>
        </Pressable>
      </View>

      {/* Tab Content */}
      <ScrollView style={styles.content}>
        {activeTab === 'stats' && renderStatsTab()}
        {activeTab === 'scenario' && renderScenarioTab()}
        {activeTab === 'compare' && renderCompareTab()}
      </ScrollView>

      {/* Actions */}
      <View style={styles.actions}>
        {!isInTrial && onTryRole && (
          <Pressable style={styles.tryButton} onPress={onTryRole}>
            <Ionicons name="play-circle" size={20} color="#FFF" />
            <Text style={styles.tryButtonText}>Try for 24h</Text>
          </Pressable>
        )}
        {onAddToTeam && (
          <Pressable style={styles.addButton} onPress={onAddToTeam}>
            <Ionicons name="add-circle" size={20} color="#FFF" />
            <Text style={styles.addButtonText}>Add to Team</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  summary: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  closeButton: {
    padding: 8,
  },
  trialBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  trialText: {
    fontSize: 13,
    color: '#FF9800',
    marginLeft: 8,
    fontWeight: '500',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#2196F3',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  activeTabText: {
    color: '#2196F3',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  statSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingValue: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginLeft: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 16,
    marginRight: 12,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  skillBadge: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  skillText: {
    fontSize: 13,
    color: '#2196F3',
  },
  responsibilityItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  bullet: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  responsibilityText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  scenarioCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  scenarioTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  scenarioDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  scenarioMetrics: {
    flexDirection: 'row',
  },
  scenarioMetric: {
    flex: 1,
    alignItems: 'center',
  },
  scenarioMetricLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  scenarioMetricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  compareRow: {
    flexDirection: 'row',
  },
  compareColumn: {
    flex: 1,
    alignItems: 'center',
  },
  compareDivider: {
    width: 1,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 16,
  },
  compareTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  compareMetric: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  emptyState: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 24,
  },
  emptyStateHint: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  tryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9800',
    borderRadius: 8,
    paddingVertical: 12,
    marginRight: 8,
  },
  tryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
    marginLeft: 8,
  },
  addButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: 12,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
    marginLeft: 8,
  },
});
