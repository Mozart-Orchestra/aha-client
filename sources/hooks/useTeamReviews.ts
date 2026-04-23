import React from 'react';
import { sync } from '@/sync/sync';
import { getServerUrl } from '@/sync/serverConfig';
import type { TeamScorecard, TeamPublicReview } from '@/utils/teamUtils';

const blockedTeamReviewAccess = new Set<string>();

function circuitKey(teamId: string, token: string): string {
    return `${teamId}:${token.slice(0, 24)}`;
}

async function isTerminalTeamAccessError(response: Response): Promise<boolean> {
    if (response.status !== 403 && response.status !== 404) {
        return false;
    }

    try {
        const body = await response.clone().json();
        return response.status === 404 || body?.code === 'TEAM_ACCOUNT_MISMATCH';
    } catch {
        return response.status === 404;
    }
}

export function __resetTeamReviewAccessCircuitForTests() {
    blockedTeamReviewAccess.clear();
}

export function useTeamReviews(
    teamId: string,
    isAuthenticated: boolean,
): {
    teamScorecard: TeamScorecard | null;
    teamPublicReviews: TeamPublicReview[];
    teamReviewLoading: boolean;
} {
    const [teamScorecard, setTeamScorecard] = React.useState<TeamScorecard | null>(null);
    const [teamPublicReviews, setTeamPublicReviews] = React.useState<TeamPublicReview[]>([]);
    const [teamReviewLoading, setTeamReviewLoading] = React.useState(false);

    React.useEffect(() => {
        const credentials = sync.getCredentials();
        if (!teamId || !credentials?.token || !isAuthenticated) {
            setTeamScorecard(null);
            setTeamPublicReviews([]);
            setTeamReviewLoading(false);
            return;
        }

        let cancelled = false;
        const headers = {
            Authorization: `Bearer ${credentials.token}`,
            'Content-Type': 'application/json',
        };
        const encodedTeamId = encodeURIComponent(teamId);
        const accessCircuitKey = circuitKey(teamId, credentials.token);

        async function loadTeamReviews() {
            if (blockedTeamReviewAccess.has(accessCircuitKey)) {
                setTeamScorecard(null);
                setTeamPublicReviews([]);
                setTeamReviewLoading(false);
                return;
            }

            setTeamReviewLoading(true);
            const [scoreResult, reviewsResult] = await Promise.allSettled([
                fetch(`${getServerUrl()}/v1/teams/${encodedTeamId}/score`, { headers }),
                fetch(`${getServerUrl()}/v1/teams/${encodedTeamId}/reviews?limit=3`, { headers }),
            ]);

            if (cancelled) return;

            const responses = [scoreResult, reviewsResult]
                .filter((result): result is PromiseFulfilledResult<Response> => result.status === 'fulfilled')
                .map((result) => result.value);
            const terminalAccessErrors = await Promise.all(responses.map(isTerminalTeamAccessError));
            if (terminalAccessErrors.some(Boolean)) {
                blockedTeamReviewAccess.add(accessCircuitKey);
                setTeamScorecard(null);
                setTeamPublicReviews([]);
                setTeamReviewLoading(false);
                return;
            }

            const nextScore = scoreResult.status === 'fulfilled' && scoreResult.value.ok
                ? await scoreResult.value.json() as TeamScorecard
                : null;
            const nextReviews = reviewsResult.status === 'fulfilled' && reviewsResult.value.ok
                ? ((await reviewsResult.value.json()) as { reviews?: TeamPublicReview[] }).reviews ?? []
                : [];

            if (nextScore || nextReviews.length > 0) {
                blockedTeamReviewAccess.delete(accessCircuitKey);
            }
            setTeamScorecard(nextScore);
            setTeamPublicReviews(nextReviews);
            setTeamReviewLoading(false);
        }

        loadTeamReviews().catch(() => {
            if (cancelled) return;
            setTeamScorecard(null);
            setTeamPublicReviews([]);
            setTeamReviewLoading(false);
        });

        return () => {
            cancelled = true;
        };
    }, [isAuthenticated, teamId]);

    return { teamScorecard, teamPublicReviews, teamReviewLoading };
}
