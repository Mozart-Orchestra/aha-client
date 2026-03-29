import React from 'react';
import { View, ScrollView, Pressable, Platform } from 'react-native';
import { Text } from '@/components/ui/StyledText';
import { Ionicons } from '@expo/vector-icons';
import { TeamStatusBar } from '@/components/team/TeamStatusBar';
import { getSessionName } from '@/utils/sessionUtils';
import { withAlpha, getHumanStatusLockLabel } from '@/utils/teamUtils';
import type { KanbanTask, KanbanColumn } from '@/sync/kanbanTypes';
import type { stylesheet } from '@/app/(app)/teams/teamStyles';
import { resolveTaskDropStatus } from './kanbanBoardDrag';

function getPriorityAccentColor(priority?: string | null): string {
    if (priority === 'high' || priority === 'urgent') return '#FF3B30';
    if (priority === 'medium') return '#FF9500';
    if (priority === 'low') return '#34C759';
    return 'transparent';
}

function getColumnStatusColor(columnId: string): string {
    if (columnId === 'done') return '#34C759';
    if (columnId === 'in-progress') return '#FF9500';
    if (columnId === 'review') return '#007AFF';
    return '#C7C7CC';
}

const ASSIGNEE_BADGE_COLORS = ['#007AFF', '#FF9500', '#34C759', '#AF52DE', '#FF2D55', '#5AC8FA', '#FF6B6B'];

function getAssigneeBadgeColor(id: string): string {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
    return ASSIGNEE_BADGE_COLORS[Math.abs(hash) % ASSIGNEE_BADGE_COLORS.length];
}

export const KanbanBoardPanel = React.memo(function KanbanBoardPanel({
    styles,
    theme,
    tasks,
    approvedTasks,
    columns,
    taskSessionLinks,
    sessionLookup,
    matchesColumn,
    onBoardSignalPress,
    onOpenTask,
    onMoveTask,
    onMoveTaskToColumn,
    onAddTask,
}: {
    styles: typeof stylesheet;
    theme: any;
    tasks: KanbanTask[];
    approvedTasks: KanbanTask[];
    columns: KanbanColumn[];
    taskSessionLinks: Map<string, { sessionId: string; title: string; linkedAt: number }[]>;
    sessionLookup: Map<string, any>;
    matchesColumn: (task: KanbanTask, columnId: string) => boolean;
    onBoardSignalPress?: (signal: 'running' | 'deciding' | 'blocked') => void;
    onOpenTask: (task: KanbanTask) => void;
    onMoveTask: (task: KanbanTask) => void;
    onMoveTaskToColumn: (task: KanbanTask, columnId: string) => void;
    onAddTask: (columnId: string) => void;
}) {
    const [draggingTaskId, setDraggingTaskId] = React.useState<string | null>(null);
    const [touchMoveTaskId, setTouchMoveTaskId] = React.useState<string | null>(null);
    const [activeDropColumnId, setActiveDropColumnId] = React.useState<string | null>(null);
    const suppressOpenTaskIdRef = React.useRef<string | null>(null);
    const activeMoveTaskId = draggingTaskId ?? touchMoveTaskId;
    const activeMoveTask = React.useMemo(
        () => approvedTasks.find((task) => task.id === activeMoveTaskId) ?? null,
        [activeMoveTaskId, approvedTasks]
    );

    const resetMoveState = React.useCallback(() => {
        setDraggingTaskId(null);
        setTouchMoveTaskId(null);
        setActiveDropColumnId(null);
    }, []);

    const commitMove = React.useCallback((targetColumnId: string) => {
        if (!activeMoveTask) {
            resetMoveState();
            return;
        }

        const nextStatus = resolveTaskDropStatus({
            currentStatus: activeMoveTask.status,
            targetColumnId,
        });

        if (nextStatus) {
            onMoveTaskToColumn(activeMoveTask, nextStatus);
        }

        resetMoveState();
    }, [activeMoveTask, onMoveTaskToColumn, resetMoveState]);

    return (
        <>
            <TeamStatusBar tasks={tasks} onSignalPress={onBoardSignalPress} />

            <View style={styles.boardContainer}>
                {columns.map((column) => (
                    <View
                        key={column.id}
                        style={[
                            styles.column,
                            { position: 'relative' },
                            activeMoveTaskId && activeDropColumnId === column.id
                                ? {
                                    borderColor: theme.colors.button.primary.background,
                                    backgroundColor: withAlpha(theme.colors.button.primary.background, 0.08),
                                }
                                : null,
                        ]}
                        {...(Platform.OS === 'web'
                            ? {
                                onDragOver: (event: any) => {
                                    if (!draggingTaskId) return;
                                    event.preventDefault?.();
                                    setActiveDropColumnId(column.id);
                                },
                                onDrop: (event: any) => {
                                    if (!draggingTaskId) return;
                                    event.preventDefault?.();
                                    commitMove(column.id);
                                },
                            }
                            : {})}
                    >
                        <View style={styles.columnHeader}>
                            <View style={styles.columnHeaderLeft}>
                                <View
                                    style={[
                                        styles.columnStatusDot,
                                        { backgroundColor: getColumnStatusColor(column.id) },
                                    ]}
                                />
                                <Text style={styles.columnTitle}>{column.title}</Text>
                            </View>
                            <Text style={styles.taskCount}>
                                {approvedTasks.filter((task) => matchesColumn(task, column.id)).length}
                            </Text>
                        </View>

                        {touchMoveTaskId && activeMoveTask && (
                            <Pressable
                                style={{
                                    position: 'absolute',
                                    top: 54,
                                    left: 12,
                                    right: 12,
                                    bottom: 12,
                                    borderRadius: 12,
                                    borderWidth: 1,
                                    borderStyle: 'dashed',
                                    borderColor: activeDropColumnId === column.id
                                        ? theme.colors.button.primary.background
                                        : theme.colors.divider,
                                    backgroundColor: activeDropColumnId === column.id
                                        ? withAlpha(theme.colors.button.primary.background, 0.12)
                                        : withAlpha(theme.colors.surface, 0.9),
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    paddingHorizontal: 16,
                                    zIndex: 3,
                                }}
                                onPress={() => commitMove(column.id)}
                            >
                                <Text
                                    style={{
                                        fontSize: 12,
                                        fontWeight: '600',
                                        color: theme.colors.text,
                                        textAlign: 'center',
                                    }}
                                >
                                    {resolveTaskDropStatus({
                                        currentStatus: activeMoveTask.status,
                                        targetColumnId: column.id,
                                    })
                                        ? `移动到 ${column.title}`
                                        : '当前位置'}
                                </Text>
                            </Pressable>
                        )}

                        <ScrollView contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
                            {approvedTasks
                                .filter((task) => matchesColumn(task, column.id))
                                .map((task) => {
                                    const activeLink = task.executionLinks?.find((link) => link.status === 'active');
                                    const activeAgentSession = activeLink ? sessionLookup.get(activeLink.sessionId) : null;
                                    const activeAgentName = activeAgentSession
                                        ? getSessionName(activeAgentSession)
                                        : activeLink?.sessionId?.slice(0, 8) ?? null;
                                    const assigneeSession = task.assigneeId ? sessionLookup.get(task.assigneeId) : null;
                                    const assigneeName = assigneeSession
                                        ? getSessionName(assigneeSession)
                                        : task.assigneeId?.slice(0, 8) ?? null;
                                    const humanLockLabel = getHumanStatusLockLabel(task.humanStatusLock);

                                    return (
                                        <Pressable
                                            key={task.id}
                                            style={[
                                                styles.taskCard,
                                                activeMoveTaskId === task.id
                                                    ? { opacity: 0.48 }
                                                    : null,
                                            ]}
                                            onPress={() => {
                                                if (suppressOpenTaskIdRef.current === task.id) {
                                                    suppressOpenTaskIdRef.current = null;
                                                    return;
                                                }
                                                if (touchMoveTaskId) {
                                                    return;
                                                }
                                                onOpenTask(task);
                                            }}
                                            onLongPress={() => {
                                                if (Platform.OS === 'web') {
                                                    onMoveTask(task);
                                                    return;
                                                }
                                                suppressOpenTaskIdRef.current = task.id;
                                                setTouchMoveTaskId(task.id);
                                                setActiveDropColumnId(column.id);
                                            }}
                                            delayLongPress={Platform.OS === 'web' ? 400 : 220}
                                            {...(Platform.OS === 'web'
                                                ? ({
                                                    draggable: true,
                                                    onDragStart: (event: any) => {
                                                        setDraggingTaskId(task.id);
                                                        setActiveDropColumnId(null);
                                                        event.dataTransfer?.setData?.('text/plain', task.id);
                                                        if (event.dataTransfer) {
                                                            event.dataTransfer.effectAllowed = 'move';
                                                        }
                                                    },
                                                    onDragEnd: () => {
                                                        resetMoveState();
                                                    },
                                                } as any)
                                                : {})}
                                        >
                                            {task.priority && (
                                                <View
                                                    style={[
                                                        styles.taskPriorityAccent,
                                                        { backgroundColor: getPriorityAccentColor(task.priority) },
                                                    ]}
                                                />
                                            )}
                                            <Text style={styles.taskTitle}>{task.title}</Text>
                                            {task.description ? (
                                                <Text style={styles.taskDescription} numberOfLines={3}>
                                                    {task.description}
                                                </Text>
                                            ) : null}
                                            {assigneeName ? (
                                                <View style={styles.taskAssigneeRow}>
                                                    <View
                                                        style={[
                                                            styles.taskAssigneeBadge,
                                                            { backgroundColor: getAssigneeBadgeColor(task.assigneeId || assigneeName) },
                                                        ]}
                                                    >
                                                        <Text style={styles.taskAssigneeBadgeText}>
                                                            {assigneeName[0].toUpperCase()}
                                                        </Text>
                                                    </View>
                                                    <Text style={styles.taskAssigneeName}>{assigneeName}</Text>
                                                </View>
                                            ) : null}
                                            {humanLockLabel ? (
                                                <View style={styles.taskHumanLockBadge}>
                                                    <Ionicons name="hand-left-outline" size={12} color="#C26A00" />
                                                    <Text style={styles.taskHumanLockText}>{humanLockLabel}</Text>
                                                </View>
                                            ) : null}

                                            {(task.priority || activeAgentName) && (
                                                <View style={styles.taskMeta}>
                                                    {activeAgentName && (
                                                        <View style={styles.taskActiveExecution}>
                                                            <Ionicons name="flash" size={11} color="#FF9500" />
                                                            <Text style={styles.taskActiveExecutionText}>{activeAgentName}</Text>
                                                        </View>
                                                    )}
                                                    {task.priority && (
                                                        <View
                                                            style={[
                                                                styles.taskPriority,
                                                                {
                                                                    backgroundColor: task.priority === 'high' || task.priority === 'urgent'
                                                                        ? withAlpha(theme.colors.textDestructive, 0.125)
                                                                        : task.priority === 'medium'
                                                                            ? withAlpha(theme.colors.warning, 0.125)
                                                                            : withAlpha(theme.colors.success, 0.125),
                                                                },
                                                            ]}
                                                        >
                                                            <Text
                                                                style={[
                                                                    styles.taskSessionsText,
                                                                    {
                                                                        color: task.priority === 'high' || task.priority === 'urgent'
                                                                            ? theme.colors.textDestructive
                                                                            : task.priority === 'medium'
                                                                                ? theme.colors.warning
                                                                                : theme.colors.success,
                                                                    },
                                                                ]}
                                                            >
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
                                onPress={() => onAddTask(column.id)}
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
});
