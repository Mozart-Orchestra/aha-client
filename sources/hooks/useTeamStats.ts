/**
 * R7 Team Stats API Hook
 * Fetches team statistics, usage metrics, and cost tracking data
 */

import * as React from 'react';
import { TokenStorage } from '@/auth/tokenStorage';
import { getServerUrl } from '@/sync/serverConfig';

export interface TeamStats {
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
  modelDistribution: TeamModelDistributionPoint[];
  codeMetrics: {
    totalCommits: number;
    totalLinesChanged: number;
    totalFilesChanged: number;
  };
  costMetrics: {
    totalCost: number;
    estimatedBudget: number;
    budgetUtilization: number;
  };
  lastActivityAt: string | null;
}

export interface UsageTimeline {
  teamId: string;
  period: string;
  groupBy: 'hour' | 'day';
  data: Array<{
    timestamp: number;
    tokens: number;
    cost: number;
    sessions: number;
  }>;
  summary: {
    totalTokens: number;
    totalCost: number;
    totalSessions?: number;
    avgTokensPerDay: number;
    avgCostPerDay: number;
  };
}

export interface TeamModelDistributionPoint {
  model: string;
  label: string;
  tokenCount: number;
  percentage: number;
}

interface TeamModelDistributionResponse {
  distribution?: Array<{
    model?: string;
    tokenCount?: number;
    percentage?: number;
  }>;
}

type RawTeamStats = Partial<Omit<TeamStats, 'modelDistribution'>> & {
  modelDistribution?: TeamModelDistributionResponse['distribution'];
};

interface UseTeamStatsResult {
  stats: TeamStats | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

interface UseTeamUsageTimelineResult {
  timeline: UsageTimeline | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

interface UseTeamModelDistributionResult {
  distribution: TeamModelDistributionPoint[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

function toFiniteNumber(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatModelLabel(model: string): string {
  const compact = model.trim();
  if (!compact) {
    return 'Unknown Model';
  }

  return compact
    .split('/')
    .filter(Boolean)
    .pop()!
    .replace(/[_:-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function normalizeUsageTimestamp(timestamp: number): number {
  const safeTimestamp = toFiniteNumber(timestamp);
  if (safeTimestamp <= 0) {
    return 0;
  }

  return safeTimestamp < 1_000_000_000_000 ? safeTimestamp * 1000 : safeTimestamp;
}

export function normalizeModelDistribution(
  distribution: TeamModelDistributionResponse['distribution']
): TeamModelDistributionPoint[] {
  const points = Array.isArray(distribution)
    ? distribution
        .map((entry) => {
          const model = String(entry?.model ?? '').trim();
          const tokenCount = Math.max(0, Math.round(toFiniteNumber(entry?.tokenCount)));
          const percentage = Math.max(0, Math.round(toFiniteNumber(entry?.percentage)));

          if (!model && tokenCount <= 0 && percentage <= 0) {
            return null;
          }

          return {
            model,
            label: formatModelLabel(model),
            tokenCount,
            percentage,
          };
        })
        .filter((point): point is TeamModelDistributionPoint => Boolean(point))
    : [];

  const totalTokens = points.reduce((sum, point) => sum + point.tokenCount, 0);

  return points
    .map((point) => ({
      ...point,
      percentage: point.percentage > 0
        ? point.percentage
        : totalTokens > 0
          ? Math.round((point.tokenCount / totalTokens) * 100)
          : 0,
    }))
    .sort((left, right) => right.tokenCount - left.tokenCount);
}

function buildLegacyModelDistribution(
  byModel: TeamStats['tokenUsage']['byModel'] | undefined
): TeamModelDistributionResponse['distribution'] {
  return [
    { model: 'opus', tokenCount: Math.max(0, Math.round(toFiniteNumber(byModel?.opus))), percentage: 0 },
    { model: 'sonnet', tokenCount: Math.max(0, Math.round(toFiniteNumber(byModel?.sonnet))), percentage: 0 },
    { model: 'haiku', tokenCount: Math.max(0, Math.round(toFiniteNumber(byModel?.haiku))), percentage: 0 },
  ];
}

function normalizePeriod(period: string): 'day' | 'week' | 'month' | 'all' {
  const normalized = period.trim().toLowerCase();
  if (normalized === 'day' || normalized === '1d') return 'day';
  if (normalized === 'week' || normalized === '7d') return 'week';
  if (normalized === 'month' || normalized === '30d') return 'month';
  if (normalized === 'all') return 'all';
  return 'week';
}

function normalizeTimelinePeriod(period: string): 'day' | 'week' | 'month' {
  const normalized = normalizePeriod(period);
  if (normalized === 'all') return 'month';
  return normalized;
}

function normalizeTeamStats(
  teamId: string,
  period: string,
  raw: RawTeamStats
): TeamStats {
  const tokenTotal = raw.tokenUsage?.total ?? 0;
  const totalCost = raw.costMetrics?.totalCost ?? 0;
  const budget = raw.costMetrics?.estimatedBudget ?? 100;
  const utilization = budget > 0 ? (totalCost / budget) * 100 : 0;
  const modelDistributionSource = raw.modelDistribution && raw.modelDistribution.length > 0
    ? raw.modelDistribution
    : buildLegacyModelDistribution(raw.tokenUsage?.byModel);

  return {
    teamId: raw.teamId ?? teamId,
    period: raw.period ?? period,
    memberCount: raw.memberCount ?? 0,
    activeMemberCount: raw.activeMemberCount ?? 0,
    messageCount: raw.messageCount ?? 0,
    taskStats: {
      total: raw.taskStats?.total ?? 0,
      todo: raw.taskStats?.todo ?? 0,
      inProgress: raw.taskStats?.inProgress ?? 0,
      review: raw.taskStats?.review ?? 0,
      done: raw.taskStats?.done ?? 0,
      blocked: raw.taskStats?.blocked ?? 0,
    },
    tokenUsage: {
      total: tokenTotal,
      byModel: {
        opus: raw.tokenUsage?.byModel?.opus ?? 0,
        sonnet: raw.tokenUsage?.byModel?.sonnet ?? 0,
        haiku: raw.tokenUsage?.byModel?.haiku ?? 0,
      },
    },
    modelDistribution: normalizeModelDistribution(modelDistributionSource),
    codeMetrics: {
      totalCommits: raw.codeMetrics?.totalCommits ?? 0,
      totalLinesChanged: raw.codeMetrics?.totalLinesChanged ?? 0,
      totalFilesChanged: raw.codeMetrics?.totalFilesChanged ?? 0,
    },
    costMetrics: {
      totalCost,
      estimatedBudget: budget,
      budgetUtilization: raw.costMetrics?.budgetUtilization ?? utilization,
    },
    lastActivityAt: raw.lastActivityAt ?? null,
  };
}

/**
 * Fetch team stats for a specific team
 */
export function useTeamStats(teamId: string | undefined): UseTeamStatsResult {
  const [stats, setStats] = React.useState<TeamStats | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshToken, setRefreshToken] = React.useState(0);

  React.useEffect(() => {
    if (!teamId) {
      return;
    }

    let cancelled = false;

    const fetchStats = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const credentials = await TokenStorage.getCredentials();
        if (!credentials) {
          if (!cancelled) {
            setError('Not authenticated');
          }
          return;
        }

        const serverUrl = getServerUrl();
        const period = normalizePeriod('week');
        const url = `${serverUrl}/v1/teams/${encodeURIComponent(teamId)}/stats?period=${period}`;

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${credentials.token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({})) as { error?: string };
          if (!cancelled) {
            setError(body.error ?? `Request failed with status ${response.status}`);
          }
          return;
        }

        const data = await response.json() as RawTeamStats;
        if (!cancelled) {
          setStats(normalizeTeamStats(teamId, period, data));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load team stats');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchStats();

    return () => {
      cancelled = true;
    };
  }, [teamId, refreshToken]);

  const refresh = React.useCallback(() => {
    setRefreshToken(prev => prev + 1);
  }, []);

  return { stats, isLoading, error, refresh };
}

/**
 * Fetch usage timeline for cost tracking
 */
export function useTeamUsageTimeline(
  teamId: string | undefined,
  period: string = '7d'
): UseTeamUsageTimelineResult {
  const [timeline, setTimeline] = React.useState<UsageTimeline | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshToken, setRefreshToken] = React.useState(0);

  React.useEffect(() => {
    if (!teamId) {
      return;
    }

    let cancelled = false;

    const fetchTimeline = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const credentials = await TokenStorage.getCredentials();
        if (!credentials) {
          if (!cancelled) {
            setError('Not authenticated');
          }
          return;
        }

        const serverUrl = getServerUrl();
        const normalizedPeriod = normalizeTimelinePeriod(period);
        const url = `${serverUrl}/v1/teams/${encodeURIComponent(teamId)}/usage?period=${normalizedPeriod}&groupBy=day`;

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${credentials.token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({})) as { error?: string };
          if (!cancelled) {
            setError(body.error ?? `Request failed with status ${response.status}`);
          }
          return;
        }

        const data = await response.json() as Omit<UsageTimeline, 'summary'> & {
          summary?: { totalTokens?: number; totalCost?: number; totalSessions?: number };
        };
        if (!cancelled) {
          const points = (data.data ?? []).map((point) => ({
            timestamp: normalizeUsageTimestamp(toFiniteNumber(point.timestamp)),
            tokens: Math.max(0, Math.round(toFiniteNumber(point.tokens))),
            cost: toFiniteNumber(point.cost),
            sessions: Math.max(0, Math.round(toFiniteNumber(point.sessions))),
          }));
          const pointCount = Math.max(points.length, 1);
          const totalTokens = data.summary?.totalTokens ?? points.reduce((sum, point) => sum + point.tokens, 0);
          const totalCost = data.summary?.totalCost ?? points.reduce((sum, point) => sum + point.cost, 0);
          setTimeline({
            teamId: data.teamId,
            period: data.period,
            groupBy: data.groupBy,
            data: points,
            summary: {
              totalTokens,
              totalCost,
              totalSessions: data.summary?.totalSessions ?? 0,
              avgTokensPerDay: Math.round(totalTokens / pointCount),
              avgCostPerDay: Number((totalCost / pointCount).toFixed(4)),
            },
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load usage timeline');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchTimeline();

    return () => {
      cancelled = true;
    };
  }, [teamId, period, refreshToken]);

  const refresh = React.useCallback(() => {
    setRefreshToken(prev => prev + 1);
  }, []);

  return { timeline, isLoading, error, refresh };
}

export function useTeamModelDistribution(
  teamId: string | undefined,
  period: string = '7d'
): UseTeamModelDistributionResult {
  const [distribution, setDistribution] = React.useState<TeamModelDistributionPoint[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshToken, setRefreshToken] = React.useState(0);

  React.useEffect(() => {
    if (!teamId) {
      return;
    }

    let cancelled = false;

    const fetchDistribution = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const credentials = await TokenStorage.getCredentials();
        if (!credentials) {
          if (!cancelled) {
            setError('Not authenticated');
          }
          return;
        }

        const serverUrl = getServerUrl();
        const normalizedPeriod = normalizeTimelinePeriod(period);
        const url = `${serverUrl}/v1/teams/${encodeURIComponent(teamId)}/usage/models?period=${normalizedPeriod}`;

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${credentials.token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({})) as { error?: string };
          if (!cancelled) {
            setError(body.error ?? `Request failed with status ${response.status}`);
          }
          return;
        }

        const data = await response.json() as TeamModelDistributionResponse;
        if (!cancelled) {
          setDistribution(normalizeModelDistribution(data.distribution));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load model distribution');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchDistribution();

    return () => {
      cancelled = true;
    };
  }, [period, refreshToken, teamId]);

  const refresh = React.useCallback(() => {
    setRefreshToken((previous) => previous + 1);
  }, []);

  return { distribution, isLoading, error, refresh };
}

/**
 * Format token count to human readable string
 */
export function formatTokens(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(2)}M`;
  } else if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return tokens.toString();
}

/**
 * Format cost to USD string
 */
export function formatCost(cost: number): string {
  return `$${cost.toFixed(2)}`;
}

/**
 * Calculate percentage
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}
