import React from 'react';
import { View, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { Text } from '@/components/StyledText';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { useArtifact, useAllSessions, useProfile, useIsDataReady, useArtifacts } from '@/sync/storage';
import { sync } from '@/sync/sync';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
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
import TeamChatRoom from '@/components/TeamChatRoom';
import { TaskDetailModal } from '@/components/TaskDetailModal';
import { TaskApprovalModal } from '@/components/TaskApprovalModal';
import { RoleStats } from '@/components/roles/RoleStats';
import { useTaskChatSync } from '@/hooks/useTaskChatSync';
import type { TeamMessage } from '@/sync/teamMessageTypes';
import { getSessionsForTask } from '@/-zen/model/taskSessionLink';
import Color from 'color';
import { syncKanbanStatusToTodo } from '@/-zen/model/ops';
import { getCurrentAuth } from '@/auth/AuthContext';
import { getRoleModelConfig, getModelLabel } from '@/team-config/i18n';
import { taskNeedsApproval } from '@/utils/taskHelpers';
import RalphControlPanel, { RalphLoopState } from '@/components/RalphControlPanel';
import { useAuth } from '@/auth/AuthContext';
import { AgentManagementModal } from '@/components/AgentManagementModal';
import {
    fetchRolePool,
    fetchRoleReviews,
    fetchTeamReviews,
    fetchTeamScore,
    submitRoleReview,
    submitTeamReview,
    PublicRole,
    RoleReview,
    TeamReview,
    TeamScorecard,
} from '@/sync/apiRoles';

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
        minWidth: 250,
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
        marginBottom: 8,
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
    scoreRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 8,
    },
    scorePill: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: theme.colors.groupped.background,
    },
    scorePillText: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        fontWeight: '500',
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 10,
    },
    actionButton: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        backgroundColor: theme.colors.surface,
    },
    actionButtonPrimary: {
        backgroundColor: theme.colors.button.primary.background,
        borderColor: theme.colors.button.primary.background,
    },
    actionButtonText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        fontWeight: '600',
    },
    actionButtonTextPrimary: {
        color: theme.colors.button.primary.tint,
    },
    filterRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 8,
        marginTop: 10,
    },
    filterLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    filterChip: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        backgroundColor: theme.colors.surface,
    },
    filterChipActive: {
        backgroundColor: theme.colors.button.primary.background,
        borderColor: theme.colors.button.primary.background,
    },
    filterChipText: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        fontWeight: '600',
    },
    filterChipTextActive: {
        color: theme.colors.button.primary.tint,
    },
    leaderboardRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        marginTop: 10,
    },
    leaderboardIndex: {
        minWidth: 18,
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    leaderboardBody: {
        flex: 1,
    },
    trendChart: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 8,
        marginTop: 12,
    },
    trendBarItem: {
        flex: 1,
        alignItems: 'center',
        minWidth: 24,
    },
    trendValue: {
        fontSize: 10,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        marginBottom: 4,
    },
    trendBarTrack: {
        height: 72,
        width: '100%',
        minWidth: 16,
        borderRadius: 8,
        backgroundColor: theme.colors.groupped.background,
        justifyContent: 'flex-end',
        overflow: 'hidden',
    },
    trendBarFill: {
        width: '100%',
        borderRadius: 8,
        backgroundColor: theme.colors.button.primary.background,
    },
    trendBarFillSecondary: {
        width: '100%',
        borderRadius: 8,
        backgroundColor: theme.colors.success,
    },
    trendLabel: {
        marginTop: 4,
        fontSize: 10,
        color: theme.colors.textSecondary,
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
}));

const withAlpha = (color: string, alpha: number): string => {
    try {
        return Color(color).alpha(alpha).rgb().string();
    } catch {
        return color;
    }
};

const AUTO_ROLE_REVIEW_PREFIX = '[auto-role-complete]';
const AUTO_TEAM_REVIEW_PREFIX = '[auto-team-complete]';

const buildAutoRoleReviewComment = (teamId: string, roleId: string) =>
    `${AUTO_ROLE_REVIEW_PREFIX} team:${teamId} role:${roleId}`;

const buildAutoTeamReviewComment = (teamId: string) =>
    `${AUTO_TEAM_REVIEW_PREFIX} team:${teamId}`;

type TrendPoint = {
    key: string;
    label: string;
    averageRating: number;
    count: number;
};

type RatingPeriod = 'week' | 'month' | 'quarter';

type RatingLike = {
    rating: number;
    createdAt: number;
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const getPeriodWindowDays = (period: RatingPeriod): number => {
    switch (period) {
        case 'week':
            return 7;
        case 'quarter':
            return 90;
        case 'month':
        default:
            return 30;
    }
};

const getBucketStart = (timestamp: number, period: RatingPeriod): number => {
    const date = new Date(timestamp);
    date.setUTCHours(0, 0, 0, 0);

    if (period === 'month') {
        // Month view groups by ISO week to keep chart density readable.
        const dayOffset = (date.getUTCDay() + 6) % 7;
        date.setUTCDate(date.getUTCDate() - dayOffset);
        return date.getTime();
    }

    if (period === 'quarter') {
        // Quarter view groups by month.
        date.setUTCDate(1);
        return date.getTime();
    }

    return date.getTime();
};

const formatTrendLabel = (bucketStart: number, period: RatingPeriod): string => {
    const date = new Date(bucketStart);
    if (period === 'quarter') {
        return `${date.getUTCMonth() + 1}M`;
    }
    return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
};

const getMaxTrendPoints = (period: RatingPeriod): number => {
    switch (period) {
        case 'week':
            return 7;
        case 'quarter':
            return 3;
        case 'month':
        default:
            return 6;
    }
};

const buildTrendPoints = (reviews: RatingLike[], period: RatingPeriod): TrendPoint[] => {
    if (reviews.length === 0) {
        return [];
    }

    const now = Date.now();
    const windowStart = now - getPeriodWindowDays(period) * ONE_DAY_MS;
    const grouped = new Map<number, RatingLike[]>();

    for (const review of reviews) {
        const timestamp = review.createdAt || Date.now();
        if (timestamp < windowStart) {
            continue;
        }

        const bucketStart = getBucketStart(timestamp, period);
        const list = grouped.get(bucketStart) || [];
        list.push(review);
        grouped.set(bucketStart, list);
    }

    if (grouped.size === 0) {
        return [];
    }

    return Array.from(grouped.entries())
        .sort(([a], [b]) => a - b)
        .slice(-getMaxTrendPoints(period))
        .map(([bucketStart, bucketReviews]) => {
            const total = bucketReviews.reduce((sum, item) => sum + item.rating, 0);
            return {
                key: String(bucketStart),
                label: formatTrendLabel(bucketStart, period),
                averageRating: total / bucketReviews.length,
                count: bucketReviews.length,
            };
        });
};

export default function TeamDashboardScreen() {
    const { id, roomId: roomIdParam } = useLocalSearchParams();
    const teamId = id as string;
    const router = useRouter();
    const { theme } = useUnistyles();
    const styles = stylesheet;
    const { credentials } = useAuth();
    const artifact = useArtifact(teamId);
    const allArtifacts = useArtifacts();
    const allSessions = useAllSessions();
    const profile = useProfile();
    const isDataReady = useIsDataReady();
    const [activeTab, setActiveTab] = React.useState<'chat' | 'board' | 'info'>('chat');
    const [isLoading, setIsLoading] = React.useState(false);
    const [selectedTask, setSelectedTask] = React.useState<KanbanTask | null>(null);
    const [showTaskDetail, setShowTaskDetail] = React.useState(false);
    const [showApprovalModal, setShowApprovalModal] = React.useState(false); // 🆕
    const [teamMessages, setTeamMessages] = React.useState<TeamMessage[]>([]);
    const [showMenu, setShowMenu] = React.useState(false);
    const [publicRolePool, setPublicRolePool] = React.useState<PublicRole[]>([]);
    const [roleReviewsById, setRoleReviewsById] = React.useState<Record<string, RoleReview[]>>({});
    const [teamReviews, setTeamReviews] = React.useState<TeamReview[]>([]);
    const [teamScorecard, setTeamScorecard] = React.useState<TeamScorecard | null>(null);
    const [teamLeaderboard, setTeamLeaderboard] = React.useState<Array<{ teamId: string; teamName: string; score: TeamScorecard }>>([]);
    const [isReviewSyncing, setIsReviewSyncing] = React.useState(false);
    const [ratingPeriod, setRatingPeriod] = React.useState<RatingPeriod>('month');
    const [ratingCategory, setRatingCategory] = React.useState<'all' | 'user' | 'master' | 'system'>('all');
    const autoReviewInFlight = React.useRef(false);
    const [showAgentModal, setShowAgentModal] = React.useState(false);

    // Ralph Loop state
    const [ralphState, setRalphState] = React.useState<RalphLoopState>({
        status: 'idle',
        currentTask: null,
        iterationCount: 0,
        completedStories: 0,
        totalStories: 0,
        lastHeartbeat: null,
    });
    const [ralphLoading, setRalphLoading] = React.useState(false);

    const { bridge: desktopBridge, collaborationState } = useDesktopBridge();
    const artifactRoomId = React.useMemo(() => {
        if (!artifact?.body) return undefined;
        try {
            const parsed = JSON.parse(artifact.body);
            return parsed.roomId as string | undefined;
        } catch {
            return undefined;
        }
    }, [artifact?.body]);
    const roomId = (roomIdParam as string) || artifactRoomId || teamId || undefined;
    const desktopRoom = React.useMemo(() => {
        if (!roomId || !collaborationState) return null;
        return collaborationState.rooms.find((room: any) => room.id === roomId) ?? null;
    }, [collaborationState, roomId]);
    const desktopBoard = React.useMemo<KanbanBoard | null>(() => {
        if (!roomId || !collaborationState) return null;
        return collaborationState.boards.find((entry: any) => entry.roomId === roomId)?.board ?? DEFAULT_KANBAN_BOARD;
    }, [collaborationState, roomId]);

    // Get user's display name for chat
    const myDisplayName = React.useMemo(() => {
        const displayName = getDisplayName(profile);
        return displayName || sync.anonID; // Fallback to session ID if no display name
    }, [profile]);

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
        if (desktopBridge || isLoading || autoInitAttempted || !isDataReady) {
            return;
        }
        // If artifact is null (data loaded but artifact doesn't exist), auto-initialize
        if (artifact === null) {
            setAutoInitAttempted(true);
            setIsLoading(true);
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

            sync.createArtifact(
                'Team',
                JSON.stringify(initialBoard, null, 2),
                [],
                false,
                'team',
                teamId
            )
            .then(() => {
                console.log(`✅ Board auto-initialized for team ${teamId}`);
                return sync.fetchArtifactWithBody(teamId);
            })
            .catch((error) => {
                console.error('Failed to auto-initialize Board:', error);
            })
            .finally(() => {
                setIsLoading(false);
            });
        }
    }, [artifact, teamId, desktopBridge, isLoading, autoInitAttempted, isDataReady]);

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
        try {
            const parsed = JSON.parse(artifact.body);
            const members = parsed.team?.members || parsed?.members || [];
            return members.map((m: any) => m.sessionId).filter(Boolean);
        } catch {
            return [];
        }
    }, [artifact?.body]);

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
        try {
            const parsed = JSON.parse(artifact.body);
            return ensureColumns(parsed);
        } catch (e) {
            console.error('Failed to parse kanban data', e);
            return { tasks: [], columns: DEFAULT_KANBAN_BOARD.columns };
        }
    }, [artifact?.body, desktopBoard, desktopBridge]);

    // Ralph Loop Handlers
    const handleRalphStart = React.useCallback(async () => {
        setRalphLoading(true);
        try {
            // TODO: Call MCP tool to start Ralph Loop
            // For now, simulate starting
            setRalphState(prev => ({
                ...prev,
                status: 'running',
                totalStories: kanbanData.tasks?.length || 0,
            }));
            console.log('[Ralph] Starting loop for team:', teamId);
        } catch (error) {
            console.error('[Ralph] Failed to start:', error);
            setRalphState(prev => ({
                ...prev,
                status: 'error',
                errorMessage: error instanceof Error ? error.message : 'Failed to start',
            }));
        } finally {
            setRalphLoading(false);
        }
    }, [teamId, kanbanData.tasks?.length]);

    const handleRalphStop = React.useCallback(async () => {
        setRalphLoading(true);
        try {
            // TODO: Write .ralph-stop sentinel file via MCP
            setRalphState(prev => ({
                ...prev,
                status: 'idle',
            }));
            console.log('[Ralph] Stopping loop for team:', teamId);
        } catch (error) {
            console.error('[Ralph] Failed to stop:', error);
        } finally {
            setRalphLoading(false);
        }
    }, [teamId]);

    const handleRalphRefresh = React.useCallback(async () => {
        setRalphLoading(true);
        try {
            // TODO: Fetch master-state.json via MCP
            // For now, update with current kanban data
            const completedTasks = kanbanData.tasks?.filter(t => t.status === 'done').length || 0;
            setRalphState(prev => ({
                ...prev,
                totalStories: kanbanData.tasks?.length || 0,
                completedStories: completedTasks,
            }));
            console.log('[Ralph] Refreshed state for team:', teamId);
        } catch (error) {
            console.error('[Ralph] Failed to refresh:', error);
        } finally {
            setRalphLoading(false);
        }
    }, [teamId, kanbanData.tasks]);

    // Update Ralph state when kanban data changes
    React.useEffect(() => {
        const completedTasks = kanbanData.tasks?.filter(t => t.status === 'done').length || 0;
        setRalphState(prev => ({
            ...prev,
            totalStories: kanbanData.tasks?.length || 0,
            completedStories: completedTasks,
        }));
    }, [kanbanData.tasks]);

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

    // 🆕 Discuss 按钮处理函数：跳转到 Chat 标签并高亮相关消息
    const handleDiscussTask = React.useCallback((task: KanbanTask) => {
        // 查找与任务相关的消息
        const relatedMessages = taskChatSync.getMessagesForTask(task.id);

        // 关闭详情弹窗
        setShowTaskDetail(false);

        // 切换到 Chat 标签
        setActiveTab('chat');

        // TODO: 可以在这里实现滚动到相关消息的功能
        // 可能需要在 TeamChatRoom 中添加一个 ref 来支持滚动到特定消息
        console.log('Discussing task:', task.id, 'Found', relatedMessages.length, 'related messages');
    }, [taskChatSync]);

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

    const handleAddTask = async (status: string) => {
        const title = await Modal.prompt('New Task', 'Enter task title');
        if (!title) return;

        if (desktopBridge && roomId) {
            await desktopBridge.createTask({
                roomId,
                title,
                status
            });
            return;
        }

        if (!artifact) {
            return;
        }

        const newTask: KanbanTask = {
            id: Math.random().toString(36).substr(2, 9),
            title,
            status: status,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

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
    };

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

    const sessionLookup = React.useMemo(() => {
        const map = new Map<string, (typeof allSessions)[number]>();
        for (const session of allSessions) {
            map.set(session.id, session);
        }
        return map;
    }, [allSessions]);

    const roleDefinitions = kanbanData.team?.roles?.length ? kanbanData.team.roles : DEFAULT_TEAM_ROLES;
    const agreements = kanbanData.team?.agreements ?? DEFAULT_TEAM_AGREEMENTS;
    const publicRoleById = React.useMemo(() => {
        return new Map(publicRolePool.map((role) => [role.id, role]));
    }, [publicRolePool]);

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

        return allSessionIds.map((sessionId, index) => {
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

            return { member, session, role, index, tasks };
        });
    }, [kanbanData.team?.members, artifact?.sessions, sessionLookup, roleDefinitions, kanbanData.tasks]);

    const getRoleScoreSnapshot = React.useCallback((roleId?: string) => {
        if (!roleId) {
            return null;
        }

        const publicRole = publicRoleById.get(roleId);
        if (publicRole?.stats) {
            return publicRole.stats;
        }

        const reviews = roleReviewsById[roleId] || [];
        if (reviews.length === 0) {
            return null;
        }

        const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
        const codeTotal = reviews.reduce((sum, review) => sum + (review.codeScore || 0), 0);
        const qualityTotal = reviews.reduce((sum, review) => sum + (review.qualityScore || 0), 0);

        const sourceTotals = reviews.reduce((acc, review) => {
            if (review.sourceScores) {
                acc.user += review.sourceScores.user || 0;
                acc.master += review.sourceScores.master || 0;
                acc.system += review.sourceScores.system || 0;
            } else {
                const source = review.source || 'user';
                acc[source] += review.rating * 20;
            }
            return acc;
        }, { user: 0, master: 0, system: 0 });

        return {
            reviewCount: reviews.length,
            completionCount: reviews.length,
            totalRating,
            averageRating: totalRating / reviews.length,
            cumulativeCode: codeTotal,
            cumulativeQuality: qualityTotal,
            sourceScoreTotals: sourceTotals,
        };
    }, [publicRoleById, roleReviewsById]);

    const roleIdsForReviews = React.useMemo(() => {
        const ids = new Set<string>();
        for (const role of roleDefinitions) {
            if (role.id) {
                ids.add(role.id);
            }
        }
        for (const member of roster) {
            const roleId = member.role?.id || member.member.roleId || member.session?.metadata?.role;
            if (roleId) {
                ids.add(roleId);
            }
        }
        return Array.from(ids);
    }, [roleDefinitions, roster]);

    const ratingWindowStart = React.useMemo(() => {
        return Date.now() - getPeriodWindowDays(ratingPeriod) * ONE_DAY_MS;
    }, [ratingPeriod]);

    const inRatingWindow = React.useCallback((timestamp?: number) => {
        if (!timestamp) {
            return true;
        }
        return timestamp >= ratingWindowStart;
    }, [ratingWindowStart]);

    const filteredTeamReviews = React.useMemo(() => {
        return teamReviews.filter((review) => {
            const byCategory = ratingCategory === 'all' || (review.source || 'user') === ratingCategory;
            const byWindow = inRatingWindow(review.createdAt);
            return byCategory && byWindow;
        });
    }, [teamReviews, ratingCategory, inRatingWindow]);
    const teamTrendPoints = React.useMemo(() => buildTrendPoints(filteredTeamReviews, ratingPeriod), [filteredTeamReviews, ratingPeriod]);
    const latestTrendPoint = teamTrendPoints.length > 0 ? teamTrendPoints[teamTrendPoints.length - 1] : null;
    const roleTitleById = React.useMemo(() => {
        const roleTitleMap = new Map<string, string>();
        for (const role of publicRolePool) {
            roleTitleMap.set(role.id, role.title || role.id);
        }
        for (const role of roleDefinitions) {
            if (!roleTitleMap.has(role.id)) {
                roleTitleMap.set(role.id, role.title || role.id);
            }
        }
        return roleTitleMap;
    }, [publicRolePool, roleDefinitions]);

    const topRoleTrend = React.useMemo(() => {
        const series = roleIdsForReviews
            .map((roleId) => {
                const reviews = (roleReviewsById[roleId] || []).filter((review) => {
                    const byCategory = ratingCategory === 'all' || (review.source || 'user') === ratingCategory;
                    const byWindow = inRatingWindow(review.createdAt);
                    return byCategory && byWindow;
                });
                if (reviews.length === 0) {
                    return null;
                }
                return {
                    roleId,
                    title: roleTitleById.get(roleId) || roleId,
                    points: buildTrendPoints(reviews, ratingPeriod),
                    reviewCount: reviews.length,
                };
            })
            .filter((item): item is { roleId: string; title: string; points: TrendPoint[]; reviewCount: number } => Boolean(item))
            .filter((item) => item.points.length > 0)
            .sort((a, b) => b.reviewCount - a.reviewCount);

        return series.length > 0 ? series[0] : null;
    }, [roleIdsForReviews, roleReviewsById, ratingCategory, inRatingWindow, roleTitleById, ratingPeriod]);
    const latestRoleTrendPoint = topRoleTrend?.points[topRoleTrend.points.length - 1] || null;

    const roleLeaderboard = React.useMemo(() => {
        const entries: Array<{ roleId: string; title: string; reviewCount: number; averageRating: number; codeTotal: number; qualityTotal: number }> = [];

        for (const roleId of roleIdsForReviews) {
            const reviews = (roleReviewsById[roleId] || []).filter((review) => {
                const byCategory = ratingCategory === 'all' || (review.source || 'user') === ratingCategory;
                const byWindow = inRatingWindow(review.createdAt);
                return byCategory && byWindow;
            });

            if (reviews.length === 0) {
                continue;
            }

            const totalRating = reviews.reduce((sum, item) => sum + item.rating, 0);
            const codeTotal = reviews.reduce((sum, item) => sum + (item.codeScore || 0), 0);
            const qualityTotal = reviews.reduce((sum, item) => sum + (item.qualityScore || 0), 0);

            entries.push({
                roleId,
                title: roleTitleById.get(roleId) || roleId,
                reviewCount: reviews.length,
                averageRating: totalRating / reviews.length,
                codeTotal,
                qualityTotal,
            });
        }

        return entries.sort((a, b) => {
            if (b.averageRating !== a.averageRating) {
                return b.averageRating - a.averageRating;
            }
            return b.reviewCount - a.reviewCount;
        });
    }, [roleTitleById, roleIdsForReviews, roleReviewsById, ratingCategory, inRatingWindow]);

    const loadTeamLeaderboard = React.useCallback(async () => {
        if (!credentials) {
            return;
        }

        const teamArtifacts = allArtifacts.filter((item) => item.type === 'team').slice(0, 30);
        const ids = Array.from(new Set([teamId, ...teamArtifacts.map((item) => item.id)]));
        if (ids.length === 0) {
            setTeamLeaderboard([]);
            return;
        }

        const entries = await Promise.all(
            ids.map(async (id) => {
                try {
                    const score = await fetchTeamScore(credentials, id);
                    const artifactItem = teamArtifacts.find((item) => item.id === id);
                    const teamName = artifactItem?.title || (id === teamId ? artifact?.title : undefined) || id;
                    return { teamId: id, teamName, score };
                } catch {
                    return null;
                }
            })
        );

        const validEntries = entries.filter((item): item is { teamId: string; teamName: string; score: TeamScorecard } => Boolean(item));
        validEntries.sort((a, b) => {
            if (b.score.averageRating !== a.score.averageRating) {
                return b.score.averageRating - a.score.averageRating;
            }
            return (b.score.reviewCount || 0) - (a.score.reviewCount || 0);
        });

        setTeamLeaderboard(validEntries);
    }, [credentials, allArtifacts, teamId, artifact?.title]);

    const filteredTeamLeaderboard = React.useMemo(() => {
        return teamLeaderboard.filter((entry) => {
            const lastReviewedAt = entry.score.lastReviewedAt;
            return inRatingWindow(lastReviewedAt);
        });
    }, [teamLeaderboard, inRatingWindow]);

    const reviewableTasks = React.useMemo(() => {
        return kanbanData.tasks.filter((task) => !taskNeedsApproval(task));
    }, [kanbanData.tasks]);

    const roleCompletionById = React.useMemo(() => {
        const bySession = new Map<string, string>();
        for (const member of roster) {
            const roleId = member.role?.id || member.member.roleId || member.session?.metadata?.role;
            if (roleId) {
                bySession.set(member.member.sessionId, roleId);
            }
        }

        const completionMap: Record<string, { total: number; completed: number }> = {};
        for (const task of reviewableTasks) {
            const roleId = task.assigneeId ? bySession.get(task.assigneeId) : undefined;
            if (!roleId) {
                continue;
            }

            const current = completionMap[roleId] || { total: 0, completed: 0 };
            current.total += 1;
            if (normalizeStatus(task.status) === 'done') {
                current.completed += 1;
            }
            completionMap[roleId] = current;
        }

        return completionMap;
    }, [roster, reviewableTasks, normalizeStatus]);

    const isTeamFullyCompleted = React.useMemo(() => {
        return reviewableTasks.length > 0 && reviewableTasks.every((task) => normalizeStatus(task.status) === 'done');
    }, [reviewableTasks, normalizeStatus]);

    const triggerAutoCompletionReviews = React.useCallback(async (
        currentRoleReviews: Record<string, RoleReview[]>,
        currentTeamReviews: TeamReview[]
    ) => {
        if (!credentials || autoReviewInFlight.current) {
            return false;
        }

        const completedRoleIds = Object.entries(roleCompletionById)
            .filter(([, stat]) => stat.total > 0 && stat.completed === stat.total)
            .map(([roleId]) => roleId);

        const pendingRoleIds = completedRoleIds.filter((roleId) => {
            const reviews = currentRoleReviews[roleId] || [];
            const autoComment = buildAutoRoleReviewComment(teamId, roleId);
            return !reviews.some((review) => review.comment === autoComment);
        });

        const teamAutoComment = buildAutoTeamReviewComment(teamId);
        const shouldSubmitTeamReview = isTeamFullyCompleted &&
            !currentTeamReviews.some((review) => review.comment === teamAutoComment);

        if (pendingRoleIds.length === 0 && !shouldSubmitTeamReview) {
            return false;
        }

        autoReviewInFlight.current = true;
        try {
            await Promise.all(pendingRoleIds.map(async (roleId) => {
                const stat = roleCompletionById[roleId];
                if (!stat) {
                    return;
                }

                const progress = stat.total > 0 ? stat.completed / stat.total : 0;
                const rating = Number((4 + progress).toFixed(2));
                const codeScore = Math.min(100, 70 + stat.completed * 6);
                const qualityScore = Math.min(100, 72 + stat.completed * 5);

                await submitRoleReview(credentials, roleId, {
                    rating,
                    codeScore,
                    qualityScore,
                    source: 'system',
                    sourceScores: { system: Math.round(rating * 20) },
                    teamId,
                    comment: buildAutoRoleReviewComment(teamId, roleId),
                });
            }));

            if (shouldSubmitTeamReview) {
                const completedCount = reviewableTasks.length;
                const teamCodeScore = Math.min(100, 72 + completedCount * 3);
                const teamQualityScore = Math.min(100, 74 + completedCount * 2);

                await submitTeamReview(credentials, teamId, {
                    rating: 5,
                    codeScore: teamCodeScore,
                    qualityScore: teamQualityScore,
                    source: 'system',
                    sourceScores: { system: 100 },
                    roleIds: completedRoleIds,
                    comment: teamAutoComment,
                });
            }

            return true;
        } catch (error) {
            console.warn('Failed to auto-submit completion reviews:', error);
            return false;
        } finally {
            autoReviewInFlight.current = false;
        }
    }, [credentials, isTeamFullyCompleted, reviewableTasks, roleCompletionById, teamId]);

    const loadReviewData = React.useCallback(async () => {
        if (!credentials) {
            return;
        }

        try {
            await loadTeamLeaderboard();
            const [pool, score, teamReviewList] = await Promise.all([
                fetchRolePool(credentials, { limit: 200 }),
                fetchTeamScore(credentials, teamId),
                fetchTeamReviews(credentials, teamId, 20),
            ]);
            let reviewMap: Record<string, RoleReview[]> = {};
            if (roleIdsForReviews.length > 0) {
                const reviewEntries = await Promise.all(
                    roleIdsForReviews.map(async (roleId) => {
                        try {
                            const reviews = await fetchRoleReviews(credentials, roleId, 50);
                            return [roleId, reviews] as const;
                        } catch {
                            return [roleId, [] as RoleReview[]] as const;
                        }
                    })
                );

                reviewMap = Object.fromEntries(reviewEntries);
            }

            const hasAutoSubmitted = await triggerAutoCompletionReviews(reviewMap, teamReviewList);
            if (hasAutoSubmitted) {
                const [nextPool, nextScore, nextTeamReviews] = await Promise.all([
                    fetchRolePool(credentials, { limit: 200 }),
                    fetchTeamScore(credentials, teamId),
                    fetchTeamReviews(credentials, teamId, 20),
                ]);
                await loadTeamLeaderboard();

                setPublicRolePool(nextPool);
                setTeamScorecard(nextScore);
                setTeamReviews(nextTeamReviews);

                if (roleIdsForReviews.length > 0) {
                    const nextRoleReviews = await Promise.all(
                        roleIdsForReviews.map(async (roleId) => {
                            try {
                                const reviews = await fetchRoleReviews(credentials, roleId, 50);
                                return [roleId, reviews] as const;
                            } catch {
                                return [roleId, [] as RoleReview[]] as const;
                            }
                        })
                    );
                    setRoleReviewsById(Object.fromEntries(nextRoleReviews));
                } else {
                    setRoleReviewsById({});
                }

                return;
            }

            setPublicRolePool(pool);
            setTeamScorecard(score);
            setTeamReviews(teamReviewList);
            setRoleReviewsById(reviewMap);
        } catch (error) {
            console.warn('Failed to load review data:', error);
        }
    }, [credentials, teamId, roleIdsForReviews, triggerAutoCompletionReviews, loadTeamLeaderboard]);

    React.useEffect(() => {
        if (activeTab !== 'info') {
            return;
        }
        void loadReviewData();
    }, [activeTab, loadReviewData]);

    const parseScoreInput = React.useCallback((raw: string | null, label: string, min: number, max: number): number | null => {
        if (raw === null) {
            return null;
        }
        const value = Number(raw);
        if (!Number.isFinite(value) || value < min || value > max) {
            Modal.alert('Invalid input', `${label} must be between ${min} and ${max}.`);
            return null;
        }
        return value;
    }, []);

    const promptReviewPayload = React.useCallback(async () => {
        const ratingRaw = await Modal.prompt(
            'Rate',
            'Rating (1-5)',
            { defaultValue: '4', inputType: 'numeric', confirmText: 'Next' }
        );
        const rating = parseScoreInput(ratingRaw, 'Rating', 1, 5);
        if (rating === null) {
            return null;
        }

        const codeRaw = await Modal.prompt(
            'Code Score',
            'Code score (0-100)',
            { defaultValue: '80', inputType: 'numeric', confirmText: 'Next' }
        );
        const codeScore = parseScoreInput(codeRaw, 'Code score', 0, 100);
        if (codeScore === null) {
            return null;
        }

        const qualityRaw = await Modal.prompt(
            'Quality Score',
            'Quality score (0-100)',
            { defaultValue: '80', inputType: 'numeric', confirmText: 'Next' }
        );
        const qualityScore = parseScoreInput(qualityRaw, 'Quality score', 0, 100);
        if (qualityScore === null) {
            return null;
        }

        const sourceRaw = await Modal.prompt(
            'Score Source',
            'Source: user / master / system',
            { defaultValue: 'user', confirmText: 'Next' }
        );

        if (sourceRaw === null) {
            return null;
        }

        const source = sourceRaw.trim().toLowerCase();
        if (!['user', 'master', 'system'].includes(source)) {
            Modal.alert('Invalid input', 'Source must be user, master, or system.');
            return null;
        }

        const comment = await Modal.prompt(
            'Comment',
            'Optional comment',
            { placeholder: 'Great collaboration', confirmText: 'Submit' }
        );

        if (comment === null) {
            return null;
        }

        return {
            rating,
            codeScore,
            qualityScore,
            source: source as 'user' | 'master' | 'system',
            comment: comment.trim() ? comment.trim() : undefined,
        };
    }, [parseScoreInput]);

    const handleRoleReview = React.useCallback(async (roleId?: string) => {
        if (!credentials || !roleId) {
            Modal.alert('Unavailable', 'Cannot review this role right now.');
            return;
        }

        const payload = await promptReviewPayload();
        if (!payload) {
            return;
        }

        setIsReviewSyncing(true);
        try {
            await submitRoleReview(credentials, roleId, {
                ...payload,
                teamId,
            });
            await loadReviewData();
            Modal.alert('Thanks!', 'Role review submitted.');
        } catch (error) {
            console.error('Failed to submit role review:', error);
            Modal.alert('Error', 'Failed to submit role review.');
        } finally {
            setIsReviewSyncing(false);
        }
    }, [credentials, promptReviewPayload, loadReviewData, teamId]);

    const handleTeamReview = React.useCallback(async () => {
        if (!credentials) {
            Modal.alert('Unavailable', 'Cannot review this team right now.');
            return;
        }

        const payload = await promptReviewPayload();
        if (!payload) {
            return;
        }

        setIsReviewSyncing(true);
        try {
            await submitTeamReview(credentials, teamId, {
                ...payload,
                roleIds: roleIdsForReviews,
            });
            await loadReviewData();
            Modal.alert('Thanks!', 'Team review submitted.');
        } catch (error) {
            console.error('Failed to submit team review:', error);
            Modal.alert('Error', 'Failed to submit team review.');
        } finally {
            setIsReviewSyncing(false);
        }
    }, [credentials, promptReviewPayload, teamId, roleIdsForReviews, loadReviewData]);

    const timelineEvents = React.useMemo(() => {
        return [...kanbanData.tasks]
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .map(task => {
                const assignee = roster.find(r => r.member.sessionId === task.assigneeId);
                return { task, assignee };
            });
    }, [kanbanData.tasks, roster]);

    // 🆕 Filter out pending tasks (only show approved tasks on board)
    const approvedTasks = reviewableTasks;

    // 🆕 Pending tasks for approval UI
    const pendingTasks = React.useMemo(() => {
        return kanbanData.tasks.filter(task => taskNeedsApproval(task));
    }, [kanbanData.tasks]);

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

    // Early returns MUST come AFTER all hooks to avoid "Rendered fewer hooks" error
    if (desktopBridge && !desktopRoom) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    if (!desktopBridge && !artifact) {
        return (
            <View style={styles.loadingContainer}>
                {isLoading ? (
                    <ActivityIndicator size="large" />
                ) : (
                    <View style={{ alignItems: 'center', padding: 20 }}>
                        <Ionicons name="alert-circle-outline" size={48} color={theme.colors.textSecondary} />
                        <Text style={[styles.title, { marginTop: 16, textAlign: 'center' }]}>
                            Team Board Not Found
                        </Text>
                        <Text style={[styles.subtitle, { marginTop: 8, textAlign: 'center', maxWidth: 300 }]}>
                            This team doesn't have a Kanban board yet. Initialize one to start tracking tasks.
                        </Text>
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
                    </View>
                )}
            </View>
        );
    }

    const renderKanban = () => (
        <>
            {/* 🆕 Pending tasks notification */}
            {pendingTasks.length > 0 && (
                <View style={[styles.pendingBanner, { backgroundColor: '#FFF3CD', borderColor: '#FFC107' }]}>
                    <Ionicons name="information-circle" size={20} color="#FFC107" />
                    <Text style={[styles.pendingBannerText, { color: '#856404' }]}>
                        {pendingTasks.length} {pendingTasks.length === 1 ? 'task' : 'tasks'} awaiting approval
                    </Text>
                    <Pressable
                        onPress={() => setShowApprovalModal(true)}
                        style={[styles.pendingBannerButton, { backgroundColor: '#FFC107' }]}
                    >
                        <Text style={styles.pendingBannerButtonText}>Review</Text>
                    </Pressable>
                </View>
            )}

            <ScrollView horizontal style={{ flex: 1 }}>
                <View style={styles.boardContainer}>
                    {kanbanData.columns.map(column => (
                        <View key={column.id} style={styles.column}>
                            <View style={styles.columnHeader}>
                                <Text style={styles.columnTitle}>{column.title}</Text>
                                <Text style={styles.taskCount}>
                                    {approvedTasks.filter(t => matchesColumn(t, column.id)).length}
                                </Text>
                            </View>

                            <ScrollView>
                                {approvedTasks
                                    .filter(t => matchesColumn(t, column.id))
                                .map(task => {
                                    const linkedSessions = taskSessionLinks.get(task.id) || [];
                                    const sessionCount = linkedSessions.length;

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
                                        {task.assigneeId && (
                                            <Text style={styles.taskAssignee}>@{task.assigneeId}</Text>
                                        )}

                                        {/* 🆕 Linked sessions 显示 */}
                                        {(sessionCount > 0 || task.priority) && (
                                            <View style={styles.taskMeta}>
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
        </ScrollView>
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

                <View style={styles.roleCard}>
                    <Text style={styles.roleTitle}>Team Public Score</Text>
                    <Text style={styles.roleSummary}>
                        Community rating and cumulative quality metrics for this team.
                    </Text>
                    <RoleStats scorecard={teamScorecard ?? undefined} />
                    <View style={styles.actionRow}>
                        <Pressable
                            style={styles.actionButton}
                            onPress={() => void loadReviewData()}
                            disabled={isReviewSyncing}
                        >
                            <Text style={styles.actionButtonText}>Refresh</Text>
                        </Pressable>
                        <Pressable
                            style={[styles.actionButton, styles.actionButtonPrimary]}
                            onPress={() => void handleTeamReview()}
                            disabled={isReviewSyncing}
                        >
                            <Text style={[styles.actionButtonText, styles.actionButtonTextPrimary]}>
                                {isReviewSyncing ? 'Submitting...' : 'Rate Team'}
                            </Text>
                        </Pressable>
                    </View>

                    <View style={styles.filterRow}>
                        <Text style={styles.filterLabel}>Period</Text>
                        {(['week', 'month', 'quarter'] as const).map((item) => (
                            <Pressable
                                key={item}
                                style={[styles.filterChip, ratingPeriod === item && styles.filterChipActive]}
                                onPress={() => setRatingPeriod(item)}
                            >
                                <Text style={[styles.filterChipText, ratingPeriod === item && styles.filterChipTextActive]}>
                                    {item.charAt(0).toUpperCase() + item.slice(1)}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                    <View style={styles.filterRow}>
                        <Text style={styles.filterLabel}>Category</Text>
                        {(['all', 'user', 'master', 'system'] as const).map((item) => (
                            <Pressable
                                key={item}
                                style={[styles.filterChip, ratingCategory === item && styles.filterChipActive]}
                                onPress={() => setRatingCategory(item)}
                            >
                                <Text style={[styles.filterChipText, ratingCategory === item && styles.filterChipTextActive]}>
                                    {item}
                                </Text>
                            </Pressable>
                        ))}
                    </View>

                    {filteredTeamReviews.slice(0, 3).map((review) => (
                        <Text key={review.id} style={styles.roleSummary}>
                            • {review.source || 'user'} rated {review.rating} ({new Date(review.createdAt).toLocaleDateString()})
                            {review.comment ? `: ${review.comment}` : ''}
                        </Text>
                    ))}
                </View>

                <View style={styles.roleCard}>
                    <Text style={styles.roleTitle}>Team Leaderboard</Text>
                    <Text style={styles.roleSummary}>Top teams ranked by average score and review count.</Text>
                    {filteredTeamLeaderboard.slice(0, 5).map((entry, index) => (
                        <View key={entry.teamId} style={styles.leaderboardRow}>
                            <Text style={styles.leaderboardIndex}>{index + 1}</Text>
                            <View style={styles.leaderboardBody}>
                                <Text style={styles.roleTitle}>{entry.teamName}</Text>
                                <Text style={styles.roleSummary}>
                                    Rating {entry.score.averageRating?.toFixed(2) || '0.00'} · Reviews {entry.score.reviewCount || 0}
                                </Text>
                            </View>
                        </View>
                    ))}
                    {filteredTeamLeaderboard.length === 0 && (
                        <Text style={styles.emptyState}>No team leaderboard data in selected period.</Text>
                    )}
                </View>

                <View style={styles.roleCard}>
                    <Text style={styles.roleTitle}>Rating Trend</Text>
                    <Text style={styles.roleSummary}>Average team rating trend in selected period/category.</Text>
                    {teamTrendPoints.length > 0 ? (
                        <>
                            <View style={styles.trendChart}>
                                {teamTrendPoints.map((point) => (
                                    <View key={point.key} style={styles.trendBarItem}>
                                        <Text style={styles.trendValue}>{point.averageRating.toFixed(1)}</Text>
                                        <View style={styles.trendBarTrack}>
                                            <View
                                                style={[
                                                    styles.trendBarFill,
                                                    { height: `${Math.max((point.averageRating / 5) * 100, 8)}%` },
                                                ]}
                                            />
                                        </View>
                                        <Text style={styles.trendLabel}>{point.label}</Text>
                                    </View>
                                ))}
                            </View>
                            {latestTrendPoint && (
                                <Text style={styles.roleSummary}>
                                    Latest {latestTrendPoint.label}: {latestTrendPoint.averageRating.toFixed(2)} ({latestTrendPoint.count} review{latestTrendPoint.count > 1 ? 's' : ''})
                                </Text>
                            )}
                        </>
                    ) : (
                        <Text style={styles.emptyState}>No rating trend data in selected period/category.</Text>
                    )}
                </View>

                <View style={styles.roleCard}>
                    <Text style={styles.roleTitle}>Role Rating Trend</Text>
                    <Text style={styles.roleSummary}>Top role trend by review volume in selected period/category.</Text>
                    {topRoleTrend ? (
                        <>
                            <Text style={styles.roleSummary}>{topRoleTrend.title}</Text>
                            <View style={styles.trendChart}>
                                {topRoleTrend.points.map((point) => (
                                    <View key={point.key} style={styles.trendBarItem}>
                                        <Text style={styles.trendValue}>{point.averageRating.toFixed(1)}</Text>
                                        <View style={styles.trendBarTrack}>
                                            <View
                                                style={[
                                                    styles.trendBarFillSecondary,
                                                    { height: `${Math.max((point.averageRating / 5) * 100, 8)}%` },
                                                ]}
                                            />
                                        </View>
                                        <Text style={styles.trendLabel}>{point.label}</Text>
                                    </View>
                                ))}
                            </View>
                            {latestRoleTrendPoint && (
                                <Text style={styles.roleSummary}>
                                    Latest {latestRoleTrendPoint.label}: {latestRoleTrendPoint.averageRating.toFixed(2)} ({latestRoleTrendPoint.count} review{latestRoleTrendPoint.count > 1 ? 's' : ''})
                                </Text>
                            )}
                        </>
                    ) : (
                        <Text style={styles.emptyState}>No role trend data in selected period/category.</Text>
                    )}
                </View>

                <View style={styles.roleCard}>
                    <Text style={styles.roleTitle}>Role Leaderboard</Text>
                    <Text style={styles.roleSummary}>Top roles ranked within the selected period/category.</Text>
                    {roleLeaderboard.slice(0, 8).map((entry, index) => (
                        <View key={entry.roleId} style={styles.leaderboardRow}>
                            <Text style={styles.leaderboardIndex}>{index + 1}</Text>
                            <View style={styles.leaderboardBody}>
                                <Text style={styles.roleTitle}>{entry.title}</Text>
                                <Text style={styles.roleSummary}>
                                    Rating {entry.averageRating.toFixed(2)} · Reviews {entry.reviewCount} · Code Σ {entry.codeTotal} · Quality Σ {entry.qualityTotal}
                                </Text>
                            </View>
                        </View>
                    ))}
                    {roleLeaderboard.length === 0 && (
                        <Text style={styles.emptyState}>No role leaderboard data in selected period/category.</Text>
                    )}
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

                <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Members & Models</Text>
                {roster.map(({ member, session, role }) => {
                    const effectiveRoleId = member.roleId || session?.metadata?.role || '';
                    const roleConfig = getRoleModelConfig(effectiveRoleId);
                    const modelOverride = (session as any)?.modelOverride as string | undefined;
                    const activeModel = modelOverride || roleConfig.model;
                    const isHuman = effectiveRoleId === 'user' || roleConfig.model === 'human';
                    const reviewRoleId = role?.id || effectiveRoleId || undefined;
                    const roleStats = getRoleScoreSnapshot(reviewRoleId);

                    return (
                        <View key={member.sessionId} style={styles.roleCard}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.roleTitle}>
                                        {member.displayName || session?.metadata?.name || member.sessionId.slice(0, 8)}
                                    </Text>
                                    <Text style={[styles.roleSummary, { fontSize: 12, marginTop: 2 }]}>
                                        {role?.title || effectiveRoleId || 'No role'}
                                    </Text>
                                </View>
                                {!isHuman && (
                                    <View style={{
                                        backgroundColor: theme.colors.surfacePressed || '#1a1a2e',
                                        paddingHorizontal: 10,
                                        paddingVertical: 4,
                                        borderRadius: 12,
                                    }}>
                                        <Text style={{
                                            fontSize: 11,
                                            color: theme.colors.textSecondary,
                                            fontWeight: '500',
                                        }}>
                                            {getModelLabel(activeModel)}
                                            {modelOverride ? ' ●' : ''}
                                        </Text>
                                    </View>
                                )}
                            </View>
                            {roleStats && (
                                <View style={styles.scoreRow}>
                                    <View style={styles.scorePill}>
                                        <Text style={styles.scorePillText}>Rating {roleStats.averageRating.toFixed(2)}</Text>
                                    </View>
                                    <View style={styles.scorePill}>
                                        <Text style={styles.scorePillText}>Reviews {roleStats.reviewCount}</Text>
                                    </View>
                                    <View style={styles.scorePill}>
                                        <Text style={styles.scorePillText}>Code Σ {roleStats.cumulativeCode}</Text>
                                    </View>
                                    <View style={styles.scorePill}>
                                        <Text style={styles.scorePillText}>Quality Σ {roleStats.cumulativeQuality}</Text>
                                    </View>
                                </View>
                            )}
                            {reviewRoleId && (
                                <View style={styles.actionRow}>
                                    <Pressable
                                        style={[styles.actionButton, styles.actionButtonPrimary]}
                                        onPress={() => void handleRoleReview(reviewRoleId)}
                                        disabled={isReviewSyncing}
                                    >
                                        <Text style={[styles.actionButtonText, styles.actionButtonTextPrimary]}>
                                            {isReviewSyncing ? 'Submitting...' : 'Rate Role'}
                                        </Text>
                                    </Pressable>
                                </View>
                            )}
                        </View>
                    );
                })}
            </View>

            {/* Ralph Loop Control Panel */}
            <View style={styles.section}>
                <RalphControlPanel
                    state={ralphState}
                    onStart={handleRalphStart}
                    onStop={handleRalphStop}
                    onRefresh={handleRalphRefresh}
                    isLoading={ralphLoading}
                />
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
                    messages={teamMessages}
                    onMessagesChange={setTeamMessages}
                    taskChatSync={taskChatSync}
                />
            </View>
        );
    };

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: true,
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
            {/* Menu dropdown - rendered outside header to avoid clipping */}
            {showMenu && (
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
                            onPress={() => {
                                setShowMenu(false);
                                setShowAgentModal(true);
                            }}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                padding: 14,
                                borderBottomWidth: 1,
                                borderBottomColor: theme.colors.divider,
                            }}
                        >
                            <Ionicons name="people-outline" size={18} color={theme.colors.text} style={{ marginRight: 12 }} />
                            <Text style={{ fontSize: 15, color: theme.colors.text }}>Manage Agents</Text>
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
            <View style={styles.container}>
                <View style={styles.header}>
                    <View style={{ flexDirection: 'row', backgroundColor: theme.colors.groupped.background, borderRadius: 12, padding: 4 }}>
                        {(['chat', 'board', 'info'] as const).map((tab) => (
                            <Pressable
                                key={tab}
                                onPress={() => setActiveTab(tab)}
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
                                    textTransform: 'capitalize'
                                }}>
                                    {tab}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                </View>

                {activeTab === 'chat' && renderChat()}
                {activeTab === 'board' && renderKanban()}
                {activeTab === 'info' && renderInfo()}
            </View>

            {/* 🆕 任务详情弹窗 */}
            <TaskDetailModal
                visible={showTaskDetail}
                task={selectedTask}
                columns={kanbanData.columns}
                onClose={() => setShowTaskDetail(false)}
                onDiscuss={handleDiscussTask}
                onSave={async (taskId, updates) => {
                    // 使用 taskChatSync 更新任务，会自动发送通知
                    await taskChatSync.updateTaskWithSync(taskId, updates, myDisplayName || '用户');
                    setShowTaskDetail(false);
                }}
                allSessions={allSessions}
            />

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

            {/* R6: Agent Management Modal */}
            <AgentManagementModal
                teamId={teamId}
                visible={showAgentModal}
                onClose={() => setShowAgentModal(false)}
                onAgentAdded={(sessionId) => {
                    console.log('Agent added:', sessionId);
                }}
                onAgentRemoved={(sessionId) => {
                    console.log('Agent removed:', sessionId);
                }}
            />
        </>
    );
}
