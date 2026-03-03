/**
 * useBriefing hook
 *
 * Fetches the morning briefing for a given team from
 * GET /v1/teams/:teamId/briefing.
 *
 * Handles authentication headers, loading/error state, and
 * exposes a refresh callback so the screen can pull-to-refresh.
 *
 * Returns null while loading and the briefing data once resolved.
 * Errors are surfaced via the `error` field so the screen can
 * decide how to present them — this hook never throws.
 */

import * as React from 'react';
import { TokenStorage } from '@/auth/tokenStorage';
import { getServerUrl } from '@/sync/serverConfig';

// ---------------------------------------------------------------------------
// Types mirroring the server response schema
// ---------------------------------------------------------------------------

export interface BriefingTask {
    id: string;
    title: string;
    status: string;
    assigneeId?: string | null;
    priority?: string;
    updatedAt: string;
    confidence?: number;
    agentName?: string;
}

export interface BriefingBlocker {
    id: string;
    taskId: string;
    taskTitle: string;
    type: string;
    description: string;
    reportedAt: string;
}

export interface BriefingSessionSummary {
    sessionId: string;
    taskId?: string | null;
    taskTitle?: string | null;
    agentName?: string | null;
    progress: number;
    continuationHint: string;
    lastActiveAt: string;
}

export interface BriefingData {
    generatedAt: string;
    period: { start: string; end: string };
    summary: string;
    completedTasks: BriefingTask[];
    inProgressTasks: BriefingTask[];
    blockers: BriefingBlocker[];
    pendingReviews: BriefingTask[];
    keyMetrics: {
        tasksCompleted: number;
        tokensUsed: number;
        estimatedCost: number;
    };
    nextActions: string[];
    contextResume: {
        lastActiveSession: BriefingSessionSummary | null;
        continuationHint: string;
    };
    greeting: {
        message: string;
        date: string;
    };
}

interface UseBriefingResult {
    briefing: BriefingData | null;
    isLoading: boolean;
    error: string | null;
    refresh: () => void;
}

// ---------------------------------------------------------------------------
// Hook implementation
// ---------------------------------------------------------------------------

export function useBriefing(teamId: string): UseBriefingResult {
    const [briefing, setBriefing] = React.useState<BriefingData | null>(null);
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [refreshToken, setRefreshToken] = React.useState(0);

    React.useEffect(() => {
        if (!teamId) {
            return;
        }

        let cancelled = false;

        const fetchBriefing = async () => {
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
                const url = `${serverUrl}/v1/teams/${encodeURIComponent(teamId)}/briefing`;

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

                const data = await response.json() as BriefingData;
                if (!cancelled) {
                    setBriefing(data);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : 'Failed to load briefing');
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        };

        fetchBriefing();

        return () => {
            cancelled = true;
        };
    }, [teamId, refreshToken]);

    const refresh = React.useCallback(() => {
        setRefreshToken(prev => prev + 1);
    }, []);

    return { briefing, isLoading, error, refresh };
}
