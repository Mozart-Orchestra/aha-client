import * as React from 'react';
import { useRouter } from 'expo-router';

import { getDisplayName } from '@/sync/profile';
import { useAllSessions, useArtifacts, useProfile } from '@/sync/storage';
import type { Session } from '@/sync/storageTypes';
import { getSessionName } from '@/utils/sessionUtils';
import { useNavigateToSession } from '@/hooks/useNavigateToSession';
import { fetchGenomeByName, parseFeedback } from '@/utils/genomeHub';

import { t } from '@/text';

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

type RoleScore = {
    score: number;
    evaluationCount: number;
};

function normalizeRoleKey(value: string): string {
    return value.trim().toLowerCase();
}

function buildRoleCandidates(value: string): string[] {
    const normalized = normalizeRoleKey(value);
    return Array.from(new Set([
        value.trim(),
        normalized,
        normalized.replace(/[\s_]+/g, '-'),
        normalized.replace(/[\s-]+/g, '_'),
    ].filter(Boolean)));
}

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
    const allSessions = useAllSessions();
    const allArtifacts = useArtifacts();
    const [selectedAgentId, setSelectedAgentId] = React.useState<string | null>(null);
    const [selectedTeamId, setSelectedTeamId] = React.useState<string | null>(null);

    const selectedTeamArtifact = React.useMemo(() => {
        return selectedTeamId
            ? allArtifacts.find((artifact) => artifact.id === selectedTeamId) ?? null
            : null;
    }, [allArtifacts, selectedTeamId]);

    const agents = React.useMemo(() => {
        const teamSessionIds = new Set(selectedTeamArtifact?.sessions ?? []);
        const sourceSessions = selectedTeamId
            ? allSessions.filter((session) =>
                session.metadata?.teamId === selectedTeamId || teamSessionIds.has(session.id)
            )
            : allSessions.filter((session) => session.active || session.presence === 'online' || session.thinking);

        const result: { id: string; name: string; dotColor: string; description: string; inactive: boolean; session: Session }[] = [];

        sourceSessions.forEach((session) => {
            const flavor = session.metadata?.flavor ?? session.metadata?.role ?? '';
            result.push({
                id: session.id,
                name: getSessionName(session),
                dotColor: AGENT_DOT_COLORS[flavor.toLowerCase()] ?? '#007AFF',
                description: flavor,
                inactive: !session.active,
                session,
            });
        });

        result.sort((a, b) => {
            if (a.inactive !== b.inactive) {
                return a.inactive ? 1 : -1;
            }

            const updatedAtDelta = b.session.updatedAt - a.session.updatedAt;
            if (updatedAtDelta !== 0) {
                return updatedAtDelta;
            }

            return b.session.createdAt - a.session.createdAt;
        });

        return result;
    }, [allSessions, selectedTeamArtifact, selectedTeamId]);

    const teams = React.useMemo(() => {
        return allArtifacts
            .filter((artifact) => artifact.type === 'team')
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .map((team, index) => ({
                id: team.id,
                name: team.title || t('teams.untitledTeam'),
                lastMessage: t('sidebar.openTeamWorkspace'),
                time: formatListTime(team.updatedAt),
                avatarColor: CONVERSATION_COLORS[index % CONVERSATION_COLORS.length],
            }));
    }, [allArtifacts]);

    const [roleScores, setRoleScores] = React.useState<Record<string, RoleScore | null>>({});

    const roleKeys = React.useMemo(() => {
        return Array.from(new Set(
            agents
                .map((agent) => agent.description?.trim())
                .filter((value): value is string => !!value)
                .map(normalizeRoleKey)
        ));
    }, [agents]);

    React.useEffect(() => {
        const missingRoleKeys = roleKeys.filter((roleKey) => !(roleKey in roleScores));
        if (missingRoleKeys.length === 0) {
            return;
        }

        let cancelled = false;

        (async () => {
            const resolvedEntries = await Promise.all(
                missingRoleKeys.map(async (roleKey) => {
                    for (const candidate of buildRoleCandidates(roleKey)) {
                        try {
                            const genome = await fetchGenomeByName('@official', candidate);
                            const feedback = parseFeedback(genome?.feedbackData ?? null);
                            if (feedback && feedback.evaluationCount > 0) {
                                return [roleKey, {
                                    score: feedback.avgScore,
                                    evaluationCount: feedback.evaluationCount,
                                }] as const;
                            }
                        } catch {
                            // Ignore missing or unreachable genome hub entries.
                        }
                    }

                    return [roleKey, null] as const;
                })
            );

            if (cancelled) {
                return;
            }

            setRoleScores((prev) => {
                const next = { ...prev };
                for (const [roleKey, score] of resolvedEntries) {
                    next[roleKey] = score;
                }
                return next;
            });
        })();

        return () => {
            cancelled = true;
        };
    }, [roleKeys, roleScores]);

    React.useEffect(() => {
        if (agents.length > 0 && (!selectedAgentId || !agents.some((agent) => agent.id === selectedAgentId))) {
            setSelectedAgentId(agents[0].id);
        }
    }, [agents, selectedAgentId]);

    React.useEffect(() => {
        if (teams.length > 0 && (!selectedTeamId || !teams.some((team) => team.id === selectedTeamId))) {
            setSelectedTeamId(teams[0].id);
        }
    }, [teams, selectedTeamId]);

    const displayName = getDisplayName(profile) || profile.github?.login || t('sidebar.workspace');
    const activeCount = agents.filter((agent) => !agent.inactive).length;
    const totalCount = agents.length;

    const statusCounts = React.useMemo(() => {
        return agents.reduce((acc, agent) => {
            const hasPendingRequests = !!agent.session.agentState?.requests && Object.keys(agent.session.agentState.requests).length > 0;

            if (hasPendingRequests) {
                acc.needsDecision += 1;
            } else if (agent.session.thinking) {
                acc.working += 1;
            } else if (agent.session.presence === 'online') {
                acc.online += 1;
            }

            return acc;
        }, {
            needsDecision: 0,
            working: 0,
            online: 0,
        });
    }, [agents]);

    return (
        <FloatingIslandSidebar
            variant={variant}
            header={{
                title: displayName,
                subtitle: totalCount > 0 ? `${activeCount} active · ${totalCount} total` : t('sidebar.online'),
                icon: 'person',
                iconGradientColors: ['#314658', '#1E2D3C'],
                trailingIcon: 'chevron-down',
            }}
            agentItems={agents.map((agent) => ({
                id: agent.id,
                name: agent.name,
                dotColor: agent.dotColor,
                inactive: agent.inactive,
                description: agent.description || undefined,
                score: roleScores[normalizeRoleKey(agent.description || '')]?.score,
                scoreCount: roleScores[normalizeRoleKey(agent.description || '')]?.evaluationCount,
                selected: selectedAgentId === agent.id,
                onPress: () => {
                    setSelectedAgentId(agent.id);
                    navigateToSession(agent.id);
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
                    label: t('sidebar.needsDecision'),
                    color: '#FF3B30',
                    backgroundColor: '#FF3B300D',
                    count: statusCounts.needsDecision || undefined,
                },
                {
                    id: 'working',
                    icon: 'pulse',
                    label: t('sidebar.working'),
                    color: '#FF9500',
                    backgroundColor: '#FF950012',
                    count: statusCounts.working || undefined,
                },
                {
                    id: 'online',
                    icon: 'checkmark-circle',
                    label: t('sidebar.online'),
                    color: '#34C759',
                    backgroundColor: '#34C75912',
                    count: statusCounts.online || undefined,
                },
            ]}
            conversationSectionLabel={t('sidebar.workspace')}
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
            conversationEmptyText={t('sidebar.noTeamsYet')}
        />
    );
});
