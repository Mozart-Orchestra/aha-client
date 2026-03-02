import React from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Text } from '@/components/StyledText';
import { Ionicons } from '@expo/vector-icons';

export interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  action?: {
    label: string;
    route: string;
    params?: Record<string, unknown>;
  };
}

export interface RoleReadinessChecklistProps {
  /** Role ID */
  roleId: string;
  /** Role title */
  roleTitle: string;
  /** Completion percentage (0-100) */
  completionPercentage: number;
  /** Onboarding tasks */
  tasks: OnboardingTask[];
  /** Callback when task action is triggered */
  onTaskAction?: (taskId: string, action: OnboardingTask['action']) => void;
  /** Callback when "Skip" is pressed */
  onSkip?: () => void;
  /** Callback when "View Role" is pressed */
  onViewRole?: () => void;
  /** Show celebration animation when 100% complete */
  showCelebration?: boolean;
}

/**
 * RoleReadinessChecklist Component
 *
 * Guides users through role onboarding with a checklist of setup tasks.
 * Provides "next steps" guidance after role is added to team.
 *
 * Usage:
 * ```tsx
 * <RoleReadinessChecklist
 *   roleId="role-123"
 *   roleTitle="Frontend Architect"
 *   completionPercentage={40}
 *   tasks={onboardingTasks}
 *   onTaskAction={handleTaskAction}
 * />
 * ```
 */
export function RoleReadinessChecklist({
  roleId,
  roleTitle,
  completionPercentage,
  tasks,
  onTaskAction,
  onSkip,
  onViewRole,
  showCelebration = false,
}: RoleReadinessChecklistProps) {
  const completedTasks = tasks.filter((t) => t.completed).length;
  const totalTasks = tasks.length;

  const getProgressColor = () => {
    if (completionPercentage >= 80) return '#4CAF50';
    if (completionPercentage >= 50) return '#FF9800';
    return '#F44336';
  };

  const getProgressMessage = () => {
    if (completionPercentage === 100) {
      return '🎉 Role is ready for action!';
    }
    if (completionPercentage >= 80) {
      return 'Almost there! Complete the remaining tasks.';
    }
    if (completionPercentage >= 50) {
      return 'Good progress! Keep going.';
    }
    return 'Let\'s get this role set up.';
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons
            name={completionPercentage === 100 ? 'checkmark-circle' : 'rocket'}
            size={32}
            color={getProgressColor()}
          />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Role Setup</Text>
          <Text style={styles.subtitle}>{roleTitle}</Text>
        </View>
      </View>

      {/* Celebration Banner */}
      {showCelebration && completionPercentage === 100 && (
        <View style={styles.celebrationBanner}>
          <Ionicons name="trophy" size={24} color="#FFD700" />
          <Text style={styles.celebrationText}>
            Congratulations! Role is fully configured!
          </Text>
        </View>
      )}

      {/* Progress Section */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>
            {completedTasks}/{totalTasks} tasks completed
          </Text>
          <Text style={styles.progressPercentage}>
            {completionPercentage}%
          </Text>
        </View>

        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${completionPercentage}%`,
                backgroundColor: getProgressColor(),
              },
            ]}
          />
        </View>

        <Text style={styles.progressMessage}>{getProgressMessage()}</Text>
      </View>

      {/* Task List */}
      <View style={styles.taskList}>
        {tasks.map((task, index) => (
          <View
            key={task.id}
            style={[
              styles.taskItem,
              task.completed && styles.taskItemCompleted,
            ]}
          >
            <View style={styles.taskHeader}>
              <View style={styles.taskLeft}>
                <View
                  style={[
                    styles.taskCheckbox,
                    task.completed && styles.taskCheckboxCompleted,
                  ]}
                >
                  {task.completed ? (
                    <Ionicons name="checkmark" size={16} color="#FFF" />
                  ) : (
                    <Text style={styles.taskNumber}>{index + 1}</Text>
                  )}
                </View>
                <View style={styles.taskInfo}>
                  <Text
                    style={[
                      styles.taskTitle,
                      task.completed && styles.taskTitleCompleted,
                    ]}
                  >
                    {task.title}
                  </Text>
                  <Text style={styles.taskDescription}>{task.description}</Text>
                </View>
              </View>
            </View>

            {!task.completed && task.action && onTaskAction && (
              <Pressable
                style={styles.taskActionButton}
                onPress={() => onTaskAction(task.id, task.action)}
              >
                <Ionicons name="arrow-forward" size={16} color="#2196F3" />
                <Text style={styles.taskActionText}>{task.action.label}</Text>
              </Pressable>
            )}
          </View>
        ))}
      </View>

      {/* Next Steps Recommendations */}
      {completionPercentage === 100 && (
        <View style={styles.nextStepsSection}>
          <Text style={styles.nextStepsTitle}>Next Steps</Text>
          <View style={styles.recommendationList}>
            <Pressable style={styles.recommendationItem}>
              <Ionicons name="add-circle" size={20} color="#2196F3" />
              <Text style={styles.recommendationText}>
                Assign first task to this role
              </Text>
            </Pressable>
            <Pressable style={styles.recommendationItem}>
              <Ionicons name="stats-chart" size={20} color="#4CAF50" />
              <Text style={styles.recommendationText}>
                View role performance metrics
              </Text>
            </Pressable>
            <Pressable style={styles.recommendationItem}>
              <Ionicons name="share-social" size={20} color="#FF9800" />
              <Text style={styles.recommendationText}>
                Share this role with your team
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        {onSkip && completionPercentage < 100 && (
          <Pressable style={styles.skipButton} onPress={onSkip}>
            <Text style={styles.skipText}>Skip for Now</Text>
          </Pressable>
        )}

        {onViewRole && (
          <Pressable style={styles.viewRoleButton} onPress={onViewRole}>
            <Ionicons name="eye" size={18} color="#2196F3" />
            <Text style={styles.viewRoleText}>View Role Details</Text>
          </Pressable>
        )}
      </View>
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
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: 16,
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  celebrationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9C4',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  celebrationText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F57F17',
    marginLeft: 12,
    flex: 1,
  },
  progressSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  progressPercentage: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  progressBar: {
    height: 12,
    backgroundColor: '#E0E0E0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressMessage: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },
  taskList: {
    padding: 16,
  },
  taskItem: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  taskItemCompleted: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  taskLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  taskCheckbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskCheckboxCompleted: {
    backgroundColor: '#4CAF50',
  },
  taskNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  taskInfo: {
    marginLeft: 12,
    flex: 1,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  taskTitleCompleted: {
    color: '#666',
    textDecorationLine: 'line-through',
  },
  taskDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
    lineHeight: 18,
  },
  taskActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3F2FD',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  taskActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
    marginLeft: 6,
  },
  nextStepsSection: {
    padding: 16,
    backgroundColor: '#F8F8F8',
  },
  nextStepsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  recommendationList: {
    gap: 8,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 8,
  },
  recommendationText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  skipButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  viewRoleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#E3F2FD',
  },
  viewRoleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
    marginLeft: 8,
  },
});
