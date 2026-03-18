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

import { FAB } from '@/components/ui/FAB';
import { Text } from '@/components/ui/StyledText';
import { getThreeColumnShellTokens } from '@/components/layout/ThreeColumnShell';
import { SidebarView } from '@/components/layout/SidebarView';
import { layout } from '@/utils/layout';
import { Modal } from '@/modal/ModalManager';
import { DecryptedArtifact } from '@/sync/artifactTypes';
import { useArtifacts } from '@/sync/storage';
import { sync } from '@/sync/sync';
import { t } from '@/text';

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
    },
    teamDate: {
        fontSize: 13,
        color: theme.colors.textSecondary,
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
        borderColor: '#D3DEE7',
        shadowColor: '#6E8293',
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
        shadowColor: '#0F1A22',
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
        borderColor: '#D3DEE7',
        shadowColor: '#6E8293',
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
        borderColor: '#D9E4EA',
        shadowColor: '#7A8C9B',
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
        borderColor: '#D9E4EA',
        shadowColor: '#7A8C9B',
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
        borderBottomColor: '#DEE8EE',
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
        borderColor: '#DCE7EE',
    },
    desktopHeaderLeadingSoft: {
        backgroundColor: '#E6EEF3',
    },
    desktopHeaderInfo: {
        flex: 1,
        minWidth: 0,
    },
    desktopEyebrow: {
        fontSize: 11,
        fontWeight: '700',
        color: '#8C9CAA',
        textTransform: 'uppercase',
        letterSpacing: 0.7,
        marginBottom: 6,
    },
    desktopTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#243746',
    },
    desktopSubtitle: {
        fontSize: 12,
        color: '#7E93A3',
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
        borderColor: '#D9E4EA',
        backgroundColor: '#EEF5F8',
    },
    desktopCountChipText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#617487',
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
        borderColor: '#D9E4EA',
        backgroundColor: 'rgba(255,255,255,0.74)',
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
        color: '#8C9CAA',
        marginBottom: 10,
        marginTop: 4,
    },
    desktopProjectGroup: {
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#DEE8EE',
        backgroundColor: 'rgba(235,243,247,0.72)',
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 10,
    },
    desktopProjectTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#243746',
    },
    desktopProjectMeta: {
        fontSize: 11,
        color: '#7E93A3',
        marginTop: 4,
    },
    desktopSessionCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#DCE7EE',
        backgroundColor: 'rgba(255,255,255,0.92)',
        padding: 14,
        marginBottom: 10,
        shadowColor: '#7A8C9B',
        shadowOffset: { width: 0, height: 7 },
        shadowOpacity: 0.07,
        shadowRadius: 16,
        elevation: 2,
    },
    desktopSessionCardOffline: {
        backgroundColor: '#F4F8FB',
        borderColor: '#E1E9EE',
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
        color: '#243746',
    },
    desktopSessionSubtitle: {
        fontSize: 12,
        lineHeight: 18,
        color: '#7E93A3',
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
        color: '#617487',
    },
    desktopBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: '#ECF3F7',
        alignSelf: 'flex-start',
    },
    desktopBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#617487',
    },
    desktopTeamsListContent: {
        padding: 18,
        paddingBottom: 28,
    },
    desktopTeamCard: {
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#DCE7EE',
        backgroundColor: 'rgba(255,255,255,0.94)',
        padding: 16,
        marginBottom: 12,
        shadowColor: '#7A8C9B',
        shadowOffset: { width: 0, height: 7 },
        shadowOpacity: 0.08,
        shadowRadius: 18,
        elevation: 3,
    },
    desktopTeamCardSelected: {
        borderColor: '#31485D',
        backgroundColor: '#EAF1F5',
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
        color: '#243746',
    },
    desktopTeamMetaText: {
        fontSize: 12,
        lineHeight: 18,
        color: '#7E93A3',
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
        borderColor: '#DFE9EE',
        backgroundColor: '#F2F7FA',
    },
    desktopMetaPillText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#617487',
    },
    desktopIconButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#DCE7EE',
        backgroundColor: '#F8FBFD',
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
        borderTopColor: '#DEE8EE',
        backgroundColor: 'rgba(239,245,248,0.96)',
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
}));

export default function TeamsScreen() {
    const { theme } = useUnistyles();
    const styles = stylesheet;
    const router = useRouter();
    const safeArea = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const allArtifacts = useArtifacts();
    const isDesktopShell = Platform.OS === 'web' && width >= 1180;
    const desktopTheme = getThreeColumnShellTokens('default');

    const teams = React.useMemo(() => {
        return allArtifacts.filter((artifact) => artifact.type === 'team');
    }, [allArtifacts]);

    const [isLoading, setIsLoading] = React.useState(false);
    const [isSelectionMode, setIsSelectionMode] = React.useState(false);
    const [selectedTeams, setSelectedTeams] = React.useState<Set<string>>(new Set());
    const [isBatchProcessing, setIsBatchProcessing] = React.useState(false);

    const openNewTeam = React.useCallback(() => {
        router.push('/teams/new');
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
                            {t('teams.membersLabel', { count: item.sessions?.length || 0 })} • {formatUpdatedDate(item.updatedAt)}
                        </Text>
                    </View>
                </View>
                {!isSelectionMode ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Pressable
                            onPress={(event) => handleDelete(item.id, event)}
                            style={{ padding: 8, marginRight: 4 }}
                            hitSlop={8}
                        >
                            <Ionicons name="trash-outline" size={20} color={theme.colors.textSecondary} />
                        </Pressable>
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
        isSelectionMode,
        selectedTeams,
        styles,
        teams.length,
        theme.colors.textSecondary,
    ]);

    const renderDesktopTeamItem = React.useCallback(({ item }: { item: DecryptedArtifact }) => {
        const isSelected = selectedTeams.has(item.id);
        const memberCount = item.sessions?.length || 0;
        const teamName = item.title || t('teams.untitledTeam');

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
                        </View>
                    </View>

                    {!isSelectionMode ? (
                        <View style={{ gap: 8 }}>
                            <Pressable
                                style={styles.desktopIconButton}
                                onPress={(event) => handleDelete(item.id, event)}
                            >
                                <Ionicons name="trash-outline" size={18} color={theme.colors.textSecondary} />
                            </Pressable>
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
                                            Cancel
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
                                            Select All
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
                                            Edit
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
                                            New Team
                                        </Text>
                                    </Pressable>
                                </>
                            )}
                        </View>
                    </View>
                    <View style={styles.desktopCountRow}>
                        <View
                            style={[
                                styles.desktopCountChip,
                                {
                                    backgroundColor: desktopTheme.chipBackground,
                                    borderColor: desktopTheme.chipBorder,
                                },
                            ]}
                        >
                            <Text style={[styles.desktopCountChipText, { color: desktopTheme.chipText }]}>
                                {teams.length} total
                            </Text>
                        </View>
                        <View
                            style={[
                                styles.desktopCountChip,
                                {
                                    backgroundColor: desktopTheme.chipBackground,
                                    borderColor: desktopTheme.chipBorder,
                                },
                            ]}
                        >
                            <Text style={[styles.desktopCountChipText, { color: desktopTheme.chipText }]}>
                                {selectedTeams.size} selected
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.desktopPanelBody}>
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
                                {selectedTeams.size} team(s) selected
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
        handleBatchArchive,
        handleBatchDelete,
        isBatchProcessing,
        isSelectionMode,
        openNewTeam,
        renderDesktopTeamItem,
        safeArea.bottom,
        selectedTeams,
        selectAllTeams,
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
                                {selectedTeams.size} team(s) selected
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
