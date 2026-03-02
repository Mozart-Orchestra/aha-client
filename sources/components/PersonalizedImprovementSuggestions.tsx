import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface SuggestionDimension {
  dimension: string;
  score: number;
  teamAvg?: number;
  trend?: 'up' | 'down' | 'stable';
}

export interface LearningResource {
  title: string;
  type: 'course' | 'article' | 'practice';
  url?: string;
}

interface SuggestionCardData {
  dimension: string;
  score: number;
  gapToTeam: number;
  priority: 'high' | 'medium' | 'low';
  insight: string;
  nextAction: string;
  resources: LearningResource[];
}

export interface PersonalizedImprovementSuggestionsProps {
  dimensions: SuggestionDimension[];
  targetScore?: number;
  maxSuggestions?: number;
  resourceMap?: Record<string, LearningResource[]>;
}

const DEFAULT_RESOURCE_MAP: Record<string, LearningResource[]> = {
  '代码质量': [
    { title: '重构实战清单', type: 'practice' },
    { title: 'TypeScript 最佳实践', type: 'article' },
    { title: 'Clean Code 课程', type: 'course' },
  ],
  '协作沟通': [
    { title: '高效评审模板', type: 'practice' },
    { title: '跨团队沟通方法', type: 'article' },
    { title: '反馈沟通训练营', type: 'course' },
  ],
  '交付效率': [
    { title: '迭代拆解模板', type: 'practice' },
    { title: '敏捷交付案例', type: 'article' },
    { title: '项目节奏管理课', type: 'course' },
  ],
  '创新能力': [
    { title: '技术调研框架', type: 'practice' },
    { title: '创新提案写作指南', type: 'article' },
    { title: '问题解决工作坊', type: 'course' },
  ],
};

function toPriority(score: number): 'high' | 'medium' | 'low' {
  if (score < 3.6) return 'high';
  if (score < 4.2) return 'medium';
  return 'low';
}

function getPriorityLabel(priority: 'high' | 'medium' | 'low') {
  if (priority === 'high') return { text: '高优先级', color: '#B00020', bg: '#FDECEC' };
  if (priority === 'medium') return { text: '中优先级', color: '#A35A00', bg: '#FFF4E6' };
  return { text: '低优先级', color: '#2E7D32', bg: '#E8F5E9' };
}

function getInsight(dimension: string, score: number, gapToTeam: number) {
  const trendText = gapToTeam < 0 ? `低于团队均值 ${Math.abs(gapToTeam).toFixed(1)} 分` : '不低于团队均值';
  return `${dimension} 当前评分 ${score.toFixed(1)}，${trendText}。`;
}

function getAction(dimension: string) {
  switch (dimension) {
    case '代码质量':
      return '下个迭代为核心模块补齐测试，并完成 1 次重构复盘。';
    case '协作沟通':
      return '每周至少参与 2 次跨角色评审并输出会议纪要。';
    case '交付效率':
      return '采用 WIP 限制并提前 1 天完成任务自测。';
    case '创新能力':
      return '每两周提交 1 条流程优化建议并验证效果。';
    default:
      return '围绕该维度设置可量化小目标，按周回顾改进效果。';
  }
}

/**
 * PersonalizedImprovementSuggestions Component
 *
 * V4-FEATURE-004: 个性化改进建议
 *
 * 验收标准:
 * - [x] 分析评分弱点
 * - [x] 生成改进建议
 * - [x] 推荐学习资源
 * - [ ] Typecheck passes
 */
export function PersonalizedImprovementSuggestions({
  dimensions,
  targetScore = 4.5,
  maxSuggestions = 3,
  resourceMap = DEFAULT_RESOURCE_MAP,
}: PersonalizedImprovementSuggestionsProps) {
  const suggestions = useMemo<SuggestionCardData[]>(() => {
    return [...dimensions]
      .sort((a, b) => a.score - b.score)
      .slice(0, maxSuggestions)
      .map((item) => {
        const gapToTeam = item.teamAvg != null ? item.score - item.teamAvg : 0;
        return {
          dimension: item.dimension,
          score: item.score,
          gapToTeam,
          priority: toPriority(item.score),
          insight: getInsight(item.dimension, item.score, gapToTeam),
          nextAction: getAction(item.dimension),
          resources: resourceMap[item.dimension] ?? [
            { title: '通用能力提升清单', type: 'practice' },
            { title: '复盘与反馈方法', type: 'article' },
          ],
        };
      });
  }, [dimensions, maxSuggestions, resourceMap]);

  const averageScore = useMemo(() => {
    if (dimensions.length === 0) return 0;
    const total = dimensions.reduce((sum, item) => sum + item.score, 0);
    return total / dimensions.length;
  }, [dimensions]);

  const scoreGap = targetScore - averageScore;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="bulb-outline" size={20} color="#7B61FF" />
          <Text style={styles.title}>个性化改进建议</Text>
        </View>
        <Text style={styles.subtitle}>基于当前评分自动生成提升路径</Text>
      </View>

      <View style={styles.overviewCard}>
        <Text style={styles.overviewTitle}>总体分析</Text>
        <Text style={styles.overviewText}>当前平均分 {averageScore.toFixed(2)} / 5.0</Text>
        <Text style={styles.overviewText}>
          {scoreGap > 0
            ? `距离目标分 ${targetScore.toFixed(1)} 还差 ${scoreGap.toFixed(2)} 分`
            : `已达到目标分 ${targetScore.toFixed(1)}，建议挑战更高目标`}
        </Text>
      </View>

      {suggestions.map((item) => {
        const priority = getPriorityLabel(item.priority);
        return (
          <View key={item.dimension} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.dimension}>{item.dimension}</Text>
              <View style={[styles.priorityBadge, { backgroundColor: priority.bg }]}>
                <Text style={[styles.priorityText, { color: priority.color }]}>{priority.text}</Text>
              </View>
            </View>

            <Text style={styles.insight}>{item.insight}</Text>

            <View style={styles.actionBox}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#1F6FEB" />
              <Text style={styles.actionText}>{item.nextAction}</Text>
            </View>

            <Text style={styles.resourceTitle}>推荐学习资源</Text>
            {item.resources.map((resource, index) => (
              <Pressable
                key={`${item.dimension}-${resource.title}-${index}`}
                onPress={() => {
                  if (resource.url) {
                    Linking.openURL(resource.url).catch(() => {
                      // Ignore failed deep-link for local-only mock resources.
                    });
                  }
                }}
                style={styles.resourceItem}
              >
                <Ionicons name="library-outline" size={14} color="#6B7280" />
                <Text style={styles.resourceText}>{resource.title}</Text>
                <Text style={styles.resourceType}>{resource.type}</Text>
              </Pressable>
            ))}
          </View>
        );
      })}

      {suggestions.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="sparkles-outline" size={26} color="#9AA0A6" />
          <Text style={styles.emptyText}>暂无可分析数据，请先完成多维度评分。</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F7F8FD',
    borderRadius: 12,
    padding: 16,
  },
  header: {
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
    color: '#222',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#6B7280',
  },
  overviewCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  overviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  overviewText: {
    fontSize: 12,
    color: '#4B5563',
    marginBottom: 2,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dimension: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  priorityBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  insight: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 18,
  },
  actionBox: {
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#EEF4FF',
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#1F3F80',
    flex: 1,
  },
  resourceTitle: {
    marginTop: 10,
    marginBottom: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  resourceText: {
    marginLeft: 6,
    flex: 1,
    fontSize: 12,
    color: '#4B5563',
  },
  resourceType: {
    fontSize: 11,
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  emptyText: {
    marginTop: 6,
    fontSize: 12,
    color: '#6B7280',
  },
});
