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
  raw: Partial<TeamStats>
): TeamStats {
  const tokenTotal = raw.tokenUsage?.total ?? 0;
  const totalCost = raw.costMetrics?.totalCost ?? 0;
  const budget = raw.costMetrics?.estimatedBudget ?? 100;
  const utilization = budget > 0 ? (totalCost / budget) * 100 : 0;

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

        const data = await response.json() as Partial<TeamStats>;
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
          const pointCount = Math.max(data.data?.length ?? 0, 1);
          const totalTokens = data.summary?.totalTokens ?? 0;
          const totalCost = data.summary?.totalCost ?? 0;
          setTimeline({
            teamId: data.teamId,
            period: data.period,
            groupBy: data.groupBy,
            data: data.data ?? [],
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
