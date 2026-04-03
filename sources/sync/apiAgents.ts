import { AuthCredentials } from '@/auth/tokenStorage';
import { backoff, NonRetryableError } from '@/utils/time';
import { checkAuth } from '@/utils/handleResponse';
import { getServerUrl } from './serverConfig';

//
// Types
//

export interface AgentRecord {
    id: string;
    displayName: string;
    sessionId: string | null;
    sessionTag?: string | null;
    memberId?: string | null;
    roleId: string | null;
    runtimeType: 'claude' | 'codex';
    genomeId: string | null;
    status: 'active' | 'paused' | 'archived';
    metadata: Record<string, unknown>;
    type: 'standalone' | 'team';
    lifecycle?: {
        spawnRequestedAt?: number;
        spawnedAt?: number;
        runStatus?: string;
    } | null;
    createdAt: number;
    updatedAt: number;
}

export interface AgentDetailRecord extends AgentRecord {
    genomeSpec?: Record<string, unknown> | null;
    genome?: Record<string, unknown> | null;
}

export interface AgentCreateParams {
    displayName: string;
    genomeId?: string;
    genomeSpec?: Record<string, unknown>;
    sessionId?: string;
    sessionTag?: string;
    memberId?: string;
    runtimeType?: 'claude' | 'codex';
    modelId?: string;
    metadata?: Record<string, unknown>;
}

export interface AgentUpdateParams {
    displayName?: string;
    genomeId?: string;
    status?: 'active' | 'paused' | 'archived';
    metadata?: Record<string, unknown>;
}

export interface AgentListParams {
    type?: 'standalone' | 'team' | 'all';
    status?: string;
    limit?: number;
    offset?: number;
}

//
// API Functions
//

export async function createAgent(
    credentials: AuthCredentials,
    params: AgentCreateParams,
): Promise<AgentRecord> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/agents`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(params),
        });
        checkAuth(response, credentials.token);

        if (response.status === 400) {
            const err = await response.json() as { error: string };
            throw new NonRetryableError(err.error || 'Invalid agent params');
        }
        if (response.status === 404) {
            throw new NonRetryableError('Genome not found');
        }
        if (!response.ok) {
            throw new Error(`Failed to create agent: ${response.status}`);
        }

        const data = await response.json() as { agent: AgentRecord };
        return data.agent;
    });
}

export async function listAgents(
    credentials: AuthCredentials,
    params: AgentListParams = {},
): Promise<{ agents: AgentRecord[]; total: number }> {
    const API_ENDPOINT = getServerUrl();
    const qs = new URLSearchParams();
    if (params.type) qs.set('type', params.type);
    if (params.status) qs.set('status', params.status);
    if (params.limit !== undefined) qs.set('limit', String(params.limit));
    if (params.offset !== undefined) qs.set('offset', String(params.offset));
    const url = `${API_ENDPOINT}/v1/agents${qs.toString() ? `?${qs}` : ''}`;

    return await backoff(async () => {
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${credentials.token}` },
        });
        checkAuth(response, credentials.token);

        if (!response.ok) {
            throw new Error(`Failed to list agents: ${response.status}`);
        }

        return await response.json() as { agents: AgentRecord[]; total: number };
    });
}

export async function getAgent(
    credentials: AuthCredentials,
    id: string,
): Promise<AgentDetailRecord | null> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/agents/${id}`, {
            headers: { 'Authorization': `Bearer ${credentials.token}` },
        });
        checkAuth(response, credentials.token);

        if (response.status === 404) {
            return null;
        }
        if (!response.ok) {
            throw new Error(`Failed to get agent: ${response.status}`);
        }

        const data = await response.json() as { agent: AgentDetailRecord };
        return data.agent;
    });
}

export async function updateAgent(
    credentials: AuthCredentials,
    id: string,
    updates: AgentUpdateParams,
): Promise<AgentRecord> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/agents/${id}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updates),
        });
        checkAuth(response, credentials.token);

        if (response.status === 404) {
            throw new NonRetryableError('Agent not found');
        }
        if (!response.ok) {
            throw new Error(`Failed to update agent: ${response.status}`);
        }

        const data = await response.json() as { agent: AgentRecord };
        return data.agent;
    });
}

export async function deleteAgent(
    credentials: AuthCredentials,
    id: string,
): Promise<void> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/agents/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${credentials.token}` },
        });
        checkAuth(response, credentials.token);

        if (response.status === 404) {
            throw new NonRetryableError('Agent not found');
        }
        if (!response.ok) {
            throw new Error(`Failed to delete agent: ${response.status}`);
        }
    });
}
