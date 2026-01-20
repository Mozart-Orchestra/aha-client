import { AuthCredentials } from '@/auth/tokenStorage';
import { backoff } from '@/utils/time';
import { getServerUrl } from './serverConfig';

// === Response Types ===

export interface TeamMemberResponse {
    success: boolean;
    member: {
        sessionId: string;
        role?: string;
        joinedAt: number;
    };
}

export interface TeamArchiveResponse {
    success: boolean;
    archivedSessions: number;
}

export interface TeamDeleteResponse {
    success: boolean;
    deletedSessions: number;
}

export interface TeamRenameResponse {
    success: boolean;
    team: {
        id: string;
        name: string;
    };
}

export interface BatchArchiveSessionsResponse {
    success: boolean;
    archived: number;
    results: Array<{ sessionId: string; success: boolean; error?: string }>;
}

export interface BatchDeleteSessionsResponse {
    success: boolean;
    deleted: number;
    results: Array<{ sessionId: string; success: boolean; error?: string }>;
}

export interface SessionRenameResponse {
    success: boolean;
    session: {
        id: string;
        name: string;
    };
}

export interface BatchArchiveTeamsResponse {
    success: boolean;
    archived: number;
    results: Array<{ teamId: string; success: boolean; archivedSessions?: number; error?: string }>;
}

export interface BatchDeleteTeamsResponse {
    success: boolean;
    deleted: number;
    results: Array<{ teamId: string; success: boolean; deletedSessions?: number; error?: string }>;
}

// === API Functions ===

/**
 * Add a member to a team
 */
export async function addTeamMember(
    credentials: AuthCredentials,
    teamId: string,
    sessionId: string,
    roleId?: string,
    displayName?: string
): Promise<TeamMemberResponse> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/teams/${teamId}/members`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sessionId, roleId: roleId || 'member', displayName })
        });

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Team not found');
            }
            throw new Error(`Failed to add team member: ${response.status}`);
        }

        return await response.json() as TeamMemberResponse;
    });
}

/**
 * Remove a member from a team
 */
export async function removeTeamMember(
    credentials: AuthCredentials,
    teamId: string,
    sessionId: string
): Promise<{ success: boolean }> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/teams/${teamId}/members/${sessionId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${credentials.token}`
            }
        });

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Team or member not found');
            }
            throw new Error(`Failed to remove team member: ${response.status}`);
        }

        return await response.json() as { success: boolean };
    });
}

/**
 * Archive a team and all its sessions
 */
export async function archiveTeam(
    credentials: AuthCredentials,
    teamId: string
): Promise<TeamArchiveResponse> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/teams/${teamId}/archive`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Team not found');
            }
            throw new Error(`Failed to archive team: ${response.status}`);
        }

        return await response.json() as TeamArchiveResponse;
    });
}

/**
 * Delete a team and all its sessions
 */
export async function deleteTeam(
    credentials: AuthCredentials,
    teamId: string
): Promise<TeamDeleteResponse> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/teams/${teamId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${credentials.token}`
            }
        });

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Team not found');
            }
            throw new Error(`Failed to delete team: ${response.status}`);
        }

        return await response.json() as TeamDeleteResponse;
    });
}

/**
 * Rename a team
 */
export async function renameTeam(
    credentials: AuthCredentials,
    teamId: string,
    newName: string
): Promise<TeamRenameResponse> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/teams/${teamId}/rename`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: newName })
        });

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Team not found');
            }
            throw new Error(`Failed to rename team: ${response.status}`);
        }

        return await response.json() as TeamRenameResponse;
    });
}

/**
 * Batch archive multiple sessions
 */
export async function batchArchiveSessions(
    credentials: AuthCredentials,
    sessionIds: string[]
): Promise<BatchArchiveSessionsResponse> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/sessions/batch/archive`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sessionIds })
        });

        if (!response.ok) {
            throw new Error(`Failed to batch archive sessions: ${response.status}`);
        }

        return await response.json() as BatchArchiveSessionsResponse;
    });
}

/**
 * Batch delete multiple sessions
 */
export async function batchDeleteSessions(
    credentials: AuthCredentials,
    sessionIds: string[]
): Promise<BatchDeleteSessionsResponse> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/sessions/batch/delete`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sessionIds })
        });

        if (!response.ok) {
            throw new Error(`Failed to batch delete sessions: ${response.status}`);
        }

        return await response.json() as BatchDeleteSessionsResponse;
    });
}

/**
 * Rename a session
 */
export async function renameSession(
    credentials: AuthCredentials,
    sessionId: string,
    newName: string
): Promise<SessionRenameResponse> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/sessions/${sessionId}/rename`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: newName })
        });

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Session not found');
            }
            throw new Error(`Failed to rename session: ${response.status}`);
        }

        return await response.json() as SessionRenameResponse;
    });
}

/**
 * Batch archive multiple teams
 */
export async function batchArchiveTeams(
    credentials: AuthCredentials,
    teamIds: string[]
): Promise<BatchArchiveTeamsResponse> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/teams/batch/archive`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ teamIds })
        });

        if (!response.ok) {
            throw new Error(`Failed to batch archive teams: ${response.status}`);
        }

        return await response.json() as BatchArchiveTeamsResponse;
    });
}

/**
 * Batch delete multiple teams
 */
export async function batchDeleteTeams(
    credentials: AuthCredentials,
    teamIds: string[]
): Promise<BatchDeleteTeamsResponse> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/teams/batch/delete`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ teamIds })
        });

        if (!response.ok) {
            throw new Error(`Failed to batch delete teams: ${response.status}`);
        }

        return await response.json() as BatchDeleteTeamsResponse;
    });
}
