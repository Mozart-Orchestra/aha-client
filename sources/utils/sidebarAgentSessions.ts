import type { DecryptedArtifact } from '@/sync/artifactTypes';
import type { KanbanTeamMember } from '@/sync/kanbanTypes';
import type { Session } from '@/sync/storageTypes';
import { parseTeamMembersFromArtifact } from './teamRoster';

export function isLiveSidebarSession(session: Pick<Session, 'active' | 'presence' | 'thinking'>): boolean {
    return session.active || session.presence === 'online' || session.thinking;
}

export function isKnownAgentSession(session: Pick<Session, 'metadata'>): boolean {
    return Boolean(
        session.metadata?.teamId
        || session.metadata?.role
        || session.metadata?.memberId
        || session.metadata?.sessionTag
        || session.metadata?.flavor
    );
}

export function selectSidebarAgentSessions(
    allSessions: ReadonlyArray<Session>,
    opts: {
        selectedTeamId?: string | null;
        teamSessionIds?: ReadonlySet<string>;
    } = {},
): Session[] {
    const selectedTeamId = opts.selectedTeamId ?? null;
    const teamSessionIds = opts.teamSessionIds ?? new Set<string>();

    if (selectedTeamId) {
        return allSessions.filter((session) =>
            session.metadata?.teamId === selectedTeamId || teamSessionIds.has(session.id)
        );
    }

    // When no team is selected, show the full known-agent roster.
    // The sidebar already groups live/offline/ended agents, so returning only
    // live agents makes the rest of the roster appear to "disappear" whenever
    // a team enters wait mode.
    const knownAgentSessions = allSessions.filter(isKnownAgentSession);
    if (knownAgentSessions.length > 0) {
        return knownAgentSessions;
    }

    // No known agents: fall back to any live session
    return allSessions.filter(isLiveSidebarSession);
}

export interface SidebarAgentRosterEntry {
    sessionId: string;
    session: Session | null;
    member: KanbanTeamMember | null;
    teamId: string | null;
}

export function buildSidebarAgentRosterEntries(
    allSessions: ReadonlyArray<Session>,
    teamArtifacts: ReadonlyArray<Pick<DecryptedArtifact, 'id' | 'type' | 'body'>>,
    opts: {
        selectedTeamId?: string | null;
        teamSessionIds?: ReadonlySet<string>;
    } = {},
): SidebarAgentRosterEntry[] {
    const sourceSessions = selectSidebarAgentSessions(allSessions, opts);
    const sessionMap = new Map(sourceSessions.map((session) => [session.id, session]));
    const entries = new Map<string, SidebarAgentRosterEntry>();

    sourceSessions.forEach((session) => {
        entries.set(session.id, {
            sessionId: session.id,
            session,
            member: null,
            teamId: session.metadata?.teamId ?? null,
        });
    });

    const relevantArtifacts = teamArtifacts.filter((artifact) => {
        if (artifact.type !== 'team') {
            return false;
        }

        if (!opts.selectedTeamId) {
            return true;
        }

        return artifact.id === opts.selectedTeamId;
    });

    relevantArtifacts.forEach((artifact) => {
        parseTeamMembersFromArtifact(artifact).forEach((member) => {
            const existing = entries.get(member.sessionId);
            if (existing) {
                entries.set(member.sessionId, {
                    ...existing,
                    member: existing.member ?? member,
                    teamId: existing.teamId ?? artifact.id,
                });
                return;
            }

            entries.set(member.sessionId, {
                sessionId: member.sessionId,
                session: sessionMap.get(member.sessionId) ?? null,
                member,
                teamId: artifact.id,
            });
        });
    });

    return Array.from(entries.values());
}
