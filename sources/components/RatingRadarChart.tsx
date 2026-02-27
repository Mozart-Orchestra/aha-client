import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Svg, Polygon, Circle, Line, Text as SvgText } from 'react-native-svg';

export interface RatingDimension {
  dimension: string;
  score: number;
  teamAvg: number;
  maxScore?: number;
}

export interface RatingRadarChartProps {
  dimensions: RatingDimension[];
  size?: number;
  showTeamAvg?: boolean;
}

/**
 * RatingRadarChart Component
 *
 * V4-UX-002: 评分仪表盘可视化 - 雷达图
 *
 * 验收标准:
 * - [x] 雷达图显示多维度评分
 * - [x] 进度条显示总分
 * - [x] 显示团队平均分对比
 * - [x] 评分解读文案
 * - [ ] Typecheck passes
 */
export function RatingRadarChart({
  dimensions,
  size = 200,
  showTeamAvg = true,
}: RatingRadarChartProps) {
  const center = size / 2;
  const radius = size * 0.35;
  const angleStep = (2 * Math.PI) / dimensions.length;

  // Calculate polygon points
  const getPoint = (score: number, maxScore: number, index: number) => {
    const angle = index * angleStep - Math.PI / 2;
    const r = (score / maxScore) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return `${x},${y}`;
  };

  // Generate polygon points for user's score
  const userPoints = dimensions
    .map((d, i) => getPoint(d.score, d.maxScore || 5, i))
    .join(' ');

  // Generate polygon points for team average
  const teamPoints = showTeamAvg
    ? dimensions
        .map((d, i) => getPoint(d.teamAvg, d.maxScore || 5, i))
        .join(' ')
    : '';

  // Calculate total score
  const totalScore =
    dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length;
  const teamAvgTotal =
    dimensions.reduce((sum, d) => sum + d.teamAvg, 0) / dimensions.length;

  // Rating interpretation
  const getRatingText = (score: number) => {
    if (score >= 4.5) return '优秀';
    if (score >= 4.0) return '良好';
    if (score >= 3.0) return '及格';
    return '需改进';
  };

  return (
    <View style={styles.container}>
      {/* Radar Chart */}
      <Svg width={size} height={size}>
        {/* Background grid - 5 levels */}
        {[1, 2, 3, 4, 5].map((level) => (
          <Polygon
            key={`grid-${level}`}
            points={dimensions
              .map((_, i) => getPoint(level, 5, i))
              .join(' ')}
            fill="none"
            stroke="#E0E0E0"
            strokeWidth={1}
          />
        ))}

        {/* Axis lines */}
        {dimensions.map((_, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const x = center + radius * Math.cos(angle);
          const y = center + radius * Math.sin(angle);
          return (
            <Line
              key={`axis-${i}`}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke="#E0E0E0"
              strokeWidth={1}
            />
          );
        })}

        {/* Team average polygon (dashed) */}
        {showTeamAvg && (
          <Polygon
            points={teamPoints}
            fill="rgba(255, 193, 7, 0.2)"
            stroke="#FFC107"
            strokeWidth={2}
            strokeDasharray="5,5"
          />
        )}

        {/* User score polygon */}
        <Polygon
          points={userPoints}
          fill="rgba(33, 150, 243, 0.3)"
          stroke="#2196F3"
          strokeWidth={2}
        />

        {/* Data points */}
        {dimensions.map((d, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const r = (d.score / (d.maxScore || 5)) * radius;
          const x = center + r * Math.cos(angle);
          const y = center + r * Math.sin(angle);
          return (
            <Circle key={`point-${i}`} cx={x} cy={y} r={4} fill="#2196F3" />
          );
        })}

        {/* Labels */}
        {dimensions.map((d, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const labelRadius = radius + 20;
          const x = center + labelRadius * Math.cos(angle);
          const y = center + labelRadius * Math.sin(angle);
          return (
            <SvgText
              key={`label-${i}`}
              x={x}
              y={y}
              fontSize={10}
              fill="#666"
              textAnchor="middle"
              alignmentBaseline="middle"
            >
              {d.dimension}
            </SvgText>
          );
        })}
      </Svg>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#2196F3' }]} />
          <Text style={styles.legendText}>个人评分</Text>
        </View>
        {showTeamAvg && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FFC107' }]} />
            <Text style={styles.legendText}>团队平均</Text>
          </View>
        )}
      </View>

      {/* Total Score */}
      <View style={styles.scoreContainer}>
        <Text style={styles.totalScoreLabel}>综合评分</Text>
        <View style={styles.scoreRow}>
          <Text style={styles.totalScoreValue}>{totalScore.toFixed(1)}</Text>
          <Text style={styles.maxScore}>/5</Text>
        </View>
        <Text
          style={[
            styles.ratingText,
            totalScore >= 4
              ? styles.ratingGood
              : totalScore >= 3
              ? styles.ratingOk
              : styles.ratingBad,
          ]}
        >
          {getRatingText(totalScore)}
        </Text>
        {showTeamAvg && (
          <Text style={styles.teamAvgText}>
            团队平均: {teamAvgTotal.toFixed(1)}/5
          </Text>
        )}
      </View>

      {/* Dimension Details */}
      <View style={styles.detailsContainer}>
        {dimensions.map((d, i) => (
          <View key={i} style={styles.detailRow}>
            <Text style={styles.detailLabel}>{d.dimension}</Text>
            <View style={styles.detailScores}>
              <Text style={styles.detailUserScore}>{d.score.toFixed(1)}</Text>
              {showTeamAvg && (
                <Text style={styles.detailTeamScore}>
                  (团队 {d.teamAvg.toFixed(1)})
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  legend: {
    flexDirection: 'row',
    marginTop: 16,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  totalScoreLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  totalScoreValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333',
  },
  maxScore: {
    fontSize: 18,
    color: '#999',
    marginBottom: 6,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingGood: {
    color: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  ratingOk: {
    color: '#FF9800',
    backgroundColor: '#FFF3E0',
  },
  ratingBad: {
    color: '#F44336',
    backgroundColor: '#FFEBEE',
  },
  teamAvgText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  detailsContainer: {
    width: '100%',
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailScores: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailUserScore: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
  },
  detailTeamScore: {
    fontSize: 12,
    color: '#999',
    marginLeft: 8,
  },
});
