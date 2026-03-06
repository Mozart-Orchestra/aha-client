import * as React from 'react';
import { TokenStorage } from '@/auth/tokenStorage';
import { getServerUrl } from '@/sync/serverConfig';
import { normalizeEvolutionSummaryResponse } from './evolutionSummary.shared';
import type { EvolutionSummary } from './evolutionSummary.shared';

export type {
    EvolutionEvidenceCategory,
    EvolutionEvidenceItem,
    EvolutionRecommendation,
    EvolutionSummary,
} from './evolutionSummary.shared';

export interface UseEvolutionSummaryResult {
    summary: EvolutionSummary | null;
    isLoading: boolean;
    error: string | null;
    refresh: () => void;
}

export { normalizeEvolutionSummaryResponse } from './evolutionSummary.shared';

export function useEvolutionSummary(teamId: string): UseEvolutionSummaryResult {
    const [summary, setSummary] = React.useState<EvolutionSummary | null>(null);
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [refreshToken, setRefreshToken] = React.useState(0);

    React.useEffect(() => {
        if (!teamId) {
            return;
        }

        let cancelled = false;

        const fetchSummary = async () => {
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
                const response = await fetch(`${serverUrl}/v1/teams/${encodeURIComponent(teamId)}/evolution/summary`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${credentials.token}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (!response.ok) {
                    throw new Error(`Failed to load evolution summary (${response.status})`);
                }

                const payload = await response.json();
                if (!cancelled) {
                    setSummary(normalizeEvolutionSummaryResponse(payload, teamId));
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : 'Failed to load evolution summary');
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        };

        void fetchSummary();

        return () => {
            cancelled = true;
        };
    }, [teamId, refreshToken]);

    return {
        summary,
        isLoading,
        error,
        refresh: React.useCallback(() => setRefreshToken((value) => value + 1), []),
    };
}
