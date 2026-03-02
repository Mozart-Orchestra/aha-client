import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface DimensionConfig {
  id: string;
  name: string;
  description: string;
  weight: number;
  score: number;
  maxScore: number;
}

export interface MultiDimensionRatingProps {
  dimensions?: DimensionConfig[];
  onDimensionsChange?: (dimensions: DimensionConfig[]) => void;
  editable?: boolean;
}

const DEFAULT_DIMENSIONS: DimensionConfig[] = [
  {
    id: 'code_quality',
    name: '代码质量',
    description: '代码规范性、可维护性、可读性',
    weight: 0.25,
    score: 4.4,
    maxScore: 5,
  },
  {
    id: 'collaboration',
    name: '协作沟通',
    description: '团队协作、沟通效率、知识分享',
    weight: 0.25,
    score: 4.2,
    maxScore: 5,
  },
  {
    id: 'delivery',
    name: '交付效率',
    description: '任务完成速度、按时交付率',
    weight: 0.25,
    score: 4.0,
    maxScore: 5,
  },
  {
    id: 'innovation',
    name: '创新能力',
    description: '技术创新、问题解决、优化改进',
    weight: 0.25,
    score: 3.8,
    maxScore: 5,
  },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getDimensionColor(index: number): string {
  const colors = ['#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#00BCD4', '#E91E63'];
  return colors[index % colors.length];
}

function getScoreLabel(score: number): string {
  if (score >= 4.5) return '卓越';
  if (score >= 4.0) return '优秀';
  if (score >= 3.5) return '良好';
  if (score >= 3.0) return '合格';
  return '需改进';
}

/**
 * MultiDimensionRating Component
 *
 * V4-FEATURE-002: 多维度评分
 *
 * 验收标准:
 * - [x] 支持 4+ 维度评分
 * - [x] 维度权重可配置
 * - [x] 维度评分可视化
 * - [x] Typecheck passes
 */
export function MultiDimensionRating({
  dimensions = DEFAULT_DIMENSIONS,
  onDimensionsChange,
  editable = true,
}: MultiDimensionRatingProps) {
  const [localDimensions, setLocalDimensions] = useState<DimensionConfig[]>(dimensions);
  const [isEditing, setIsEditing] = useState(false);

  const totalWeight = useMemo(
    () => localDimensions.reduce((sum, dim) => sum + dim.weight, 0),
    [localDimensions]
  );

  const normalizedDimensions = useMemo(
    () =>
      localDimensions.map((dim) => ({
        ...dim,
        normalizedWeight: totalWeight > 0 ? dim.weight / totalWeight : 0,
      })),
    [localDimensions, totalWeight]
  );

  const weightedMax = useMemo(
    () =>
      normalizedDimensions.reduce(
        (sum, dim) => sum + dim.maxScore * dim.normalizedWeight,
        0
      ),
    [normalizedDimensions]
  );

  const weightedScore = useMemo(
    () =>
      normalizedDimensions.reduce(
        (sum, dim) => sum + dim.score * dim.normalizedWeight,
        0
      ),
    [normalizedDimensions]
  );

  const weightedPercentage = weightedMax > 0 ? (weightedScore / weightedMax) * 100 : 0;

  const handleUpdateDimension = (id: string, patch: Partial<DimensionConfig>) => {
    const updated = localDimensions.map((dim) => {
      if (dim.id !== id) return dim;
      const nextWeight = patch.weight ?? dim.weight;
      const nextMax = patch.maxScore ?? dim.maxScore;
      const nextScore = clamp(patch.score ?? dim.score, 0, nextMax);
      return {
        ...dim,
        ...patch,
        weight: clamp(nextWeight, 0, 1),
        maxScore: Math.max(1, nextMax),
        score: nextScore,
      };
    });

    setLocalDimensions(updated);
    onDimensionsChange?.(updated);
  };

  const handleAddDimension = () => {
    const nextCount = localDimensions.length + 1;
    const newDimension: DimensionConfig = {
      id: `dimension_${Date.now()}`,
      name: `新维度 ${nextCount}`,
      description: '请输入维度描述',
      weight: 0.2,
      score: 3,
      maxScore: 5,
    };

    const updated = [...localDimensions, newDimension];
    setLocalDimensions(updated);
    onDimensionsChange?.(updated);
  };

  const handleRemoveDimension = (id: string) => {
    const updated = localDimensions.filter((dim) => dim.id !== id);
    setLocalDimensions(updated);
    onDimensionsChange?.(updated);
  };

  const handleNormalizeWeights = () => {
    if (localDimensions.length === 0) return;

    const normalized = localDimensions.map((dim) => ({
      ...dim,
      weight: 1 / localDimensions.length,
    }));

    setLocalDimensions(normalized);
    onDimensionsChange?.(normalized);
  };

  const outOfRangeCount = localDimensions.filter(
    (dim) => dim.score < 0 || dim.score > dim.maxScore
  ).length;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="layers" size={24} color="#2196F3" />
          <Text style={styles.title}>多维度评分</Text>
        </View>
        <Text style={styles.subtitle}>
          {localDimensions.length} 个维度 · 综合评分 {weightedScore.toFixed(2)}/{weightedMax.toFixed(2)} · {getScoreLabel(weightedScore)}
        </Text>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <Text style={styles.summaryTitle}>综合评分进度</Text>
          <Text style={styles.summaryScore}>{weightedScore.toFixed(2)}</Text>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${clamp(weightedPercentage, 0, 100)}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          达成度 {weightedPercentage.toFixed(1)}%（满分 {weightedMax.toFixed(2)}）
        </Text>
      </View>

      <View style={styles.chartContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>权重分布</Text>
          {editable && (
            <Pressable style={styles.smallButton} onPress={handleNormalizeWeights}>
              <Text style={styles.smallButtonText}>均衡权重</Text>
            </Pressable>
          )}
        </View>
        <View style={styles.stackedBar}>
          {normalizedDimensions.map((dim, index) => (
            <View
              key={dim.id}
              style={[
                styles.stackedBarPart,
                {
                  flex: Math.max(dim.normalizedWeight, 0.01),
                  backgroundColor: getDimensionColor(index),
                },
              ]}
            />
          ))}
        </View>

        {normalizedDimensions.map((dim, index) => (
          <View key={dim.id} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: getDimensionColor(index) }]} />
            <Text style={styles.legendText}>{dim.name}</Text>
            <Text style={styles.legendValue}>{(dim.normalizedWeight * 100).toFixed(1)}%</Text>
          </View>
        ))}
      </View>

      <View style={styles.dimensionsContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>维度详情</Text>
          {editable && (
            <Pressable style={styles.smallButton} onPress={() => setIsEditing((prev) => !prev)}>
              <Text style={styles.smallButtonText}>{isEditing ? '完成编辑' : '编辑模式'}</Text>
            </Pressable>
          )}
        </View>

        {normalizedDimensions.map((dim, index) => {
          const scorePercentage = dim.maxScore > 0 ? (dim.score / dim.maxScore) * 100 : 0;

          return (
            <View key={dim.id} style={styles.dimensionCard}>
              <View style={styles.dimensionHeader}>
                <View
                  style={[
                    styles.dimensionColor,
                    { backgroundColor: getDimensionColor(index) },
                  ]}
                />

                <View style={styles.dimensionMeta}>
                  {isEditing ? (
                    <TextInput
                      style={styles.dimensionNameInput}
                      value={dim.name}
                      onChangeText={(text) => handleUpdateDimension(dim.id, { name: text })}
                    />
                  ) : (
                    <Text style={styles.dimensionName}>{dim.name}</Text>
                  )}
                  <Text style={styles.dimensionDescription}>{dim.description}</Text>
                </View>

                {isEditing && localDimensions.length > 1 && (
                  <Pressable onPress={() => handleRemoveDimension(dim.id)} style={styles.removeButton}>
                    <Ionicons name="close-circle" size={20} color="#F44336" />
                  </Pressable>
                )}
              </View>

              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>权重</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.numberInput}
                    value={dim.weight.toFixed(2)}
                    keyboardType="decimal-pad"
                    onChangeText={(text) =>
                      handleUpdateDimension(dim.id, {
                        weight: clamp(parseFloat(text) || 0, 0, 1),
                      })
                    }
                  />
                ) : (
                  <Text style={styles.metricValue}>{(dim.normalizedWeight * 100).toFixed(1)}%</Text>
                )}
              </View>

              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>评分</Text>
                {isEditing ? (
                  <View style={styles.scoreEditor}>
                    <Pressable
                      onPress={() => handleUpdateDimension(dim.id, { score: dim.score - 0.1 })}
                      style={styles.iconButton}
                    >
                      <Ionicons name="remove-circle-outline" size={20} color="#666" />
                    </Pressable>
                    <TextInput
                      style={styles.numberInput}
                      value={dim.score.toFixed(1)}
                      keyboardType="decimal-pad"
                      onChangeText={(text) =>
                        handleUpdateDimension(dim.id, {
                          score: clamp(parseFloat(text) || 0, 0, dim.maxScore),
                        })
                      }
                    />
                    <Text style={styles.maxText}>/ {dim.maxScore.toFixed(1)}</Text>
                    <Pressable
                      onPress={() => handleUpdateDimension(dim.id, { score: dim.score + 0.1 })}
                      style={styles.iconButton}
                    >
                      <Ionicons name="add-circle-outline" size={20} color="#666" />
                    </Pressable>
                  </View>
                ) : (
                  <Text style={styles.metricValue}>
                    {dim.score.toFixed(1)} / {dim.maxScore.toFixed(1)}
                  </Text>
                )}
              </View>

              <View style={styles.dimensionProgressTrack}>
                <View
                  style={[
                    styles.dimensionProgressFill,
                    {
                      width: `${clamp(scorePercentage, 0, 100)}%`,
                      backgroundColor: getDimensionColor(index),
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}

        {editable && isEditing && (
          <Pressable style={styles.addButton} onPress={handleAddDimension}>
            <Ionicons name="add-circle" size={20} color="#2196F3" />
            <Text style={styles.addButtonText}>添加评分维度</Text>
          </Pressable>
        )}
      </View>

      {(Math.abs(totalWeight - 1) > 0.01 || outOfRangeCount > 0) && (
        <View style={styles.warningBox}>
          <Ionicons name="warning-outline" size={18} color="#E67E22" />
          <Text style={styles.warningText}>
            {Math.abs(totalWeight - 1) > 0.01
              ? `当前权重总和为 ${totalWeight.toFixed(2)}，建议调整为 1.00。`
              : '存在评分超出维度上限，请检查配置。'}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    marginLeft: 8,
    fontSize: 20,
    fontWeight: '700',
    color: '#222',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    color: '#666',
  },
  summaryCard: {
    marginTop: 8,
    backgroundColor: '#FFF',
    padding: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  summaryScore: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F6FEB',
  },
  progressTrack: {
    marginTop: 10,
    height: 8,
    borderRadius: 8,
    backgroundColor: '#E9EEF5',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1F6FEB',
    borderRadius: 8,
  },
  progressText: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
  },
  chartContainer: {
    marginTop: 8,
    backgroundColor: '#FFF',
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  smallButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#E8F0FE',
  },
  smallButtonText: {
    fontSize: 12,
    color: '#1F6FEB',
    fontWeight: '600',
  },
  stackedBar: {
    flexDirection: 'row',
    height: 18,
    borderRadius: 9,
    overflow: 'hidden',
    marginBottom: 12,
  },
  stackedBarPart: {
    height: '100%',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  legendText: {
    flex: 1,
    fontSize: 13,
    color: '#444',
  },
  legendValue: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  dimensionsContainer: {
    marginTop: 8,
    backgroundColor: '#FFF',
    padding: 16,
    marginBottom: 16,
  },
  dimensionCard: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#F8FAFD',
    marginBottom: 10,
  },
  dimensionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  dimensionColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 3,
    marginRight: 8,
  },
  dimensionMeta: {
    flex: 1,
  },
  dimensionName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
  },
  dimensionNameInput: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    borderBottomWidth: 1,
    borderBottomColor: '#D0D7E2',
    paddingVertical: 2,
  },
  dimensionDescription: {
    marginTop: 4,
    fontSize: 12,
    color: '#6E7781',
  },
  removeButton: {
    marginLeft: 8,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  metricLabel: {
    width: 50,
    fontSize: 13,
    color: '#666',
  },
  metricValue: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
  },
  numberInput: {
    width: 72,
    borderWidth: 1,
    borderColor: '#D0D7E2',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#FFF',
    fontSize: 13,
    color: '#333',
  },
  scoreEditor: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  maxText: {
    marginLeft: 6,
    marginRight: 6,
    fontSize: 12,
    color: '#666',
  },
  dimensionProgressTrack: {
    marginTop: 10,
    height: 6,
    backgroundColor: '#E3EAF5',
    borderRadius: 6,
    overflow: 'hidden',
  },
  dimensionProgressFill: {
    height: '100%',
    borderRadius: 6,
  },
  addButton: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#CAD8F5',
    borderStyle: 'dashed',
    borderRadius: 10,
    backgroundColor: '#F7FAFF',
  },
  addButtonText: {
    marginLeft: 6,
    color: '#1F6FEB',
    fontSize: 13,
    fontWeight: '600',
  },
  warningBox: {
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#FFF4E6',
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningText: {
    marginLeft: 8,
    color: '#A35A00',
    fontSize: 12,
    flex: 1,
  },
});
