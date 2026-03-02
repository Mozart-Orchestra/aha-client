import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RatingGoal, RatingGoalCard } from './RatingGoal';

export interface GoalScoreMap {
  [dimension: string]: number;
}

export interface RatingGoalsPanelProps {
  goals?: RatingGoal[];
  currentScores: GoalScoreMap;
  onGoalsChange?: (goals: RatingGoal[]) => void;
}

const DEFAULT_GOALS: RatingGoal[] = [
  {
    id: 'goal-code-quality',
    dimension: '代码质量',
    targetScore: 4.6,
    deadline: '2026-03-31',
    description: '通过重构和单测提升代码稳定性。',
    notifyDaysBefore: 5,
  },
  {
    id: 'goal-collaboration',
    dimension: '协作沟通',
    targetScore: 4.4,
    deadline: '2026-03-20',
    description: '每周完成至少 2 次跨组评审。',
    notifyDaysBefore: 3,
  },
];

/**
 * RatingGoalsPanel Component
 *
 * V4-FEATURE-003: 目标设定功能
 *
 * 验收标准:
 * - [x] 支持设定评分目标
 * - [x] 显示目标完成进度
 * - [x] 目标达成提醒
 * - [x] Typecheck passes
 */
export function RatingGoalsPanel({
  goals = DEFAULT_GOALS,
  currentScores,
  onGoalsChange,
}: RatingGoalsPanelProps) {
  const [localGoals, setLocalGoals] = useState<RatingGoal[]>(goals);

  const completedCount = useMemo(() => {
    return localGoals.filter((goal) => {
      const current = currentScores[goal.dimension] ?? 0;
      return current >= goal.targetScore;
    }).length;
  }, [currentScores, localGoals]);

  const completionRate = localGoals.length > 0 ? (completedCount / localGoals.length) * 100 : 0;

  const handleAddGoal = () => {
    const defaultDimension = Object.keys(currentScores)[0] ?? '综合评分';
    const nextGoal: RatingGoal = {
      id: `goal-${Date.now()}`,
      dimension: defaultDimension,
      targetScore: 4.5,
      deadline: '',
      description: '',
      notifyDaysBefore: 3,
    };

    const nextGoals = [nextGoal, ...localGoals];
    setLocalGoals(nextGoals);
    onGoalsChange?.(nextGoals);
  };

  const handleUpdateGoal = (updatedGoal: RatingGoal) => {
    const nextGoals = localGoals.map((goal) =>
      goal.id === updatedGoal.id ? updatedGoal : goal
    );
    setLocalGoals(nextGoals);
    onGoalsChange?.(nextGoals);
  };

  const handleDeleteGoal = (goalId: string) => {
    const nextGoals = localGoals.filter((goal) => goal.id !== goalId);
    setLocalGoals(nextGoals);
    onGoalsChange?.(nextGoals);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <View style={styles.titleRow}>
            <Ionicons name="flag-outline" size={20} color="#1F6FEB" />
            <Text style={styles.title}>评分目标追踪</Text>
          </View>
          <Text style={styles.subtitle}>
            已完成 {completedCount}/{localGoals.length} 个目标 · 完成率 {completionRate.toFixed(1)}%
          </Text>
        </View>

        <Pressable style={styles.addButton} onPress={handleAddGoal}>
          <Ionicons name="add" size={16} color="#FFF" />
          <Text style={styles.addButtonText}>新增目标</Text>
        </Pressable>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.min(completionRate, 100)}%` }]} />
      </View>

      {localGoals.map((goal) => {
        const currentScore = currentScores[goal.dimension] ?? 0;
        return (
          <RatingGoalCard
            key={goal.id}
            goal={goal}
            currentScore={currentScore}
            onUpdate={handleUpdateGoal}
            onDelete={handleDeleteGoal}
          />
        );
      })}

      {localGoals.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="analytics-outline" size={28} color="#9AA0A6" />
          <Text style={styles.emptyTitle}>暂未设置评分目标</Text>
          <Text style={styles.emptySubtitle}>可先为关键维度设置 1-2 个阶段目标</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F5F7FB',
    borderRadius: 12,
    padding: 16,
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
  title: {
    marginLeft: 6,
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#6B7280',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F6FEB',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  addButtonText: {
    marginLeft: 4,
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  progressTrack: {
    height: 8,
    borderRadius: 8,
    backgroundColor: '#E5EAF3',
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#1F6FEB',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 22,
  },
  emptyTitle: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  emptySubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#6B7280',
  },
});
