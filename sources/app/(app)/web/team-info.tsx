import * as React from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { TeamStatsDashboard } from '@/components/TeamStatsDashboard';
import { EvolutionSummaryCard } from '@/components/EvolutionSummaryCard';
import { TeamWorkspaceShell } from '@/components/web/TeamWorkspaceShell';
import { uiPenColors, uiPenFontFamily, uiPenRadius } from '@/components/web/uiPenTokens';
import { mergeTeamOverviews, summarizeTeamArtifacts } from '@/components/web/teamOverview';
import { useCanonicalTeams } from '@/hooks/useCanonicalTeams';
import { useEvolutionSummary } from '@/hooks/useEvolutionSummary';
import { useArtifact, useArtifacts } from '@/sync/storage';
import { sync } from '@/sync/sync';

export default function TeamInfoWebScreen() {
    const params = useLocalSearchParams<{ teamId?: string | string[] }>();
    const artifacts = useArtifacts();
    const { teams: canonicalTeams } = useCanonicalTeams();
    const artifactTeams = React.useMemo(() => summarizeTeamArtifacts(artifacts), [artifacts]);
    const teams = React.useMemo(() => mergeTeamOverviews(artifactTeams, canonicalTeams), [artifactTeams, canonicalTeams]);

    const paramTeamId = Array.isArray(params.teamId) ? params.teamId[0] : params.teamId;
    const selectedTeamId = paramTeamId || teams[0]?.id;
    const selectedTeam = React.useMemo(
        () => teams.find((team) => team.id === selectedTeamId) || null,
        [teams, selectedTeamId]
    );
    const selectedArtifact = useArtifact(selectedTeam?.id || '');
    const {
        summary: evolutionSummary,
        isLoading: isEvolutionLoading,
        error: evolutionError,
        refresh: refreshEvolution,
    } = useEvolutionSummary(selectedTeam?.id || '');

    React.useEffect(() => {
        void sync.fetchArtifactsList().catch(() => undefined);
    }, []);

    React.useEffect(() => {
        if (!selectedTeam?.id || !selectedTeam.artifactBacked) {
            return;
        }
        if (!selectedArtifact?.body) {
            void sync.fetchArtifactWithBody(selectedTeam.id).catch(() => undefined);
        }
    }, [selectedArtifact?.body, selectedTeam?.artifactBacked, selectedTeam?.id]);

    const rightPanel = selectedTeam ? (
        <View style={{ flex: 1, padding: 12 }}>
            <Text style={{ color: uiPenColors.textPrimary, fontSize: 14, fontWeight: '700', fontFamily: uiPenFontFamily }}>
                Snapshot
            </Text>
            <View
                style={{
                    marginTop: 10,
                    borderRadius: uiPenRadius.lg,
                    borderWidth: 1,
                    borderColor: uiPenColors.borderSubtle,
                    backgroundColor: uiPenColors.bgElevated,
                    padding: 10,
                }}
            >
                {[
                    { label: 'Agents', value: selectedTeam.memberCount },
                    { label: 'Messages', value: '--' },
                    { label: 'Tasks', value: selectedTeam.taskCount },
                    { label: 'Done', value: selectedTeam.doneTaskCount },
                ].map((item) => (
                    <View
                        key={item.label}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingVertical: 4,
                        }}
                    >
                        <Text style={{ color: uiPenColors.textSecondary, fontSize: 12, fontFamily: uiPenFontFamily }}>{item.label}</Text>
                        <Text style={{ color: uiPenColors.textPrimary, fontSize: 12, fontWeight: '700', fontFamily: uiPenFontFamily }}>
                            {item.value}
                        </Text>
                    </View>
                ))}
            </View>

            <Text style={{ marginTop: 12, color: uiPenColors.textSecondary, fontSize: 12, lineHeight: 18, fontFamily: uiPenFontFamily }}>
                Info view combines base team metrics and server stats dashboard for tokens, model usage, and throughput trends.
            </Text>
        </View>
    ) : null;

    if (Platform.OS !== 'web') {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Text>Team info is only available on web.</Text>
            </View>
        );
    }

    if (!selectedTeam) {
        return (
            <TeamWorkspaceShell activeTab="info" title="Team Info" teams={teams} selectedTeamId={selectedTeamId}>
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <Text style={{ color: uiPenColors.textPrimary, fontSize: 18, fontWeight: '700', fontFamily: uiPenFontFamily }}>
                        No team data yet
                    </Text>
                    <Text
                        style={{
                            marginTop: 8,
                            color: uiPenColors.textSecondary,
                            fontSize: 14,
                            textAlign: 'center',
                            fontFamily: uiPenFontFamily,
                            maxWidth: 520,
                        }}
                    >
                        Create or select a team to open the info and stats workspace.
                    </Text>
                </View>
            </TeamWorkspaceShell>
        );
    }

    return (
        <TeamWorkspaceShell
            activeTab="info"
            title={`${selectedTeam.title} · Info & Stats`}
            teams={teams}
            selectedTeamId={selectedTeam.id}
            rightPanel={rightPanel}
            headerActions={
                <Pressable
                    onPress={() => {
                        router.push(`/web/team-chat?teamId=${encodeURIComponent(selectedTeam.id)}`);
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
                    <Text style={{ color: uiPenColors.textPrimary, fontSize: 12, fontWeight: '700', fontFamily: uiPenFontFamily }}>
                        Open Chat
                    </Text>
                </Pressable>
            }
        >
            <ScrollView style={{ flex: 1, backgroundColor: uiPenColors.bgPage }} contentContainerStyle={{ padding: 14, gap: 10 }}>
                <View
                    style={{
                        borderRadius: uiPenRadius.xl,
                        borderWidth: 1,
                        borderColor: uiPenColors.borderSubtle,
                        backgroundColor: uiPenColors.bgCard,
                        padding: 14,
                    }}
                >
                    <Text style={{ color: uiPenColors.textPrimary, fontSize: 16, fontWeight: '700', fontFamily: uiPenFontFamily }}>
                        Team Overview
                    </Text>
                    <Text style={{ marginTop: 6, color: uiPenColors.textSecondary, fontSize: 13, lineHeight: 20, fontFamily: uiPenFontFamily }}>
                        {selectedTeam.description}
                    </Text>

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                        {[
                            { label: 'Todo', value: selectedTeam.statusCounts.todo, bg: '#EEF3FF', text: '#4F6BD9' },
                            { label: 'In Progress', value: selectedTeam.statusCounts['in-progress'], bg: '#E7F3F8', text: '#2F7A9B' },
                            { label: 'Review', value: selectedTeam.statusCounts.review, bg: '#F1ECFA', text: '#7F67C2' },
                            { label: 'Done', value: selectedTeam.statusCounts.done, bg: '#EAF5EE', text: '#3D8A5A' },
                        ].map((item) => (
                            <View
                                key={item.label}
                                style={{
                                    borderRadius: uiPenRadius.pill,
                                    backgroundColor: item.bg,
                                    paddingHorizontal: 10,
                                    paddingVertical: 5,
                                    borderWidth: 1,
                                    borderColor: uiPenColors.borderSubtle,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 6,
                                }}
                            >
                                <Text style={{ color: item.text, fontSize: 12, fontWeight: '700', fontFamily: uiPenFontFamily }}>{item.label}</Text>
                                <Text style={{ color: item.text, fontSize: 12, fontFamily: uiPenFontFamily }}>{item.value}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                <View
                    style={{
                        borderRadius: uiPenRadius.xl,
                        borderWidth: 1,
                        borderColor: uiPenColors.borderSubtle,
                        backgroundColor: uiPenColors.bgCard,
                        padding: 14,
                    }}
                >
                    <Text style={{ color: uiPenColors.textPrimary, fontSize: 16, fontWeight: '700', fontFamily: uiPenFontFamily, marginBottom: 8 }}>
                        Team Stats Dashboard
                    </Text>
                    <View style={{ minHeight: 420 }}>
                        <TeamStatsDashboard teamId={selectedTeam.id} />
                    </View>
                </View>

                <EvolutionSummaryCard
                    title="Evolution Workspace"
                    summary={evolutionSummary}
                    isLoading={isEvolutionLoading}
                    error={evolutionError}
                    onRetry={refreshEvolution}
                />
            </ScrollView>
        </TeamWorkspaceShell>
    );
}
