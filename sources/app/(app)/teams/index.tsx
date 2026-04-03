import React from 'react';
import {
    ActivityIndicator,
    FlatList,
    GestureResponderEvent,
    Platform,
    Pressable,
    ScrollView,
    View,
    useWindowDimensions,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { useAuth } from '@/auth/AuthContext';
import { FAB } from '@/components/ui/FAB';
import { Text } from '@/components/ui/StyledText';
import { getThreeColumnShellTokens } from '@/components/layout/ThreeColumnShell';
import { SidebarView } from '@/components/layout/SidebarView';
import { layout } from '@/utils/layout';
import { Modal } from '@/modal/ModalManager';
import { DecryptedArtifact } from '@/sync/artifactTypes';
import { fetchWorkspaceOverview } from '@/sync/apiTeamManagement';
import { loadWorkspaceOverview, saveWorkspaceOverview } from '@/sync/persistence';
import { useArtifacts } from '@/sync/storage';
import { sync } from '@/sync/sync';
import type { WorkspaceOverviewSnapshot } from '@/sync/workspaceOverviewTypes';
import { t } from '@/text';
import { getTeamSessionIdsFromArtifact } from '@/utils/teamRoster';
import { listAgents, type AgentRecord } from '@/sync/apiAgents';

function isArchivedTeamArtifact(artifact: DecryptedArtifact): boolean {
    if (!artifact.body) {
        return false;
    }

    try {
        const board = JSON.parse(artifact.body) as { archivedAt?: number; team?: { archivedAt?: number } };
        return Boolean(board.archivedAt || board.team?.archivedAt);
    } catch {
        return false;
    }
}

const stylesheet = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.colors.groupped.background,
    },
    contentContainer: {
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
    overviewCard: {
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 4,
        padding: 16,
        borderRadius: 16,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.divider,
    },
    overviewEyebrow: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        color: theme.colors.textSecondary,
        marginBottom: 6,
    },
    overviewTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: theme.colors.text,
    },
    overviewSubtitle: {
        fontSize: 13,
        lineHeight: 18,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    overviewChipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 12,
    },
    overviewChip: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        backgroundColor: theme.colors.groupped.background,
    },
    overviewChipText: {
        fontSize: 11,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    teamItem: {
        backgroundColor: theme.colors.surface,
        marginHorizontal: 16,
        marginBottom: 1,
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
    },
    teamItemFirst: {
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        marginTop: 16,
    },
    teamItemLast: {
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        marginBottom: 16,
    },
    teamItemSingle: {
        borderRadius: 12,
        marginTop: 16,
        marginBottom: 16,
    },
    teamContent: {
        flex: 1,
        marginRight: 8,
    },
    teamTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: theme.colors.text,
        marginBottom: 4,
    },
    teamUntitled: {
        color: theme.colors.textSecondary,
        fontStyle: 'italic',
    },
    teamMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
    },
    teamDate: {
        fontSize: 13,
        color: theme.colors.textSecondary,
    },
    archivedBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        backgroundColor: '#6b728018',
    },
    archivedBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#6b7280',
        letterSpacing: 0.3,
        textTransform: 'uppercase',
    },
    teamChevron: {
        color: theme.colors.textSecondary,
    },
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
    desktopShell: {
        flex: 1,
        flexDirection: 'row',
        gap: 20,
        minHeight: 0,
        paddingHorizontal: 20,
        paddingVertical: 24,
    },
    desktopRailWrap: {
        width: 86,
        alignItems: 'center',
        gap: 18,
        minHeight: 0,
    },
    desktopRailOuter: {
        width: 70,
        flex: 1,
        borderRadius: 32,
        padding: 8,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        shadowColor: theme.colors.shadow.color,
        shadowOffset: { width: 10, height: 14 },
        shadowOpacity: 0.12,
        shadowRadius: 28,
        elevation: 5,
    },
    desktopRailInner: {
        flex: 1,
        borderRadius: 26,
        borderWidth: 1,
        borderColor: '#32404E',
        alignItems: 'center',
        paddingVertical: 18,
        paddingHorizontal: 8,
        gap: 14,
    },
    desktopRailButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    desktopRailButtonActive: {
        backgroundColor: '#31485D',
        borderWidth: 1,
        borderColor: '#3C5468',
        shadowColor: theme.colors.shadow.color,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 3,
    },
    desktopRailSpacer: {
        flex: 1,
    },
    desktopDock: {
        width: 60,
        height: 84,
        borderRadius: 22,
        padding: 7,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        shadowColor: theme.colors.shadow.color,
        shadowOffset: { width: 8, height: 12 },
        shadowOpacity: 0.1,
        shadowRadius: 22,
        elevation: 4,
    },
    desktopDockInner: {
        flex: 1,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#443D36',
    },
    desktopSidebar: {
        width: 280,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.colors.divider,
        shadowColor: theme.colors.shadow.color,
        shadowOffset: { width: 6, height: 14 },
        shadowOpacity: 0.1,
        shadowRadius: 28,
        elevation: 5,
        minHeight: 0,
    },
    desktopPanel: {
        flex: 1,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.colors.divider,
        shadowColor: theme.colors.shadow.color,
        shadowOffset: { width: 8, height: 14 },
        shadowOpacity: 0.1,
        shadowRadius: 30,
        elevation: 6,
        minWidth: 0,
        minHeight: 0,
    },
    desktopPanelHeader: {
        paddingHorizontal: 18,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.divider,
    },
    desktopHeaderRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    desktopHeaderLeading: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#31485D',
        borderWidth: 1,
        borderColor: theme.colors.divider,
    },
    desktopHeaderLeadingSoft: {
        backgroundColor: theme.colors.surfaceHigh,
    },
    desktopHeaderInfo: {
        flex: 1,
        minWidth: 0,
    },
    desktopEyebrow: {
        fontSize: 11,
        fontWeight: '700',
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.7,
        marginBottom: 6,
    },
    desktopTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: theme.colors.text,
    },
    desktopSubtitle: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    desktopCountRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 10,
    },
    desktopCountChip: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        backgroundColor: theme.colors.surfaceHigh,
    },
    desktopCountChipText: {
        fontSize: 11,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    desktopHeaderActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    desktopHeaderAction: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        backgroundColor: theme.colors.surface,
    },
    desktopHeaderActionPrimary: {
        backgroundColor: '#31485D',
        borderColor: '#31485D',
    },
    desktopHeaderActionDisabled: {
        opacity: 0.45,
    },
    desktopHeaderActionText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#31485D',
    },
    desktopHeaderActionTextPrimary: {
        color: '#FFFFFF',
    },
    desktopPanelBody: {
        flex: 1,
        minHeight: 0,
        minWidth: 0,
    },
    desktopScroll: {
        flex: 1,
        minHeight: 0,
    },
    desktopScrollContent: {
        padding: 18,
        paddingBottom: 24,
    },
    desktopSectionLabel: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        color: theme.colors.textSecondary,
        marginBottom: 10,
        marginTop: 4,
    },
    desktopProjectGroup: {
        borderRadius: 14,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        backgroundColor: theme.colors.surfaceHigh,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 10,
    },
    desktopProjectTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: theme.colors.text,
    },
    desktopProjectMeta: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    desktopSessionCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        backgroundColor: theme.colors.surface,
        padding: 14,
        marginBottom: 10,
        shadowColor: theme.colors.shadow.color,
        shadowOffset: { width: 0, height: 7 },
        shadowOpacity: 0.07,
        shadowRadius: 16,
        elevation: 2,
    },
    desktopSessionCardOffline: {
        backgroundColor: theme.colors.surfaceHigh,
        borderColor: theme.colors.divider,
    },
    desktopSessionContent: {
        flex: 1,
        minWidth: 0,
    },
    desktopSessionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    desktopSessionTitle: {
        flex: 1,
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.text,
    },
    desktopSessionSubtitle: {
        fontSize: 12,
        lineHeight: 18,
        color: theme.colors.textSecondary,
    },
    desktopSessionStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 10,
    },
    desktopStatusText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    desktopBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: theme.colors.surfaceHigh,
        alignSelf: 'flex-start',
    },
    desktopBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: theme.colors.textSecondary,
    },
    desktopTeamsListContent: {
        padding: 18,
        paddingBottom: 28,
    },
    desktopTeamCard: {
        borderRadius: 20,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        backgroundColor: theme.colors.surface,
        padding: 16,
        marginBottom: 12,
        shadowColor: theme.colors.shadow.color,
        shadowOffset: { width: 0, height: 7 },
        shadowOpacity: 0.08,
        shadowRadius: 18,
        elevation: 3,
    },
    desktopTeamCardSelected: {
        borderColor: '#31485D',
        backgroundColor: theme.colors.surfaceHigh,
    },
    desktopTeamRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    desktopTeamAvatar: {
        width: 40,
        height: 40,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#31485D',
    },
    desktopTeamAvatarText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    desktopTeamTextWrap: {
        flex: 1,
        minWidth: 0,
    },
    desktopTeamTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: theme.colors.text,
    },
    desktopTeamMetaText: {
        fontSize: 12,
        lineHeight: 18,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    desktopMetaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 12,
    },
    desktopMetaPill: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        backgroundColor: theme.colors.surfaceHigh,
    },
    desktopMetaPillText: {
        fontSize: 11,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    desktopIconButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: theme.colors.divider,
        backgroundColor: theme.colors.surfaceHigh,
    },
    desktopEmptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        paddingVertical: 32,
    },
    desktopBatchBar: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        borderTopWidth: 1,
        borderTopColor: theme.colors.divider,
        backgroundColor: theme.colors.surfaceHigh,
        paddingHorizontal: 18,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
    },
    desktopBatchActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    soloAgentsCard: {
        borderRadius: 12,
        marginTop: 16,
        marginBottom: 4,
        borderWidth: 1,
        borderColor: '#b26a00',
        backgroundColor: 'rgba(178, 106, 0, 0.08)',
    },
    soloAgentsIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    desktopSoloCard: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        marginHorizontal: 18,
        marginTop: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#b26a00',
        backgroundColor: 'rgba(178, 106, 0, 0.07)',
        padding: 14,
        shadowColor: '#b26a00',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 2,
    },
    desktopSoloIcon: {
        width: 40,
        height: 40,
        borderRadius: 14,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        backgroundColor: '#b26a00',
        marginRight: 12,
    },
    desktopSoloBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#b26a00',
        backgroundColor: 'rgba(178, 106, 0, 0.15)',
    },
}));

export default function TeamsScreen() {
    const { credentials } = useAuth();
    const { theme } = useUnistyles();
    const styles = stylesheet;
    const router = useRouter();
    const safeArea = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const allArtifacts = useArtifacts();
    const isDesktopShell = Platform.OS === 'web' && width >= 1180;
    const desktopTheme = getThreeColumnShellTokens('default', theme);

    const teams = React.useMemo(() => {
        return allArtifacts
            .filter((artifact) => artifact.type === 'team')
            .sort((a, b) => {
                const archivedDelta = Number(isArchivedTeamArtifact(a)) - Number(isArchivedTeamArtifact(b));
                if (archivedDelta !== 0) {
                    return archivedDelta;
                }
                return b.updatedAt - a.updatedAt;
            });
    }, [allArtifacts]);

    const [isLoading, setIsLoading] = React.useState(false);
    const [isSelectionMode, setIsSelectionMode] = React.useState(false);
    const [selectedTeams, setSelectedTeams] = React.useState<Set<string>>(new Set());
    const [isBatchProcessing, setIsBatchProcessing] = React.useState(false);
    const [workspaceOverview, setWorkspaceOverview] = React.useState<WorkspaceOverviewSnapshot | null>(
        () => loadWorkspaceOverview(),
    );

    // Standalone agents (for Solo Agents count badge)
    const [standaloneAgents, setStandaloneAgents] = React.useState<AgentRecord[]>([]);

    const refreshStandaloneAgents = React.useCallback(async () => {
        const creds = sync.getCredentials();
        if (!creds) {
            setStandaloneAgents([]);
            return;
        }

        try {
            const { agents } = await listAgents(creds, { type: 'standalone', limit: 50 });
            setStandaloneAgents(agents.filter((a) => a.status !== 'archived'));
        } catch (err) {
            console.error('Failed to fetch standalone agents:', err);
        }
    }, []);

    useFocusEffect(
        React.useCallback(() => {
            void refreshStandaloneAgents();
            return undefined;
        }, [refreshStandaloneAgents]),
    );

    const openNewTeam = React.useCallback(() => {
        router.push('/teams/new');
    }, [router]);

    const openSoloAgents = React.useCallback(() => {
        router.push('/teams/solo' as any);
    }, [router]);

    const toggleTeamSelection = React.useCallback((teamId: string) => {
        setSelectedTeams((previous) => {
            const next = new Set(previous);

            if (next.has(teamId)) {
                next.delete(teamId);
            } else {
                next.add(teamId);
            }

            return next;
        });
    }, []);

    const handleLongPress = React.useCallback((teamId: string) => {
        if (!isSelectionMode) {
            setIsSelectionMode(true);
            setSelectedTeams(new Set([teamId]));
        }
    }, [isSelectionMode]);

    const exitSelectionMode = React.useCallback(() => {
        setIsSelectionMode(false);
        setSelectedTeams(new Set());
    }, []);

    const selectAllTeams = React.useCallback(() => {
        setSelectedTeams(new Set(teams.map((team) => team.id)));
    }, [teams]);

    const handleBatchArchive = React.useCallback(async () => {
        if (selectedTeams.size === 0) {
            return;
        }

        const confirmed = await Modal.confirm(
            t('teams.archiveTeams'),
            t('teams.archiveConfirm', { count: selectedTeams.size }),
            {
                confirmText: t('teams.archiveAction'),
                cancelText: t('common.cancel'),
            }
        );

        if (!confirmed) {
            return;
        }

        try {
            setIsBatchProcessing(true);
            const result = await sync.batchArchiveTeams(Array.from(selectedTeams));
            if (result.success) {
                Modal.alert(t('common.success'), t('teams.archiveSuccess', { count: result.archived }));
                exitSelectionMode();
            }
        } catch (error) {
            console.error('Failed to batch archive teams:', error);
            Modal.alert(t('common.error'), t('teams.archiveFailed'));
        } finally {
            setIsBatchProcessing(false);
        }
    }, [exitSelectionMode, selectedTeams]);

    const handleBatchDelete = React.useCallback(async () => {
        if (selectedTeams.size === 0) {
            return;
        }

        const confirmed = await Modal.confirm(
            t('teams.deleteTeams'),
            t('teams.deleteTeamsConfirm', { count: selectedTeams.size }),
            {
                confirmText: t('teams.deleteAction'),
                cancelText: t('common.cancel'),
                destructive: true,
            }
        );

        if (!confirmed) {
            return;
        }

        try {
            setIsBatchProcessing(true);
            const result = await sync.batchDeleteTeams(Array.from(selectedTeams));
            if (result.success) {
                Modal.alert(t('common.success'), t('teams.deleteSuccess', { count: result.deleted }));
                exitSelectionMode();
            }
        } catch (error) {
            console.error('Failed to batch delete teams:', error);
            Modal.alert(t('common.error'), t('teams.deleteFailed'));
        } finally {
            setIsBatchProcessing(false);
        }
    }, [exitSelectionMode, selectedTeams]);

    React.useEffect(() => {
        let cancelled = false;
        let isMounted = true;

        (async () => {
            try {
                const credentials = sync.getCredentials();
                if (!credentials) {
                    return;
                }

                setIsLoading(true);
                await sync.fetchArtifactsList();
            } catch (error) {
                console.error('Failed to fetch artifacts:', error);
            } finally {
                if (isMounted && !cancelled) {
                    setIsLoading(false);
                }
            }
        })();

        return () => {
            cancelled = true;
            isMounted = false;
        };
    }, []);

    React.useEffect(() => {
        if (!credentials) {
            return;
        }

        let cancelled = false;

        fetchWorkspaceOverview(credentials)
            .then((overview) => {
                if (cancelled) {
                    return;
                }

                setWorkspaceOverview(overview);
                saveWorkspaceOverview(overview);
            })
            .catch((error) => {
                console.error('Failed to fetch teams overview snapshot', error);
            });

        return () => {
            cancelled = true;
        };
    }, [credentials?.token]);

    React.useEffect(() => {
        const teamsMissingBody = teams.filter((artifact) => artifact.body === undefined);
        if (teamsMissingBody.length === 0) {
            return;
        }

        let cancelled = false;

        (async () => {
            for (const artifact of teamsMissingBody) {
                if (cancelled) {
                    return;
                }
                await sync.fetchArtifactWithBody(artifact.id).catch((error) => {
                    console.error(`Failed to hydrate team artifact ${artifact.id} in list view:`, error);
                });
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [teams]);

    const handleDelete = React.useCallback(async (teamId: string, event: GestureResponderEvent) => {
        event.stopPropagation();
        const confirmed = await Modal.confirm(
            t('teams.deleteTeam'),
            t('teams.deleteTeamConfirm')
        );

        if (!confirmed) {
            return;
        }

        try {
            await sync.deleteTeam(teamId);
        } catch (error) {
            console.error('Failed to delete team:', error);
            await Modal.alert(t('common.error'), t('teams.deleteTeamFailed'));
        }
    }, []);

    const handleRestore = React.useCallback(async (item: DecryptedArtifact, event: GestureResponderEvent) => {
        event.stopPropagation();
        const confirmed = await Modal.confirm(
            t('teams.restoreTeam'),
            t('teams.restoreTeamConfirm'),
            {
                confirmText: t('teams.restoreAction'),
                cancelText: t('common.cancel'),
            }
        );

        if (!confirmed) {
            return;
        }

        try {
            const sessionIds = getTeamSessionIdsFromArtifact(item);
            const result = await sync.unarchiveTeam(item.id, sessionIds);
            if (result.success) {
                Modal.alert(t('common.success'), t('teams.restoreTeamSuccess', { restoredSessions: result.restoredSessions }));
            }
        } catch (error) {
            console.error('Failed to restore team from list:', error);
            await Modal.alert(t('common.error'), t('teams.restoreTeamFailed'));
        }
    }, []);

    const handleTeamPress = React.useCallback((teamId: string) => {
        if (isSelectionMode) {
            toggleTeamSelection(teamId);
        } else {
            router.push(`/teams/${teamId}`);
        }
    }, [isSelectionMode, router, toggleTeamSelection]);

    const formatUpdatedDate = React.useCallback((timestamp: number) => {
        return new Date(timestamp).toLocaleDateString();
    }, []);

    const overviewChips = React.useMemo(() => {
        if (!workspaceOverview) {
            return [
                { id: 'teams', label: t('teams.chipTotal', { count: teams.length }) },
                { id: 'selected', label: t('teams.chipSelected', { count: selectedTeams.size }) },
            ];
        }

        return [
            { id: 'teams', label: t('teams.chipTotal', { count: workspaceOverview.teamCount }) },
            { id: 'selected', label: t('teams.chipSelected', { count: selectedTeams.size }) },
            { id: 'completed', label: t('teams.chipDone', { count: workspaceOverview.completedTasksTotal }) },
        ];
    }, [selectedTeams.size, teams.length, workspaceOverview]);

    const soloAgentsCard = React.useMemo(() => {
        if (isSelectionMode) return null;

        const count = standaloneAgents.length;

        return (
            <Pressable
                style={[
                    styles.teamItem,
                    styles.soloAgentsCard,
                ]}
                onPress={() => router.push('/teams/solo' as any)}
            >
                <View style={[styles.soloAgentsIcon, { backgroundColor: theme.colors.button.primary.background }]}>
                    <Ionicons name="person" size={14} color="#FFFFFF" />
                </View>
                <View style={styles.teamContent}>
                    <Text style={styles.teamTitle} numberOfLines={1}>
                        {t('teams.soloAgents')}
                    </Text>
                    <View style={styles.teamMeta}>
                        <Text style={styles.teamDate}>
                            {t('teams.soloAgentsCount', { count })}
                        </Text>
                    </View>
                </View>
                <Ionicons
                    name="chevron-forward"
                    size={18}
                    style={styles.teamChevron}
                    color={theme.colors.textSecondary}
                />
            </Pressable>
        );
    }, [isSelectionMode, router, standaloneAgents.length, styles, theme.colors]);

    const listHeaderComponent = React.useMemo(() => {
        const overviewCard = workspaceOverview && !isSelectionMode ? (
            <View style={styles.overviewCard}>
                <Text style={styles.overviewEyebrow}>{t('home.reportTitle')}</Text>
                <Text style={styles.overviewTitle}>{t('teams.workspaceTeams')}</Text>
                <Text style={styles.overviewSubtitle}>{t('home.reportSubtitle')}</Text>
                <View style={styles.overviewChipRow}>
                    {overviewChips
                        .filter((chip) => chip.id !== 'selected')
                        .map((chip) => (
                            <View key={chip.id} style={styles.overviewChip}>
                                <Text style={styles.overviewChipText}>{chip.label}</Text>
                            </View>
                        ))}
                </View>
            </View>
        ) : null;

        if (!soloAgentsCard && !overviewCard) return null;

        return (
            <>
                {soloAgentsCard}
                {overviewCard}
            </>
        );
    }, [isSelectionMode, overviewChips, soloAgentsCard, styles, workspaceOverview]);

    const ListEmptyComponent = React.useCallback(() => {
        if (isLoading) {
            return (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" />
                    <Text style={[styles.emptyDescription, { marginTop: 16 }]}>
                        {t('teams.loadingTeams')}
                    </Text>
                </View>
            );
        }

        return (
            <View style={[styles.emptyContainer, isDesktopShell && styles.desktopEmptyState]}>
                <Image
                    source={require('@/assets/images/brutalist/Brutalism_5.png')}
                    contentFit="contain"
                    style={[styles.emptyIcon, { width: 64, height: 64 }]}
                    tintColor={theme.colors.textSecondary}
                />
                <Text style={styles.emptyTitle}>
                    {t('teams.noTeamsYet')}
                </Text>
                <Text style={styles.emptyDescription}>
                    {t('teams.noTeamsDescription')}
                </Text>
            </View>
        );
    }, [isDesktopShell, isLoading, styles, theme.colors.textSecondary]);

    const renderMobileTeamItem = React.useCallback(({ item, index }: { item: DecryptedArtifact; index: number }) => {
        const isFirst = index === 0;
        const isLast = index === teams.length - 1;
        const isSingle = teams.length === 1;
        const isSelected = selectedTeams.has(item.id);
        const isArchived = isArchivedTeamArtifact(item);

        return (
            <Pressable
                style={[
                    styles.teamItem,
                    isSingle ? styles.teamItemSingle
                        : isFirst ? styles.teamItemFirst
                            : isLast ? styles.teamItemLast
                                : {},
                ]}
                onPress={() => handleTeamPress(item.id)}
                onLongPress={() => handleLongPress(item.id)}
            >
                {isSelectionMode ? (
                    <View style={[styles.checkbox, isSelected ? styles.checkboxSelected : undefined]}>
                        {isSelected ? <Ionicons name="checkmark" size={16} color="#FFFFFF" /> : null}
                    </View>
                ) : null}
                <View style={styles.teamContent}>
                    <Text
                        style={[
                            styles.teamTitle,
                            !item.title ? styles.teamUntitled : undefined,
                        ]}
                        numberOfLines={1}
                    >
                        {item.title || t('teams.untitledTeam')}
                    </Text>
                    <View style={styles.teamMeta}>
                        <Text style={styles.teamDate}>
                            {t('teams.membersLabel', { count: getTeamSessionIdsFromArtifact(item).length })} • {formatUpdatedDate(item.updatedAt)}
                        </Text>
                        {isArchived ? (
                            <View style={styles.archivedBadge}>
                                <Text style={styles.archivedBadgeText}>{t('agents.archived')}</Text>
                            </View>
                        ) : null}
                    </View>
                </View>
                {!isSelectionMode ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {isArchived ? (
                            <Pressable
                                onPress={(event) => handleRestore(item, event)}
                                style={{ padding: 8, marginRight: 4 }}
                                hitSlop={8}
                            >
                                <Ionicons name="refresh-outline" size={20} color="#16a34a" />
                            </Pressable>
                        ) : (
                            <Pressable
                                onPress={(event) => handleDelete(item.id, event)}
                                style={{ padding: 8, marginRight: 4 }}
                                hitSlop={8}
                            >
                                <Ionicons name="trash-outline" size={20} color={theme.colors.textSecondary} />
                            </Pressable>
                        )}
                        <Ionicons
                            name="chevron-forward"
                            size={18}
                            style={styles.teamChevron}
                            color={theme.colors.textSecondary}
                        />
                    </View>
                ) : null}
            </Pressable>
        );
    }, [
        formatUpdatedDate,
        handleDelete,
        handleLongPress,
        handleTeamPress,
        handleRestore,
        isSelectionMode,
        selectedTeams,
        styles,
        teams.length,
        theme.colors.textSecondary,
    ]);

    const renderDesktopTeamItem = React.useCallback(({ item }: { item: DecryptedArtifact }) => {
        const isSelected = selectedTeams.has(item.id);
        const memberCount = getTeamSessionIdsFromArtifact(item).length;
        const teamName = item.title || t('teams.untitledTeam');
        const isArchived = isArchivedTeamArtifact(item);

        return (
            <Pressable
                style={[
                    styles.desktopTeamCard,
                    isSelected && styles.desktopTeamCardSelected,
                ]}
                onPress={() => handleTeamPress(item.id)}
                onLongPress={() => handleLongPress(item.id)}
            >
                <View style={styles.desktopTeamRow}>
                    {isSelectionMode ? (
                        <View style={[styles.checkbox, isSelected ? styles.checkboxSelected : undefined]}>
                            {isSelected ? <Ionicons name="checkmark" size={16} color="#FFFFFF" /> : null}
                        </View>
                    ) : (
                        <View style={styles.desktopTeamAvatar}>
                            <Text style={styles.desktopTeamAvatarText}>
                                {teamName.slice(0, 2).toUpperCase()}
                            </Text>
                        </View>
                    )}

                    <View style={styles.desktopTeamTextWrap}>
                        <Text
                            style={[
                                styles.desktopTeamTitle,
                                !item.title ? styles.teamUntitled : undefined,
                            ]}
                            numberOfLines={1}
                        >
                            {teamName}
                        </Text>
                        <Text style={styles.desktopTeamMetaText} numberOfLines={2}>
                            {t('teams.membersLabel', { count: memberCount })} • {formatUpdatedDate(item.updatedAt)}
                        </Text>
                        <View style={styles.desktopMetaRow}>
                            <View style={styles.desktopMetaPill}>
                                <Text style={styles.desktopMetaPillText}>
                                    {t('agents.memberCount', { count: memberCount })}
                                </Text>
                            </View>
                            <View style={styles.desktopMetaPill}>
                                <Text style={styles.desktopMetaPillText}>{t('teams.artifactSynced')}</Text>
                            </View>
                            {isArchived ? (
                                <View style={styles.desktopMetaPill}>
                                    <Text style={styles.desktopMetaPillText}>{t('agents.archived')}</Text>
                                </View>
                            ) : null}
                        </View>
                    </View>

                    {!isSelectionMode ? (
                        <View style={{ gap: 8 }}>
                            {isArchived ? (
                                <Pressable
                                    style={styles.desktopIconButton}
                                    onPress={(event) => handleRestore(item, event)}
                                >
                                    <Ionicons name="refresh-outline" size={18} color="#16a34a" />
                                </Pressable>
                            ) : (
                                <Pressable
                                    style={styles.desktopIconButton}
                                    onPress={(event) => handleDelete(item.id, event)}
                                >
                                    <Ionicons name="trash-outline" size={18} color={theme.colors.textSecondary} />
                                </Pressable>
                            )}
                            <View style={styles.desktopIconButton}>
                                <Ionicons name="arrow-forward" size={16} color="#31485D" />
                            </View>
                        </View>
                    ) : null}
                </View>
            </Pressable>
        );
    }, [
        formatUpdatedDate,
        handleDelete,
        handleLongPress,
        handleTeamPress,
        handleRestore,
        isSelectionMode,
        selectedTeams,
        styles,
        theme.colors.textSecondary,
    ]);

    const desktopTeamsContentStyle = React.useMemo(() => {
        return [
            styles.desktopTeamsListContent,
            teams.length === 0 && { flex: 1 },
            isSelectionMode && { paddingBottom: 128 + safeArea.bottom },
        ];
    }, [isSelectionMode, safeArea.bottom, styles.desktopTeamsListContent, teams.length]);

    const renderDesktopShell = React.useCallback(() => {
        const mainPanel = (
            <>
                <View style={styles.desktopPanelHeader}>
                    <View style={styles.desktopHeaderRow}>
                        <View
                            style={[
                                styles.desktopHeaderLeading,
                                styles.desktopHeaderLeadingSoft,
                                { backgroundColor: desktopTheme.softIconBackground },
                            ]}
                        >
                            <Ionicons
                                name="people-outline"
                                size={16}
                                color={desktopTheme.softIconForeground}
                            />
                        </View>
                        <View style={styles.desktopHeaderInfo}>
                            <Text style={styles.desktopEyebrow}>{t('teams.title')}</Text>
                            <Text style={[styles.desktopTitle, { color: desktopTheme.panelTitle }]}>
                                {t('teams.workspaceTeams')}
                            </Text>
                            <Text style={[styles.desktopSubtitle, { color: desktopTheme.panelTextSecondary }]}>
                                {t('teams.workspaceTeamsDescription')}
                            </Text>
                        </View>
                        <View style={styles.desktopHeaderActions}>
                            {isSelectionMode ? (
                                <>
                                    <Pressable
                                        style={[
                                            styles.desktopHeaderAction,
                                            {
                                                backgroundColor: desktopTheme.actionBackground,
                                                borderColor: desktopTheme.actionBorder,
                                            },
                                        ]}
                                        onPress={exitSelectionMode}
                                    >
                                        <Text style={[styles.desktopHeaderActionText, { color: desktopTheme.actionText }]}>
                                            {t('common.cancel')}
                                        </Text>
                                    </Pressable>
                                    <Pressable
                                        style={[
                                            styles.desktopHeaderAction,
                                            {
                                                backgroundColor: desktopTheme.actionBackground,
                                                borderColor: desktopTheme.actionBorder,
                                            },
                                            teams.length === 0 && styles.desktopHeaderActionDisabled,
                                        ]}
                                        onPress={selectAllTeams}
                                        disabled={teams.length === 0}
                                    >
                                        <Text style={[styles.desktopHeaderActionText, { color: desktopTheme.actionText }]}>
                                            {t('teams.selectAll')}
                                        </Text>
                                    </Pressable>
                                </>
                            ) : (
                                <>
                                    <Pressable
                                        style={[
                                            styles.desktopHeaderAction,
                                            {
                                                backgroundColor: desktopTheme.actionBackground,
                                                borderColor: desktopTheme.actionBorder,
                                            },
                                            teams.length === 0 && styles.desktopHeaderActionDisabled,
                                        ]}
                                        onPress={() => setIsSelectionMode(true)}
                                        disabled={teams.length === 0}
                                    >
                                        <Text style={[styles.desktopHeaderActionText, { color: desktopTheme.actionText }]}>
                                            {t('teams.editButton')}
                                        </Text>
                                    </Pressable>
                                    <Pressable
                                        style={[
                                            styles.desktopHeaderAction,
                                            styles.desktopHeaderActionPrimary,
                                            {
                                                backgroundColor: desktopTheme.primaryActionBackground,
                                                borderColor: desktopTheme.primaryActionBackground,
                                            },
                                        ]}
                                        onPress={openNewTeam}
                                    >
                                        <Text
                                            style={[
                                                styles.desktopHeaderActionText,
                                                styles.desktopHeaderActionTextPrimary,
                                                { color: desktopTheme.primaryActionText },
                                            ]}
                                        >
                                            {t('teams.newTeamButton')}
                                        </Text>
                                    </Pressable>
                                </>
                            )}
                        </View>
                    </View>
                    <View style={styles.desktopCountRow}>
                        {overviewChips.map((chip) => (
                            <View
                                key={chip.id}
                                style={[
                                    styles.desktopCountChip,
                                    {
                                        backgroundColor: desktopTheme.chipBackground,
                                        borderColor: desktopTheme.chipBorder,
                                    },
                                ]}
                            >
                                <Text style={[styles.desktopCountChipText, { color: desktopTheme.chipText }]}>
                                    {chip.label}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>

                <View style={styles.desktopPanelBody}>
                    {/* Solo Agents — pinned at top with warm-gold accent */}
                    {!isSelectionMode && (
                        <Pressable
                            style={styles.desktopSoloCard}
                            onPress={openSoloAgents}
                        >
                            <View style={styles.desktopSoloIcon}>
                                <Ionicons name="person" size={18} color="#FFFFFF" />
                            </View>
                            <View style={{ flex: 1, minWidth: 0 }}>
                                <Text style={{ fontSize: 15, fontWeight: '700', color: '#b26a00' }} numberOfLines={1}>
                                    {t('teams.soloAgents')}
                                </Text>
                                <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 }}>
                                    {t('teams.soloAgentsCount', { count: standaloneAgents.length })}
                                </Text>
                            </View>
                            <View style={styles.desktopSoloBadge}>
                                <Text style={{ fontSize: 10, fontWeight: '700', color: '#b26a00', letterSpacing: 0.5 }}>{t('teams.soloBadge')}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color="#b26a00" style={{ marginLeft: 8 }} />
                        </Pressable>
                    )}
                    <FlatList
                        data={teams}
                        renderItem={renderDesktopTeamItem}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={desktopTeamsContentStyle}
                        ListEmptyComponent={ListEmptyComponent}
                        extraData={selectedTeams}
                        showsVerticalScrollIndicator={false}
                    />

                    {isSelectionMode && (
                        <View
                            style={[
                                styles.desktopBatchBar,
                                {
                                    paddingBottom: Math.max(safeArea.bottom, 12) + 12,
                                },
                            ]}
                        >
                            <Text style={styles.selectionInfo}>
                                {t('teams.selectedCount', { count: selectedTeams.size })}
                            </Text>
                            <View style={styles.desktopBatchActions}>
                                <Pressable
                                    onPress={handleBatchArchive}
                                    disabled={selectedTeams.size === 0 || isBatchProcessing}
                                    style={[
                                        styles.batchActionButton,
                                        (selectedTeams.size === 0 || isBatchProcessing) && { opacity: 0.5 },
                                    ]}
                                >
                                    <Ionicons name="archive-outline" size={18} color={theme.colors.text} />
                                    <Text style={styles.batchActionButtonText}>{t('teams.archiveAction')}</Text>
                                </Pressable>
                                <Pressable
                                    onPress={handleBatchDelete}
                                    disabled={selectedTeams.size === 0 || isBatchProcessing}
                                    style={[
                                        styles.batchActionButton,
                                        styles.batchActionButtonDestructive,
                                        (selectedTeams.size === 0 || isBatchProcessing) && { opacity: 0.5 },
                                    ]}
                                >
                                    <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
                                    <Text style={[styles.batchActionButtonText, styles.batchActionButtonTextDestructive]}>
                                        {t('teams.deleteAction')}
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                    )}
                </View>
            </>
        );

        return (
            <SidebarView mainPanel={mainPanel} />
        );
    }, [
        ListEmptyComponent,
        desktopTeamsContentStyle,
        desktopTheme,
        exitSelectionMode,
        overviewChips,
        handleBatchArchive,
        handleBatchDelete,
        isBatchProcessing,
        isSelectionMode,
        openNewTeam,
        openSoloAgents,
        renderDesktopTeamItem,
        safeArea.bottom,
        selectedTeams,
        selectAllTeams,
        standaloneAgents.length,
        styles,
        teams.length,
        theme.colors.text,
    ]);

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: !isDesktopShell,
                    headerTitle: isSelectionMode ? t('teams.selectedCount', { count: selectedTeams.size }) : t('teams.title'),
                    headerLeft: isSelectionMode ? () => (
                        <Pressable onPress={exitSelectionMode} style={{ padding: 8 }}>
                            <Text style={{ color: theme.colors.text, fontSize: 16 }}>{t('common.cancel')}</Text>
                        </Pressable>
                    ) : undefined,
                    headerRight: isSelectionMode ? () => (
                        <Pressable onPress={selectAllTeams} style={{ padding: 8 }}>
                            <Text style={{ color: theme.colors.text, fontSize: 16 }}>{t('teams.selectAll')}</Text>
                        </Pressable>
                    ) : () => (
                        <Pressable
                            onPress={() => setIsSelectionMode(true)}
                            style={{ padding: 8 }}
                            disabled={teams.length === 0}
                        >
                            <Text
                                style={{
                                    color: teams.length === 0 ? theme.colors.textSecondary : theme.colors.text,
                                    fontSize: 16,
                                }}
                            >
                                {t('teams.editButton')}
                            </Text>
                        </Pressable>
                    ),
                }}
            />

            {isDesktopShell ? renderDesktopShell() : (
                <View style={styles.container}>
                    <FlatList
                        data={teams}
                        renderItem={renderMobileTeamItem}
                        keyExtractor={(item) => item.id}
                        ListHeaderComponent={listHeaderComponent}
                        contentContainerStyle={[
                            styles.contentContainer,
                            teams.length === 0 && { flex: 1 },
                            { maxWidth: layout.maxWidth, alignSelf: 'center', width: '100%' },
                            isSelectionMode && { paddingBottom: 100 + safeArea.bottom },
                        ]}
                        ListEmptyComponent={ListEmptyComponent}
                        extraData={selectedTeams}
                    />

                    {!isSelectionMode && <FAB onPress={openNewTeam} />}

                    {isSelectionMode && (
                        <View style={[styles.batchActionBar, { paddingBottom: safeArea.bottom + 12 }]}>
                            <Text style={styles.selectionInfo}>
                                {t('teams.selectedCount', { count: selectedTeams.size })}
                            </Text>
                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                <Pressable
                                    onPress={handleBatchArchive}
                                    disabled={selectedTeams.size === 0 || isBatchProcessing}
                                    style={[
                                        styles.batchActionButton,
                                        (selectedTeams.size === 0 || isBatchProcessing) && { opacity: 0.5 },
                                    ]}
                                >
                                    <Ionicons name="archive-outline" size={18} color={theme.colors.text} />
                                    <Text style={styles.batchActionButtonText}>{t('teams.archiveAction')}</Text>
                                </Pressable>
                                <Pressable
                                    onPress={handleBatchDelete}
                                    disabled={selectedTeams.size === 0 || isBatchProcessing}
                                    style={[
                                        styles.batchActionButton,
                                        styles.batchActionButtonDestructive,
                                        (selectedTeams.size === 0 || isBatchProcessing) && { opacity: 0.5 },
                                    ]}
                                >
                                    <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
                                    <Text style={[styles.batchActionButtonText, styles.batchActionButtonTextDestructive]}>
                                        {t('teams.deleteAction')}
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                    )}
                </View>
            )}
        </>
    );
}
