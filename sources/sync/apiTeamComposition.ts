import { AuthCredentials } from '@/auth/tokenStorage';
import { backoff } from '@/utils/time';
import { getServerUrl } from './serverConfig';

export interface TeamCompositionSignals {
    readyPingRatio?: number;
    coordinatorMessageRatio?: number;
    deploymentIncidentRatio?: number;
    idleStatusRatio?: number;
    cliFocusRatio?: number;
    serverFocusRatio?: number;
    kanbanFocusRatio?: number;
    historySampleSize?: number;
}

export interface TeamCompositionRequest {
    goal: string;
    context?: string;
    versionTrack?: 'v1' | 'v2' | 'dual';
    mode?: 'single' | 'multi';
    maxTeams?: number;
    deploymentTarget?: 'wow' | 'uv1' | 'uv2' | 'local' | 'generic';
    evolutionSignals?: TeamCompositionSignals;
}

export interface TeamEvoMap {
    score: number;
    tier: 'S' | 'A' | 'B' | 'C';
    trend: 'up' | 'flat' | 'down';
    highlights: string[];
}

export interface TeamCompositionSlice {
    key: string;
    name: string;
    objective: string;
    versionTrack: 'v1' | 'v2' | 'shared';
    branchSuggestion?: string;
    roleCounts: Record<string, number>;
    evoMap: TeamEvoMap;
    rationale: string[];
    risks: string[];
}

export interface TeamReleaseGateCheck {
    component: 'aha-cli' | 'happy-server' | 'kanban';
    environments: Array<'uv1' | 'uv2' | 'wow' | 'local'>;
    status: 'pending' | 'passed' | 'failed';
}

export interface TeamReleaseGate {
    versionTrack: 'v1' | 'v2' | 'shared';
    branch: string;
    completionRule: string;
    requiredChecks: TeamReleaseGateCheck[];
}

export interface TeamCompositionPlan {
    mode: 'single' | 'multi';
    versionTrack: 'v1' | 'v2' | 'dual';
    deploymentTarget: 'wow' | 'uv1' | 'uv2' | 'local' | 'generic';
    inferredFocus: string[];
    constraints: string[];
    recommendations: string[];
    signalsUsed: {
        readyPingRatio: number;
        coordinatorMessageRatio: number;
        deploymentIncidentRatio: number;
        idleStatusRatio: number;
        cliFocusRatio: number;
        serverFocusRatio: number;
        kanbanFocusRatio: number;
        historySampleSize: number;
    };
    releaseGates: TeamReleaseGate[];
    teams: TeamCompositionSlice[];
}

export async function composeTeamPlan(credentials: AuthCredentials, payload: TeamCompositionRequest): Promise<TeamCompositionPlan> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/teams/compose`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`Failed to compose teams: ${response.status}`);
        }

        return await response.json() as TeamCompositionPlan;
    });
}
