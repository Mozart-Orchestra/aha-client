import React from 'react';
import { View, ScrollView, Pressable, StyleSheet, Linking } from 'react-native';
import { Text } from '@/components/StyledText';
import { Ionicons } from '@expo/vector-icons';

export interface ImprovementSuggestion {
  id: string;
  category: 'code-quality' | 'efficiency' | 'collaboration' | 'learning';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actions: string[];
  resources?: Array<{
    title: string;
    url: string;
    type: 'article' | 'video' | 'course' | 'tool';
  }>;
  estimatedEffort: 'quick-fix' | 'moderate' | 'significant';
  impactScore: number; // 1-10
}

export interface ImprovementSuggestionsProps {
  /** Role ID */
  roleId: string;
  /** Role title */
  roleTitle: string;
  /** Diagnostic insights from RatingDiagnostics */
  diagnosticInsights: Array<{
    type: 'strength' | 'weakness' | 'improvement' | 'trend';
    title: string;
    description: string;
    recommendation?: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  /** Average rating */
  averageRating: number;
  /** Number of completed tasks */
  completedTasks: number;
  /** Callback when suggestion is dismissed */
  onDismiss?: (suggestionId: string) => void;
  /** Callback when suggestion action is completed */
  onActionComplete?: (suggestionId: string, actionIndex: number) => void;
}

/**
 * ImprovementSuggestions Component
 *
 * V5-AI-002: Personalized Improvement Suggestions
 *
 * Generates specific, actionable improvement suggestions based on diagnostic insights.
 * Provides learning resources and tracks improvement progress.
 *
 * Usage:
 * ```tsx
 * <ImprovementSuggestions
 *   roleId="role-123"
 *   roleTitle="Frontend Architect"
 *   diagnosticInsights={insights}
 *   averageRating={4.2}
 *   completedTasks={23}
 * />
 * ```
 */
export function ImprovementSuggestions({
  roleId,
  roleTitle,
  diagnosticInsights,
  averageRating,
  completedTasks,
  onDismiss,
  onActionComplete,
}: ImprovementSuggestionsProps) {
  const suggestions = React.useMemo(() => {
    const result: ImprovementSuggestion[] = [];

    // Generate suggestions based on diagnostic insights
    diagnosticInsights.forEach((insight, index) => {
      if (insight.type === 'weakness' || insight.type === 'improvement') {
        // Code Quality issues
        if (
          insight.title.toLowerCase().includes('code quality') ||
          insight.title.toLowerCase().includes('quality focus')
        ) {
          result.push({
            id: `suggestion-${index}-code-quality`,
            category: 'code-quality',
            priority: insight.priority,
            title: 'Improve Code Quality',
            description: insight.recommendation || insight.description,
            actions: [
              'Add comprehensive unit tests (aim for 80%+ coverage)',
              'Implement code review checklist',
              'Use static analysis tools (ESLint, TypeScript strict mode)',
              'Document complex logic with comments',
            ],
            resources: [
              {
                title: 'Clean Code Principles',
                url: 'https://github.com/ryanmcdermott/clean-code-javascript',
                type: 'article',
              },
              {
                title: 'Testing Best Practices',
                url: 'https://testingjavascript.com/',
                type: 'course',
              },
            ],
            estimatedEffort: 'moderate',
            impactScore: insight.priority === 'high' ? 9 : 7,
          });
        }

        // Efficiency issues
        if (
          insight.title.toLowerCase().includes('efficiency') ||
          insight.title.toLowerCase().includes('declining trend')
        ) {
          result.push({
            id: `suggestion-${index}-efficiency`,
            category: 'efficiency',
            priority: insight.priority,
            title: 'Boost Efficiency',
            description: insight.recommendation || insight.description,
            actions: [
              'Break down large tasks into smaller subtasks',
              'Use keyboard shortcuts and automation tools',
              'Set time limits for research phases',
              'Reuse proven code patterns and templates',
            ],
            resources: [
              {
                title: 'Productivity Tips for Developers',
                url: 'https://www.freecodecamp.org/news/productivity-tips-for-developers/',
                type: 'article',
              },
            ],
            estimatedEffort: 'quick-fix',
            impactScore: 8,
          });
        }

        // Collaboration issues
        if (
          insight.title.toLowerCase().includes('below team average') ||
          insight.title.toLowerCase().includes('inconsistent')
        ) {
          result.push({
            id: `suggestion-${index}-collaboration`,
            category: 'collaboration',
            priority: insight.priority,
            title: 'Enhance Collaboration',
            description: insight.recommendation || insight.description,
            actions: [
              'Request feedback from team members regularly',
              'Participate in code reviews (both giving and receiving)',
              'Share knowledge through team presentations',
              'Use collaborative tools (shared docs, pair programming)',
            ],
            resources: [
              {
                title: 'Effective Code Reviews',
                url: 'https://google.github.io/eng-practices/review/',
                type: 'article',
              },
            ],
            estimatedEffort: 'moderate',
            impactScore: 7,
          });
        }

        // Learning opportunities
        if (completedTasks < 10) {
          result.push({
            id: `suggestion-${index}-learning`,
            category: 'learning',
            priority: 'low',
            title: 'Expand Knowledge Base',
            description:
              'Complete more tasks to build expertise and receive additional ratings.',
            actions: [
              'Volunteer for diverse task types',
              'Request mentorship from experienced team members',
              'Study project documentation and architecture',
              'Practice with side projects',
            ],
            resources: [
              {
                title: 'Learn by Doing',
                url: 'https://www.codecademy.com/',
                type: 'course',
              },
            ],
            estimatedEffort: 'significant',
            impactScore: 6,
          });
        }
      }
    });

    // Remove duplicates and sort by priority + impact
    const uniqueSuggestions = result.filter(
      (suggestion, index, self) =>
        index === self.findIndex((s) => s.title === suggestion.title)
    );

    return uniqueSuggestions.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.impactScore - a.impactScore;
    });
  }, [diagnosticInsights, completedTasks]);

  const getCategoryStyle = (category: ImprovementSuggestion['category']) => {
    switch (category) {
      case 'code-quality':
        return { backgroundColor: '#E8F5E9', iconColor: '#4CAF50', icon: 'construct' };
      case 'efficiency':
        return { backgroundColor: '#FFF3E0', iconColor: '#FF9800', icon: 'speedometer' };
      case 'collaboration':
        return { backgroundColor: '#E3F2FD', iconColor: '#2196F3', icon: 'people' };
      case 'learning':
        return { backgroundColor: '#F3E5F5', iconColor: '#9C27B0', icon: 'school' };
    }
  };

  const getEffortLabel = (effort: ImprovementSuggestion['estimatedEffort']) => {
    switch (effort) {
      case 'quick-fix':
        return '⚡ Quick Fix';
      case 'moderate':
        return '🔧 Moderate';
      case 'significant':
        return '🏗️ Significant';
    }
  };

  const handleResourcePress = (url: string) => {
    Linking.openURL(url).catch((err) => {
      console.error('Failed to open URL:', err);
    });
  };

  if (suggestions.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="bulb" size={24} color="#FF9800" />
          <Text style={styles.title}>Improvement Suggestions</Text>
          <Text style={styles.subtitle}>Personalized for {roleTitle}</Text>
        </View>

        <View style={styles.emptyState}>
          <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
          <Text style={styles.emptyTitle}>Great Performance!</Text>
          <Text style={styles.emptyText}>
            No critical improvements needed. Keep up the excellent work!
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="bulb" size={24} color="#FF9800" />
        <Text style={styles.title}>Improvement Suggestions</Text>
        <Text style={styles.subtitle}>
          {suggestions.length} personalized recommendations
        </Text>
      </View>

      <ScrollView style={styles.suggestionsList}>
        {suggestions.map((suggestion) => {
          const style = getCategoryStyle(suggestion.category);
          return (
            <View key={suggestion.id} style={styles.suggestionCard}>
              <View style={[styles.cardHeader, { backgroundColor: style.backgroundColor }]}>
                <View style={styles.cardHeaderTop}>
                  <Ionicons name={style.icon as any} size={24} color={style.iconColor} />
                  <Text style={styles.cardTitle}>{suggestion.title}</Text>
                  {suggestion.priority === 'high' && (
                    <View style={styles.priorityBadge}>
                      <Text style={styles.priorityText}>HIGH</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.cardDescription}>{suggestion.description}</Text>

                <View style={styles.cardMetadata}>
                  <Text style={styles.metadataText}>
                    {getEffortLabel(suggestion.estimatedEffort)}
                  </Text>
                  <Text style={styles.metadataText}>Impact: {suggestion.impactScore}/10</Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <Text style={styles.actionListTitle}>Action Items:</Text>
                {suggestion.actions.map((action, index) => (
                  <View key={index} style={styles.actionItem}>
                    <Ionicons name="checkmark-circle-outline" size={16} color="#666" />
                    <Text style={styles.actionText}>{action}</Text>
                    {onActionComplete && (
                      <Pressable
                        onPress={() => onActionComplete(suggestion.id, index)}
                        style={styles.actionCompleteButton}
                      >
                        <Ionicons name="checkbox" size={18} color="#4CAF50" />
                      </Pressable>
                    )}
                  </View>
                ))}

                {suggestion.resources && suggestion.resources.length > 0 && (
                  <View style={styles.resourcesSection}>
                    <Text style={styles.resourcesTitle}>Learning Resources:</Text>
                    {suggestion.resources.map((resource, index) => (
                      <Pressable
                        key={index}
                        style={styles.resourceLink}
                        onPress={() => handleResourcePress(resource.url)}
                      >
                        <Ionicons
                          name={
                            resource.type === 'article'
                              ? 'document-text'
                              : resource.type === 'video'
                                ? 'play-circle'
                                : resource.type === 'course'
                                  ? 'school'
                                  : 'construct'
                          }
                          size={16}
                          color="#2196F3"
                        />
                        <Text style={styles.resourceText}>{resource.title}</Text>
                        <Ionicons name="open-outline" size={14} color="#999" />
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              {onDismiss && (
                <Pressable
                  style={styles.dismissButton}
                  onPress={() => onDismiss(suggestion.id)}
                >
                  <Ionicons name="close-circle-outline" size={18} color="#999" />
                  <Text style={styles.dismissText}>Dismiss</Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  suggestionsList: {
    flex: 1,
    padding: 16,
  },
  suggestionCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
  },
  cardHeader: {
    padding: 16,
  },
  cardHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  priorityBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFF',
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  cardMetadata: {
    flexDirection: 'row',
    gap: 12,
  },
  metadataText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  cardBody: {
    padding: 16,
  },
  actionListTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  actionCompleteButton: {
    padding: 4,
  },
  resourcesSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  resourcesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  resourceLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  resourceText: {
    fontSize: 14,
    color: '#2196F3',
    marginLeft: 8,
    flex: 1,
  },
  dismissButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  dismissText: {
    fontSize: 13,
    color: '#999',
    marginLeft: 4,
  },
});
