/**
 * Team Stats API Client
 * R7 — Team Statistics Aggregation & Visualization
 *
 * Provides functions for fetching team statistics, usage data, and exports.
 */

import { apiFetch } from './api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TimeRange = 'day' | 'week' | 'month' | 'all';

export interface TaskStats {
    total: number;
    todo: number;
    inProgress: number;
    review: number;
    done: number;
    blocked: number;
}

export interface TokenUsage {
    total: number;
    byModel: {
        opus: number;
        sonnet: number;
        haiku: number;
    };
}

export interface CodeMetrics {
    totalCommits: number;
    totalLinesChanged: number;
    totalFilesChanged: number;
}

export interface TeamStats {
    teamId: string;
    memberCount: number;
    activeMemberCount: number;
    messageCount: number;
    taskStats: TaskStats;
    tokenUsage: TokenUsage;
    codeMetrics: CodeMetrics;
    lastActivityAt: string | null;
}

export interface UsageDataPoint {
    timestamp: number;
    tokens: number;
    cost: number;
    sessions: number;
}

export interface UsageTimeline {
    teamId: string;
    period: string;
    groupBy: 'hour' | 'day';
    data: UsageDataPoint[];
    summary: {
        totalTokens: number;
        totalCost: number;
        totalSessions: number;
    };
}

export interface ModelDistributionItem {
    model: string;
    tokenCount: number;
    percentage: number;
}

export interface ModelDistribution {
    distribution: ModelDistributionItem[];
}

export interface BatchStats {
    [teamId: string]: {
        memberCount: number;
        messageCount: number;
        taskStats: {
            total: number;
            todo: number;
            inProgress: number;
            done: number;
        };
    };
}

export interface ExportData {
    teamId: string;
    format: 'json' | 'csv';
    period: string;
    data: unknown;
    exportedAt: number;
    recordCount: number;
}

// ---------------------------------------------------------------------------
// API Functions
// ---------------------------------------------------------------------------

/**
 * Get team statistics
 */
export async function fetchTeamStats(
    teamId: string,
    period: TimeRange = 'week'
): Promise<TeamStats | null> {
    const response = await apiFetch<TeamStats>(
        `/v1/teams/${teamId}/stats?period=${period}`
    );
    return response.success ? response.data ?? null : null;
}

/**
 * Get stats for multiple teams in batch
 */
export async function fetchBatchTeamStats(teamIds: string[]): Promise<BatchStats | null> {
    const response = await apiFetch<BatchStats>('/v1/teams/stats/batch', {
        method: 'POST',
        body: JSON.stringify({ teamIds }),
    });
    return response.success ? response.data ?? null : null;
}

/**
 * Get usage timeline for a team
 */
export async function fetchTeamUsage(
    teamId: string,
    period: TimeRange = 'week',
    groupBy: 'hour' | 'day' = 'day'
): Promise<UsageTimeline | null> {
    const response = await apiFetch<UsageTimeline>(
        `/v1/teams/${teamId}/usage?period=${period}&groupBy=${groupBy}`
    );
    return response.success ? response.data ?? null : null;
}

/**
 * Get model usage distribution
 */
export async function fetchModelDistribution(
    teamId: string,
    period: TimeRange = 'week'
): Promise<ModelDistribution | null> {
    const response = await apiFetch<ModelDistribution>(
        `/v1/teams/${teamId}/usage/models?period=${period}`
    );
    return response.success ? response.data ?? null : null;
}

/**
 * Export team stats
 */
export async function exportTeamStats(
    teamId: string,
    format: 'json' | 'csv',
    period: TimeRange = 'week'
): Promise<ExportData | null> {
    const response = await apiFetch<ExportData>(
        `/v1/teams/${teamId}/export?format=${format}&period=${period}`
    );
    return response.success ? response.data ?? null : null;
}

/**
 * Clear stats cache for a team
 */
export async function clearTeamStatsCache(
    teamId: string
): Promise<{ success: boolean; cleared: number } | null> {
    const response = await apiFetch<{ success: boolean; cleared: number }>(
        `/v1/teams/${teamId}/stats/cache`,
        { method: 'DELETE' }
    );
    return response.success ? response.data ?? null : null;
}