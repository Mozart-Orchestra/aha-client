import * as React from 'react';
import { Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Modal } from '@/modal';
import { TaskDetailModal } from '@/components/TaskDetailModal';
import { ReviewPRButton } from '@/components/team/ReviewPRButton';
import { TeamWorkspaceShell } from '@/components/web/TeamWorkspaceShell';
import { parseBoardTasksFromBody, buildBoardRootWithTasks, getNextBoardStatus, type BoardTask } from '@/components/web/teamBoard';
import {
    buildGanttTimeline,
    formatMonthDay,
    GANTT_DAY_WIDTH,
    GANTT_STATUS_LABELS,
    getGanttTickStep,
    getGanttTimelineWidth,
    ONE_DAY_MS,
} from '@/components/web/teamGantt';
import { uiPenColors, uiPenFontFamily, uiPenRadius } from '@/components/web/uiPenTokens';
import { buildBoardColumns, normalizeTaskStatus, summarizeTeamArtifacts } from '@/components/web/teamOverview';
import { useTeamTasks } from '@/hooks/useTeamTasks';
import type { KanbanTask } from '@/sync/kanbanTypes';
import { useAllSessions, useArtifact, useArtifacts } from '@/sync/storage';
import { sync } from '@/sync/sync';

type ViewMode = 'board' | 'gantt';

type FeedbackState = {
    tone: 'success' | 'error';
    message: string;
} | null;

function toFallbackKanbanTasks(body: string | null | undefined): KanbanTask[] {
    return parseBoardTasksFromBody(body).tasks.map((task) => ({
        ...task,
        createdAt: task.createdAt ?? task.updatedAt,
        updatedAt: task.updatedAt,
        dueDate: task.dueDate ?? null,
        dependencies: task.dependencies ?? [],
    }));
}

function toBoardTasks(tasks: KanbanTask[]): BoardTask[] {
    return tasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: normalizeTaskStatus(task.status),
        assigneeId: task.assigneeId ?? null,
        priority: task.priority,
        updatedAt: task.updatedAt,
        createdAt: task.createdAt,
        dueDate: task.dueDate ?? null,
        dependencies: task.dependencies ?? [],
    }));
}

function formatShortDate(timestamp?: number | null): string {
    if (!timestamp) {
        return 'No due date';
    }
    return new Date(timestamp).toLocaleDateString();
}

export default function WebBoardScreen() {
    const params = useLocalSearchParams<{ teamId?: string | string[]; taskId?: string | string[] }>();
    const artifacts = useArtifacts();
    const allSessions = useAllSessions();
    const teams = React.useMemo(() => summarizeTeamArtifacts(artifacts), [artifacts]);

    const paramTeamId = Array.isArray(params.teamId) ? params.teamId[0] : params.teamId;
    const paramTaskId = Array.isArray(params.taskId) ? params.taskId[0] : params.taskId;
    const selectedTeamId = paramTeamId || teams[0]?.id;
    const selectedTeam = React.useMemo(
        () => teams.find((team) => team.id === selectedTeamId) || null,
        [teams, selectedTeamId]
    );

    const selectedArtifact = useArtifact(selectedTeam?.id || '');
    const parsedBoard = React.useMemo(() => parseBoardTasksFromBody(selectedArtifact?.body), [selectedArtifact?.body]);
    const fallbackTasks = React.useMemo(() => toFallbackKanbanTasks(selectedArtifact?.body), [selectedArtifact?.body]);
    const taskState = useTeamTasks(selectedTeam?.id);
    const taskSource = taskState.source === 'canonical' || taskState.tasks.length > 0 ? 'canonical' : 'artifact';
    const tasks = taskSource === 'canonical' ? taskState.tasks : fallbackTasks;
    const taskSnapshots = React.useMemo(
        () => tasks.map((task) => ({
            id: task.id,
            title: task.title,
            status: normalizeTaskStatus(task.status),
            assigneeId: task.assigneeId ?? null,
            updatedAt: task.updatedAt,
        })),
        [tasks]
    );
    const boardColumns = React.useMemo(() => buildBoardColumns(taskSnapshots), [taskSnapshots]);
    const taskById = React.useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);

    const [newTaskTitle, setNewTaskTitle] = React.useState('');
    const [newTaskAssignee, setNewTaskAssignee] = React.useState('');
    const [isSaving, setIsSaving] = React.useState(false);
    const [viewMode, setViewMode] = React.useState<ViewMode>('board');
    const [selectedTaskId, setSelectedTaskId] = React.useState<string | null>(null);
    const [showTaskDetail, setShowTaskDetail] = React.useState(false);
    const [autoOpenedTaskId, setAutoOpenedTaskId] = React.useState<string | null>(null);
    const [actionFeedback, setActionFeedback] = React.useState<FeedbackState>(null);
    const [isRefining, setIsRefining] = React.useState(false);
    const [isRewriting, setIsRewriting] = React.useState(false);

    React.useEffect(() => {
        void sync.fetchArtifactsList().catch(() => undefined);
    }, []);

    React.useEffect(() => {
        if (!selectedTeam?.id) {
            return;
        }
        if (!selectedArtifact?.body) {
            void sync.fetchArtifactWithBody(selectedTeam.id).catch(() => undefined);
        }
    }, [selectedArtifact?.body, selectedTeam?.id]);

    const selectedTask = React.useMemo(
        () => tasks.find((task) => task.id === selectedTaskId) || null,
        [tasks, selectedTaskId]
    );

    React.useEffect(() => {
        if (!paramTaskId || autoOpenedTaskId === paramTaskId) {
            return;
        }
        if (!tasks.some((task) => task.id === paramTaskId)) {
            return;
        }
        setSelectedTaskId(paramTaskId);
        setShowTaskDetail(true);
        setAutoOpenedTaskId(paramTaskId);
    }, [autoOpenedTaskId, paramTaskId, tasks]);

    React.useEffect(() => {
        setActionFeedback(null);
    }, [selectedTaskId]);

    const assigneeLabelById = React.useMemo(
        () => new Map(allSessions.map((session) => [session.id, (session as any).displayName || (session as any).name || session.id])),
        [allSessions]
    );
    const ganttTimeline = React.useMemo(() => buildGanttTimeline(tasks, assigneeLabelById), [assigneeLabelById, tasks]);
    const ganttTickStep = React.useMemo(() => getGanttTickStep(ganttTimeline?.totalDays || 0), [ganttTimeline?.totalDays]);
    const ganttTimelineWidth = React.useMemo(() => getGanttTimelineWidth(ganttTimeline?.totalDays || 0), [ganttTimeline?.totalDays]);

    const getGanttStatusColor = React.useCallback((status: string) => {
        switch (status) {
            case 'todo':
                return '#4F6BD9';
            case 'in-progress':
                return '#2F7A9B';
            case 'review':
                return '#7F67C2';
            case 'blocked':
                return '#C0564A';
            case 'done':
                return '#3D8A5A';
            default:
                return uiPenColors.textSecondary;
        }
    }, []);

    const persistFallbackTasks = React.useCallback(async (nextTasks: KanbanTask[]) => {
        if (!selectedArtifact || !selectedTeam) {
            throw new Error('Artifact board is unavailable');
        }

        const nextRoot = buildBoardRootWithTasks(parsedBoard.root, toBoardTasks(nextTasks), selectedTeam.title);

        await sync.updateArtifact(
            selectedArtifact.id,
            selectedArtifact.title,
            JSON.stringify(nextRoot, null, 2),
            selectedArtifact.sessions,
            selectedArtifact.draft,
            selectedArtifact.type
        );

        await sync.fetchArtifactWithBody(selectedArtifact.id);
    }, [parsedBoard.root, selectedArtifact, selectedTeam]);

    async function runTaskMutation<T>(canonicalOp: () => Promise<T>, fallbackOp?: () => Promise<T>): Promise<T> {
        try {
            return await canonicalOp();
        } catch (error) {
            if (fallbackOp) {
                return await fallbackOp();
            }
            throw error;
        }
    }

    const openTaskDetail = React.useCallback((taskId: string) => {
        setSelectedTaskId(taskId);
        setShowTaskDetail(true);
        setActionFeedback(null);
    }, []);

    const createTask = React.useCallback(async () => {
        if (!selectedTeam) {
            return;
        }

        const title = newTaskTitle.trim();
        if (!title) {
            Modal.alert('Missing title', 'Enter a task title first.');
            return;
        }

        const assignee = newTaskAssignee.trim().replace(/^@/, '');
        const now = Date.now();

        setIsSaving(true);
        try {
            const createdTask = await runTaskMutation(
                () => taskState.createTask({
                    title,
                    assigneeId: assignee || null,
                    status: 'todo',
                }),
                selectedArtifact && selectedTeam
                    ? async () => {
                          const fallbackTask: KanbanTask = {
                              id: `task_${now}_${Math.random().toString(36).slice(2, 8)}`,
                              title,
                              status: 'todo',
                              assigneeId: assignee || null,
                              createdAt: now,
                              updatedAt: now,
                              dueDate: null,
                              dependencies: [],
                          };
                          await persistFallbackTasks([...fallbackTasks, fallbackTask]);
                          return fallbackTask;
                      }
                    : undefined
            );

            setNewTaskTitle('');
            setNewTaskAssignee('');
            openTaskDetail(createdTask.id);
        } catch (error) {
            Modal.alert('Task failed', error instanceof Error ? error.message : 'Failed to create task');
        } finally {
            setIsSaving(false);
        }
    }, [fallbackTasks, newTaskAssignee, newTaskTitle, openTaskDetail, persistFallbackTasks, selectedArtifact, selectedTeam, taskState]);

    const updateTask = React.useCallback(async (taskId: string, updates: Partial<KanbanTask>) => {
        const now = Date.now();
        await runTaskMutation(
            () => taskState.updateTask(taskId, updates),
            selectedArtifact && selectedTeam
                ? async () => {
                      const nextTasks = tasks.map((task) => (
                          task.id === taskId
                              ? {
                                    ...task,
                                    ...updates,
                                    updatedAt: now,
                                }
                              : task
                      ));
                      await persistFallbackTasks(nextTasks);
                      return nextTasks.find((task) => task.id === taskId)!;
                  }
                : undefined
        );
    }, [persistFallbackTasks, selectedArtifact, selectedTeam, taskState, tasks]);

    const moveTask = React.useCallback(async (task: KanbanTask) => {
        setIsSaving(true);
        try {
            await updateTask(task.id, { status: getNextBoardStatus(task.status) });
        } catch (error) {
            Modal.alert('Task failed', error instanceof Error ? error.message : 'Failed to move task');
        } finally {
            setIsSaving(false);
        }
    }, [updateTask]);

    const removeTask = React.useCallback(async (task: KanbanTask) => {
        const confirmed = await Modal.confirm('Delete Task', `Delete "${task.title}"? This cannot be undone.`);
        if (!confirmed) {
            return;
        }

        setIsSaving(true);
        try {
            await runTaskMutation(
                () => taskState.deleteTask(task.id),
                selectedArtifact && selectedTeam
                    ? async () => {
                          await persistFallbackTasks(tasks.filter((item) => item.id !== task.id));
                      }
                    : undefined
            );
            if (selectedTaskId === task.id) {
                setShowTaskDetail(false);
                setSelectedTaskId(null);
            }
        } catch (error) {
            Modal.alert('Delete failed', error instanceof Error ? error.message : 'Failed to delete task');
        } finally {
            setIsSaving(false);
        }
    }, [persistFallbackTasks, selectedArtifact, selectedTaskId, selectedTeam, taskState, tasks]);

    const handleRefineTask = React.useCallback(async (task: KanbanTask) => {
        setIsRefining(true);
        setActionFeedback(null);
        try {
            const result = await taskState.refineTask(task.id, `Board context for ${task.title}`);
            setActionFeedback({
                tone: 'success',
                message: result.refinement.suggestions.length > 0
                    ? `Refined task with ${result.refinement.suggestions.length} suggestions.`
                    : 'Refined task description.',
            });
        } catch (error) {
            setActionFeedback({
                tone: 'error',
                message: error instanceof Error ? error.message : 'Failed to refine task',
            });
        } finally {
            setIsRefining(false);
        }
    }, [taskState]);

    const handleRewriteTask = React.useCallback(async (task: KanbanTask) => {
        setIsRewriting(true);
        setActionFeedback(null);
        try {
            const result = await taskState.rewriteTask(task.id, 'concise');
            setActionFeedback({
                tone: 'success',
                message: `Rewrote task as “${result.rewrite.rewrittenTitle}”.`,
            });
        } catch (error) {
            setActionFeedback({
                tone: 'error',
                message: error instanceof Error ? error.message : 'Failed to rewrite task',
            });
        } finally {
            setIsRewriting(false);
        }
    }, [taskState]);

    const rightPanel = selectedTeam ? (
        <View style={{ flex: 1, padding: 12 }}>
            <Text
                style={{
                    color: uiPenColors.textPrimary,
                    fontSize: 14,
                    fontWeight: '700',
                    fontFamily: uiPenFontFamily,
                }}
            >
                Board Notes
            </Text>
            <Text
                style={{
                    marginTop: 6,
                    color: uiPenColors.textSecondary,
                    fontSize: 12,
                    lineHeight: 18,
                    fontFamily: uiPenFontFamily,
                }}
            >
                Canonical task API is the default write path here. Artifact body stays as a compatibility fallback.
            </Text>

            <View
                style={{
                    marginTop: 12,
                    borderRadius: uiPenRadius.lg,
                    borderWidth: 1,
                    borderColor: uiPenColors.borderSubtle,
                    backgroundColor: uiPenColors.bgElevated,
                    padding: 10,
                    gap: 8,
                }}
            >
                <Text style={{ color: uiPenColors.textPrimary, fontSize: 12, fontWeight: '700', fontFamily: uiPenFontFamily }}>
                    {tasks.length} tasks · {taskSource === 'canonical' ? 'canonical' : 'artifact fallback'}
                </Text>
                {boardColumns.map((column) => (
                    <View
                        key={column.id}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingVertical: 2,
                        }}
                    >
                        <Text style={{ color: uiPenColors.textSecondary, fontSize: 12, fontFamily: uiPenFontFamily }}>
                            {column.title}
                        </Text>
                        <Text style={{ color: uiPenColors.textPrimary, fontSize: 12, fontWeight: '700', fontFamily: uiPenFontFamily }}>
                            {column.tasks.length}
                        </Text>
                    </View>
                ))}
            </View>
        </View>
    ) : null;

    if (Platform.OS !== 'web') {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Text>Web board is only available on web.</Text>
            </View>
        );
    }

    if (!selectedTeam) {
        return (
            <TeamWorkspaceShell activeTab="board" title="Team Board" teams={teams} selectedTeamId={selectedTeamId}>
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <Text style={{ color: uiPenColors.textPrimary, fontSize: 18, fontWeight: '700', fontFamily: uiPenFontFamily }}>
                        No team board available
                    </Text>
                    <Text
                        style={{
                            marginTop: 8,
                            color: uiPenColors.textSecondary,
                            fontSize: 14,
                            fontFamily: uiPenFontFamily,
                            textAlign: 'center',
                            maxWidth: 520,
                        }}
                    >
                        Create a team first, then this view will show Todo / In Progress / Review / Done columns.
                    </Text>
                </View>
            </TeamWorkspaceShell>
        );
    }

    return (
        <>
            <TeamWorkspaceShell
                activeTab="board"
                title={`${selectedTeam.title} · Board`}
                teams={teams}
                selectedTeamId={selectedTeam.id}
                rightPanel={rightPanel}
                headerActions={
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Pressable
                            onPress={() => setViewMode('board')}
                            style={{
                                borderRadius: 10,
                                borderWidth: 1,
                                borderColor: uiPenColors.borderSubtle,
                                backgroundColor: viewMode === 'board' ? uiPenColors.bgElevated : uiPenColors.bgCard,
                                paddingHorizontal: 12,
                                paddingVertical: 7,
                            }}
                        >
                            <Text style={{ color: uiPenColors.textPrimary, fontSize: 12, fontWeight: '700', fontFamily: uiPenFontFamily }}>
                                Board
                            </Text>
                        </Pressable>
                        <Pressable
                            onPress={() => setViewMode('gantt')}
                            style={{
                                borderRadius: 10,
                                borderWidth: 1,
                                borderColor: uiPenColors.borderSubtle,
                                backgroundColor: viewMode === 'gantt' ? uiPenColors.bgElevated : uiPenColors.bgCard,
                                paddingHorizontal: 12,
                                paddingVertical: 7,
                            }}
                        >
                            <Text style={{ color: uiPenColors.textPrimary, fontSize: 12, fontWeight: '700', fontFamily: uiPenFontFamily }}>
                                Gantt
                            </Text>
                        </Pressable>
                        <Pressable
                            onPress={() => {
                                router.push(`/web/team-info?teamId=${encodeURIComponent(selectedTeam.id)}`);
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
                                Open Info
                            </Text>
                        </Pressable>
                    </View>
                }
            >
                <View style={{ flex: 1, backgroundColor: uiPenColors.bgPage }}>
                    <View style={{ padding: 14, gap: 8 }}>
                        {taskState.error && taskSource !== 'canonical' ? (
                            <View
                                style={{
                                    borderRadius: uiPenRadius.md,
                                    borderWidth: 1,
                                    borderColor: uiPenColors.borderSubtle,
                                    backgroundColor: uiPenColors.bgElevated,
                                    padding: 10,
                                }}
                            >
                                <Text style={{ color: uiPenColors.textPrimary, fontSize: 12, fontWeight: '700', fontFamily: uiPenFontFamily }}>
                                    Using artifact fallback
                                </Text>
                                <Text style={{ marginTop: 4, color: uiPenColors.textSecondary, fontSize: 12, fontFamily: uiPenFontFamily }}>
                                    {taskState.error}
                                </Text>
                            </View>
                        ) : null}

                        <TextInput
                            value={newTaskTitle}
                            onChangeText={setNewTaskTitle}
                            placeholder="New task title..."
                            placeholderTextColor={uiPenColors.textTertiary}
                            style={{
                                minHeight: 42,
                                borderRadius: uiPenRadius.md,
                                borderWidth: 1,
                                borderColor: uiPenColors.borderSubtle,
                                backgroundColor: uiPenColors.bgCard,
                                paddingHorizontal: 12,
                                color: uiPenColors.textPrimary,
                                fontFamily: uiPenFontFamily,
                            }}
                        />
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TextInput
                                value={newTaskAssignee}
                                onChangeText={setNewTaskAssignee}
                                placeholder="Assignee role (optional, @builder)"
                                placeholderTextColor={uiPenColors.textTertiary}
                                style={{
                                    flex: 1,
                                    minHeight: 42,
                                    borderRadius: uiPenRadius.md,
                                    borderWidth: 1,
                                    borderColor: uiPenColors.borderSubtle,
                                    backgroundColor: uiPenColors.bgCard,
                                    paddingHorizontal: 12,
                                    color: uiPenColors.textPrimary,
                                    fontFamily: uiPenFontFamily,
                                }}
                            />
                            <Pressable
                                onPress={() => {
                                    void createTask();
                                }}
                                disabled={isSaving}
                                style={{
                                    minHeight: 42,
                                    borderRadius: uiPenRadius.md,
                                    backgroundColor: uiPenColors.accentGreen,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    paddingHorizontal: 14,
                                }}
                            >
                                <Text style={{ color: uiPenColors.textInverse, fontSize: 12, fontWeight: '700', fontFamily: uiPenFontFamily }}>
                                    {isSaving ? 'Saving...' : 'Create Task'}
                                </Text>
                            </Pressable>
                        </View>
                    </View>

                    {viewMode === 'board' ? (
                        <ScrollView horizontal style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 14 }}>
                            {boardColumns.map((column) => (
                                <View key={column.id} style={{ width: 300, marginRight: 12 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <Text
                                            style={{
                                                color: uiPenColors.textPrimary,
                                                fontSize: 14,
                                                fontWeight: '700',
                                                fontFamily: uiPenFontFamily,
                                            }}
                                        >
                                            {column.title}
                                        </Text>
                                        <Text style={{ color: uiPenColors.textSecondary, fontSize: 12, fontFamily: uiPenFontFamily }}>
                                            {column.tasks.length}
                                        </Text>
                                    </View>

                                    <View
                                        style={{
                                            minHeight: 380,
                                            borderRadius: uiPenRadius.lg,
                                            borderWidth: 1,
                                            borderColor: uiPenColors.borderSubtle,
                                            backgroundColor: uiPenColors.bgCard,
                                            padding: 10,
                                        }}
                                    >
                                        {column.tasks.length === 0 ? (
                                            <Text style={{ color: uiPenColors.textSecondary, fontSize: 12, fontFamily: uiPenFontFamily }}>
                                                No tasks in {column.title.toLowerCase()}.
                                            </Text>
                                        ) : null}
                                        {column.tasks.map((snapshot) => {
                                            const task = taskById.get(snapshot.id) || {
                                                ...snapshot,
                                                createdAt: snapshot.updatedAt,
                                                updatedAt: snapshot.updatedAt,
                                                dueDate: null,
                                                dependencies: [],
                                            };

                                            return (
                                                <View
                                                    key={task.id}
                                                    style={{
                                                        borderRadius: uiPenRadius.md,
                                                        borderWidth: 1,
                                                        borderColor: uiPenColors.borderSubtle,
                                                        backgroundColor: uiPenColors.bgElevated,
                                                        paddingHorizontal: 10,
                                                        paddingVertical: 9,
                                                        marginBottom: 8,
                                                    }}
                                                >
                                                    <Pressable onPress={() => openTaskDetail(task.id)}>
                                                        <Text
                                                            style={{
                                                                color: uiPenColors.textPrimary,
                                                                fontSize: 13,
                                                                fontWeight: '600',
                                                                fontFamily: uiPenFontFamily,
                                                            }}
                                                        >
                                                            {task.title}
                                                        </Text>
                                                        {task.assigneeId ? (
                                                            <Text
                                                                style={{
                                                                    marginTop: 2,
                                                                    color: uiPenColors.textSecondary,
                                                                    fontSize: 11,
                                                                    fontFamily: uiPenFontFamily,
                                                                }}
                                                            >
                                                                @{task.assigneeId}
                                                            </Text>
                                                        ) : null}
                                                        <Text
                                                            style={{
                                                                marginTop: 6,
                                                                color: uiPenColors.textSecondary,
                                                                fontSize: 11,
                                                                fontFamily: uiPenFontFamily,
                                                            }}
                                                        >
                                                            {formatShortDate(task.dueDate)} · {task.dependencies?.length || 0} dependencies
                                                        </Text>
                                                    </Pressable>
                                                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                                                        <Pressable
                                                            onPress={() => {
                                                                void moveTask(task);
                                                            }}
                                                            style={{
                                                                flexDirection: 'row',
                                                                alignItems: 'center',
                                                                borderRadius: 8,
                                                                borderWidth: 1,
                                                                borderColor: uiPenColors.borderSubtle,
                                                                paddingHorizontal: 8,
                                                                paddingVertical: 6,
                                                                backgroundColor: uiPenColors.bgCard,
                                                            }}
                                                        >
                                                            <Ionicons name="arrow-forward" size={12} color={uiPenColors.textSecondary} />
                                                            <Text style={{ marginLeft: 4, color: uiPenColors.textSecondary, fontSize: 11, fontFamily: uiPenFontFamily }}>
                                                                Move
                                                            </Text>
                                                        </Pressable>
                                                        <Pressable
                                                            onPress={() => openTaskDetail(task.id)}
                                                            style={{
                                                                flexDirection: 'row',
                                                                alignItems: 'center',
                                                                borderRadius: 8,
                                                                borderWidth: 1,
                                                                borderColor: uiPenColors.borderSubtle,
                                                                paddingHorizontal: 8,
                                                                paddingVertical: 6,
                                                                backgroundColor: uiPenColors.bgCard,
                                                            }}
                                                        >
                                                            <Ionicons name="open-outline" size={12} color={uiPenColors.textSecondary} />
                                                            <Text style={{ marginLeft: 4, color: uiPenColors.textSecondary, fontSize: 11, fontFamily: uiPenFontFamily }}>
                                                                Open
                                                            </Text>
                                                        </Pressable>
                                                        <Pressable
                                                            onPress={() => {
                                                                void removeTask(task);
                                                            }}
                                                            style={{
                                                                flexDirection: 'row',
                                                                alignItems: 'center',
                                                                borderRadius: 8,
                                                                borderWidth: 1,
                                                                borderColor: uiPenColors.borderSubtle,
                                                                paddingHorizontal: 8,
                                                                paddingVertical: 6,
                                                                backgroundColor: uiPenColors.bgCard,
                                                            }}
                                                        >
                                                            <Ionicons name="trash-outline" size={12} color={uiPenColors.accentRed} />
                                                            <Text style={{ marginLeft: 4, color: uiPenColors.accentRed, fontSize: 11, fontFamily: uiPenFontFamily }}>
                                                                Delete
                                                            </Text>
                                                        </Pressable>
                                                    </View>
                                                </View>
                                            );
                                        })}
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    ) : ganttTimeline ? (
                        <ScrollView horizontal style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 14 }}>
                            <View style={{ minWidth: ganttTimelineWidth + 260 }}>
                                <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                                    <View
                                        style={{
                                            width: 240,
                                            paddingHorizontal: 12,
                                            paddingVertical: 8,
                                            borderWidth: 1,
                                            borderColor: uiPenColors.borderSubtle,
                                            borderTopLeftRadius: uiPenRadius.lg,
                                            backgroundColor: uiPenColors.bgCard,
                                        }}
                                    >
                                        <Text style={{ color: uiPenColors.textPrimary, fontSize: 12, fontWeight: '700', fontFamily: uiPenFontFamily }}>
                                            Task / Owner
                                        </Text>
                                    </View>
                                    <View
                                        style={{
                                            width: ganttTimelineWidth,
                                            borderWidth: 1,
                                            borderLeftWidth: 0,
                                            borderColor: uiPenColors.borderSubtle,
                                            borderTopRightRadius: uiPenRadius.lg,
                                            backgroundColor: uiPenColors.bgCard,
                                            position: 'relative',
                                            height: 42,
                                        }}
                                    >
                                        {ganttTimeline.ticks.map((tickAt, tickIndex) => (
                                            <View key={tickAt}>
                                                <View
                                                    style={{
                                                        position: 'absolute',
                                                        left: tickIndex * GANTT_DAY_WIDTH,
                                                        top: 0,
                                                        bottom: 0,
                                                        width: 1,
                                                        backgroundColor: uiPenColors.borderSubtle,
                                                    }}
                                                />
                                                {(tickIndex % ganttTickStep === 0 || tickIndex === ganttTimeline.totalDays) ? (
                                                    <Text
                                                        style={{
                                                            position: 'absolute',
                                                            left: tickIndex * GANTT_DAY_WIDTH + 4,
                                                            top: 12,
                                                            color: uiPenColors.textSecondary,
                                                            fontSize: 10,
                                                            fontFamily: uiPenFontFamily,
                                                        }}
                                                    >
                                                        {formatMonthDay(tickAt)}
                                                    </Text>
                                                ) : null}
                                            </View>
                                        ))}
                                    </View>
                                </View>

                                {ganttTimeline.rows.map((row, rowIndex) => {
                                    const barColor = getGanttStatusColor(row.status);
                                    const barLeft = row.offsetDays * GANTT_DAY_WIDTH + 2;
                                    const barWidth = Math.max(GANTT_DAY_WIDTH - 4, row.spanDays * GANTT_DAY_WIDTH - 6);
                                    const endLabel = row.task.dueDate ? formatMonthDay(row.endAt - ONE_DAY_MS) : 'No due';

                                    return (
                                        <View key={row.task.id} style={{ flexDirection: 'row' }}>
                                            <Pressable
                                                onPress={() => openTaskDetail(row.task.id)}
                                                style={{
                                                    width: 240,
                                                    paddingHorizontal: 12,
                                                    paddingVertical: 10,
                                                    borderWidth: 1,
                                                    borderTopWidth: rowIndex === 0 ? 0 : 1,
                                                    borderColor: uiPenColors.borderSubtle,
                                                    backgroundColor: uiPenColors.bgCard,
                                                }}
                                            >
                                                <Text style={{ color: uiPenColors.textPrimary, fontSize: 12, fontWeight: '700', fontFamily: uiPenFontFamily }}>
                                                    {row.task.title}
                                                </Text>
                                                <Text style={{ marginTop: 4, color: uiPenColors.textSecondary, fontSize: 11, fontFamily: uiPenFontFamily }}>
                                                    {row.assigneeLabel} · {GANTT_STATUS_LABELS[row.status] || row.status}
                                                </Text>
                                                <Text style={{ marginTop: 2, color: uiPenColors.textSecondary, fontSize: 10, fontFamily: uiPenFontFamily }}>
                                                    {formatMonthDay(row.startAt)} → {endLabel}
                                                </Text>
                                            </Pressable>
                                            <View
                                                style={{
                                                    width: ganttTimelineWidth,
                                                    minHeight: 72,
                                                    borderWidth: 1,
                                                    borderTopWidth: rowIndex === 0 ? 0 : 1,
                                                    borderLeftWidth: 0,
                                                    borderColor: uiPenColors.borderSubtle,
                                                    backgroundColor: uiPenColors.bgCard,
                                                    position: 'relative',
                                                }}
                                            >
                                                {ganttTimeline.ticks.map((tickAt, tickIndex) => (
                                                    <View
                                                        key={`${row.task.id}-${tickAt}`}
                                                        style={{
                                                            position: 'absolute',
                                                            left: tickIndex * GANTT_DAY_WIDTH,
                                                            top: 0,
                                                            bottom: 0,
                                                            width: 1,
                                                            backgroundColor: uiPenColors.borderSubtle,
                                                        }}
                                                    />
                                                ))}
                                                <View
                                                    style={{
                                                        position: 'absolute',
                                                        left: barLeft,
                                                        top: 18,
                                                        width: barWidth,
                                                        minHeight: 34,
                                                        borderRadius: 999,
                                                        backgroundColor: barColor,
                                                        justifyContent: 'center',
                                                        paddingHorizontal: 12,
                                                    }}
                                                >
                                                    <Text numberOfLines={1} style={{ color: uiPenColors.textInverse, fontSize: 11, fontWeight: '700', fontFamily: uiPenFontFamily }}>
                                                        {row.task.title}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        </ScrollView>
                    ) : (
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                            <Text style={{ color: uiPenColors.textPrimary, fontSize: 16, fontWeight: '700', fontFamily: uiPenFontFamily }}>
                                No tasks scheduled yet
                            </Text>
                            <Text
                                style={{
                                    marginTop: 8,
                                    color: uiPenColors.textSecondary,
                                    fontSize: 13,
                                    fontFamily: uiPenFontFamily,
                                    textAlign: 'center',
                                    maxWidth: 480,
                                }}
                            >
                                Add tasks and set due dates in task details to populate the gantt timeline.
                            </Text>
                        </View>
                    )}
                </View>
            </TeamWorkspaceShell>

            <TaskDetailModal
                visible={showTaskDetail}
                task={selectedTask}
                columns={[
                    { id: 'todo', title: 'To Do' },
                    { id: 'in-progress', title: 'In Progress' },
                    { id: 'review', title: 'Review' },
                    { id: 'done', title: 'Done' },
                ]}
                onClose={() => {
                    setShowTaskDetail(false);
                }}
                onDiscuss={(task) => {
                    router.push(`/web/team-chat?teamId=${encodeURIComponent(selectedTeam.id)}&taskId=${encodeURIComponent(task.id)}` as any);
                }}
                onSave={async (taskId, updates) => {
                    await updateTask(taskId, updates);
                    setShowTaskDetail(false);
                }}
                allSessions={allSessions}
                onRefine={handleRefineTask}
                onRewrite={handleRewriteTask}
                isRefining={isRefining}
                isRewriting={isRewriting}
                actionFeedback={actionFeedback}
                extraActions={selectedTask ? <ReviewPRButton teamId={selectedTeam.id} label="Review PR" /> : null}
            />
        </>
    );
}
