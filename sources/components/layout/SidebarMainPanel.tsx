import * as React from 'react';
import { useRouter } from 'expo-router';

import { useVisibleSessionListViewData } from '@/hooks/useVisibleSessionListViewData';
import { getDisplayName } from '@/sync/profile';
import { useArtifacts, useProfile } from '@/sync/storage';
import type { Session } from '@/sync/storageTypes';
import { getSessionName } from '@/utils/sessionUtils';
import { useNavigateToSession } from '@/hooks/useNavigateToSession';

import { FloatingIslandSidebar } from './FloatingIslandSidebar';
import { ThreeColumnShellVariant } from './ThreeColumnShell';

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

interface SidebarMainPanelProps {
    variant?: ThreeColumnShellVariant;
}

export const SidebarMainPanel = React.memo(({ variant = 'default' }: SidebarMainPanelProps) => {
    const router = useRouter();
    const profile = useProfile();
    const navigateToSession = useNavigateToSession();
    const sessionListData = useVisibleSessionListViewData();
    const allArtifacts = useArtifacts();

    const agents = React.useMemo(() => {
        if (!sessionListData) {
            return [];
        }

        const result: { id: string; name: string; dotColor: string; description: string; session: Session }[] = [];

        for (const item of sessionListData) {
            if (item.type === 'session' && item.session.active) {
                const flavor = item.session.metadata?.flavor ?? item.session.metadata?.role ?? '';
                result.push({
                    id: item.session.id,
                    name: getSessionName(item.session),
                    dotColor: AGENT_DOT_COLORS[flavor.toLowerCase()] ?? '#007AFF',
                    description: flavor,
                    session: item.session,
                });
            }

            if (item.type === 'active-sessions') {
                item.sessions.forEach((session) => {
                    const flavor = session.metadata?.flavor ?? session.metadata?.role ?? '';
                    result.push({
                        id: session.id,
                        name: getSessionName(session),
                        dotColor: AGENT_DOT_COLORS[flavor.toLowerCase()] ?? '#007AFF',
                        description: flavor,
                        session,
                    });
                });
            }
        }

        return result.slice(0, 6);
    }, [sessionListData]);

    const teams = React.useMemo(() => {
        return allArtifacts
            .filter((artifact) => artifact.type === 'team')
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .slice(0, 5)
            .map((team, index) => ({
                id: team.id,
                name: team.title || 'Untitled team',
                lastMessage: 'Open team workspace',
                time: formatListTime(team.updatedAt),
                avatarColor: CONVERSATION_COLORS[index % CONVERSATION_COLORS.length],
            }));
    }, [allArtifacts]);

    const [selectedAgentId, setSelectedAgentId] = React.useState<string | null>(null);
    const [selectedTeamId, setSelectedTeamId] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (agents.length > 0 && !selectedAgentId) {
            setSelectedAgentId(agents[0].id);
        }
    }, [agents, selectedAgentId]);

    React.useEffect(() => {
        if (teams.length > 0 && !selectedTeamId) {
            setSelectedTeamId(teams[0].id);
        }
    }, [teams, selectedTeamId]);

    const displayName = getDisplayName(profile) || profile.github?.login || 'Workspace';
    const activeCount = agents.length;

    return (
        <FloatingIslandSidebar
            variant={variant}
            header={{
                title: displayName,
                subtitle: activeCount > 0 ? `${activeCount} active · Online` : 'Online',
                icon: 'person',
                iconGradientColors: ['#314658', '#1E2D3C'],
                trailingIcon: 'chevron-down',
            }}
            agentItems={agents.map((agent) => ({
                id: agent.id,
                name: agent.name,
                dotColor: agent.dotColor,
                description: agent.description || undefined,
                selected: selectedAgentId === agent.id,
                count: selectedAgentId === agent.id ? 0 : undefined,
                onPress: () => {
                    setSelectedAgentId(agent.id);
                },
                onDoublePress: () => {
                    setSelectedAgentId(agent.id);
                    navigateToSession(agent.id);
                },
            }))}
            statusItems={[
                {
                    id: 'needs-decision',
                    icon: 'radio-button-on',
                    label: 'Needs Decision',
                    color: '#FF3B30',
                    backgroundColor: '#FF3B300D',
                    count: undefined,
                },
                {
                    id: 'working',
                    icon: 'pulse',
                    label: 'Working',
                    color: '#FF9500',
                    backgroundColor: '#FF950012',
                    count: activeCount || undefined,
                },
                {
                    id: 'team-review',
                    icon: 'people',
                    label: 'Team Review',
                    color: '#8A7F74',
                    backgroundColor: '#00000000',
                },
            ]}
            conversationItems={teams.map((team) => ({
                ...team,
                avatarIcon: 'grid-outline',
                selected: selectedTeamId === team.id,
                onPress: () => {
                    setSelectedTeamId(team.id);
                    router.push(`/teams/${team.id}` as never);
                },
            }))}
            conversationHeaderAction={() => router.push('/teams/new' as never)}
            conversationEmptyText="No teams yet"
        />
    );
});
