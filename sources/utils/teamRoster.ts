import type { DecryptedArtifact } from '@/sync/artifactTypes';
import type { KanbanTeamMember } from '@/sync/kanbanTypes';
import type { Session } from '@/sync/storageTypes';

type TeamArtifactLike = Pick<DecryptedArtifact, 'sessions' | 'body'> | null | undefined;

type TeamRosterSortEntry = {
    member?: Pick<KanbanTeamMember, 'memberId' | 'roleId' | 'sessionId' | 'lifecycle'> | null;
    session?: Pick<Session, 'createdAt' | 'active' | 'metadata'> | null;
    fallbackIndex?: number;
};

const TEAM_MEMBER_ROLE_PRIORITY: Record<string, number> = {
    master: 0,
    orchestrator: 0,
    architect: 1,
    'solution-architect': 1,
    implementer: 2,
    builder: 2,
    framer: 2,
    'qa-engineer': 3,
    qa: 3,
    reviewer: 3,
    researcher: 4,
    scout: 4,
    supervisor: 99,
    'help-agent': 99,
    'org-manager': 100,
};

function getStableSpawnOrder(entry: TeamRosterSortEntry): number {
    const spawnRequestedAt = entry.member?.lifecycle?.spawnRequestedAt;
    if (typeof spawnRequestedAt === 'number' && Number.isFinite(spawnRequestedAt)) {
        return spawnRequestedAt;
    }

    const processStartedAt = entry.member?.lifecycle?.processStartedAt;
    if (typeof processStartedAt === 'number' && Number.isFinite(processStartedAt)) {
        return processStartedAt;
    }

    const createdAt = entry.session?.createdAt;
    if (typeof createdAt === 'number' && Number.isFinite(createdAt)) {
        return createdAt;
    }

    return Number.MAX_SAFE_INTEGER;
}

function getStableIdentity(entry: TeamRosterSortEntry): string {
    return entry.member?.memberId
        || entry.member?.sessionId
        || entry.session?.metadata?.sessionTag
        || '';
}

export function parseTeamMembersFromArtifact(artifact: TeamArtifactLike): KanbanTeamMember[] {
    if (!artifact?.body) {
        return [];
    }

    try {
        const parsed = JSON.parse(artifact.body);
        const members = parsed?.team?.members;
        if (!Array.isArray(members)) {
            return [];
        }

        return members.filter((member): member is KanbanTeamMember => {
            return !!member && typeof member.sessionId === 'string' && member.sessionId.length > 0;
        });
    } catch {
        return [];
    }
}

export function getTeamMemberMapFromArtifact(artifact: TeamArtifactLike): Map<string, KanbanTeamMember> {
    return new Map(
        parseTeamMembersFromArtifact(artifact).map((member) => [member.sessionId, member])
    );
}

export function getTeamSessionIdsFromArtifact(artifact: TeamArtifactLike): string[] {
    const ids = new Set<string>();

    (artifact?.sessions ?? []).forEach((sessionId) => {
        if (typeof sessionId === 'string' && sessionId.length > 0) {
            ids.add(sessionId);
        }
    });

    parseTeamMembersFromArtifact(artifact).forEach((member) => {
        ids.add(member.sessionId);
    });

    return [...ids];
}

export function compareTeamRosterEntries(left: TeamRosterSortEntry, right: TeamRosterSortEntry): number {
    const leftDead = left.session && !left.session.active ? 1 : 0;
    const rightDead = right.session && !right.session.active ? 1 : 0;
    if (leftDead !== rightDead) {
        return leftDead - rightDead;
    }

    const leftRoleId = left.member?.roleId || left.session?.metadata?.role || '';
    const rightRoleId = right.member?.roleId || right.session?.metadata?.role || '';
    const leftPriority = TEAM_MEMBER_ROLE_PRIORITY[leftRoleId] ?? 5;
    const rightPriority = TEAM_MEMBER_ROLE_PRIORITY[rightRoleId] ?? 5;
    if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
    }

    const leftOrder = getStableSpawnOrder(left);
    const rightOrder = getStableSpawnOrder(right);
    if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
    }

    const leftIdentity = getStableIdentity(left);
    const rightIdentity = getStableIdentity(right);
    if (leftIdentity && rightIdentity && leftIdentity !== rightIdentity) {
        return leftIdentity.localeCompare(rightIdentity);
    }

    return (left.fallbackIndex ?? 0) - (right.fallbackIndex ?? 0);
}
