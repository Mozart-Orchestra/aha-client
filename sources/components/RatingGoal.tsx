import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface RatingGoal {
  id: string;
  dimension: string;
  targetScore: number;
  deadline?: string;
  description?: string;
  notifyDaysBefore?: number;
}

export interface RatingGoalProps {
  goal: RatingGoal;
  currentScore: number;
  onUpdate?: (goal: RatingGoal) => void;
  onDelete?: (goalId: string) => void;
}

function parseDate(date?: string): Date | undefined {
  if (!date) return undefined;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed;
}

function getDaysLeft(deadline?: string): number | undefined {
  const targetDate = parseDate(deadline);
  if (!targetDate) return undefined;

  const now = new Date();
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.ceil((targetDate.getTime() - now.getTime()) / msPerDay);
}

/**
 * RatingGoalCard Component
 *
 * V4-FEATURE-003: 目标设定功能
 *
 * 验收标准:
 * - [x] 支持设定评分目标
 * - [x] 显示目标完成进度
 * - [x] 目标达成提醒
 * - [x] Typecheck passes
 */
export function RatingGoalCard({ goal, currentScore, onUpdate, onDelete }: RatingGoalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedGoal, setEditedGoal] = useState(goal);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const progress = Math.max(0, Math.min((currentScore / Math.max(goal.targetScore, 0.1)) * 100, 100));
  const isAchieved = currentScore >= goal.targetScore;

  const daysLeft = useMemo(() => getDaysLeft(goal.deadline), [goal.deadline]);
  const reminderThreshold = goal.notifyDaysBefore ?? 3;

  const reminder = useMemo(() => {
    if (isAchieved) {
      return {
        icon: 'trophy-outline' as const,
        text: '目标已达成，继续冲刺更高目标！',
        level: 'success' as const,
      };
    }

    if (typeof daysLeft === 'number') {
      if (daysLeft < 0) {
        return {
          icon: 'alert-circle-outline' as const,
          text: '目标已逾期，建议重新设定截止时间或目标值。',
          level: 'danger' as const,
        };
      }

      if (daysLeft <= reminderThreshold) {
        return {
          icon: 'notifications-outline' as const,
          text: `距离截止还有 ${daysLeft} 天，建议优先提升「${goal.dimension}」。`,
          level: 'warning' as const,
        };
      }
    }

    return {
      icon: 'information-circle-outline' as const,
      text: `当前进度 ${progress.toFixed(1)}%，继续保持节奏。`,
      level: 'info' as const,
    };
  }, [daysLeft, goal.dimension, isAchieved, progress, reminderThreshold]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

  const handleSave = () => {
    onUpdate?.({
      ...editedGoal,
      targetScore: Math.max(0.1, editedGoal.targetScore),
      notifyDaysBefore: Math.max(1, editedGoal.notifyDaysBefore ?? 3),
    });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <View style={styles.editContainer}>
        <Text style={styles.editTitle}>编辑评分目标</Text>
        <TextInput
          style={styles.input}
          value={editedGoal.dimension}
          onChangeText={(text) => setEditedGoal({ ...editedGoal, dimension: text })}
          placeholder="维度名称"
        />
        <TextInput
          style={styles.input}
          value={editedGoal.targetScore.toString()}
          onChangeText={(text) =>
            setEditedGoal({
              ...editedGoal,
              targetScore: parseFloat(text) || 0,
            })
          }
          placeholder="目标分数"
          keyboardType="decimal-pad"
        />
        <TextInput
          style={styles.input}
          value={editedGoal.deadline ?? ''}
          onChangeText={(text) => setEditedGoal({ ...editedGoal, deadline: text.trim() })}
          placeholder="截止日期 (YYYY-MM-DD)"
        />
        <TextInput
          style={styles.input}
          value={(editedGoal.notifyDaysBefore ?? 3).toString()}
          onChangeText={(text) =>
            setEditedGoal({
              ...editedGoal,
              notifyDaysBefore: parseInt(text, 10) || 3,
            })
          }
          placeholder="提前提醒天数"
          keyboardType="number-pad"
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          multiline
          numberOfLines={3}
          value={editedGoal.description ?? ''}
          onChangeText={(text) => setEditedGoal({ ...editedGoal, description: text })}
          placeholder="目标说明（可选）"
        />

        <View style={styles.editButtons}>
          <Pressable style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>保存</Text>
          </Pressable>
          <Pressable style={styles.cancelButton} onPress={() => setIsEditing(false)}>
            <Text style={styles.cancelButtonText}>取消</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, isAchieved && styles.achievedContainer]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="flag" size={20} color={isAchieved ? '#2E7D32' : '#1F6FEB'} />
          <Text style={styles.dimension}>{goal.dimension}</Text>
        </View>
        <View style={styles.actions}>
          <Pressable onPress={() => setIsEditing(true)} style={styles.actionButton}>
            <Ionicons name="create-outline" size={18} color="#666" />
          </Pressable>
          <Pressable onPress={() => onDelete?.(goal.id)} style={styles.actionButton}>
            <Ionicons name="trash-outline" size={18} color="#F44336" />
          </Pressable>
        </View>
      </View>

      {!!goal.description && <Text style={styles.description}>{goal.description}</Text>}

      <View style={styles.progressSection}>
        <View style={styles.progressRow}>
          <Text style={styles.currentScore}>{currentScore.toFixed(1)}</Text>
          <Text style={styles.separator}>/</Text>
          <Text style={styles.targetScore}>{goal.targetScore.toFixed(1)}</Text>
        </View>

        <View style={styles.progressBarContainer}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                }),
                backgroundColor: isAchieved ? '#2E7D32' : '#1F6FEB',
              },
            ]}
          />
        </View>

        <Text style={styles.progressText}>
          {isAchieved
            ? '🎉 目标已达成！'
            : `还需 ${(goal.targetScore - currentScore).toFixed(1)} 分`}
        </Text>
      </View>

      {goal.deadline && (
        <View style={styles.deadlineRow}>
          <Ionicons name="calendar-outline" size={14} color="#999" />
          <Text style={styles.deadlineText}>截止: {goal.deadline}</Text>
          {typeof daysLeft === 'number' && (
            <Text
              style={[
                styles.daysLeft,
                daysLeft < 0 ? styles.daysOverdue : daysLeft <= 3 ? styles.daysUrgent : styles.daysNormal,
              ]}
            >
              {daysLeft < 0 ? `已逾期 ${Math.abs(daysLeft)} 天` : `还有 ${daysLeft} 天`}
            </Text>
          )}
        </View>
      )}

      <View style={[styles.reminderBox, styles[`reminder_${reminder.level}`]]}>
        <Ionicons name={reminder.icon} size={16} color={reminderColors[reminder.level]} />
        <Text style={[styles.reminderText, { color: reminderColors[reminder.level] }]}>
          {reminder.text}
        </Text>
      </View>
    </View>
  );
}

const reminderColors: Record<string, string> = {
  success: '#2E7D32',
  warning: '#F9A825',
  danger: '#C62828',
  info: '#1565C0',
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  achievedContainer: {
    backgroundColor: '#E8F5E9',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dimension: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  actions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 4,
    marginLeft: 8,
  },
  description: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  progressSection: {
    marginBottom: 12,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  currentScore: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F6FEB',
  },
  separator: {
    fontSize: 20,
    color: '#999',
    marginHorizontal: 4,
  },
  targetScore: {
    fontSize: 18,
    color: '#999',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
    color: '#666',
  },
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  deadlineText: {
    fontSize: 12,
    color: '#999',
    marginLeft: 4,
  },
  daysLeft: {
    fontSize: 12,
    marginLeft: 8,
    fontWeight: '600',
  },
  daysNormal: {
    color: '#4CAF50',
  },
  daysUrgent: {
    color: '#FF9800',
  },
  daysOverdue: {
    color: '#F44336',
  },
  reminderBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  reminder_success: {
    backgroundColor: '#E8F5E9',
  },
  reminder_warning: {
    backgroundColor: '#FFF8E1',
  },
  reminder_danger: {
    backgroundColor: '#FFEBEE',
  },
  reminder_info: {
    backgroundColor: '#E3F2FD',
  },
  reminderText: {
    fontSize: 12,
    marginLeft: 6,
    flex: 1,
  },
  editContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },
  editTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  editButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#1F6FEB',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
  },
});