import { AuthCredentials } from '@/auth/tokenStorage';
import { backoff } from '@/utils/time';
import { getServerUrl } from './serverConfig';

/**
 * Custom Role type matching roleRoutes.ts schema
 */
export interface CustomRole {
    id: string;
    title: string;
    summary?: string;
    icon?: string;
    modelConfig?: {
        model?: string;
        temperature?: number;
        maxTokens?: number;
    };
    toolPermissions?: {
        allowRead?: boolean;
        allowWrite?: boolean;
        allowEdit?: boolean;
        allowBash?: boolean;
        allowedTools?: string[];
        disallowedTools?: string[];
    };
    assignedSkills?: string[];
    policy?: {
        permissionMode?: 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan';
        accessLevel?: 'read-only' | 'full-access';
        coordinationMode?: 'strong' | 'weak';
    };
    responsibilities?: string[];
    abilityBoundaries?: string[];
    handoffProtocol?: string[];
    protocol?: string[];
    isTemplate?: boolean;
    templateSource?: string;
    visibility?: 'public' | 'private';
    ownerId?: string;
    createdAt?: number;
    updatedAt?: number;
    publishedAt?: number;
    stats?: RoleStats;
}

export interface RoleStats {
    reviewCount: number;
    completionCount: number;
    totalRating: number;
    averageRating: number;
    cumulativeCode: number;
    cumulativeQuality: number;
    sourceScoreTotals: {
        user: number;
        master: number;
        system: number;
    };
    lastReviewedAt?: number;
}

export interface PublicRole extends CustomRole {
    visibility: 'public';
    ownerId: string;
    publishedAt: number;
    stats: RoleStats;
}

export interface RoleTemplate {
    id: string;
    title: string;
    summary: string;
    icon?: string;
    category?: string;
    responsibilities?: string[];
    abilityBoundaries?: string[];
    handoffProtocol?: string[];
    protocol?: string[];
}

export interface RoleReviewInput {
    rating: number;
    codeScore?: number;
    qualityScore?: number;
    source?: 'user' | 'master' | 'system';
    sourceScores?: {
        user?: number;
        master?: number;
        system?: number;
    };
    teamId?: string;
    comment?: string;
}

export interface RoleReview extends RoleReviewInput {
    id: string;
    roleId: string;
    reviewerId: string;
    createdAt: number;
}

export interface TeamReviewInput {
    rating: number;
    codeScore?: number;
    qualityScore?: number;
    source?: 'user' | 'master' | 'system';
    sourceScores?: {
        user?: number;
        master?: number;
        system?: number;
    };
    roleIds?: string[];
    comment?: string;
}

export interface TeamReview extends TeamReviewInput {
    id: string;
    teamId: string;
    reviewerId: string;
    createdAt: number;
}

export interface TeamScorecard {
    teamId: string;
    reviewCount: number;
    totalRating: number;
    averageRating: number;
    cumulativeCode: number;
    cumulativeQuality: number;
    sourceScoreTotals: {
        user: number;
        master: number;
        system: number;
    };
    lastReviewedAt?: number;
}

async function parseApiError(response: Response): Promise<string | null> {
    try {
        const payload = await response.clone().json() as { error?: string; message?: string };
        return payload.error || payload.message || null;
    } catch {
        return null;
    }
}

async function fetchJsonWithFallback<T>(
    urlCandidates: string[],
    headers: Record<string, string>
): Promise<T> {
    let lastError: Error | null = null;

    for (const url of urlCandidates) {
        try {
            const response = await fetch(url, { headers });
            if (!response.ok) {
                lastError = new Error(`Request failed: ${response.status} (${url})`);
                continue;
            }
            return await response.json() as T;
        } catch (error) {
            lastError = error instanceof Error ? error : new Error('Unknown request error');
        }
    }

    throw lastError || new Error('All fallback endpoints failed');
}

function getApiBaseCandidates(apiEndpoint: string): string[] {
    const base = apiEndpoint.replace(/\/+$/, '');
    const v1Base = base.replace(/\/api\/v2$/, '');
    const v2Base = `${v1Base}/api/v2`;

    if (base.includes('/api/v2')) {
        return Array.from(new Set([base, v1Base]));
    }

    return Array.from(new Set([base, v2Base]));
}

async function requestWithBaseFallback<T>(
    baseCandidates: string[],
    run: (base: string) => Promise<Response>,
    options?: { parseJson?: boolean }
): Promise<T> {
    let lastError: Error | null = null;

    for (const base of baseCandidates) {
        try {
            const response = await run(base);
            if (!response.ok) {
                const errorMessage = await parseApiError(response);
                lastError = new Error(errorMessage || `Request failed: ${response.status} (${base})`);
                continue;
            }

            if (options?.parseJson === false) {
                return undefined as T;
            }

            return await response.json() as T;
        } catch (error) {
            lastError = error instanceof Error ? error : new Error('Unknown request error');
        }
    }

    throw lastError || new Error('All fallback endpoints failed');
}

function getRatingApiBaseCandidates(apiEndpoint: string): string[] {
    const base = apiEndpoint.replace(/\/+$/, '');
    if (base.includes('/api/v2')) {
        return [base];
    }
    return [base, `${base}/api/v2`];
}

function buildRatingUrlCandidates(apiEndpoint: string, path: string): string[] {
    return getRatingApiBaseCandidates(apiEndpoint).map((base) => `${base}${path}`);
}

async function fetchJsonWithStatusFallback<T>(
    urlCandidates: string[],
    init: RequestInit,
    retryStatusCodes: number[] = [404, 405]
): Promise<T> {
    let lastError: Error | null = null;

    for (let i = 0; i < urlCandidates.length; i += 1) {
        const url = urlCandidates[i];
        try {
            const response = await fetch(url, init);
            if (response.ok) {
                return await response.json() as T;
            }

            const errorMessage = await parseApiError(response);
            const shouldRetry = i < urlCandidates.length - 1 && retryStatusCodes.includes(response.status);
            if (shouldRetry) {
                continue;
            }

            throw new Error(errorMessage || `Request failed: ${response.status} (${url})`);
        } catch (error) {
            lastError = error instanceof Error ? error : new Error('Unknown request error');
            if (i < urlCandidates.length - 1) {
                continue;
            }
        }
    }

    throw lastError || new Error('All fallback endpoints failed');
}

/**
 * Fetch custom roles for the current user
 */
export async function fetchCustomRoles(credentials: AuthCredentials): Promise<CustomRole[]> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const headers = {
            'Authorization': `Bearer ${credentials.token}`,
            'Content-Type': 'application/json'
        };
        const data = await requestWithBaseFallback<{ roles: CustomRole[]; total: number }>(
            getApiBaseCandidates(API_ENDPOINT),
            (base) => fetch(`${base}/v1/roles`, { headers })
        );
        return data.roles;
    });
}

/**
 * Fetch a single custom role by ID
 */
export async function fetchCustomRole(credentials: AuthCredentials, roleId: string): Promise<CustomRole> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const headers = {
            'Authorization': `Bearer ${credentials.token}`,
            'Content-Type': 'application/json'
        };
        return await requestWithBaseFallback<CustomRole>(
            getApiBaseCandidates(API_ENDPOINT),
            (base) => fetch(`${base}/v1/roles/${roleId}`, { headers })
        );
    });
}

/**
 * Create a custom role
 */
export async function createCustomRole(
    credentials: AuthCredentials,
    role: Partial<CustomRole>
): Promise<CustomRole> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const headers = {
            'Authorization': `Bearer ${credentials.token}`,
            'Content-Type': 'application/json'
        };
        const data = await requestWithBaseFallback<{ success: boolean; role: CustomRole }>(
            getApiBaseCandidates(API_ENDPOINT),
            (base) => fetch(`${base}/v1/roles`, {
                method: 'POST',
                headers,
                body: JSON.stringify(role)
            })
        );
        return data.role;
    });
}

/**
 * Update a custom role
 */
export async function updateCustomRole(
    credentials: AuthCredentials,
    roleId: string,
    updates: Partial<CustomRole>
): Promise<CustomRole> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const headers = {
            'Authorization': `Bearer ${credentials.token}`,
            'Content-Type': 'application/json'
        };
        const data = await requestWithBaseFallback<{ success: boolean; role: CustomRole }>(
            getApiBaseCandidates(API_ENDPOINT),
            (base) => fetch(`${base}/v1/roles/${roleId}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify(updates)
            })
        );
        return data.role;
    });
}

/**
 * Delete a custom role
 */
export async function deleteCustomRole(
    credentials: AuthCredentials,
    roleId: string
): Promise<void> {
    const API_ENDPOINT = getServerUrl();

    await backoff(async () => {
        const headers = {
            'Authorization': `Bearer ${credentials.token}`,
            'Content-Type': 'application/json'
        };
        await requestWithBaseFallback<void>(
            getApiBaseCandidates(API_ENDPOINT),
            (base) => fetch(`${base}/v1/roles/${roleId}`, {
                method: 'DELETE',
                headers
            }),
            { parseJson: false }
        );
    });
}

/**
 * Fetch server-provided default role templates
 */
export async function fetchDefaultRoles(credentials: AuthCredentials): Promise<RoleTemplate[]> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const headers = {
            'Authorization': `Bearer ${credentials.token}`,
            'Content-Type': 'application/json'
        };

        const candidates = [
            `${API_ENDPOINT}/v1/roles/templates/list`,
            `${API_ENDPOINT}/v1/roles/defaults`,
        ];

        // templates/list returns { templates }, defaults returns { roles }
        const data = await fetchJsonWithFallback<{ roles?: RoleTemplate[]; templates?: RoleTemplate[] }>(
            candidates,
            headers
        );

        return data.templates || data.roles || [];
    });
}

/**
 * Fetch public role pool
 */
export async function fetchRolePool(
    credentials: AuthCredentials,
    options?: { limit?: number; search?: string }
): Promise<PublicRole[]> {
    const API_ENDPOINT = getServerUrl();
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.search) params.set('search', options.search);
    const query = params.toString();

    return await backoff(async () => {
        const headers = {
            'Authorization': `Bearer ${credentials.token}`,
            'Content-Type': 'application/json'
        };

        const suffix = query ? `?${query}` : '';
        const candidates = [
            `${API_ENDPOINT}/v1/roles/public${suffix}`,
            `${API_ENDPOINT}/v1/roles/pool${suffix}`,
        ];

        const data = await fetchJsonWithFallback<{ roles: PublicRole[]; total: number }>(
            candidates,
            headers
        );
        return data.roles;
    });
}

/**
 * Submit a public review for a role
 */
export async function submitRoleReview(
    credentials: AuthCredentials,
    roleId: string,
    review: RoleReviewInput
): Promise<{ review: RoleReview; stats: RoleStats }> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/roles/${roleId}/reviews`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(review)
        });

        if (!response.ok) {
            throw new Error(`Failed to submit role review: ${response.status}`);
        }

        return await response.json() as { success: true; review: RoleReview; stats: RoleStats };
    });
}

/**
 * Fetch public reviews for a role
 */
export async function fetchRoleReviews(
    credentials: AuthCredentials,
    roleId: string,
    limit = 50
): Promise<RoleReview[]> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/roles/${roleId}/reviews?limit=${limit}`, {
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch role reviews: ${response.status}`);
        }

        const data = await response.json() as { reviews: RoleReview[]; total: number };
        return data.reviews;
    });
}

/**
 * Submit a public review for a team
 */
export async function submitTeamReview(
    credentials: AuthCredentials,
    teamId: string,
    review: TeamReviewInput
): Promise<{ review: TeamReview; scorecard: TeamScorecard }> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/teams/${teamId}/reviews`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(review)
        });

        if (!response.ok) {
            throw new Error(`Failed to submit team review: ${response.status}`);
        }

        return await response.json() as { success: true; review: TeamReview; scorecard: TeamScorecard };
    });
}

/**
 * Fetch team public reviews
 */
export async function fetchTeamReviews(
    credentials: AuthCredentials,
    teamId: string,
    limit = 50
): Promise<TeamReview[]> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/teams/${teamId}/reviews?limit=${limit}`, {
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch team reviews: ${response.status}`);
        }

        const data = await response.json() as { reviews: TeamReview[]; total: number };
        return data.reviews;
    });
}

/**
 * Fetch cumulative team scorecard
 */
export async function fetchTeamScore(
    credentials: AuthCredentials,
    teamId: string
): Promise<TeamScorecard> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/teams/${teamId}/score`, {
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch team score: ${response.status}`);
        }

        return await response.json() as TeamScorecard;
    });
}

// ============================================
// Rating Records API (PRD RATING-SERVER-002)
// ============================================

export interface RatingRecord {
    id: string;
    teamId: string;
    roleId: string;
    taskId?: string;
    rating: number;
    userRating?: number;
    masterRating?: number;
    systemRating?: number;
    codeLines: number;
    commits: number;
    bugsCount: number;
    qualityScore: number;
    source: 'user' | 'master' | 'system';
    reviewerId: string;
    comment?: string;
    createdAt: number;
}

export interface TeamRatingAnalytics {
    teamId: string;
    totalRatings: number;
    averageRating: number;
    totalCodeLines: number;
    totalCommits: number;
    totalBugs: number;
    averageQualityScore: number;
    roleBreakdown: Array<{
        roleId: string;
        totalRatings: number;
        averageRating: number;
        totalCodeLines: number;
        totalCommits: number;
        totalBugs: number;
        averageQualityScore: number;
    }>;
}

export interface SystemRatingMetrics {
    roleId: string;
    teamId?: string;
    taskId?: string;
    codeLines: number;
    commits: number;
    bugsCount: number;
    filesChanged: number;
    reviewComments: number;
    testCoverage?: number;
    persist?: boolean;
}

export interface SystemRatingResult {
    rating: number;
    codeScore: number;
    qualityScore: number;
    systemScore: number;
    breakdown: {
        codeLinesScore: number;
        commitsScore: number;
        bugsScore: number;
        qualityBonus: number;
    };
}

/**
 * Fetch team rating records
 */
export async function fetchTeamRatings(
    credentials: AuthCredentials,
    teamId: string,
    options?: { limit?: number }
): Promise<{ ratings: RatingRecord[]; total: number }> {
    const API_ENDPOINT = getServerUrl();
    const limit = options?.limit || 200;
    const suffix = limit !== 200 ? `?limit=${limit}` : '';
    const urlCandidates = buildRatingUrlCandidates(API_ENDPOINT, `/v1/ratings/${teamId}${suffix}`);

    return await backoff(async () => {
        return await fetchJsonWithStatusFallback<{ ratings: RatingRecord[]; total: number }>(urlCandidates, {
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json'
            }
        });
    });
}

/**
 * Fetch team rating analytics
 */
export async function fetchTeamRatingAnalytics(
    credentials: AuthCredentials,
    teamId: string
): Promise<TeamRatingAnalytics> {
    const API_ENDPOINT = getServerUrl();
    const urlCandidates = buildRatingUrlCandidates(API_ENDPOINT, `/v1/ratings/${teamId}/analytics`);

    return await backoff(async () => {
        return await fetchJsonWithStatusFallback<TeamRatingAnalytics>(urlCandidates, {
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json'
            }
        });
    });
}

/**
 * Calculate system rating based on task metrics
 */
export async function calculateSystemRating(
    credentials: AuthCredentials,
    metrics: SystemRatingMetrics
): Promise<{ success: boolean; result: SystemRatingResult; persisted: boolean }> {
    const API_ENDPOINT = getServerUrl();
    const urlCandidates = buildRatingUrlCandidates(API_ENDPOINT, '/v1/ratings/system/calculate');

    return await backoff(async () => {
        return await fetchJsonWithStatusFallback<{ success: boolean; result: SystemRatingResult; persisted: boolean }>(urlCandidates, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(metrics)
        });
    });
}

/**
 * Get role system rating snapshot
 */
export async function fetchRoleSystemRating(
    credentials: AuthCredentials,
    roleId: string
): Promise<{ success: boolean; result: SystemRatingResult | null }> {
    const API_ENDPOINT = getServerUrl();
    const urlCandidates = buildRatingUrlCandidates(API_ENDPOINT, `/v1/ratings/system/role/${roleId}`);

    return await backoff(async () => {
        return await fetchJsonWithStatusFallback<{ success: boolean; result: SystemRatingResult | null }>(urlCandidates, {
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json'
            }
        });
    });
}
