import { AuthCredentials } from '@/auth/tokenStorage';
import { backoff } from '@/utils/time';
import { getServerUrl } from './serverConfig';

// ============================================
// V5 AI-Powered Features API Client
// ============================================

/**
 * Project requirement for role recommendation
 */
export interface ProjectRequirement {
    techStack: string[];
    teamSize: number;
    projectType: string;
    description?: string;
    timeline?: string;
}

/**
 * Role recommendation result
 */
export interface RoleRecommendation {
    role: {
        id: string;
        name: string;
        category: string;
        assignedSkills: string[];
        description: string;
        rating?: number;
        completedTasks?: number;
        successRate?: number;
    };
    matchScore: number;
    reasons: string[];
    skillMatch: {
        matched: string[];
        missing: string[];
        bonus: string[];
    };
}

/**
 * Recommendation API request
 */
export interface RecommendationRequest {
    techStack: string[];
    teamSize: number;
    projectType: string;
    description?: string;
    timeline?: string;
    maxRecommendations?: number;
}

/**
 * Recommendation API response
 */
export interface RecommendationResponse {
    success: boolean;
    recommendations: RoleRecommendation[];
}

/**
 * Search result from semantic search
 */
export interface SearchResult {
    roleKey: string;
    roleId: string;
    similarity: number;
    description: string;
    metadata?: {
        title?: string;
        category?: string;
        skills?: string[];
    };
}

/**
 * Search API request
 */
export interface SearchRequest {
    query: string;
    maxResults?: number;
    minSimilarity?: number;
    includeMetadata?: boolean;
}

/**
 * Search API response
 */
export interface SearchResponse {
    results: SearchResult[];
    total: number;
}

/**
 * Index role request
 */
export interface IndexRoleRequest {
    roleKey: string;
    description: string;
    metadata?: {
        title?: string;
        category?: string;
        skills?: string[];
    };
}

/**
 * Index role response
 */
export interface IndexRoleResponse {
    success: boolean;
    message: string;
}

/**
 * Rating data for improvement suggestions
 */
export interface RatingData {
    overall: number;
    dimensions: {
        codeQuality: number;
        collaboration: number;
        efficiency: number;
        innovation: number;
        problemSolving: number;
    };
    trends: {
        direction: 'improving' | 'stable' | 'declining';
        changeRate: number;
    };
    historicalData: Array<{
        date: string;
        score: number;
        taskId: string;
    }>;
}

/**
 * Learning resource
 */
export interface LearningResource {
    type: 'article' | 'video' | 'course' | 'book' | 'tool';
    title: string;
    url: string;
    description: string;
    estimatedTime: string;
}

/**
 * Improvement suggestion
 */
export interface ImprovementSuggestion {
    category: string;
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    actionableSteps: string[];
    resources: LearningResource[];
    expectedImpact: string;
    timeline: string;
}

/**
 * Suggestion API request
 */
export interface SuggestionRequest {
    profile: {
        roleId: string;
        title: string;
        skills: string[];
    };
    ratingData: RatingData;
    options?: {
        maxSuggestions?: number;
        categories?: string[];
    };
}

/**
 * Suggestion API response
 */
export interface SuggestionResponse {
    suggestions: ImprovementSuggestion[];
    total: number;
}

/**
 * Weakness analysis response
 */
export interface WeaknessAnalysis {
    weaknesses: Array<{
        dimension: string;
        score: number;
        severity: 'high' | 'medium' | 'low';
    }>;
    summary: string;
}

async function parseApiError(response: Response): Promise<string | null> {
    try {
        const payload = await response.clone().json() as { error?: string; message?: string };
        return payload.error || payload.message || null;
    } catch {
        return null;
    }
}

function buildV5UrlCandidates(apiEndpoint: string, path: string): string[] {
    const base = apiEndpoint.replace(/\/+$/, '');
    const withoutApiV2 = base.endsWith('/api/v2') ? base.slice(0, -7) : base;

    // Some environments expose V5 as /api/v5 directly, others via /api/v2 prefix.
    const candidates = [`${withoutApiV2}${path}`, `${withoutApiV2}/api/v2${path}`];
    return [...new Set(candidates)];
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

// ============================================
// Recommendation API (V5-AI-001)
// ============================================

/**
 * Get role recommendations for a project
 */
export async function getRoleRecommendations(
    credentials: AuthCredentials,
    request: RecommendationRequest
): Promise<RecommendationResponse> {
    const API_ENDPOINT = getServerUrl();
    const urlCandidates = buildV5UrlCandidates(API_ENDPOINT, '/api/v5/recommendations');

    return await backoff(async () => {
        return await fetchJsonWithStatusFallback<RecommendationResponse>(urlCandidates, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(request)
        });
    });
}

/**
 * Batch role recommendations for multiple projects
 */
export async function batchRoleRecommendations(
    credentials: AuthCredentials,
    requirements: ProjectRequirement[]
): Promise<Map<string, RoleRecommendation[]>> {
    const API_ENDPOINT = getServerUrl();
    const urlCandidates = buildV5UrlCandidates(API_ENDPOINT, '/api/v5/recommendations/batch');

    return await backoff(async () => {
        return await fetchJsonWithStatusFallback<Map<string, RoleRecommendation[]>>(urlCandidates, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ requirements })
        });
    });
}

// ============================================
// Semantic Search API (V5-UX-002)
// ============================================

/**
 * Search roles using semantic similarity
 */
export async function searchRoles(
    credentials: AuthCredentials,
    request: SearchRequest
): Promise<SearchResponse> {
    const API_ENDPOINT = getServerUrl();
    const urlCandidates = buildV5UrlCandidates(API_ENDPOINT, '/api/v5/search/roles');

    return await backoff(async () => {
        return await fetchJsonWithStatusFallback<SearchResponse>(urlCandidates, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(request)
        });
    });
}

/**
 * Index a role for semantic search
 */
export async function indexRole(
    credentials: AuthCredentials,
    request: IndexRoleRequest
): Promise<IndexRoleResponse> {
    const API_ENDPOINT = getServerUrl();
    const urlCandidates = buildV5UrlCandidates(API_ENDPOINT, '/api/v5/search/index');

    return await backoff(async () => {
        return await fetchJsonWithStatusFallback<IndexRoleResponse>(urlCandidates, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(request)
        });
    });
}

/**
 * Index all roles (batch operation)
 */
export async function indexAllRoles(credentials: AuthCredentials): Promise<IndexRoleResponse> {
    const API_ENDPOINT = getServerUrl();
    const urlCandidates = buildV5UrlCandidates(API_ENDPOINT, '/api/v5/search/index-all');

    return await backoff(async () => {
        return await fetchJsonWithStatusFallback<IndexRoleResponse>(urlCandidates, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json'
            }
        });
    });
}

/**
 * Delete a role from search index
 */
export async function deleteRoleIndex(
    credentials: AuthCredentials,
    roleKey: string
): Promise<IndexRoleResponse> {
    const API_ENDPOINT = getServerUrl();
    const urlCandidates = buildV5UrlCandidates(API_ENDPOINT, `/api/v5/search/index/${encodeURIComponent(roleKey)}`);

    return await backoff(async () => {
        return await fetchJsonWithStatusFallback<IndexRoleResponse>(urlCandidates, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json'
            }
        });
    });
}

// ============================================
// Improvement Suggestions API (V5-AI-002)
// ============================================

/**
 * Get personalized improvement suggestions
 */
export async function getImprovementSuggestions(
    credentials: AuthCredentials,
    request: SuggestionRequest
): Promise<SuggestionResponse> {
    const API_ENDPOINT = getServerUrl();
    const urlCandidates = buildV5UrlCandidates(API_ENDPOINT, '/api/v5/suggestions');

    return await backoff(async () => {
        return await fetchJsonWithStatusFallback<SuggestionResponse>(urlCandidates, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(request)
        });
    });
}

/**
 * Batch improvement suggestions for multiple roles
 */
export async function batchImprovementSuggestions(
    credentials: AuthCredentials,
    users: Array<{ profile: SuggestionRequest['profile']; ratingData: RatingData }>,
    options?: SuggestionRequest['options']
): Promise<Record<string, ImprovementSuggestion[]>> {
    const API_ENDPOINT = getServerUrl();
    const urlCandidates = buildV5UrlCandidates(API_ENDPOINT, '/api/v5/suggestions/batch');

    return await backoff(async () => {
        return await fetchJsonWithStatusFallback<Record<string, ImprovementSuggestion[]>>(urlCandidates, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ users, options })
        });
    });
}

/**
 * Get learning resources database
 */
export async function getLearningResources(
    credentials: AuthCredentials
): Promise<LearningResource[]> {
    const API_ENDPOINT = getServerUrl();
    const urlCandidates = buildV5UrlCandidates(API_ENDPOINT, '/api/v5/suggestions/resources');

    return await backoff(async () => {
        return await fetchJsonWithStatusFallback<LearningResource[]>(urlCandidates, {
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json'
            }
        });
    });
}

/**
 * Analyze rating data to identify weaknesses
 */
export async function analyzeWeaknesses(
    credentials: AuthCredentials,
    ratingData: RatingData
): Promise<WeaknessAnalysis> {
    const API_ENDPOINT = getServerUrl();
    const urlCandidates = buildV5UrlCandidates(API_ENDPOINT, '/api/v5/suggestions/analyze');

    return await backoff(async () => {
        return await fetchJsonWithStatusFallback<WeaknessAnalysis>(urlCandidates, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ratingData })
        });
    });
}
