/**
 * TeamSessionSidebarPanel
 *
 * Team-context secondary panel shown in session/[id].tsx when the session was
 * opened from a team page (teamId param is present).
 *
 * Shows:
 *   - Agents section: sessions belonging to this team (from artifact.sessions + team.members)
 *     clicking navigates to that agent's session, preserving team context
 *   - Teams section (conversations): all team artifacts, current team highlighted
 *     clicking navigates to /teams/[id]
 */

import * as React from 'react';
import { useRouter } from 'expo-router';

import { useArtifact, useArtifacts, useAllSessions } from '@/sync/storage';
import { getSessionName, getAgentPresenceVisual } from '@/utils/sessionUtils';
import { getTeamMemberMapFromArtifact, getTeamSessionIdsFromArtifact } from '@/utils/teamRoster';
import { pushSessionRoute } from '@/utils/returnNavigation';
import { getActiveTaskForSession } from '@/utils/teamActiveTask';
import type { KanbanTask } from '@/sync/kanbanTypes';

import { FloatingIslandSidebar } from '../layout/FloatingIslandSidebar';
import { ThreeColumnShellVariant } from '../layout/ThreeColumnShell';

const CONVERSATION_COLORS = ['#7AA585', '#8F99C1', '#1A1209', '#B89A6F', '#6886A3'];

function formatListTime(timestamp: number): string {
    const now = new Date();
    const value = new Date(timestamp);
    if (now.toDateString() === value.toDateString()) {
        return value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return value.toLocaleDateString([], { month: 'numeric', day: 'numeric' });
}

interface TeamSessionSidebarPanelProps {
    teamId: string;
    currentSessionId: string;
    returnTo?: string;
    variant?: ThreeColumnShellVariant;
}

export const TeamSessionSidebarPanel = React.memo(({
    teamId,
    currentSessionId,
    returnTo,
    variant = 'default',
}: TeamSessionSidebarPanelProps) => {
    const router = useRouter();
    const teamArtifact = useArtifact(teamId);
    const allSessions = useAllSessions();
    const allArtifacts = useArtifacts();

    const teamTasks = React.useMemo<KanbanTask[]>(() => {
        if (!teamArtifact?.body) {
            return [];
        }

        try {
            const parsed = JSON.parse(teamArtifact.body);
            return Array.isArray(parsed?.tasks) ? parsed.tasks : [];
        } catch {
            return [];
        }
    }, [teamArtifact?.body]);

    // Build agent list from team's linked session IDs
    const agents = React.useMemo(() => {
        const teamSessionIds = getTeamSessionIdsFromArtifact(teamArtifact);
        const teamMemberMap = getTeamMemberMapFromArtifact(teamArtifact);
        if (teamSessionIds.length === 0) return [];

        const sessionMap = new Map(allSessions.map((session) => [session.id, session]));

        return teamSessionIds
            .map((sessionId) => {
                const session = sessionMap.get(sessionId);
                const member = teamMemberMap.get(sessionId);
                const presence = session
                    ? getAgentPresenceVisual(session)
                    : { dotColor: '#8A7F74', inactive: true, dead: false };
                const role = member?.roleId ?? session?.metadata?.role ?? session?.metadata?.flavor ?? '';
                const runtimeLabel = member?.runtimeType ? member.runtimeType : undefined;
                const description = [role, runtimeLabel].filter(Boolean).join(' · ');

                return {
                    id: sessionId,
                    name: member?.displayName || (session ? getSessionName(session) : sessionId),
                    dotColor: presence.dotColor,
                    inactive: presence.inactive,
                    dead: presence.dead,
                    role,
                    description,
                    activeTask: getActiveTaskForSession(teamTasks, sessionId),
                };
            });
    }, [teamArtifact?.sessions, teamArtifact?.body, allSessions, teamTasks]);

    // Team list for conversation section
    const teams = React.useMemo(() => {
        return allArtifacts
            .filter((a) => a.type === 'team')
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .slice(0, 5)
            .map((team, index) => ({
                id: team.id,
                name: team.title || 'Untitled team',
                lastMessage: team.title || '',
                time: formatListTime(team.updatedAt),
                avatarColor: CONVERSATION_COLORS[index % CONVERSATION_COLORS.length],
            }));
    }, [allArtifacts]);

    const teamTitle = teamArtifact?.title || 'Team';

    return (
        <FloatingIslandSidebar
            variant={variant}
            header={{
                title: teamTitle,
                subtitle: `${agents.length} agents`,
                icon: 'people',
                iconGradientColors: ['#314658', '#1E2D3C'],
                trailingIcon: 'chevron-down',
            }}
            agentItems={agents.map((agent) => ({
                id: agent.id,
                name: agent.name,
                dotColor: agent.dotColor,
                inactive: agent.inactive,
                dead: agent.dead,
                description: agent.description || undefined,
                selected: agent.id === currentSessionId,
                activeTaskTitle: agent.activeTask?.title,
                activeTaskStartedAt: agent.activeTask?.startedAt,
                onPress: () => {
                    pushSessionRoute(router, {
                        id: agent.id,
                        teamId,
                        teamName: teamTitle,
                        roleName: agent.role,
                        returnTo,
                    });
                },
            }))}
            agentSectionLabel="Agents"
            statusItems={[
                {
                    id: 'agents',
                    icon: 'hardware-chip-outline',
                    label: 'Team Agents',
                    color: '#007AFF',
                    backgroundColor: '#007AFF0D',
                    count: agents.length || undefined,
                },
            ]}
            conversationItems={teams.map((team) => ({
                ...team,
                avatarIcon: 'grid-outline' as const,
                selected: team.id === teamId,
                onPress: () => {
                    router.push({
                        pathname: '/teams/[id]',
                        params: { id: team.id },
                    } as any);
                },
            }))}
            conversationSectionLabel="Teams"
            conversationEmptyText="No teams yet"
        />
    );
});
