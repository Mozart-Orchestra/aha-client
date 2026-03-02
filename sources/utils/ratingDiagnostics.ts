/**
 * Rating Diagnostics Utilities
 *
 * Shared logic for analyzing rating history and generating diagnostic insights.
 * Used by both RatingDiagnostics component and ImprovementSuggestions component.
 */

export interface RatingDataPoint {
  timestamp: number;
  rating: number;
  source: 'user' | 'master' | 'system';
  codeScore?: number;
  qualityScore?: number;
}

export interface DiagnosticInsight {
  type: 'strength' | 'weakness' | 'improvement' | 'trend';
  icon: string;
  title: string;
  description: string;
  recommendation?: string;
  priority: 'high' | 'medium' | 'low';
}

/**
 * Generate diagnostic insights from rating history
 */
export function generateDiagnosticInsights(
  ratingHistory: RatingDataPoint[],
  teamAverageRating: number,
  periodDays: number = 30
): DiagnosticInsight[] {
  const result: DiagnosticInsight[] = [];

  if (ratingHistory.length === 0) {
    return result;
  }

  // Calculate basic metrics
  const ratings = ratingHistory.map((r) => r.rating);
  const averageRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  const latestRating = ratings[ratings.length - 1];
  const earliestRating = ratings[0];
  const ratingTrend = latestRating - earliestRating;

  // 1. Team Comparison
  const ratingGap = averageRating - teamAverageRating;
  if (ratingGap >= 0.3) {
    result.push({
      type: 'strength',
      icon: 'trophy',
      title: 'Above Team Average',
      description: `Your average rating (${averageRating.toFixed(1)}) is ${ratingGap.toFixed(
        1
      )} points higher than team average (${teamAverageRating.toFixed(1)}).`,
      priority: 'low',
    });
  } else if (ratingGap <= -0.3) {
    result.push({
      type: 'weakness',
      icon: 'trending-down',
      title: 'Below Team Average',
      description: `Your average rating (${averageRating.toFixed(1)}) is ${Math.abs(
        ratingGap
      ).toFixed(1)} points lower than team average (${teamAverageRating.toFixed(1)}).`,
      recommendation: 'Review recent low-rated tasks and identify common patterns.',
      priority: 'high',
    });
  }

  // 2. Rating Trend
  if (ratingTrend > 0.5) {
    result.push({
      type: 'trend',
      icon: 'trending-up',
      title: 'Improving Trend',
      description: `Your rating has improved by ${ratingTrend.toFixed(
        1
      )} points over the last ${periodDays} days.`,
      priority: 'low',
    });
  } else if (ratingTrend < -0.5) {
    result.push({
      type: 'weakness',
      icon: 'alert-circle',
      title: 'Declining Trend',
      description: `Your rating has declined by ${Math.abs(ratingTrend).toFixed(
        1
      )} points over the last ${periodDays} days.`,
      recommendation: 'Identify recent tasks with low ratings and focus on quality improvement.',
      priority: 'high',
    });
  }

  // 3. Source Analysis
  const systemRatings = ratingHistory.filter((r) => r.source === 'system');
  if (systemRatings.length > 0) {
    const avgSystemRating =
      systemRatings.reduce((sum, r) => sum + r.rating, 0) / systemRatings.length;

    if (avgSystemRating < 3.5) {
      result.push({
        type: 'weakness',
        icon: 'construct',
        title: 'Code Quality Needs Improvement',
        description: `System-rated code quality score is ${avgSystemRating.toFixed(
          1
        )}/5, indicating room for improvement.`,
        recommendation:
          'Focus on reducing bugs, improving code readability, and adding comprehensive tests.',
        priority: 'high',
      });
    }
  }

  // 4. Quality vs Code Analysis
  const withScores = ratingHistory.filter((r) => r.codeScore && r.qualityScore);
  if (withScores.length > 0) {
    const avgCode =
      withScores.reduce((sum, r) => sum + (r.codeScore || 0), 0) / withScores.length;
    const avgQuality =
      withScores.reduce((sum, r) => sum + (r.qualityScore || 0), 0) / withScores.length;

    if (avgCode > avgQuality + 15) {
      result.push({
        type: 'improvement',
        icon: 'stats-chart',
        title: 'Quality Focus Needed',
        description: `Code quantity (${avgCode.toFixed(
          0
        )}) is high but quality score (${avgQuality.toFixed(0)}) could be improved.`,
        recommendation: 'Prioritize code reviews, testing, and documentation over speed.',
        priority: 'medium',
      });
    } else if (avgQuality > avgCode + 15) {
      result.push({
        type: 'improvement',
        icon: 'speedometer',
        title: 'Efficiency Opportunity',
        description: `Quality score (${avgQuality.toFixed(
          0
        )}) is excellent, but code quantity (${avgCode.toFixed(0)}) could be higher.`,
        recommendation: 'Consider optimizing workflow to increase output while maintaining quality.',
        priority: 'low',
      });
    }
  }

  // 5. Consistency Check
  const ratingVariance =
    ratings.reduce((sum, r) => sum + Math.pow(r - averageRating, 2), 0) / ratings.length;
  const ratingStdDev = Math.sqrt(ratingVariance);

  if (ratingStdDev > 1.0) {
    result.push({
      type: 'improvement',
      icon: 'analytics',
      title: 'Inconsistent Performance',
      description: `High rating variability (σ = ${ratingStdDev.toFixed(
        2
      )}) suggests inconsistent task performance.`,
      recommendation: 'Establish a consistent workflow and quality checklist for all tasks.',
      priority: 'medium',
    });
  } else if (ratingStdDev < 0.3) {
    result.push({
      type: 'strength',
      icon: 'checkmark-circle',
      title: 'Consistent Performance',
      description: `Low rating variability (σ = ${ratingStdDev.toFixed(
        2
      )}) shows reliable, consistent performance.`,
      priority: 'low',
    });
  }

  return result.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}
