import type { AuthCredentials } from '@/auth/tokenStorage';
import { backoff, NonRetryableError } from '@/utils/time';
import { checkAuth } from '@/utils/handleResponse';
import { buildImageRefFields, resolveCandidateId, resolveImageRef } from '@/utils/imageRef';
import { getServerUrl } from './serverConfig';
import type { AgentLifecycle } from '@/utils/spawnState';
import type { WorkspaceOverviewSnapshot } from './workspaceOverviewTypes';
import type { KanbanBoard } from './kanbanTypes';

// === Response Types ===

export interface TeamMemberResponse {
    success: boolean;
    member: {
        memberId?: string;
        sessionId: string;
        sessionTag?: string;
        role?: string;
        joinedAt: number;
        authorities?: string[];
        teamOverlay?: Record<string, unknown>;
        machineId?: string;
        workspacePath?: string;
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

export interface TeamUnarchiveResponse {
    success: boolean;
    restoredSessions: number;
}

export interface BatchUnarchiveSessionsResponse {
    success: boolean;
    restored: number;
    results: Array<{ sessionId: string; success: boolean; error?: string }>;
}

export interface BatchDeleteTeamsResponse {
    success: boolean;
    deleted: number;
    results: Array<{ teamId: string; success: boolean; deletedSessions?: number; error?: string }>;
}

export interface TeamSummary {
    id: string;
    name: string;
    memberCount: number;
    taskCount: number;
    createdAt: number;
    updatedAt: number;
}

export interface CorpsSeatRequest {
    id?: string;
    /** @deprecated Use `sourceImageId` instead. Kept for backward compatibility. */
    genomeId: string;
    genomeName?: string | null;
    genomeNamespace?: string | null;
    genomeVersion?: number | null;
    genomeDisplayName?: string | null;
    /** Canonical image identifier (genome hub primary key). */
    sourceImageId?: string;
    /** Canonical image version at time of spawn. */
    sourceImageVersion?: number | null;
    roleId: string;
    displayName?: string;
    runtimeType: 'claude' | 'codex';
    machineId?: string | null;
    workspacePath?: string | null;
    quantity: number;
    customPrompt?: string;
}

export interface CreateCorpsParams {
    id?: string;
    name: string;
    description?: string;
    target?: string;
    machineId?: string | null;
    workspacePath?: string | null;
    seats?: CorpsSeatRequest[];
    roles?: CorpsSeatRequest[];
}

export interface CreateCorpsResponse {
    success: true;
    corps: {
        id: string;
        name: string;
        seatCount: number;
        plannedMemberCount: number;
    };
    team: TeamSummary;
    plannedMembers: Array<{
        memberId: string;
        sessionTag: string;
        roleId: string;
        displayName: string;
        genomeId: string;
        sourceImageId: string;
        sourceImageVersion?: number | null;
        candidateId: string;
        runtimeType: 'claude' | 'codex';
        machineId: string;
        workspacePath: string;
        customPrompt?: string;
    }>;
}

async function throwTeamManagementHttpError(response: Response, fallbackMessage: string): Promise<never> {
    let serverMessage: string | null = null;

    try {
        const body = await response.json() as { error?: unknown; message?: unknown };
        if (typeof body.error === 'string' && body.error.trim()) {
            serverMessage = body.error;
        } else if (typeof body.message === 'string' && body.message.trim()) {
            serverMessage = body.message;
        }
    } catch {
        // Ignore malformed or empty error bodies and fall back to the provided message.
    }

    const message = serverMessage ?? fallbackMessage;
    const isClientError = response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 429;

    if (isClientError) {
        throw new NonRetryableError(message);
    }

    throw new Error(message);
}

function serializeCorpsSeat(seat: CorpsSeatRequest): Record<string, unknown> {
    const imageRef = resolveImageRef({
        sourceImageId: seat.sourceImageId,
        sourceImageVersion: seat.sourceImageVersion,
        genomeId: seat.genomeId,
        genomeVersion: seat.genomeVersion,
    });

    return {
        ...(seat.id !== undefined ? { id: seat.id } : {}),
        genomeId: imageRef?.id ?? seat.genomeId,
        ...(seat.genomeName !== undefined && seat.genomeName !== null ? { genomeName: seat.genomeName } : {}),
        ...(seat.genomeNamespace !== undefined && seat.genomeNamespace !== null ? { genomeNamespace: seat.genomeNamespace } : {}),
        ...(imageRef?.version !== null && imageRef?.version !== undefined ? { genomeVersion: imageRef.version } : {}),
        ...(seat.genomeDisplayName !== undefined && seat.genomeDisplayName !== null ? { genomeDisplayName: seat.genomeDisplayName } : {}),
        ...buildImageRefFields(imageRef),
        roleId: seat.roleId,
        ...(seat.displayName !== undefined ? { displayName: seat.displayName } : {}),
        runtimeType: seat.runtimeType,
        ...(seat.machineId !== undefined && seat.machineId !== null ? { machineId: seat.machineId } : {}),
        ...(seat.workspacePath !== undefined && seat.workspacePath !== null ? { workspacePath: seat.workspacePath } : {}),
        quantity: seat.quantity,
        ...(seat.customPrompt !== undefined ? { customPrompt: seat.customPrompt } : {}),
    };
}

export async function fetchWorkspaceOverview(
    credentials: AuthCredentials,
): Promise<WorkspaceOverviewSnapshot> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/teams/overview`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
            },
        });
        checkAuth(response, credentials.token);

        if (!response.ok) {
            throw new Error(`Failed to fetch workspace overview: ${response.status}`);
        }

        const data = await response.json() as { overview: WorkspaceOverviewSnapshot };
        return data.overview;
    });
}

// === API Functions ===

/**
 * Create a new team
 */
export async function createTeam(
    credentials: AuthCredentials,
    params: { id?: string; name: string; description?: string; board?: KanbanBoard },
): Promise<TeamSummary> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/teams`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(params),
        });
        checkAuth(response, credentials.token);

        if (!response.ok) {
            await throwTeamManagementHttpError(response, `Failed to create team: ${response.status}`);
        }

        const data = await response.json() as { team: TeamSummary };
        return data.team;
    });
}

/**
 * Create a manual corps/team plan on the server so the frontend can use the
 * explicit `POST /v1/corps` contract instead of assembling the board locally.
 */
export async function createCorps(
    credentials: AuthCredentials,
    params: CreateCorpsParams,
): Promise<CreateCorpsResponse> {
    const API_ENDPOINT = getServerUrl();
    const body: Record<string, unknown> = {
        ...(params.id !== undefined ? { id: params.id } : {}),
        name: params.name,
        ...(params.description !== undefined ? { description: params.description } : {}),
        ...(params.target !== undefined ? { target: params.target } : {}),
        ...(params.machineId !== undefined && params.machineId !== null ? { machineId: params.machineId } : {}),
        ...(params.workspacePath !== undefined && params.workspacePath !== null ? { workspacePath: params.workspacePath } : {}),
        ...(params.seats !== undefined ? { seats: params.seats.map(serializeCorpsSeat) } : {}),
        ...(params.roles !== undefined ? { roles: params.roles.map(serializeCorpsSeat) } : {}),
    };

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/corps`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        checkAuth(response, credentials.token);

        if (!response.ok) {
            await throwTeamManagementHttpError(response, `Failed to create corps: ${response.status}`);
        }

        return await response.json() as CreateCorpsResponse;
    });
}

/**
 * Add a member to a team
 */
export async function addTeamMember(
    credentials: AuthCredentials,
    teamId: string,
    sessionId: string,
    roleId?: string,
    displayName?: string,
    opts?: {
        memberId?: string;
        sessionTag?: string;
        candidateId?: string;
        /** @deprecated Use `sourceImageId` instead. Kept for backward compatibility. */
        specId?: string;
        /** Canonical image identifier (genome hub primary key). */
        sourceImageId?: string;
        /** Canonical image version at time of spawn. */
        sourceImageVersion?: number | null;
        customPrompt?: string;
        parentSessionId?: string;
        executionPlane?: string;
        runtimeType?: string;
        machineId?: string | null;
        workspacePath?: string | null;
        spawnError?: string;
        lifecycle?: AgentLifecycle;
        authorities?: string[];
        teamOverlay?: Record<string, unknown>;
    }
): Promise<TeamMemberResponse> {
    const API_ENDPOINT = getServerUrl();
    const imageRef = resolveImageRef({
        sourceImageId: opts?.sourceImageId,
        sourceImageVersion: opts?.sourceImageVersion,
        specId: opts?.specId,
    });
    const candidateId = resolveCandidateId(imageRef, opts?.candidateId);

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/teams/${teamId}/members`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sessionId,
                roleId: roleId || 'member',
                displayName,
                ...(opts?.memberId !== undefined ? { memberId: opts.memberId } : {}),
                ...(opts?.sessionTag !== undefined ? { sessionTag: opts.sessionTag } : {}),
                ...(candidateId !== undefined ? { candidateId } : {}),
                ...buildImageRefFields(imageRef, { includeLegacySpec: true }),
                ...(opts?.customPrompt !== undefined ? { customPrompt: opts.customPrompt } : {}),
                ...(opts?.parentSessionId !== undefined ? { parentSessionId: opts.parentSessionId } : {}),
                ...(opts?.executionPlane !== undefined ? { executionPlane: opts.executionPlane } : {}),
                ...(opts?.runtimeType !== undefined ? { runtimeType: opts.runtimeType } : {}),
                ...(opts?.machineId !== undefined && opts.machineId !== null ? { machineId: opts.machineId } : {}),
                ...(opts?.workspacePath !== undefined && opts.workspacePath !== null ? { workspacePath: opts.workspacePath } : {}),
                ...(opts?.spawnError !== undefined ? { spawnError: opts.spawnError } : {}),
                ...(opts?.lifecycle !== undefined ? { lifecycle: opts.lifecycle } : {}),
                ...(opts?.authorities !== undefined ? { authorities: opts.authorities } : {}),
                ...(opts?.teamOverlay !== undefined ? { teamOverlay: opts.teamOverlay } : {}),
            })
        });

        checkAuth(response, credentials.token);

        if (!response.ok) {
            await throwTeamManagementHttpError(response, `Failed to add team member: ${response.status}`);
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

        checkAuth(response, credentials.token);

        if (!response.ok) {
            await throwTeamManagementHttpError(response, `Failed to remove team member: ${response.status}`);
        }

        return await response.json() as { success: boolean };
    });
}

/**
 * Archive a team and all its sessions
 * @param sessionIds - Session IDs to archive (required since body is encrypted)
 */
export async function archiveTeam(
    credentials: AuthCredentials,
    teamId: string,
    sessionIds: string[] = []
): Promise<TeamArchiveResponse> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/teams/${teamId}/archive`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sessionIds })
        });

        checkAuth(response, credentials.token);

        if (!response.ok) {
            await throwTeamManagementHttpError(response, `Failed to archive team: ${response.status}`);
        }

        return await response.json() as TeamArchiveResponse;
    });
}

/**
 * Delete a team and all its sessions
 * @param sessionIds - Session IDs to delete (required since body is encrypted)
 */
export async function deleteTeam(
    credentials: AuthCredentials,
    teamId: string,
    sessionIds: string[] = []
): Promise<TeamDeleteResponse> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/teams/${teamId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sessionIds })
        });

        checkAuth(response, credentials.token);

        if (!response.ok) {
            await throwTeamManagementHttpError(response, `Failed to delete team: ${response.status}`);
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

        checkAuth(response, credentials.token);

        if (!response.ok) {
            await throwTeamManagementHttpError(response, `Failed to rename team: ${response.status}`);
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

        checkAuth(response, credentials.token);

        if (!response.ok) {
            await throwTeamManagementHttpError(response, `Failed to batch archive sessions: ${response.status}`);
        }

        return await response.json() as BatchArchiveSessionsResponse;
    });
}

/**
 * Unarchive (restore) a team and all its sessions
 */
export async function unarchiveTeam(
    credentials: AuthCredentials,
    teamId: string,
    sessionIds: string[] = []
): Promise<TeamUnarchiveResponse> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/teams/${teamId}/unarchive`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sessionIds })
        });

        checkAuth(response, credentials.token);

        if (!response.ok) {
            await throwTeamManagementHttpError(response, `Failed to unarchive team: ${response.status}`);
        }

        return await response.json() as TeamUnarchiveResponse;
    });
}

/**
 * Batch unarchive (restore) multiple sessions
 */
export async function batchUnarchiveSessions(
    credentials: AuthCredentials,
    sessionIds: string[]
): Promise<BatchUnarchiveSessionsResponse> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/sessions/batch/unarchive`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sessionIds })
        });

        checkAuth(response, credentials.token);

        if (!response.ok) {
            await throwTeamManagementHttpError(response, `Failed to batch unarchive sessions: ${response.status}`);
        }

        return await response.json() as BatchUnarchiveSessionsResponse;
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

        checkAuth(response, credentials.token);

        if (!response.ok) {
            await throwTeamManagementHttpError(response, `Failed to batch delete sessions: ${response.status}`);
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

        checkAuth(response, credentials.token);

        if (!response.ok) {
            await throwTeamManagementHttpError(response, `Failed to rename session: ${response.status}`);
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

        checkAuth(response, credentials.token);

        if (!response.ok) {
            await throwTeamManagementHttpError(response, `Failed to batch archive teams: ${response.status}`);
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

        checkAuth(response, credentials.token);

        if (!response.ok) {
            await throwTeamManagementHttpError(response, `Failed to batch delete teams: ${response.status}`);
        }

        return await response.json() as BatchDeleteTeamsResponse;
    });
}
