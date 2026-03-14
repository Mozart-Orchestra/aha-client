/**
 * TeamSessionSidebarPanel
 *
 * Team-context secondary panel shown in session/[id].tsx when the session was
 * opened from a team page (teamId param is present).
 *
 * Shows:
 *   - Agents section: sessions belonging to this team (from artifact.sessions)
 *     clicking navigates to that agent's session, preserving team context
 *   - Teams section (conversations): all team artifacts, current team highlighted
 *     clicking navigates to /teams/[id]
 */

import * as React from 'react';
import { useRouter } from 'expo-router';

import { useArtifact, useArtifacts, useAllSessions } from '@/sync/storage';
import { getSessionName } from '@/utils/sessionUtils';

import { FloatingIslandSidebar } from '../layout/FloatingIslandSidebar';
import { ThreeColumnShellVariant } from '../layout/ThreeColumnShell';

const AGENT_DOT_COLORS: Record<string, string> = {
    master: '#007AFF',
    implementer: '#FF9500',
    qa: '#5856D6',
    architect: '#34C759',
    builder: '#FF9500',
    reviewer: '#8A7F74',
};

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
    variant?: ThreeColumnShellVariant;
}

export const TeamSessionSidebarPanel = React.memo(({
    teamId,
    currentSessionId,
    variant = 'default',
}: TeamSessionSidebarPanelProps) => {
    const router = useRouter();
    const teamArtifact = useArtifact(teamId);
    const allSessions = useAllSessions();
    const allArtifacts = useArtifacts();

    // Build agent list from team's linked session IDs
    const agents = React.useMemo(() => {
        const teamSessionIds = new Set(teamArtifact?.sessions ?? []);
        if (teamSessionIds.size === 0) return [];

        return allSessions
            .filter((s) => teamSessionIds.has(s.id))
            .map((session) => {
                const role = session.metadata?.role ?? session.metadata?.flavor ?? '';
                return {
                    id: session.id,
                    name: getSessionName(session),
                    dotColor: AGENT_DOT_COLORS[role.toLowerCase()] ?? '#007AFF',
                    role,
                };
            });
    }, [teamArtifact?.sessions, allSessions]);

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
                selected: agent.id === currentSessionId,
                onPress: () => {
                    router.push({
                        pathname: '/session/[id]',
                        params: {
                            id: agent.id,
                            teamId,
                            teamName: teamTitle,
                            roleName: agent.role,
                        },
                    } as any);
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
