import * as React from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import TeamChatRoom from '@/components/TeamChatRoom';
import { TeamWorkspaceShell } from '@/components/web/TeamWorkspaceShell';
import { uiPenColors, uiPenFontFamily } from '@/components/web/uiPenTokens';
import { mergeTeamOverviews, summarizeTeamArtifacts } from '@/components/web/teamOverview';
import { useCanonicalTeams } from '@/hooks/useCanonicalTeams';
import { getTeamCreationRoute } from '@/features/teams/wizard/routes';
import { useAllSessions, useArtifact, useArtifacts, useIsDataReady } from '@/sync/storage';
import { sync } from '@/sync/sync';

interface ParsedMember {
    sessionId: string;
    displayName?: string;
    roleId?: string;
}

function parseTeamMembers(body: string | null | undefined): { members: ParsedMember[]; roleTitleById: Map<string, string> } {
    if (!body) {
        return { members: [], roleTitleById: new Map() };
    }

    try {
        const parsed = JSON.parse(body);
        const teamNode = typeof parsed?.team === 'object' && parsed?.team ? parsed.team : parsed;
        const membersRaw = Array.isArray(teamNode?.members) ? teamNode.members : [];
        const rolesRaw = Array.isArray(teamNode?.roles) ? teamNode.roles : [];

        const roleTitleById = new Map<string, string>();
        for (const roleNode of rolesRaw) {
            if (roleNode && typeof roleNode === 'object') {
                const roleId = typeof roleNode.id === 'string' ? roleNode.id : '';
                const title = typeof roleNode.title === 'string' ? roleNode.title : roleId;
                if (roleId) {
                    roleTitleById.set(roleId, title || roleId);
                }
            }
        }

        const members: ParsedMember[] = membersRaw
            .filter((member: unknown): member is Record<string, unknown> => typeof member === 'object' && member !== null)
            .map((member: Record<string, unknown>) => ({
                sessionId: typeof member.sessionId === 'string' ? member.sessionId : '',
                displayName: typeof member.displayName === 'string' ? member.displayName : undefined,
                roleId: typeof member.roleId === 'string' ? member.roleId : undefined,
            }))
            .filter((member: ParsedMember) => member.sessionId.length > 0);

        return { members, roleTitleById };
    } catch {
        return { members: [], roleTitleById: new Map() };
    }
}

export default function TeamChatWebScreen() {
    const params = useLocalSearchParams<{ teamId?: string | string[] }>();
    const artifacts = useArtifacts();
    const { teams: canonicalTeams } = useCanonicalTeams();
    const allSessions = useAllSessions();
    const isDataReady = useIsDataReady();

    React.useEffect(() => {
        void sync.fetchArtifactsList().catch(() => undefined);
    }, []);

    const artifactTeams = React.useMemo(() => summarizeTeamArtifacts(artifacts), [artifacts]);
    const teams = React.useMemo(() => mergeTeamOverviews(artifactTeams, canonicalTeams), [artifactTeams, canonicalTeams]);
    const paramTeamId = Array.isArray(params.teamId) ? params.teamId[0] : params.teamId;
    const selectedTeamId = paramTeamId || teams[0]?.id;
    const selectedTeam = React.useMemo(
        () => teams.find((team) => team.id === selectedTeamId) || null,
        [teams, selectedTeamId]
    );

    const artifactWithBody = useArtifact(selectedTeam?.id || '');

    React.useEffect(() => {
        if (!selectedTeam?.id || !selectedTeam.artifactBacked) {
            return;
        }
        if (!artifactWithBody?.body) {
            void sync.fetchArtifactWithBody(selectedTeam.id).catch(() => undefined);
        }
    }, [selectedTeam?.artifactBacked, selectedTeam?.id, artifactWithBody?.body]);

    const roster = React.useMemo(() => {
        if (!selectedTeam) {
            return [];
        }

        const { members, roleTitleById } = parseTeamMembers(artifactWithBody?.body);
        const sessionMap = new Map(allSessions.map((session) => [session.id, session]));

        const enriched = members.map((member) => {
            const session = sessionMap.get(member.sessionId);
            return {
                member: {
                    sessionId: member.sessionId,
                    displayName: member.displayName,
                    roleId: member.roleId,
                },
                session: session
                    ? {
                          active: session.active,
                          updatedAt: session.updatedAt,
                      }
                    : undefined,
                role: member.roleId
                    ? {
                          title: roleTitleById.get(member.roleId) || member.roleId,
                      }
                    : undefined,
            };
        });

        if (enriched.length > 0) {
            return enriched;
        }

        return allSessions
            .filter((session) => session.metadata?.teamId === selectedTeam.id)
            .map((session) => ({
                member: {
                    sessionId: session.id,
                    displayName: session.metadata?.name,
                    roleId: session.metadata?.role,
                },
                session: {
                    active: session.active,
                    updatedAt: session.updatedAt,
                },
                role: session.metadata?.role
                    ? {
                          title: session.metadata.role,
                      }
                    : undefined,
            }));
    }, [allSessions, artifactWithBody?.body, selectedTeam]);

    const rightPanel = (
        <View style={{ flex: 1, padding: 12 }}>
            <Text
                style={{
                    color: uiPenColors.textPrimary,
                    fontSize: 14,
                    fontWeight: '700',
                    fontFamily: uiPenFontFamily,
                }}
            >
                Team Members
            </Text>
            <Text
                style={{
                    marginTop: 2,
                    color: uiPenColors.textSecondary,
                    fontSize: 12,
                    fontFamily: uiPenFontFamily,
                }}
            >
                {roster.length} active workspace slots
            </Text>

            <ScrollView style={{ marginTop: 10 }}>
                {roster.map((entry) => (
                    <View
                        key={entry.member.sessionId}
                        style={{
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: uiPenColors.borderSubtle,
                            backgroundColor: uiPenColors.bgElevated,
                            paddingHorizontal: 10,
                            paddingVertical: 8,
                            marginBottom: 8,
                        }}
                    >
                        <Text
                            numberOfLines={1}
                            style={{
                                color: uiPenColors.textPrimary,
                                fontSize: 13,
                                fontWeight: '600',
                                fontFamily: uiPenFontFamily,
                            }}
                        >
                            {entry.member.displayName || entry.member.sessionId.slice(0, 8)}
                        </Text>
                        <Text
                            style={{
                                marginTop: 2,
                                color: uiPenColors.textSecondary,
                                fontSize: 12,
                                fontFamily: uiPenFontFamily,
                            }}
                        >
                            {entry.role?.title || entry.member.roleId || 'member'}
                        </Text>
                    </View>
                ))}
            </ScrollView>
        </View>
    );

    if (Platform.OS !== 'web') {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Text>Web team chat is only available on web.</Text>
            </View>
        );
    }

    if (!selectedTeam) {
        return (
            <TeamWorkspaceShell
                activeTab="chat"
                title="Team Chat"
                teams={teams}
                selectedTeamId={selectedTeamId}
                headerActions={
                    <Pressable
                        onPress={() => {
                            router.push(getTeamCreationRoute('market'));
                        }}
                        style={{
                            borderRadius: 10,
                            backgroundColor: uiPenColors.accentGreen,
                            paddingHorizontal: 12,
                            paddingVertical: 7,
                        }}
                    >
                        <Text
                            style={{
                                color: uiPenColors.textInverse,
                                fontSize: 12,
                                fontWeight: '700',
                                fontFamily: uiPenFontFamily,
                            }}
                        >
                            Open Agent Market
                        </Text>
                    </Pressable>
                }
            >
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <Text
                        style={{
                            color: uiPenColors.textPrimary,
                            fontSize: 18,
                            fontWeight: '700',
                            fontFamily: uiPenFontFamily,
                            textAlign: 'center',
                        }}
                    >
                        No team available yet
                    </Text>
                    <Text
                        style={{
                            marginTop: 8,
                            color: uiPenColors.textSecondary,
                            fontSize: 14,
                            fontFamily: uiPenFontFamily,
                            textAlign: 'center',
                            maxWidth: 480,
                        }}
                    >
                        Create your first team, then launch sessions and chat with agents from this workspace.
                    </Text>
                </View>
            </TeamWorkspaceShell>
        );
    }

    return (
        <TeamWorkspaceShell
            activeTab="chat"
            title={`${selectedTeam.title} · Team Chat`}
            teams={teams}
            selectedTeamId={selectedTeam.id}
            rightPanel={rightPanel}
            headerActions={
                <Pressable
                    onPress={() => {
                        router.push(withTeamId('/web/board', selectedTeam.id) as any);
                    }}
                    style={{
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: uiPenColors.borderSubtle,
                        backgroundColor: uiPenColors.bgCard,
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                    }}
                >
                    <Text
                        style={{
                            color: uiPenColors.textPrimary,
                            fontSize: 12,
                            fontWeight: '700',
                            fontFamily: uiPenFontFamily,
                        }}
                    >
                        Open Board
                    </Text>
                </Pressable>
            }
        >
            {isDataReady ? (
                <TeamChatRoom
                    teamId={selectedTeam.id}
                    teamName={selectedTeam.title}
                    members={roster}
                />
            ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Text
                        style={{
                            color: uiPenColors.textSecondary,
                            fontSize: 14,
                            fontFamily: uiPenFontFamily,
                        }}
                    >
                        Loading team chat...
                    </Text>
                </View>
            )}
        </TeamWorkspaceShell>
    );
}

function withTeamId(base: string, teamId: string): string {
    return `${base}?teamId=${encodeURIComponent(teamId)}`;
}
