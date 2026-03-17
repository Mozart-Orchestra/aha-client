import React from 'react';
import {
    ActivityIndicator,
    Platform,
    Pressable,
    ScrollView,
    View,
    useWindowDimensions,
} from 'react-native';
import { Text } from '@/components/ui/StyledText';
import { trackTeamViewed, trackTaskCreated, trackTaskApproval, trackTeamChatSent, trackTaskCompleted, trackTaskMoved } from '@/track';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { useArtifact, useAllSessions, useAllMachines, useProfile, useIsDataReady, useArtifacts } from '@/sync/storage';
import { sync } from '@/sync/sync';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Modal } from '@/modal';
import {
    KanbanBoard,
    KanbanColumn,
    KanbanTask,
    DEFAULT_TEAM_ROLES,
    DEFAULT_TEAM_AGREEMENTS,
    DEFAULT_KANBAN_BOARD
} from '@/sync/kanbanTypes';
import { useDesktopBridge } from '@/desktop/useDesktopBridge';
import { getDisplayName } from '@/sync/profile';
import TeamChatRoom from '@/components/team/TeamChatRoom';
import { TaskDetailModal } from '@/components/team/TaskDetailModal';
import { TaskApprovalModal } from '@/components/team/TaskApprovalModal';
import { NewTaskModal } from '@/components/team/NewTaskModal';
import { TeamStatusBar } from '@/components/team/TeamStatusBar';
import { useTaskChatSync } from '@/hooks/useTaskChatSync';
import type { TeamMessage } from '@/sync/teamMessageTypes';
import { getSessionsForTask } from '@/-zen/model/taskSessionLink';
import Color from 'color';
import { syncKanbanStatusToTodo } from '@/-zen/model/ops';
import { getCurrentAuth } from '@/auth/AuthContext';
import { useAuth } from '@/auth/AuthContext';
import { taskNeedsApproval } from '@/utils/taskHelpers';
import { EvolutionSection } from '@/components/settings/EvolutionSection';
import { FloatingIslandSidebar } from '@/components/layout/FloatingIslandSidebar';
import { getThreeColumnShellTokens } from '@/components/layout/ThreeColumnShell';
import { SidebarView } from '@/components/layout/SidebarView';
import { getSessionName, getAgentPresenceVisual } from '@/utils/sessionUtils';
import { buildTeamReturnPath, getSingleRouteParam, pushSessionRoute } from '@/utils/returnNavigation';
import { randomUUID } from '@/utils/uuid';
import { t } from '@/text';
import { formatTaskReference } from '@/utils/taskChatSync';
import { applyDerivedLifecycleTimestamps } from '@/utils/teamLifecycle';
import { getActiveTaskForSession } from '@/utils/teamActiveTask';

function buildTeamMemberSessionTag(teamId: string, memberId: string): string {
    return `team:${teamId}:member:${memberId}`;
}

const stylesheet = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.colors.groupped.background,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    header: {
        padding: 16,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.divider,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    boardContainer: {
        flex: 1,
        flexDirection: 'row',
        padding: 16,
    },
    column: {
        flex: 1,
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        marginHorizontal: 6,
        padding: 12,
    },
    columnHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    columnTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
    taskCount: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        backgroundColor: theme.colors.groupped.background,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    taskCard: {
        backgroundColor: theme.colors.groupped.background,
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        // Force card to fill column width and constrain children
        width: '100%',
    },
    taskTitle: {
        fontSize: 14,
        color: theme.colors.text,
        marginBottom: 4,
        // Explicit width: 100% forces text to wrap within card boundaries
        width: '100%',
    },
    taskAssignee: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        fontStyle: 'italic',
    },
    taskMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: theme.colors.divider,
    },
    taskSessionsLink: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 12,
    },
    taskSessionsIcon: {
        marginRight: 4,
    },
    taskSessionsText: {
        fontSize: 11,
        color: theme.colors.textSecondary,
    },
    taskPriority: {
        fontSize: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        overflow: 'hidden',
    },
    taskActiveExecution: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 999,
        backgroundColor: 'rgba(255, 149, 0, 0.12)',
    },
    taskActiveExecutionText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#FF9500',
    },
    addTaskButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8,
        marginTop: 8,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        borderRadius: 8,
        borderStyle: 'dashed',
    },
    addTaskText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginLeft: 4,
    },
    // 🆕 Pending tasks banner styles
    pendingBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        marginHorizontal: 16,
        marginTop: 16,
        borderWidth: 1,
        borderRadius: 8,
    },
    pendingBannerText: {
        flex: 1,
        fontSize: 14,
        marginLeft: 8,
    },
    pendingBannerButton: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 6,
    },
    pendingBannerButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    scrollContent: {
        paddingBottom: 48
    },
    section: {
        marginTop: 16,
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        marginHorizontal: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: theme.colors.divider,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 12,
    },
    memberCard: {
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: theme.colors.divider,
    },
    memberFirst: {
        borderTopWidth: 0,
        paddingTop: 4,
    },
    memberName: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.text,
    },
    memberMeta: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    pill: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: theme.colors.groupped.background,
        marginTop: 8,
    },
    pillText: {
        fontSize: 12,
        fontWeight: '500',
        color: theme.colors.textSecondary,
    },
    roleCard: {
        borderTopWidth: 1,
        borderTopColor: theme.colors.divider,
        paddingTop: 16,
        marginTop: 16,
    },
    roleTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.text,
    },
    roleSummary: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginTop: 6,
        lineHeight: 20,
    },
    metaLabel: {
        marginTop: 12,
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    bulletItem: {
        fontSize: 13,
        color: theme.colors.text,
        marginTop: 6,
        lineHeight: 18,
    },
    agreementsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    agreementCard: {
        flex: 1,
        minWidth: 150,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        borderRadius: 10,
        padding: 12,
        marginTop: 12,
    },
    agreementTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    agreementText: {
        fontSize: 13,
        color: theme.colors.text,
        lineHeight: 18,
    },
    emptyState: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        fontStyle: 'italic',
    },
    desktopPanelHeader: {
        paddingHorizontal: 24,
        paddingVertical: 14,
        height: 54,
        borderBottomWidth: 1,
        borderBottomColor: '#DEE8EE',
    },
    desktopHeaderTopRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    desktopTabsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        height: '100%',
        minWidth: 0,
    },
    desktopTab: {
        width: 80,
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
    },
    desktopTabActive: {
        borderRadius: 999,
        shadowColor: '#7A8C9B',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.07,
        shadowRadius: 10,
        elevation: 2,
    },
    desktopTabText: {
        fontSize: 13,
    },
    desktopPanelBody: {
        flex: 1,
        minHeight: 0,
        minWidth: 0,
    },
    desktopMenu: {
        position: 'absolute',
        top: 52,
        right: 22,
        minWidth: 188,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
        elevation: 6,
        zIndex: 20,
    },
    desktopMenuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    desktopMenuDivider: {
        height: 1,
    },
    mobileHeaderTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12,
    },
    mobileWorkspaceButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: theme.colors.groupped.background,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    mobileWorkspaceCopy: {
        flex: 1,
        minWidth: 0,
    },
    mobileWorkspaceTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.text,
    },
    mobileWorkspaceSubtitle: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    mobileHeaderIconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.groupped.background,
        borderWidth: 1,
        borderColor: theme.colors.divider,
    },
    mobileWorkspaceBackdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(10, 16, 22, 0.16)',
        zIndex: 1200,
    },
    mobileWorkspacePanel: {
        position: 'absolute',
        top: 82,
        left: 12,
        bottom: 16,
        borderRadius: 22,
        overflow: 'hidden',
        backgroundColor: '#F8FBFD',
        borderWidth: 1,
        borderColor: '#D9E4EA',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.14,
        shadowRadius: 32,
        elevation: 12,
        zIndex: 1300,
    },
}));

const withAlpha = (color: string, alpha: number): string => {
    try {
        return Color(color).alpha(alpha).rgb().string();
    } catch {
        return color;
    }
};

const SHELL_TABS = [
    { id: 'chat', label: 'Chat' },
    { id: 'board', label: 'Board' },
    { id: 'info', label: 'Info' },
    { id: 'evolution', label: 'Evolution' },
] as const;
const TEAM_DASHBOARD_TABS = ['chat', 'board', 'info', 'evolution'] as const;
type TeamDashboardTab = typeof TEAM_DASHBOARD_TABS[number];

const SHELL_ROLE_COLORS: Record<string, string> = {
    master: '#007AFF',
    orchestrator: '#007AFF',
    builder: '#FF9500',
    implementer: '#FF9500',
    qa: '#5856D6',
    'qa-engineer': '#5856D6',
    framer: '#34C759',
    architect: '#34C759',
    reviewer: '#8A7F74',
    observer: '#8A7F74',
};

const SHELL_CONVERSATION_COLORS = ['#7AA585', '#8F99C1', '#1A1209', '#B89A6F', '#6886A3'];

function getRoleAccent(roleId?: string): string {
    if (!roleId) {
        return '#8A7F74';
    }

    return SHELL_ROLE_COLORS[roleId.toLowerCase()] ?? '#8A7F74';
}

function formatShellTime(timestamp: number): string {
    const now = new Date();
    const value = new Date(timestamp);

    if (now.toDateString() === value.toDateString()) {
        return value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    return value.toLocaleDateString([], { month: 'numeric', day: 'numeric' });
}

function getMessagePreview(message: TeamMessage): string {
    const source = (message.shortContent || message.content || '').replace(/\s+/g, ' ').trim();
    if (!source) {
        return 'No recent message';
    }
    return source.length > 42 ? `${source.slice(0, 42)}...` : source;
}

export default function TeamDashboardScreen() {
    const { id, roomId: roomIdParam, tab } = useLocalSearchParams();
    const teamId = id as string;
    const router = useRouter();
    const { theme } = useUnistyles();
    const { width, height } = useWindowDimensions();
    const styles = stylesheet;
    const artifact = useArtifact(teamId);
    const allTeams = useArtifacts().filter(a => a.type === 'team');
    const allSessions = useAllSessions();
    const allMachines = useAllMachines();
    const profile = useProfile();
    const { isAuthenticated } = useAuth();
    const isDataReady = useIsDataReady();
    const isDesktopShell = Platform.OS === 'web' && width >= 1180;
    const shellVariant = 'default' as const;
    const shellTheme = getThreeColumnShellTokens(shellVariant);
    const tabParam = getSingleRouteParam(tab);
    const normalizedInitialTab = React.useMemo<TeamDashboardTab>(() => {
        if (tabParam && (TEAM_DASHBOARD_TABS as readonly string[]).includes(tabParam)) {
            return tabParam as TeamDashboardTab;
        }
        return 'chat';
    }, [tabParam]);
    const [activeTab, setActiveTab] = React.useState<TeamDashboardTab>(normalizedInitialTab);
    const [isLoading, setIsLoading] = React.useState(false);
    const [selectedTask, setSelectedTask] = React.useState<KanbanTask | null>(null);
    const [showTaskDetail, setShowTaskDetail] = React.useState(false);
    const [showNewTaskModal, setShowNewTaskModal] = React.useState(false);
    const [newTaskStatus, setNewTaskStatus] = React.useState('todo');
    const [chatComposerPrefill, setChatComposerPrefill] = React.useState<{ text: string; token: number } | null>(null);
    const [showApprovalModal, setShowApprovalModal] = React.useState(false); // 🆕
    const [teamMessages, setTeamMessages] = React.useState<TeamMessage[]>([]);
    const [showMenu, setShowMenu] = React.useState(false);
    const [showWorkspaceDrawer, setShowWorkspaceDrawer] = React.useState(false);
    const [selectedAgentId, setSelectedAgentId] = React.useState<string | null>(null);
    const [selectedConversationId, setSelectedConversationId] = React.useState<string | null>(null);
    const [isRecoveringTeam, setIsRecoveringTeam] = React.useState(false);
    const lifecyclePersistTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const { bridge: desktopBridge, collaborationState } = useDesktopBridge();
    const parsedArtifactBoard = React.useMemo<{
        board: KanbanBoard | null;
        parseError: Error | null;
    }>(() => {
        if (!artifact?.body) {
            return { board: null, parseError: null };
        }

        try {
            return {
                board: JSON.parse(artifact.body) as KanbanBoard,
                parseError: null,
            };
        } catch (error) {
            return {
                board: null,
                parseError: error instanceof Error ? error : new Error('Failed to parse team artifact body'),
            };
        }
    }, [artifact?.body]);
    const artifactRoomId = React.useMemo(() => {
        return parsedArtifactBoard.board?.roomId;
    }, [parsedArtifactBoard.board]);
    const roomId = (roomIdParam as string) || artifactRoomId || undefined;
    const teamReturnTo = React.useMemo(() => {
        return buildTeamReturnPath({
            teamId,
            tab: activeTab,
            roomId,
        });
    }, [activeTab, roomId, teamId]);
    const desktopRoom = React.useMemo(() => {
        if (!roomId || !collaborationState) return null;
        return collaborationState.rooms.find((room: any) => room.id === roomId) ?? null;
    }, [collaborationState, roomId]);
    const desktopBoard = React.useMemo<KanbanBoard | null>(() => {
        if (!roomId || !collaborationState) return null;
        return collaborationState.boards.find((entry: any) => entry.roomId === roomId)?.board ?? null;
    }, [collaborationState, roomId]);

    // Get user's display name for chat
    const myDisplayName = React.useMemo(() => {
        const displayName = getDisplayName(profile);
        return displayName || sync.anonID || 'Workspace'; // Fallback for unauthenticated/empty profile states
    }, [profile]);

    React.useEffect(() => {
        if (normalizedInitialTab !== activeTab) {
            setActiveTab(normalizedInitialTab);
        }
    }, [activeTab, normalizedInitialTab]);

    React.useEffect(() => {
        if (teamId) {
            trackTeamViewed(teamId);
        }
    }, [teamId]);

    const selectTab = React.useCallback((nextTab: TeamDashboardTab) => {
        setActiveTab(nextTab);
        router.replace({
            pathname: '/teams/[id]',
            params: {
                id: teamId,
                ...(roomId ? { roomId } : {}),
                tab: nextTab,
            },
        } as any);
    }, [roomId, router, teamId]);

    React.useEffect(() => {
        if (desktopBridge) {
            return;
        }
        if (artifact && artifact.body === undefined && !isLoading) {
            setIsLoading(true);
            sync.fetchArtifactWithBody(artifact.id)
                .finally(() => setIsLoading(false));
        }
    }, [artifact, isLoading, desktopBridge]);

    // Auto-initialize Board if artifact doesn't exist (CLI-created teams)
    const [autoInitAttempted, setAutoInitAttempted] = React.useState(false);
    React.useEffect(() => {
        // Wait for data to be ready before auto-initializing
        if (desktopBridge || isLoading || autoInitAttempted || !isDataReady || !isAuthenticated) {
            return;
        }
        // If artifact is null (data loaded but artifact doesn't exist), auto-initialize
        if (artifact === null) {
            setAutoInitAttempted(true);
            setIsLoading(true);
            console.log(`🔍 Checking server for existing Board for team ${teamId}...`);

            sync.fetchArtifactWithBody(teamId)
                .then((existingArtifact) => {
                    if (existingArtifact) {
                        console.log(`✅ Found existing Board for team ${teamId} on server`);
                        return;
                    }

                    console.log(`🔧 Auto-initializing Board for team ${teamId}...`);
                    const initialBoard: KanbanBoard = {
                        ...DEFAULT_KANBAN_BOARD,
                        tasks: [],
                        team: {
                            roles: DEFAULT_TEAM_ROLES,
                            agreements: DEFAULT_TEAM_AGREEMENTS,
                            members: []
                        }
                    };

                    return sync.createArtifact(
                        'Team',
                        JSON.stringify(initialBoard, null, 2),
                        [],
                        false,
                        'team',
                        teamId
                    ).then(() => {
                        console.log(`✅ Board auto-initialized for team ${teamId}`);
                        return sync.fetchArtifactWithBody(teamId);
                    });
                })
                .catch((error) => {
                    console.error('Failed to ensure Board exists:', error);
                })
                .finally(() => {
                    setIsLoading(false);
                });
        }
    }, [artifact, teamId, desktopBridge, isLoading, autoInitAttempted, isAuthenticated, isDataReady]);

    // Subscribe to task events for real-time Board updates (Server-Driven Task Orchestration)
    React.useEffect(() => {
        if (desktopBridge) {
            // Desktop bridge handles its own updates
            return;
        }

        // Subscribe to task events for this team
        const unsubscribe = sync.subscribeToTaskEvents(teamId, (event) => {
            console.log(`🔄 Board: Received ${event.type} for task ${event.taskId}`);
            // Refetch artifact to get updated board data
            sync.fetchArtifactWithBody(teamId).catch(err => {
                console.error(`Failed to refresh board after ${event.type}:`, err);
            });
        });

        return () => {
            unsubscribe();
        };
    }, [teamId, desktopBridge]);

    // Helper to get session IDs from artifact body
    const getSessionIds = React.useCallback((): string[] => {
        if (!artifact?.body) return [];
        if (parsedArtifactBoard.parseError || !parsedArtifactBoard.board) {
            throw parsedArtifactBoard.parseError || new Error('Team artifact body is unavailable');
        }

        const members = parsedArtifactBoard.board.team?.members || [];
        return members.map((m: any) => m.sessionId).filter(Boolean);
    }, [artifact?.body, parsedArtifactBoard.board, parsedArtifactBoard.parseError]);

    // Archive Team handler
    const handleArchiveTeam = React.useCallback(async () => {
        setShowMenu(false);
        const confirmed = await Modal.confirm(
            'Archive Team',
            'This will archive the team and all its associated sessions. You can restore it later from the archive. Are you sure?',
            {
                confirmText: 'Archive',
                cancelText: 'Cancel',
                destructive: false
            }
        );

        if (!confirmed) return;

        try {
            const sessionIds = getSessionIds();
            const result = await sync.archiveTeam(teamId, sessionIds);
            if (result.success) {
                Modal.alert('Success', `Team archived with ${result.archivedSessions} sessions.`);
                router.replace('/teams');
            }
        } catch (error) {
            console.error('Failed to archive team:', error);
            Modal.alert('Error', 'Failed to archive team. Please try again.');
        }
    }, [teamId, router, getSessionIds]);

    // Delete Team handler
    const handleDeleteTeam = React.useCallback(async () => {
        setShowMenu(false);
        const confirmed = await Modal.confirm(
            'Delete Team',
            'This will permanently delete the team and all its associated sessions. This action cannot be undone. Are you sure?',
            {
                confirmText: 'Delete',
                cancelText: 'Cancel',
                destructive: true
            }
        );

        if (!confirmed) return;

        try {
            const sessionIds = getSessionIds();
            const result = await sync.deleteTeam(teamId, sessionIds);
            if (result.success) {
                Modal.alert('Success', `Team deleted with ${result.deletedSessions} sessions.`);
                router.replace('/teams');
            }
        } catch (error) {
            console.error('Failed to delete team:', error);
            Modal.alert('Error', 'Failed to delete team. Please try again.');
        }
    }, [teamId, router, getSessionIds]);

    // Rename Team handler
    const handleRenameTeam = React.useCallback(async () => {
        setShowMenu(false);
        const newName = await Modal.prompt(
            'Rename Team',
            'Enter a new name for this team:',
            {
                defaultValue: artifact?.title || '',
                placeholder: 'Team name',
                confirmText: 'Rename',
                cancelText: 'Cancel'
            }
        );

        if (!newName || newName.trim() === artifact?.title) return;

        try {
            // Call server API to update body.name
            const result = await sync.renameTeam(teamId, newName.trim());
            if (result.success && artifact) {
                // Also update the artifact header title for list display
                // Server only updates body.name, we need to update header.title
                await sync.updateArtifact(
                    teamId,
                    newName.trim(),
                    artifact.body || null,
                    artifact.sessions,
                    artifact.draft,
                    artifact.type
                );
            }
        } catch (error) {
            console.error('Failed to rename team:', error);
            Modal.alert('Error', 'Failed to rename team. Please try again.');
        }
    }, [teamId, artifact]);

    // Initialize missing Team Artifact (P0 fix for teams created without artifact)
    const handleInitializeArtifact = React.useCallback(async () => {
        const confirmed = await Modal.confirm(
            'Initialize Team Board',
            'This team is missing its Kanban board data. Would you like to initialize it now?',
            {
                confirmText: 'Initialize',
                cancelText: 'Cancel',
                destructive: false
            }
        );

        if (!confirmed) return;

        setIsLoading(true);
        try {
            // Create initial board data
            const initialBoard: KanbanBoard = {
                ...DEFAULT_KANBAN_BOARD,
                tasks: [],
                team: {
                    roles: DEFAULT_TEAM_ROLES,
                    agreements: DEFAULT_TEAM_AGREEMENTS,
                    members: []
                }
            };

            // Create artifact with the existing teamId
            await sync.createArtifact(
                'Team',  // Default title
                JSON.stringify(initialBoard, null, 2),
                [],  // No sessions initially
                false,  // Not a draft
                'team',  // Type
                teamId  // Use existing teamId as artifact ID
            );

            Modal.alert('Success', 'Team board initialized successfully!');

            // Refresh the artifact
            await sync.fetchArtifactWithBody(teamId);
        } catch (error) {
            console.error('Failed to initialize team artifact:', error);
            Modal.alert('Error', 'Failed to initialize team board. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [teamId]);

    const kanbanData: KanbanBoard = React.useMemo(() => {
        const ensureColumns = (data: any): KanbanBoard => {
            const baseColumns = Array.isArray(data?.columns) && data.columns.length > 0
                ? data.columns
                : DEFAULT_KANBAN_BOARD.columns;

            const mergedColumns = [...baseColumns];
            DEFAULT_KANBAN_BOARD.columns.forEach((column) => {
                if (!mergedColumns.some((c: KanbanColumn) => c.id === column.id)) {
                    mergedColumns.push(column);
                }
            });

            const tasks = Array.isArray(data?.tasks) ? data.tasks : [];
            return { ...data, tasks, columns: mergedColumns };
        };

        if (desktopBridge) {
            return ensureColumns(desktopBoard || DEFAULT_KANBAN_BOARD);
        }
        if (!artifact?.body) return { tasks: [], columns: DEFAULT_KANBAN_BOARD.columns };
        if (parsedArtifactBoard.parseError || !parsedArtifactBoard.board) {
            console.error('Failed to parse kanban data', parsedArtifactBoard.parseError);
            return { tasks: [], columns: DEFAULT_KANBAN_BOARD.columns };
        }

        return ensureColumns(parsedArtifactBoard.board);
    }, [artifact?.body, desktopBoard, desktopBridge, parsedArtifactBoard.board, parsedArtifactBoard.parseError]);

    const sessionLookup = React.useMemo(() => {
        const map = new Map<string, (typeof allSessions)[number]>();
        for (const session of allSessions) {
            map.set(session.id, session);
        }
        return map;
    }, [allSessions]);

    const handleRecoverTeam = React.useCallback(async () => {
        setShowMenu(false);

        const teamMembers = kanbanData.team?.members ?? [];
        const recoverCandidates = teamMembers.filter((member) => {
            if (member.executionPlane === 'bypass') {
                return false;
            }
            return member.roleId !== 'supervisor' && member.roleId !== 'help-agent';
        });

        if (recoverCandidates.length === 0) {
            Modal.alert('Nothing to Recover', 'No recoverable team agents were found in this team.');
            return;
        }

        const confirmed = await Modal.confirm(
            'Recover Team',
            'This will relaunch inactive team agents using their saved identity, machine, and working directory. Active agents are skipped.',
            {
                confirmText: 'Recover',
                cancelText: 'Cancel',
                destructive: false,
            }
        );

        if (!confirmed) return;

        setIsRecoveringTeam(true);
        try {
            let recovered = 0;
            let skipped = 0;
            const issues: string[] = [];

            for (const member of recoverCandidates) {
                const label = member.displayName || member.roleId || member.sessionId.slice(0, 8);
                const session = sessionLookup.get(member.sessionId);
                const memberId = member.memberId || randomUUID();
                const sessionTag = member.sessionTag || buildTeamMemberSessionTag(teamId, memberId);
                const runtimeType = member.runtimeType === 'codex' ? 'codex' : 'claude';
                const sessionName = member.displayName || session?.metadata?.name || label;

                if (session?.active) {
                    if (!member.memberId || !member.sessionTag) {
                        await sync.addTeamMember(teamId, member.sessionId, member.roleId, sessionName, {
                            memberId,
                            sessionTag,
                            specId: member.specId,
                            parentSessionId: member.parentSessionId,
                            executionPlane: member.executionPlane,
                            runtimeType,
                        });
                    }
                    skipped += 1;
                    continue;
                }

                const machineId = session?.metadata?.machineId;
                const directory = session?.metadata?.path;
                if (!machineId) {
                    issues.push(`${label}: missing machine binding`);
                    continue;
                }
                if (!directory) {
                    issues.push(`${label}: missing working directory`);
                    continue;
                }

                const machine = allMachines.find((entry) => entry.id === machineId);
                if (!machine?.active) {
                    issues.push(`${label}: machine offline`);
                    continue;
                }

                try {
                    const recoveredSessionId = await sync.spawnSessionOnMachine(machineId, {
                        sessionId: member.sessionId,
                        sessionTag,
                        directory,
                        agent: runtimeType,
                        teamId,
                        role: member.roleId,
                        sessionName,
                        sessionPath: directory,
                        ...(member.specId ? { specId: member.specId } : {}),
                        ...(member.parentSessionId ? { parentSessionId: member.parentSessionId } : {}),
                        ...(member.executionPlane ? { executionPlane: member.executionPlane as 'mainline' | 'bypass' } : {}),
                        env: {
                            AHA_TEAM_MEMBER_ID: memberId,
                        },
                    });

                    if (!recoveredSessionId) {
                        issues.push(`${label}: spawn failed`);
                        continue;
                    }

                    await sync.addTeamMember(teamId, recoveredSessionId, member.roleId, sessionName, {
                        memberId,
                        sessionTag,
                        specId: member.specId,
                        parentSessionId: member.parentSessionId,
                        executionPlane: member.executionPlane,
                        runtimeType,
                    });
                    recovered += 1;
                } catch (error) {
                    console.error(`Failed to recover team member ${label}:`, error);
                    issues.push(`${label}: ${error instanceof Error ? error.message : 'recover failed'}`);
                }
            }

            const lines = [
                recovered > 0
                    ? `Recovered ${recovered} team agent${recovered === 1 ? '' : 's'}.`
                    : 'No team agents were recovered.',
                skipped > 0
                    ? `Skipped ${skipped} already-active agent${skipped === 1 ? '' : 's'}.`
                    : null,
                issues.length > 0
                    ? `Issues: ${issues.slice(0, 4).join(' | ')}${issues.length > 4 ? ` | +${issues.length - 4} more` : ''}`
                    : null,
            ].filter(Boolean);

            Modal.alert(recovered > 0 ? 'Recovery Started' : 'Recovery Incomplete', lines.join('\n'));
        } catch (error) {
            console.error('Failed to recover team:', error);
            Modal.alert('Error', 'Failed to recover team. Please try again.');
        } finally {
            setIsRecoveringTeam(false);
        }
    }, [allMachines, kanbanData.team?.members, sessionLookup, teamId]);

    // 🆕 Chat-Board 双向同步 Hook
    const taskChatSync = useTaskChatSync({
        teamId,
        tasks: kanbanData.tasks,
        messages: teamMessages,
        onTaskUpdate: async (taskId, updates) => {
            if (desktopBridge && roomId) {
                await desktopBridge.updateTask(taskId, updates);
                return;
            }
            if (!artifact) {
                return;
            }

            // 更新本地任务数据
            const updatedTasks = kanbanData.tasks.map(t =>
                t.id === taskId ? { ...t, ...updates, updatedAt: Date.now() } : t
            );

            const newData: KanbanBoard = {
                ...kanbanData,
                tasks: updatedTasks
            };

            await sync.updateArtifact(
                artifact.id,
                artifact.title,
                JSON.stringify(newData, null, 2),
                artifact.sessions,
                artifact.draft,
                artifact.type
            );
        },
        onMessageSend: async (message) => {
            await sync.sendTeamMessage({
                teamId,
                id: message.id,
                content: message.content,
                type: message.type,
                mentions: message.mentions,
                metadata: message.metadata,
                fromSessionId: message.fromSessionId,
                fromRole: message.fromRole,
                fromDisplayName: message.fromDisplayName,
            });

            // 更新本地消息列表
            setTeamMessages(prev => [...prev, message]);
        },
        onTaskCreate: async (taskData) => {
            if (desktopBridge && roomId) {
                const createdTask = await desktopBridge.createTask({
                    roomId,
                    title: taskData.title || 'Untitled Task',
                    description: taskData.description,
                    status: taskData.status || 'todo',
                    assigneeId: taskData.assigneeId,
                    metadata: {
                        priority: taskData.priority,
                        dueDate: taskData.dueDate,
                        tags: taskData.tags,
                        source: taskData.source || 'user',
                        approvalStatus: taskData.approvalStatus || 'approved',
                    }
                });

                return {
                    id: createdTask.id,
                    title: createdTask.title,
                    description: createdTask.description,
                    status: createdTask.status,
                    assigneeId: createdTask.assigneeId,
                    createdAt: createdTask.createdAt,
                    updatedAt: createdTask.updatedAt,
                    priority: (createdTask.metadata?.priority as KanbanTask['priority']) || taskData.priority,
                    dueDate: (createdTask.metadata?.dueDate as number | undefined) || taskData.dueDate,
                    tags: (createdTask.metadata?.tags as string[] | undefined) || taskData.tags,
                    source: (createdTask.metadata?.source as KanbanTask['source']) || (taskData.source as KanbanTask['source']) || 'user',
                    approvalStatus: (createdTask.metadata?.approvalStatus as KanbanTask['approvalStatus']) || taskData.approvalStatus || 'approved',
                } as KanbanTask;
            }

            if (!artifact) {
                throw new Error('No artifact available for task creation.');
            }
            const newTask: KanbanTask = {
                id: Math.random().toString(36).substring(2, 11),
                ...taskData,
                createdAt: Date.now(),
                updatedAt: Date.now()
            } as KanbanTask;

            const newData: KanbanBoard = {
                ...kanbanData,
                tasks: [...kanbanData.tasks, newTask]
            };

            await sync.updateArtifact(
                artifact.id,
                artifact.title,
                JSON.stringify(newData, null, 2),
                artifact.sessions,
                artifact.draft,
                artifact.type
            );

            return newTask;
        },
    });

    React.useEffect(() => {
        if (!artifact?.body || !parsedArtifactBoard.board?.team?.members?.length) {
            return;
        }

        const processStartedBySessionId = new Map<string, number>();
        for (const session of allSessions) {
            const processStartedAt = session.metadata?.processStartedAt;
            if (typeof processStartedAt === 'number') {
                processStartedBySessionId.set(session.id, processStartedAt);
            }
        }

        const { members: nextMembers, changed } = applyDerivedLifecycleTimestamps(
            parsedArtifactBoard.board.team.members,
            teamMessages,
            processStartedBySessionId,
        );

        if (!changed) {
            return;
        }

        const nextBoard: KanbanBoard = {
            ...parsedArtifactBoard.board,
            team: {
                ...parsedArtifactBoard.board.team,
                members: nextMembers,
            },
        };

        if (lifecyclePersistTimerRef.current) {
            clearTimeout(lifecyclePersistTimerRef.current);
        }

        lifecyclePersistTimerRef.current = setTimeout(() => {
            sync.updateArtifact(
                artifact.id,
                artifact.title,
                JSON.stringify(nextBoard, null, 2),
                artifact.sessions,
                artifact.draft,
                artifact.type,
            ).catch((error) => {
                console.error('Failed to persist derived team lifecycle timestamps:', error);
            }).finally(() => {
                lifecyclePersistTimerRef.current = null;
            });
        }, 250);

        return () => {
            if (lifecyclePersistTimerRef.current) {
                clearTimeout(lifecyclePersistTimerRef.current);
                lifecyclePersistTimerRef.current = null;
            }
        };
    }, [
        artifact,
        allSessions,
        parsedArtifactBoard.board,
        teamMessages,
    ]);

    const normalizeStatus = React.useCallback((status: string): string => {
        const statusMap: Record<string, string> = {
            'in_progress': 'in-progress',
            'inprogress': 'in-progress',
            'InProgress': 'in-progress',
            'IN_PROGRESS': 'in-progress',
            'todo': 'todo',
            'review': 'review',
            'blocked': 'blocked',
            'done': 'done'
        };
        return statusMap[status] || (status ? status.toLowerCase() : 'todo');
    }, []);

    const handleAddTask = React.useCallback((status: string) => {
        setNewTaskStatus(status);
        setShowNewTaskModal(true);
    }, []);

    const handleDeleteTask = React.useCallback(async (taskId: string) => {
        const task = kanbanData.tasks.find((entry) => entry.id === taskId);
        if (!task) {
            return;
        }

        const confirmed = await Modal.confirm(
            'Delete Task',
            `Delete "${task.title}"?`,
            { confirmText: 'Delete', destructive: true }
        );

        if (!confirmed) {
            return;
        }

        if (desktopBridge) {
            await desktopBridge.removeTask(taskId);
        } else if (artifact) {
            const newData: KanbanBoard = {
                ...kanbanData,
                tasks: kanbanData.tasks.filter((entry) => entry.id !== taskId)
            };

            await sync.updateArtifact(
                artifact.id,
                artifact.title,
                JSON.stringify(newData, null, 2),
                artifact.sessions,
                artifact.draft,
                artifact.type
            );
        }

        const message = {
            id: randomUUID(),
            teamId,
            fromDisplayName: myDisplayName || '用户',
            content: `${myDisplayName || '用户'} 删除了任务：**${task.title}**`,
            type: 'notification' as const,
            timestamp: Date.now(),
            metadata: {
                taskId,
                _action: 'deleted',
            },
            shortContent: `任务已删除: ${task.title}`,
        };

        await sync.sendTeamMessage(message);
        setTeamMessages((previous) => [...previous, message]);
        setShowTaskDetail(false);
    }, [artifact, desktopBridge, kanbanData, myDisplayName, teamId]);

    const handleMoveTask = async (task: KanbanTask) => {
        const normalized = normalizeStatus(task.status);
        const nextStatus = {
            'todo': 'in-progress',
            'in-progress': 'review',
            'review': 'done',
            'blocked': 'in-progress',
            'done': 'todo'
        }[normalized] || 'todo';

        // 🆕 使用 Chat-Board 同步功能：自动发送通知到聊天
        try {
            await taskChatSync.updateTaskWithSync(
                task.id,
                { status: nextStatus },
                myDisplayName || '用户'
            );

            trackTaskMoved(task.id, teamId, normalized, nextStatus);
            if (nextStatus === 'done') {
                trackTaskCompleted(task.id, teamId);
            }

            // 🆕 Phase 2: 同步状态到 Todo（如果有链接）
            if (task.todoId) {
                const auth = getCurrentAuth();
                if (auth?.credentials) {
                    syncKanbanStatusToTodo(auth.credentials, task.id, nextStatus).catch(err => {
                        console.error('Failed to sync Kanban status to Todo:', err);
                    });
                }
            }
        } catch (error) {
            console.error('Failed to sync task update:', error);
            // 即使同步失败，任务状态更新仍然会进行（在 updateTaskWithSync 中）
        }
    };

    const roleDefinitions = kanbanData.team?.roles?.length ? kanbanData.team.roles : DEFAULT_TEAM_ROLES;
    const agreements = kanbanData.team?.agreements ?? DEFAULT_TEAM_AGREEMENTS;

    const roster = React.useMemo(() => {
        const members = kanbanData.team?.members ?? [];
        const assignedIds = new Set(members.map(m => m.sessionId));

        const memberMap = new Map(members.map(m => [m.sessionId, m]));
        // Only show actual team members from artifact.sessions and team.members
        // Don't auto-add the viewing user - they should be added explicitly via the API
        const allSessionIds = Array.from(new Set([
            ...(artifact?.sessions ?? []),
            ...assignedIds
        ]));

        const entries = allSessionIds.map((sessionId, index) => {
            const session = sessionLookup.get(sessionId);
            const existingMember = memberMap.get(sessionId);

            // Create member with proper displayName for mentions functionality
            const member = existingMember || {
                sessionId,
                roleId: '',
                displayName: session?.metadata?.name || session?.metadata?.host || sessionId,
                focusAreas: []
            };

            // Ensure displayName is set for mentions functionality
            if (!member.displayName) {
                member.displayName = session?.metadata?.name || session?.metadata?.host || sessionId;
            }
            const effectiveRoleId = member.roleId || session?.metadata?.role;

            const role = roleDefinitions.find((entry) =>
                entry.id === effectiveRoleId ||
                entry.title.toLowerCase() === effectiveRoleId?.toLowerCase()
            );

            // Find tasks assigned to this member
            const tasks = kanbanData.tasks.filter(t => t.assigneeId === sessionId);
            const activeTask = getActiveTaskForSession(kanbanData.tasks, sessionId);

            return { member, session, role, index, tasks, activeTask };
        });

        // Stable sort: role priority first (master/orchestrator → coordinator → worker → bypass),
        // then insertion order (index). Never sort by activity time.
        const ROLE_PRIORITY: Record<string, number> = {
            master: 0, orchestrator: 0,
            architect: 1, 'solution-architect': 1,
            implementer: 2, builder: 2, framer: 2,
            'qa-engineer': 3, qa: 3, reviewer: 3,
            researcher: 4, scout: 4,
            supervisor: 99, 'help-agent': 99, 'org-manager': 100,
        };
        return entries.sort((a, b) => {
            // Terminated (inactive) agents always go to the bottom
            const aDead = a.session && !a.session.active ? 1 : 0;
            const bDead = b.session && !b.session.active ? 1 : 0;
            if (aDead !== bDead) return aDead - bDead;
            const pa = ROLE_PRIORITY[a.member.roleId || a.session?.metadata?.role || ''] ?? 5;
            const pb = ROLE_PRIORITY[b.member.roleId || b.session?.metadata?.role || ''] ?? 5;
            if (pa !== pb) return pa - pb;
            return a.index - b.index; // stable: preserve insertion order within same role tier
        });
    }, [kanbanData.team?.members, artifact?.sessions, sessionLookup, roleDefinitions, kanbanData.tasks]);

    // 🆕 Discuss 按钮处理函数：切换到 Chat 并预填 @mention 草稿
    const handleDiscussTask = React.useCallback((task: KanbanTask) => {
        const assigneeEntry = task.assigneeId
            ? roster.find((entry) => entry.member.sessionId === task.assigneeId)
            : null;
        const masterEntry = roster.find((entry) => {
            const roleId = entry.role?.id || entry.member.roleId || entry.session?.metadata?.role;
            return roleId === 'master';
        });

        const mentionTarget = assigneeEntry
            ? (assigneeEntry.role?.id || assigneeEntry.member.roleId || assigneeEntry.member.displayName || 'master')
            : (masterEntry?.role?.id || masterEntry?.member.roleId || 'master');

        const mentionText = `@${String(mentionTarget).replace(/\s+/g, '-')}`;
        const draft = `${mentionText} Let's discuss ${formatTaskReference(task)} (${task.title}) `;

        setShowTaskDetail(false);
        selectTab('chat');
        setChatComposerPrefill({
            text: draft,
            token: Date.now(),
        });
    }, [roster, selectTab]);

    const timelineEvents = React.useMemo(() => {
        return [...kanbanData.tasks]
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .map(task => {
                const assignee = roster.find(r => r.member.sessionId === task.assigneeId);
                return { task, assignee };
            });
    }, [kanbanData.tasks, roster]);

    // 🆕 Filter out pending tasks (only show approved tasks on board)
    const approvedTasks = React.useMemo(() => {
        return kanbanData.tasks.filter(task => !taskNeedsApproval(task));
    }, [kanbanData.tasks]);

    // 🆕 Pending tasks for approval UI
    const pendingTasks = React.useMemo(() => {
        return kanbanData.tasks.filter(task => taskNeedsApproval(task));
    }, [kanbanData.tasks]);

    const onlineCount = React.useMemo(() => {
        return roster.filter((entry) => entry.session?.active).length;
    }, [roster]);

    const statusSummary = React.useMemo(() => {
        const reviewCount = approvedTasks.filter((task) => normalizeStatus(task.status) === 'review').length;
        const workingCount = approvedTasks.filter((task) => {
            const status = normalizeStatus(task.status);
            return status === 'todo' || status === 'in-progress' || status === 'blocked';
        }).length;

        return {
            decision: pendingTasks.length || undefined,
            working: workingCount || undefined,
            review: reviewCount || undefined,
        };
    }, [approvedTasks, normalizeStatus, pendingTasks.length]);

    const recentConversations = React.useMemo(() => {
        const deduped = new Set<string>();
        const rows: {
            id: string;
            name: string;
            lastMessage: string;
            time: string;
            avatarColor: string;
            avatarLabel: string;
            unreadCount?: number;
        }[] = [];

        [...teamMessages]
            .sort((a, b) => b.timestamp - a.timestamp)
            .forEach((message) => {
                if (message.type === 'system') {
                    return;
                }

                const key = message.fromSessionId || message.fromDisplayName || message.id;
                if (deduped.has(key) || rows.length >= 4) {
                    return;
                }

                deduped.add(key);

                const name = message.fromDisplayName || message.fromRole || 'Teammate';
                rows.push({
                    id: key,
                    name,
                    lastMessage: getMessagePreview(message),
                    time: formatShellTime(message.timestamp),
                    avatarColor: SHELL_CONVERSATION_COLORS[rows.length % SHELL_CONVERSATION_COLORS.length],
                    avatarLabel: name.slice(0, 1).toUpperCase(),
                    unreadCount: message.type === 'notification' ? 1 : undefined,
                });
            });

        if (rows.length === 0) {
            rows.push({
                id: `team-${teamId}`,
                name: artifact?.title || desktopRoom?.name || 'Team',
                lastMessage: 'Open the team room and start coordinating work.',
                time: '',
                avatarColor: SHELL_CONVERSATION_COLORS[0],
                avatarLabel: (artifact?.title || desktopRoom?.name || 'T').slice(0, 1).toUpperCase(),
            });
        }

        return rows;
    }, [artifact?.title, desktopRoom?.name, teamId, teamMessages]);

    React.useEffect(() => {
        if (!selectedAgentId && roster.length > 0) {
            setSelectedAgentId(roster[0].member.sessionId);
        }
    }, [roster, selectedAgentId]);

    React.useEffect(() => {
        if (!selectedConversationId && recentConversations.length > 0) {
            setSelectedConversationId(recentConversations[0].id);
        }
    }, [recentConversations, selectedConversationId]);

    // Derive the current user's role title from the roster for the sidebar header
    const myRoleTitle = React.useMemo(() => {
        const myEntry = roster.find(r => {
            const role = r.session?.metadata?.role;
            return !role || role === 'user';
        });
        return myEntry?.role?.title || 'Team Member';
    }, [roster]);

    const matchesColumn = React.useCallback((task: KanbanTask, columnId: string) => {
        return normalizeStatus(task.status) === columnId;
    }, [normalizeStatus]);

    // 🆕 计算每个任务的linked sessions
    const taskSessionLinks = React.useMemo(() => {
        const links = new Map<string, { sessionId: string; title: string; linkedAt: number }[]>();

        kanbanData.tasks.forEach(task => {
            const sessions = getSessionsForTask(task.id);
            links.set(task.id, sessions);
        });

        return links;
    }, [kanbanData.tasks]);

    const isMissingDesktopRoom = !!desktopBridge && !desktopRoom;
    const isMissingDesktopBoard = !!desktopBridge && !!desktopRoom && !desktopBoard;
    const isMissingArtifact = !desktopBridge && !artifact;
    const isArtifactParseError = !desktopBridge && !!artifact?.body && !!parsedArtifactBoard.parseError;
    const isAuthMissing = !desktopBridge && !isAuthenticated;
    const shouldShowBoardFallback = isAuthMissing || isMissingDesktopRoom || isMissingDesktopBoard || isMissingArtifact || isArtifactParseError;
    const fallbackTitle = isAuthMissing
        ? 'Authentication Required'
        : isArtifactParseError
        ? 'Team Board Failed to Load'
        : isMissingDesktopRoom
            ? 'Team Room Not Found'
            : 'Team Board Not Found';
    const fallbackDescription = isAuthMissing
        ? 'This browser session does not currently have valid credentials. Sign in or restore your account before opening team boards.'
        : isArtifactParseError
        ? 'This team exists, but its board data could not be parsed. Fix the stored board payload before continuing.'
        : isMissingDesktopRoom
            ? 'This team route opened without a valid collaboration room. Re-open the team from the teams list or recreate its desktop room binding.'
            : isMissingDesktopBoard
                ? 'This team room exists, but no board is attached to it yet.'
                : 'This team doesn\'t have a Kanban board yet. Initialize one to start tracking tasks.';

    const renderKanban = () => (
        <>
            {/* 三信号状态面板 — 运行中 / 等待介入 / 异常告警 */}
            <TeamStatusBar
                tasks={kanbanData.tasks}
                onSignalPress={(signal) => {
                    if (signal === 'deciding') {
                        setShowApprovalModal(true);
                    }
                }}
            />

            <View style={styles.boardContainer}>
                    {kanbanData.columns.map(column => (
                        <View key={column.id} style={styles.column}>
                            <View style={styles.columnHeader}>
                                <Text style={styles.columnTitle}>{column.title}</Text>
                                <Text style={styles.taskCount}>
                                    {approvedTasks.filter(t => matchesColumn(t, column.id)).length}
                                </Text>
                            </View>

                            <ScrollView contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
                                {approvedTasks
                                    .filter(t => matchesColumn(t, column.id))
                                .map(task => {
                                    const linkedSessions = taskSessionLinks.get(task.id) || [];
                                    const sessionCount = linkedSessions.length;
                                    const activeLink = task.executionLinks?.find(l => l.status === 'active');
                                    const activeAgentSession = activeLink ? sessionLookup.get(activeLink.sessionId) : null;
                                    const activeAgentName = activeAgentSession
                                        ? getSessionName(activeAgentSession)
                                        : activeLink?.sessionId?.slice(0, 8) ?? null;

                                    return (
                                    <Pressable
                                        key={task.id}
                                        style={styles.taskCard}
                                        onPress={() => {
                                            setSelectedTask(task);
                                            setShowTaskDetail(true);
                                        }}
                                        onLongPress={() => handleMoveTask(task)}
                                    >
                                        <Text style={styles.taskTitle}>{task.title}</Text>
                                        {task.assigneeId && (() => {
                                            const session = sessionLookup.get(task.assigneeId);
                                            const name = session ? getSessionName(session) : task.assigneeId.slice(0, 8);
                                            return (
                                                <Text style={styles.taskAssignee}>@{name}</Text>
                                            );
                                        })()}

                                        {/* 🆕 Linked sessions 显示 */}
                                        {(sessionCount > 0 || task.priority || activeAgentName) && (
                                            <View style={styles.taskMeta}>
                                                {activeAgentName && (
                                                    <View style={styles.taskActiveExecution}>
                                                        <Ionicons name="flash" size={11} color="#FF9500" />
                                                        <Text style={styles.taskActiveExecutionText}>{activeAgentName}</Text>
                                                    </View>
                                                )}
                                                {sessionCount > 0 && (
                                                    <View style={styles.taskSessionsLink}>
                                                        <Ionicons
                                                            name="chatbubble-outline"
                                                            size={14}
                                                            color={theme.colors.textSecondary}
                                                            style={styles.taskSessionsIcon}
                                                        />
                                                        <Text style={styles.taskSessionsText}>
                                                            {sessionCount} {sessionCount === 1 ? 'session' : 'sessions'}
                                                        </Text>
                                                    </View>
                                                )}
                                                {task.priority && (
                                                    <View style={[
                                                        styles.taskPriority,
                                                        {
                                                            backgroundColor: task.priority === 'high' || task.priority === 'urgent'
                                                                ? withAlpha(theme.colors.textDestructive, 0.125)
                                                                : task.priority === 'medium'
                                                                ? withAlpha(theme.colors.warning, 0.125)
                                                                : withAlpha(theme.colors.success, 0.125)
                                                        }
                                                    ]}>
                                                        <Text style={[
                                                            styles.taskSessionsText,
                                                            {
                                                                color: task.priority === 'high' || task.priority === 'urgent'
                                                                    ? theme.colors.textDestructive
                                                                    : task.priority === 'medium'
                                                                    ? theme.colors.warning
                                                                    : theme.colors.success
                                                            }
                                                        ]}>
                                                            {task.priority}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        )}
                                    </Pressable>
                                );
                                })}

                            <Pressable
                                style={styles.addTaskButton}
                                onPress={() => handleAddTask(column.id)}
                            >
                                <Ionicons name="add" size={16} color={theme.colors.textSecondary} />
                                <Text style={styles.addTaskText}>Add Task</Text>
                            </Pressable>
                        </ScrollView>
                    </View>
                ))}
            </View>
        </>
    );

    const renderInfo = () => (
        <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Team Information</Text>
                <View style={styles.roleCard}>
                    <Text style={styles.roleTitle}>Goal</Text>
                    <Text style={styles.roleSummary}>
                        {(kanbanData.team as any)?.goal || (kanbanData.team as any)?.mission || 'No goal set'}
                    </Text>
                </View>

                <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Agreements</Text>
                <View style={styles.roleCard}>
                    <Text style={styles.roleTitle}>Status Updates</Text>
                    <Text style={styles.roleSummary}>{agreements.statusUpdates}</Text>
                </View>
                <View style={styles.roleCard}>
                    <Text style={styles.roleTitle}>Handoffs</Text>
                    <Text style={styles.roleSummary}>{agreements.handoffs}</Text>
                </View>
                <View style={styles.roleCard}>
                    <Text style={styles.roleTitle}>Escalation</Text>
                    <Text style={styles.roleSummary}>{agreements.escalation}</Text>
                </View>
                <View style={styles.roleCard}>
                    <Text style={styles.roleTitle}>Definition of Done</Text>
                    <Text style={styles.roleSummary}>{agreements.definitionOfDone}</Text>
                </View>
            </View>
        </ScrollView>
    );

    const renderChat = () => {
        // Try to find current user's session in roster
        // Look for a session that doesn't have an agent role (agents have roles like 'master', 'builder', etc.)
        const myMember = roster.find(r => {
            const session = r.session;
            if (!session) return false;
            const role = session.metadata?.role;
            // Sessions without a role or with 'user' role are likely user sessions
            return !role || role === 'user';
        });

        // CRITICAL: Use sync.anonID as fallback if not found in roster
        // This ensures the user can participate in chat even before they're formally added as a member
        const mySessionId = myMember?.member.sessionId || sync.anonID;

        return (
            <View style={{ flex: 1 }}>
                <TeamChatRoom
                    teamId={teamId}
                    teamName={artifact?.title || desktopRoom?.name || 'Team'}
                    mySessionId={mySessionId}
                    myRole="user"
                    myDisplayName={myDisplayName}
                    members={roster}
                    returnTo={teamReturnTo}
                    messages={teamMessages}
                    onMessagesChange={setTeamMessages}
                    taskChatSync={taskChatSync}
                    composerPrefill={chatComposerPrefill}
                    variant={isDesktopShell ? 'edzlf' : 'default'}
                    fallbackMachineId={allMachines.find(m => m.active)?.id}
                />
            </View>
        );
    };

    const workspaceSidebar = (
        <FloatingIslandSidebar
            variant={shellVariant}
            header={{
                title: myDisplayName,
                subtitle: `${myRoleTitle} · Online`,
                iconLabel: myDisplayName.slice(0, 1).toUpperCase(),
                iconGradientColors: ['#314658', '#1E2D3C'],
                trailingIcon: 'chevron-down',
            }}
            agentItems={roster.map((entry) => {
                const presence = entry.session
                    ? getAgentPresenceVisual(entry.session)
                    : { dotColor: '#8A7F74', inactive: true, dead: false };
                const runtimeLabel = entry.member.runtimeType ? entry.member.runtimeType : undefined;
                const roleLabel = entry.role?.title || entry.member.roleId || entry.session?.metadata?.role || '';
                return {
                    id: entry.member.sessionId,
                    name: entry.role?.title || entry.member.displayName || entry.session?.metadata?.name || entry.member.sessionId,
                    dotColor: presence.dotColor,
                    inactive: presence.inactive,
                    dead: presence.dead,
                    description: [roleLabel, runtimeLabel].filter(Boolean).join(' · '),
                    selected: selectedAgentId === entry.member.sessionId,
                    activeTaskTitle: entry.activeTask?.title,
                    activeTaskStartedAt: entry.activeTask?.startedAt,
                    count: selectedAgentId === entry.member.sessionId
                        ? entry.tasks.length
                        : entry.tasks.length > 0 ? entry.tasks.length : undefined,
                onPress: () => {
                    setShowWorkspaceDrawer(false);
                    setSelectedAgentId(entry.member.sessionId);
                    pushSessionRoute(router, {
                        id: entry.member.sessionId,
                        teamId,
                        teamName: artifact?.title || desktopRoom?.name || 'Team',
                        roleName: entry.session?.metadata?.role || entry.role?.id || '',
                        returnTo: teamReturnTo,
                    });
                },
                };
            })}
            statusItems={[
                {
                    id: 'decision',
                    icon: 'radio-button-on',
                    label: 'Needs Decision',
                    color: '#FF3B30',
                    backgroundColor: '#FF3B300D',
                    count: statusSummary.decision,
                },
                {
                    id: 'working',
                    icon: 'pulse',
                    label: 'Working',
                    color: '#FF9500',
                    backgroundColor: '#FF950012',
                    count: statusSummary.working,
                },
                {
                    id: 'review',
                    icon: 'people',
                    label: 'Team Review',
                    color: '#8A7F74',
                    backgroundColor: '#00000000',
                    count: statusSummary.review,
                },
            ]}
            conversationItems={allTeams.map((team, index) => ({
                id: team.id,
                name: team.title || 'Team',
                lastMessage: '',
                time: '',
                avatarColor: SHELL_CONVERSATION_COLORS[index % SHELL_CONVERSATION_COLORS.length],
                avatarLabel: (team.title || 'T').slice(0, 1).toUpperCase(),
                selected: team.id === teamId,
                onPress: () => {
                    setShowWorkspaceDrawer(false);
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

    const boardFallbackPanel = (
        <View style={styles.loadingContainer}>
            {((isMissingDesktopRoom && !desktopRoom && !collaborationState) || isLoading) ? (
                <ActivityIndicator size="large" />
            ) : (
                <View style={{ alignItems: 'center', padding: 20 }}>
                    <Ionicons name="alert-circle-outline" size={48} color={theme.colors.textSecondary} />
                    <Text style={[styles.title, { marginTop: 16, textAlign: 'center' }]}>
                        {fallbackTitle}
                    </Text>
                    <Text style={[styles.subtitle, { marginTop: 8, textAlign: 'center', maxWidth: 300 }]}>
                        {fallbackDescription}
                    </Text>
                    {!desktopBridge && !isArtifactParseError && !isAuthMissing ? (
                        <Pressable
                            style={{
                                marginTop: 20,
                                backgroundColor: theme.colors.button.primary.background,
                                paddingHorizontal: 24,
                                paddingVertical: 12,
                                borderRadius: 8
                            }}
                            onPress={handleInitializeArtifact}
                        >
                            <Text style={{ color: theme.colors.button.primary.tint, fontWeight: '600' }}>
                                Initialize Board
                            </Text>
                        </Pressable>
                    ) : null}
                </View>
            )}
        </View>
    );

    const desktopMainPanel = (
        <>
            <View
                style={[
                    styles.desktopPanelHeader,
                    { backgroundColor: 'rgba(242,246,248,0.82)' },
                ]}
            >
                <View style={styles.desktopHeaderTopRow}>
                    <View style={styles.desktopTabsRow}>
                        {SHELL_TABS.map((tab) => {
                            const isActive = activeTab === tab.id;
                            return (
                                <Pressable
                                    key={tab.id}
                                    onPress={() => {
                                        selectTab(tab.id);
                                        setShowMenu(false);
                                    }}
                                    style={[
                                        styles.desktopTab,
                                        isActive && styles.desktopTabActive,
                                    ]}
                                >
                                    {isActive ? (
                                        <LinearGradient
                                            colors={['#FFFFFF', '#EDF3F7']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 0, y: 1 }}
                                            style={{
                                                ...StyleSheet.absoluteFillObject as object,
                                                borderRadius: 999,
                                            }}
                                        />
                                    ) : null}
                                    <Text
                                        style={[
                                            styles.desktopTabText,
                                            {
                                                color: isActive ? '#233648' : '#92A1AF',
                                                fontWeight: isActive ? '600' : 'normal',
                                            },
                                        ]}
                                    >
                                        {tab.label}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>
                    <View style={{ flex: 1 }} />
                    <Pressable
                        onPress={() => setShowMenu((previous) => !previous)}
                    >
                        <Ionicons name="ellipsis-horizontal" size={20} color="#98A8B5" />
                    </Pressable>
                </View>
                {showMenu ? (
                    <View
                        style={[
                            styles.desktopMenu,
                            {
                                backgroundColor: '#F8FBFDEB',
                                borderColor: shellTheme.panelBorder,
                            },
                        ]}
                    >
                        <Pressable onPress={handleRenameTeam} style={styles.desktopMenuItem}>
                            <Ionicons name="pencil-outline" size={17} color={shellTheme.panelTitle} />
                            <Text style={{ color: shellTheme.panelTitle, fontSize: 14 }}>Rename</Text>
                        </Pressable>
                        <View style={[styles.desktopMenuDivider, { backgroundColor: shellTheme.panelDivider }]} />
                        <Pressable onPress={handleRecoverTeam} style={styles.desktopMenuItem} disabled={isRecoveringTeam}>
                            <Ionicons name="refresh-outline" size={17} color={shellTheme.panelTitle} />
                            <Text style={{ color: shellTheme.panelTitle, fontSize: 14 }}>
                                {isRecoveringTeam ? 'Recovering…' : 'Recover'}
                            </Text>
                        </Pressable>
                        <View style={[styles.desktopMenuDivider, { backgroundColor: shellTheme.panelDivider }]} />
                        <Pressable onPress={handleArchiveTeam} style={styles.desktopMenuItem}>
                            <Ionicons name="archive-outline" size={17} color={shellTheme.panelTitle} />
                            <Text style={{ color: shellTheme.panelTitle, fontSize: 14 }}>Archive</Text>
                        </Pressable>
                        <View style={[styles.desktopMenuDivider, { backgroundColor: shellTheme.panelDivider }]} />
                        <Pressable onPress={handleDeleteTeam} style={styles.desktopMenuItem}>
                            <Ionicons name="trash-outline" size={17} color={theme.colors.textDestructive} />
                            <Text style={{ color: theme.colors.textDestructive, fontSize: 14 }}>Delete</Text>
                        </Pressable>
                    </View>
                ) : null}
            </View>
            <View style={styles.desktopPanelBody}>
                {shouldShowBoardFallback ? (
                    boardFallbackPanel
                ) : (
                    <>
                        {activeTab === 'chat' && renderChat()}
                        {activeTab === 'board' && renderKanban()}
                        {activeTab === 'info' && renderInfo()}
                        {activeTab === 'evolution' && <EvolutionSection teamId={teamId} />}
                    </>
                )}
                <TaskDetailModal
                    visible={showTaskDetail}
                    contained={true}
                    task={selectedTask}
                    columns={kanbanData.columns}
                    onClose={() => setShowTaskDetail(false)}
                    onDiscuss={handleDiscussTask}
                    onDelete={handleDeleteTask}
                    onSave={async (taskId, updates) => {
                        await taskChatSync.updateTaskWithSync(taskId, updates, myDisplayName || '用户');
                        setShowTaskDetail(false);
                    }}
                    allSessions={allSessions}
                />
                <NewTaskModal
                    visible={showNewTaskModal}
                    contained={true}
                    columns={kanbanData.columns}
                    initialStatus={newTaskStatus}
                    onClose={() => setShowNewTaskModal(false)}
                    onCreate={async (taskInput) => {
                        await taskChatSync.createTaskWithSync(taskInput, myDisplayName || '用户');
                    }}
                />
            </View>
        </>
    );

    const desktopShell = (
        <SidebarView
            secondaryPanel={workspaceSidebar}
            mainPanel={desktopMainPanel}
        />
    );

    const mobileWorkspaceDrawer = (
        <>
            <Pressable
                style={styles.mobileWorkspaceBackdrop}
                onPress={() => setShowWorkspaceDrawer(false)}
            />
            <View
                style={[
                    styles.mobileWorkspacePanel,
                    { width: Math.min(360, width - 24) }
                ]}
            >
                {workspaceSidebar}
            </View>
        </>
    );

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: !isDesktopShell,
                    headerTitle: (desktopBridge ? desktopRoom?.name : artifact?.title) || 'Team Dashboard',
                    headerRight: () => (
                        <Pressable
                            onPress={() => setShowMenu(!showMenu)}
                            hitSlop={10}
                            style={{ padding: 8 }}
                        >
                            <Ionicons name="ellipsis-horizontal" size={24} color={theme.colors.text} />
                        </Pressable>
                    ),
                }}
            />
            {!isDesktopShell && showMenu && (
                <>
                    <Pressable
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 999,
                        }}
                        onPress={() => setShowMenu(false)}
                    />
                    <View style={{
                        position: 'absolute',
                        top: 50,
                        right: 8,
                        backgroundColor: theme.colors.surface,
                        borderRadius: 12,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.15,
                        shadowRadius: 12,
                        elevation: 8,
                        minWidth: 180,
                        borderWidth: 1,
                        borderColor: theme.colors.divider,
                        zIndex: 1000,
                    }}>
                        <Pressable
                            onPress={handleRenameTeam}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                padding: 14,
                                borderBottomWidth: 1,
                                borderBottomColor: theme.colors.divider,
                            }}
                        >
                            <Ionicons name="pencil-outline" size={18} color={theme.colors.text} style={{ marginRight: 12 }} />
                            <Text style={{ fontSize: 15, color: theme.colors.text }}>Rename</Text>
                        </Pressable>
                        <Pressable
                            onPress={handleRecoverTeam}
                            disabled={isRecoveringTeam}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                padding: 14,
                                borderBottomWidth: 1,
                                borderBottomColor: theme.colors.divider,
                                opacity: isRecoveringTeam ? 0.6 : 1,
                            }}
                        >
                            <Ionicons name="refresh-outline" size={18} color={theme.colors.text} style={{ marginRight: 12 }} />
                            <Text style={{ fontSize: 15, color: theme.colors.text }}>
                                {isRecoveringTeam ? 'Recovering…' : 'Recover'}
                            </Text>
                        </Pressable>
                        <Pressable
                            onPress={handleArchiveTeam}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                padding: 14,
                                borderBottomWidth: 1,
                                borderBottomColor: theme.colors.divider,
                            }}
                        >
                            <Ionicons name="archive-outline" size={18} color={theme.colors.text} style={{ marginRight: 12 }} />
                            <Text style={{ fontSize: 15, color: theme.colors.text }}>Archive</Text>
                        </Pressable>
                        <Pressable
                            onPress={handleDeleteTeam}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                padding: 14,
                            }}
                        >
                            <Ionicons name="trash-outline" size={18} color={theme.colors.textDestructive} style={{ marginRight: 12 }} />
                            <Text style={{ fontSize: 15, color: theme.colors.textDestructive }}>Delete</Text>
                        </Pressable>
                    </View>
                </>
            )}
            {isDesktopShell ? (
                desktopShell
            ) : (
                <View style={styles.container}>
                    <View style={styles.header}>
                        <View style={styles.mobileHeaderTopRow}>
                            <Pressable
                                style={styles.mobileWorkspaceButton}
                                onPress={() => {
                                    setShowWorkspaceDrawer((previous) => !previous);
                                    setShowMenu(false);
                                }}
                            >
                                <Ionicons name="layers-outline" size={18} color={theme.colors.text} />
                                <View style={styles.mobileWorkspaceCopy}>
                                    <Text style={styles.mobileWorkspaceTitle} numberOfLines={1}>
                                        {artifact?.title || desktopRoom?.name || 'Workspace'}
                                    </Text>
                                    <Text style={styles.mobileWorkspaceSubtitle} numberOfLines={1}>
                                        {onlineCount} online · {roster.length} agents · {allTeams.length} teams
                                    </Text>
                                </View>
                                <Ionicons
                                    name={showWorkspaceDrawer ? 'chevron-up' : 'chevron-down'}
                                    size={16}
                                    color={theme.colors.textSecondary}
                                />
                            </Pressable>
                            <Pressable
                                style={styles.mobileHeaderIconButton}
                                onPress={() => {
                                    setShowMenu(!showMenu);
                                    setShowWorkspaceDrawer(false);
                                }}
                            >
                                <Ionicons name="ellipsis-horizontal" size={18} color={theme.colors.text} />
                            </Pressable>
                        </View>
                        <View style={{ flexDirection: 'row', backgroundColor: theme.colors.groupped.background, borderRadius: 12, padding: 4 }}>
                            {(['chat', 'board', 'info', 'evolution'] as const).map((tab) => (
                                <Pressable
                                    key={tab}
                                    onPress={() => selectTab(tab)}
                                    style={{
                                        flex: 1,
                                        paddingVertical: 8,
                                        alignItems: 'center',
                                        borderRadius: 8,
                                        backgroundColor: activeTab === tab ? theme.colors.surface : 'transparent',
                                        shadowColor: activeTab === tab ? '#000' : 'transparent',
                                        shadowOffset: { width: 0, height: 1 },
                                        shadowOpacity: activeTab === tab ? 0.1 : 0,
                                        shadowRadius: 2,
                                    }}
                                >
                                    <Text style={{
                                        fontSize: 14,
                                        fontWeight: '600',
                                        color: activeTab === tab ? theme.colors.text : theme.colors.textSecondary,
                                        textTransform: 'capitalize',
                                    }}>
                                        {tab}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>

                    {shouldShowBoardFallback ? (
                        boardFallbackPanel
                    ) : (
                        <>
                            {activeTab === 'chat' && renderChat()}
                            {activeTab === 'board' && renderKanban()}
                            {activeTab === 'info' && renderInfo()}
                            {activeTab === 'evolution' && <EvolutionSection teamId={teamId} />}
                        </>
                    )}
                </View>
            )}

            {!isDesktopShell && showWorkspaceDrawer && mobileWorkspaceDrawer}

            {/* 🆕 任务详情弹窗 (mobile only — desktop uses contained modal inside main panel) */}
            {!isDesktopShell && (
                <>
                    <TaskDetailModal
                        visible={showTaskDetail}
                        task={selectedTask}
                        columns={kanbanData.columns}
                        onClose={() => setShowTaskDetail(false)}
                        onDiscuss={handleDiscussTask}
                        onDelete={handleDeleteTask}
                        onSave={async (taskId, updates) => {
                            // 使用 taskChatSync 更新任务，会自动发送通知
                            await taskChatSync.updateTaskWithSync(taskId, updates, myDisplayName || '用户');
                            setShowTaskDetail(false);
                        }}
                        allSessions={allSessions}
                    />
                    <NewTaskModal
                        visible={showNewTaskModal}
                        columns={kanbanData.columns}
                        initialStatus={newTaskStatus}
                        onClose={() => setShowNewTaskModal(false)}
                        onCreate={async (taskInput) => {
                            await taskChatSync.createTaskWithSync(taskInput, myDisplayName || '用户');
                        }}
                    />
                </>
            )}

            {/* 🆕 任务审批弹窗 */}
            <TaskApprovalModal
                visible={showApprovalModal}
                onClose={() => setShowApprovalModal(false)}
                pendingTasks={pendingTasks}
                teamId={teamId}
                onTaskApproved={(task) => {
                    console.log('Task approved:', task.title);
                }}
                onTaskRejected={(task, reason) => {
                    console.log('Task rejected:', task.title, 'Reason:', reason);
                }}
            />
        </>
    );
}
