import type { DecryptedArtifact } from '@/sync/artifactTypes';
import type { KanbanTeamMember } from '@/sync/kanbanTypes';

type TeamArtifactLike = Pick<DecryptedArtifact, 'sessions' | 'body'> | null | undefined;

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
