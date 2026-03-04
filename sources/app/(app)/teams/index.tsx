import React from 'react';
import { View, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { Text } from '@/components/StyledText';
import { useArtifacts } from '@/sync/storage';
import { DecryptedArtifact } from '@/sync/artifactTypes';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { t } from '@/text';
import { layout } from '@/components/layout';
import { sync } from '@/sync/sync';
import { FAB } from '@/components/FAB';
import { Modal } from '@/modal/ModalManager';
import { AppStateView } from '@/components/AppStateView';

const stylesheet = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.colors.groupped.background,
    },
    contentContainer: {
        paddingTop: 16,
        paddingBottom: 100,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    emptyIcon: {
        marginBottom: 16,
        color: theme.colors.textSecondary,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyDescription: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    teamItem: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E5E4E1',
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 10,
    },
    teamItemFirst: {
        marginTop: 0,
    },
    teamItemLast: {
        marginBottom: 12,
    },
    teamItemSingle: {
        marginTop: 0,
        marginBottom: 12,
    },
    teamItemSelected: {
        borderColor: theme.colors.button.primary.background,
        backgroundColor: `${theme.colors.button.primary.background}0A`,
    },
    teamTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    teamContent: {
        flex: 1,
    },
    teamTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.text,
    },
    teamUntitled: {
        color: theme.colors.textSecondary,
        fontStyle: 'italic',
    },
    teamStatusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#D9D8D4',
        backgroundColor: '#F6F5F2',
    },
    teamStatusBadgeActive: {
        borderColor: '#3D8A5A',
        backgroundColor: '#EAF5EE',
    },
    teamStatusText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#8A8882',
    },
    teamStatusTextActive: {
        color: '#3D8A5A',
    },
    teamDescription: {
        fontSize: 13,
        lineHeight: 18,
        color: theme.colors.textSecondary,
    },
    teamMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
    },
    teamDate: {
        fontSize: 12,
        fontWeight: '500',
        color: theme.colors.textSecondary,
    },
    teamActions: {
        marginTop: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    teamChevron: {
        color: theme.colors.textSecondary,
    },
    // Batch selection styles
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: theme.colors.textSecondary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    checkboxSelected: {
        backgroundColor: theme.colors.button.primary.background,
        borderColor: theme.colors.button.primary.background,
    },
    batchActionBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: theme.colors.surface,
        borderTopWidth: 1,
        borderTopColor: theme.colors.divider,
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    batchActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: theme.colors.groupped.background,
    },
    batchActionButtonDestructive: {
        backgroundColor: theme.colors.textDestructive,
    },
    batchActionButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
        marginLeft: 6,
    },
    batchActionButtonTextDestructive: {
        color: '#FFFFFF',
    },
    selectionInfo: {
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    quickStartButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: theme.colors.button.primary.background,
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 24,
        marginTop: 24,
        minWidth: 200,
    },
    quickStartButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    connectRepoButton: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 24,
        marginTop: 12,
    },
    connectRepoButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
    connectRepoCard: {
        marginHorizontal: 16,
        marginBottom: 14,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#3D8A5A',
        backgroundColor: '#EAF5EE',
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    connectRepoIconWrap: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    connectRepoCopyWrap: {
        flex: 1,
        gap: 2,
    },
    connectRepoTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1A1918',
    },
    connectRepoDesc: {
        fontSize: 12,
        color: '#6D6C6A',
    },
    headerActionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerActionText: {
        fontSize: 16,
        color: theme.colors.text,
        fontWeight: '500',
    },
    headerAddButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#3D8A5A',
    },
}));

export default function TeamsScreen() {
    const { theme } = useUnistyles();
    const styles = stylesheet;
    const router = useRouter();
    const safeArea = useSafeAreaInsets();
    const allArtifacts = useArtifacts();

    // Filter for team artifacts
    const teams = React.useMemo(() => {
        return allArtifacts.filter(a => a.type === 'team');
    }, [allArtifacts]);

    const [isLoading, setIsLoading] = React.useState(false);
    const [loadError, setLoadError] = React.useState<'network' | 'unknown' | null>(null);
    const [isSelectionMode, setIsSelectionMode] = React.useState(false);
    const [selectedTeams, setSelectedTeams] = React.useState<Set<string>>(new Set());
    const [isBatchProcessing, setIsBatchProcessing] = React.useState(false);

    // Exit selection mode when no teams selected
    React.useEffect(() => {
        if (isSelectionMode && selectedTeams.size === 0 && teams.length > 0) {
            // Keep selection mode active even with 0 selected
        }
    }, [selectedTeams, isSelectionMode, teams.length]);

    // Toggle team selection
    const toggleTeamSelection = React.useCallback((teamId: string) => {
        setSelectedTeams(prev => {
            const next = new Set(prev);
            if (next.has(teamId)) {
                next.delete(teamId);
            } else {
                next.add(teamId);
            }
            return next;
        });
    }, []);

    // Enter selection mode via long press
    const handleLongPress = React.useCallback((teamId: string) => {
        if (!isSelectionMode) {
            setIsSelectionMode(true);
            setSelectedTeams(new Set([teamId]));
        }
    }, [isSelectionMode]);

    // Exit selection mode
    const exitSelectionMode = React.useCallback(() => {
        setIsSelectionMode(false);
        setSelectedTeams(new Set());
    }, []);

    // Select all teams
    const selectAllTeams = React.useCallback(() => {
        setSelectedTeams(new Set(teams.map(t => t.id)));
    }, [teams]);

    // Helper to extract session IDs from team body
    const extractSessionIds = React.useCallback((teamId: string): string[] => {
        const team = teams.find(t => t.id === teamId);
        if (!team?.body || typeof team.body !== 'string') return [];

        try {
            const parsed = JSON.parse(team.body);
            const members = parsed?.team?.members || parsed?.members;
            if (Array.isArray(members)) {
                return members.map((m: any) => m.sessionId).filter(Boolean);
            }
        } catch (e) {
            // Silent fail - return empty array
        }
        return [];
    }, [teams]);

    const getTeamDisplay = React.useCallback((team: DecryptedArtifact) => {
        let parsed: any = {};
        try {
            parsed = team.body && typeof team.body === 'string' ? JSON.parse(team.body) : {};
        } catch (error) {
            parsed = {};
        }

        const teamNode = parsed.team || parsed;
        const members = Array.isArray(teamNode?.members) ? teamNode.members : [];
        const roles = Array.isArray(teamNode?.roles) ? teamNode.roles : [];
        const memberCount = members.length || team.sessions?.length || 0;
        const roleCount = roles.reduce((acc: number, role: any) => {
            const quantity = Number(role?.quantity ?? 0);
            return acc + (Number.isFinite(quantity) && quantity > 0 ? quantity : 0);
        }, 0);
        const title = (team.title || teamNode?.name || '').trim() || 'Untitled Team';
        const description =
            (teamNode?.goal || teamNode?.description || '').trim() ||
            `Collaborative team with ${Math.max(memberCount, 1)} member${memberCount === 1 ? '' : 's'}.`;

        return {
            title,
            description,
            memberCount,
            roleCount,
            isActive: memberCount > 0,
            status: memberCount > 0 ? 'Active' : 'Idle',
            updatedAtLabel: new Date(team.updatedAt).toLocaleDateString(),
        };
    }, []);

    // Batch archive handler
    const handleBatchArchive = React.useCallback(async () => {
        if (selectedTeams.size === 0) return;

        // Extract session IDs for all selected teams
        const teamIds = Array.from(selectedTeams);
        let totalSessions = 0;
        teamIds.forEach(teamId => {
            totalSessions += extractSessionIds(teamId).length;
        });

        const confirmed = await Modal.confirm(
            t('teams.batchArchiveTitle') || 'Archive Teams',
            t('teams.batchArchiveMessage', { teamCount: teamIds.length, sessionCount: totalSessions }) ||
            `Archive ${teamIds.length} team(s) and ${totalSessions} associated session(s)?`,
            {
                confirmText: t('teams.archive') || 'Archive',
                cancelText: t('common.cancel') || 'Cancel',
            }
        );

        if (!confirmed) return;

        try {
            setIsBatchProcessing(true);
            const result = await sync.batchArchiveTeams(teamIds);
            if (result.success) {
                Modal.alert(
                    t('common.success') || 'Success',
                    t('teams.batchArchiveSuccess', { count: result.archived }) ||
                    `Archived ${result.archived} team(s).`
                );
                exitSelectionMode();
            }
        } catch (error) {
            Modal.alert(
                t('common.error') || 'Error',
                t('teams.batchArchiveError') || 'Failed to archive teams. Please try again.'
            );
        } finally {
            setIsBatchProcessing(false);
        }
    }, [selectedTeams, extractSessionIds, exitSelectionMode, t]);

    // Batch delete handler
    const handleBatchDelete = React.useCallback(async () => {
        if (selectedTeams.size === 0) return;

        // Extract session IDs for all selected teams
        const teamIds = Array.from(selectedTeams);
        let totalSessions = 0;
        teamIds.forEach(teamId => {
            totalSessions += extractSessionIds(teamId).length;
        });

        const confirmed = await Modal.confirm(
            t('teams.batchDeleteTitle') || 'Delete Teams',
            t('teams.batchDeleteMessage', { teamCount: teamIds.length, sessionCount: totalSessions }) ||
            `Permanently delete ${teamIds.length} team(s) and ${totalSessions} associated session(s)? This cannot be undone.`,
            {
                confirmText: t('teams.delete') || 'Delete',
                cancelText: t('common.cancel') || 'Cancel',
                destructive: true,
            }
        );

        if (!confirmed) return;

        try {
            setIsBatchProcessing(true);
            const result = await sync.batchDeleteTeams(teamIds);
            if (result.success) {
                Modal.alert(
                    t('common.success') || 'Success',
                    t('teams.batchDeleteSuccess', { count: result.deleted }) ||
                    `Deleted ${result.deleted} team(s).`
                );
                exitSelectionMode();
            }
        } catch (error) {
            Modal.alert(
                t('common.error') || 'Error',
                t('teams.batchDeleteError') || 'Failed to delete teams. Please try again.'
            );
        } finally {
            setIsBatchProcessing(false);
        }
    }, [selectedTeams, extractSessionIds, exitSelectionMode, t]);

    const fetchTeams = React.useCallback(async () => {
        try {
            const credentials = sync.getCredentials();
            if (!credentials) {
                return;
            }

            setLoadError(null);
            setIsLoading(true);
            await sync.fetchArtifactsList();
        } catch (error) {
            const message = error instanceof Error ? error.message.toLowerCase() : '';
            const isNetworkError =
                message.includes('network') ||
                message.includes('fetch') ||
                message.includes('timeout') ||
                message.includes('offline') ||
                message.includes('econn');
            setLoadError(isNetworkError ? 'network' : 'unknown');
        } finally {
            setIsLoading(false);
        }
    }, []);

    React.useEffect(() => {
        void fetchTeams();
    }, [fetchTeams]);

    const handleDelete = React.useCallback(async (teamId: string, event: any) => {
        event.stopPropagation();

        // Find the team artifact
        const team = teams.find(t => t.id === teamId);
        if (!team) {
            await Modal.alert(
                t('common.error') || 'Error',
                t('teams.teamNotFound') || 'Team not found'
            );
            return;
        }

        // Extract associated session IDs
        const sessionIds = extractSessionIds(teamId);
        const sessionText = sessionIds.length === 1 ? 'session' : 'sessions';

        const confirm = await Modal.confirm(
            t('teams.deleteConfirmTitle') || 'Delete Team',
            t('teams.deleteConfirmMessage', { count: sessionIds.length, sessionText }) ||
            `Are you sure you want to delete this team and ${sessionIds.length} associated ${sessionText}? This action cannot be undone.`
        );

        if (confirm) {
            try {
                await sync.deleteTeam(teamId, sessionIds);
            } catch (error) {
                await Modal.alert(
                    t('common.error') || 'Error',
                    t('teams.deleteError') || 'Failed to delete team. Please try again.'
                );
            }
        }
    }, [teams, extractSessionIds, t]);

    const renderItem = React.useCallback(({ item, index }: { item: DecryptedArtifact; index: number }) => {
        const isFirst = index === 0;
        const isLast = index === teams.length - 1;
        const isSingle = teams.length === 1;
        const isSelected = selectedTeams.has(item.id);
        const display = getTeamDisplay(item);

        return (
            <Pressable
                style={[
                    styles.teamItem,
                    isSelected ? styles.teamItemSelected : undefined,
                    isSingle ? styles.teamItemSingle :
                        isFirst ? styles.teamItemFirst :
                            isLast ? styles.teamItemLast : {}
                ]}
                testID="team-card"
                onPress={() => {
                    if (isSelectionMode) {
                        toggleTeamSelection(item.id);
                    } else {
                        router.push(`/teams/${item.id}`);
                    }
                }}
                onLongPress={() => handleLongPress(item.id)}
            >
                <View style={styles.teamTopRow}>
                    <View style={styles.teamContent}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            {isSelectionMode ? (
                                <View style={[styles.checkbox, isSelected ? styles.checkboxSelected : undefined]}>
                                    {isSelected ? <Ionicons name="checkmark" size={16} color="#FFFFFF" /> : null}
                                </View>
                            ) : null}
                            <Text
                                style={[
                                    styles.teamTitle,
                                    display.title === 'Untitled Team' ? styles.teamUntitled : undefined
                                ]}
                                numberOfLines={1}
                            >
                                {display.title}
                            </Text>
                        </View>
                    </View>
                    {!isSelectionMode ? (
                        <View
                            style={[
                                styles.teamStatusBadge,
                                display.isActive ? styles.teamStatusBadgeActive : undefined,
                            ]}
                            testID="team-status"
                        >
                            <Text
                                style={[
                                    styles.teamStatusText,
                                    display.isActive ? styles.teamStatusTextActive : undefined,
                                ]}
                            >
                                {display.status}
                            </Text>
                        </View>
                    ) : null}
                </View>
                <Text style={styles.teamDescription} numberOfLines={2}>
                    {display.description}
                </Text>
                <View style={styles.teamMeta}>
                    <Text style={styles.teamDate}>{display.memberCount} members</Text>
                    <Text style={styles.teamDate}>{display.roleCount} roles</Text>
                    <Text style={styles.teamDate}>Updated {display.updatedAtLabel}</Text>
                </View>
                {!isSelectionMode ? (
                    <View style={styles.teamActions}>
                        <Pressable
                            onPress={(e) => handleDelete(item.id, e)}
                            style={{ padding: 8, marginRight: 4 }}
                            hitSlop={8}
                        >
                            <Ionicons name="trash-outline" size={20} color={theme.colors.textSecondary} />
                        </Pressable>
                        <Ionicons name="chevron-forward" size={18} style={styles.teamChevron} color={theme.colors.textSecondary} />
                    </View>
                ) : null}
            </Pressable>
        );
    }, [teams, router, styles, handleDelete, isSelectionMode, selectedTeams, toggleTeamSelection, handleLongPress, theme, getTeamDisplay]);

    const keyExtractor = React.useCallback((item: DecryptedArtifact) => item.id, []);

    const ListHeaderComponent = React.useCallback(() => {
        if (isSelectionMode || teams.length === 0) {
            return null;
        }

        return (
            <Pressable
                style={styles.connectRepoCard}
                onPress={() => router.push('/teams/new-wizard')}
                accessibilityRole="button"
            >
                <View style={styles.connectRepoIconWrap}>
                    <Ionicons name="git-branch-outline" size={20} color="#3D8A5A" />
                </View>
                <View style={styles.connectRepoCopyWrap}>
                    <Text style={styles.connectRepoTitle}>Connect a Repo</Text>
                    <Text style={styles.connectRepoDesc}>Start building with AI agents</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#6D6C6A" />
            </Pressable>
        );
    }, [isSelectionMode, teams.length, router, styles]);

    const ListEmptyComponent = React.useCallback(() => {
        if (isLoading) {
            return (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" />
                    <Text style={[styles.emptyDescription, { marginTop: 16 }]}>
                        Loading teams...
                    </Text>
                </View>
            );
        }

        if (loadError) {
            return (
                <AppStateView
                    preset="network-error"
                    title={loadError === 'network' ? undefined : 'Unable to Load Teams'}
                    message={
                        loadError === 'network'
                            ? undefined
                            : 'We could not load your team list right now.'
                    }
                    recovery={
                        loadError === 'network'
                            ? undefined
                            : 'Please retry in a moment.'
                    }
                    primaryAction={{
                        label: 'Retry',
                        onPress: () => {
                            void fetchTeams();
                        },
                    }}
                />
            );
        }

        return (
            <AppStateView
                preset="empty-team"
                primaryAction={{ label: 'Quick Start', onPress: () => router.push('/teams/new-wizard') }}
                secondaryAction={{ label: 'Connect a Repo', onPress: () => router.push('/teams/new-wizard') }}
            />
        );
    }, [isLoading, styles, loadError, fetchTeams, router]);

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: true,
                    headerTitle: isSelectionMode ? `${selectedTeams.size} Selected` : 'My Legions',
                    headerLeft: isSelectionMode ? () => (
                        <Pressable onPress={exitSelectionMode} style={{ padding: 8 }}>
                            <Text style={{ color: theme.colors.text, fontSize: 16 }}>Cancel</Text>
                        </Pressable>
                    ) : undefined,
                    headerRight: isSelectionMode ? () => (
                        <Pressable onPress={selectAllTeams} style={{ padding: 8 }}>
                            <Text style={{ color: theme.colors.text, fontSize: 16 }}>Select All</Text>
                        </Pressable>
                    ) : () => (
                        <View style={styles.headerActionRow}>
                            <Pressable
                                onPress={() => setIsSelectionMode(true)}
                                style={{ padding: 8 }}
                                disabled={teams.length === 0}
                            >
                                <Text style={[
                                    styles.headerActionText,
                                    teams.length === 0 ? { color: theme.colors.textSecondary } : undefined
                                ]}>
                                    Edit
                                </Text>
                            </Pressable>
                            <Pressable
                                onPress={() => router.push('/teams/new-wizard')}
                                style={styles.headerAddButton}
                                accessibilityRole="button"
                            >
                                <Ionicons name="add" size={18} color="#FFFFFF" />
                            </Pressable>
                        </View>
                    ),
                }}
            />
            <View style={styles.container}>
                <FlatList
                    data={teams}
                    renderItem={renderItem}
                    keyExtractor={keyExtractor}
                    contentContainerStyle={[
                        styles.contentContainer,
                        teams.length === 0 && { flex: 1 },
                        { maxWidth: layout.maxWidth, alignSelf: 'center', width: '100%' },
                        isSelectionMode && { paddingBottom: 100 + safeArea.bottom }
                    ]}
                    ListHeaderComponent={ListHeaderComponent}
                    ListEmptyComponent={ListEmptyComponent}
                    extraData={selectedTeams}
                />

                {/* Floating Action Button - hide in selection mode */}
                {!isSelectionMode && <FAB onPress={() => router.push('/teams/new-wizard')} />}

                {/* Batch Action Bar */}
                {isSelectionMode && (
                    <View style={[styles.batchActionBar, { paddingBottom: safeArea.bottom + 12 }]}>
                        <Text style={styles.selectionInfo}>
                            {selectedTeams.size} team(s) selected
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <Pressable
                                onPress={handleBatchArchive}
                                disabled={selectedTeams.size === 0 || isBatchProcessing}
                                style={[
                                    styles.batchActionButton,
                                    (selectedTeams.size === 0 || isBatchProcessing) && { opacity: 0.5 }
                                ]}
                            >
                                <Ionicons name="archive-outline" size={18} color={theme.colors.text} />
                                <Text style={styles.batchActionButtonText}>Archive</Text>
                            </Pressable>
                            <Pressable
                                onPress={handleBatchDelete}
                                disabled={selectedTeams.size === 0 || isBatchProcessing}
                                style={[
                                    styles.batchActionButton,
                                    styles.batchActionButtonDestructive,
                                    (selectedTeams.size === 0 || isBatchProcessing) && { opacity: 0.5 }
                                ]}
                            >
                                <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
                                <Text style={[styles.batchActionButtonText, styles.batchActionButtonTextDestructive]}>
                                    Delete
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                )}
            </View>
        </>
    );
}
