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

/**
 * Fetch custom roles for the current user
 */
export async function fetchCustomRoles(credentials: AuthCredentials): Promise<CustomRole[]> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/roles`, {
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch roles: ${response.status}`);
        }

        const data = await response.json() as { roles: CustomRole[]; total: number };
        return data.roles;
    });
}

/**
 * Fetch a single custom role by ID
 */
export async function fetchCustomRole(credentials: AuthCredentials, roleId: string): Promise<CustomRole> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/roles/${roleId}`, {
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Role not found');
            }
            throw new Error(`Failed to fetch role: ${response.status}`);
        }

        const data = await response.json() as CustomRole;
        return data;
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
        const response = await fetch(`${API_ENDPOINT}/v1/roles`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(role)
        });

        if (!response.ok) {
            throw new Error(`Failed to create role: ${response.status}`);
        }

        const data = await response.json() as { success: boolean; role: CustomRole };
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
        const response = await fetch(`${API_ENDPOINT}/v1/roles/${roleId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updates)
        });

        if (!response.ok) {
            throw new Error(`Failed to update role: ${response.status}`);
        }

        const data = await response.json() as { success: boolean; role: CustomRole };
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
        const response = await fetch(`${API_ENDPOINT}/v1/roles/${roleId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to delete role: ${response.status}`);
        }
    });
}

/**
 * Fetch server-provided default role templates
 */
export async function fetchDefaultRoles(credentials: AuthCredentials): Promise<RoleTemplate[]> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/roles/defaults`, {
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch default roles: ${response.status}`);
        }

        const data = await response.json() as { roles: RoleTemplate[] };
        return data.roles;
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
        const response = await fetch(`${API_ENDPOINT}/v1/roles/pool${query ? `?${query}` : ''}`, {
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch role pool: ${response.status}`);
        }

        const data = await response.json() as { roles: PublicRole[]; total: number };
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
