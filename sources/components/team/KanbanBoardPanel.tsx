import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text } from '@/components/ui/StyledText';
import { Ionicons } from '@expo/vector-icons';
import { TeamStatusBar } from '@/components/team/TeamStatusBar';
import { getSessionName } from '@/utils/sessionUtils';
import { withAlpha, getHumanStatusLockLabel } from '@/utils/teamUtils';
import type { KanbanTask, KanbanColumn } from '@/sync/kanbanTypes';
import type { stylesheet } from '@/app/(app)/teams/teamStyles';

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
    onAddTask: (columnId: string) => void;
}) {
    return (
        <>
            <TeamStatusBar tasks={tasks} onSignalPress={onBoardSignalPress} />

            <View style={styles.boardContainer}>
                {columns.map((column) => (
                    <View key={column.id} style={styles.column}>
                        <View style={styles.columnHeader}>
                            <Text style={styles.columnTitle}>{column.title}</Text>
                            <Text style={styles.taskCount}>
                                {approvedTasks.filter((task) => matchesColumn(task, column.id)).length}
                            </Text>
                        </View>

                        <ScrollView contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
                            {approvedTasks
                                .filter((task) => matchesColumn(task, column.id))
                                .map((task) => {
                                    const linkedSessions = taskSessionLinks.get(task.id) || [];
                                    const sessionCount = linkedSessions.length;
                                    const activeLink = task.executionLinks?.find((link) => link.status === 'active');
                                    const activeAgentSession = activeLink ? sessionLookup.get(activeLink.sessionId) : null;
                                    const activeAgentName = activeAgentSession
                                        ? getSessionName(activeAgentSession)
                                        : activeLink?.sessionId?.slice(0, 8) ?? null;
                                    const assigneeSession = task.assigneeId ? sessionLookup.get(task.assigneeId) : null;
                                    const assigneeName = assigneeSession
                                        ? getSessionName(assigneeSession)
                                        : task.assigneeId?.slice(0, 8) ?? null;
                                    const reporterSession = task.reporterId ? sessionLookup.get(task.reporterId) : null;
                                    const reporterName = reporterSession
                                        ? getSessionName(reporterSession)
                                        : task.reporterId?.slice(0, 8) ?? null;
                                    const lastComment = task.comments?.length ? task.comments[task.comments.length - 1] : null;
                                    const lastCommentAuthor = lastComment
                                        ? (lastComment.authorDisplayName
                                            || lastComment.authorRole
                                            || lastComment.authorSessionId?.slice(0, 8)
                                            || 'Unknown')
                                        : null;
                                    const humanLockLabel = getHumanStatusLockLabel(task.humanStatusLock);

                                    return (
                                        <Pressable
                                            key={task.id}
                                            style={styles.taskCard}
                                            onPress={() => onOpenTask(task)}
                                            onLongPress={() => onMoveTask(task)}
                                        >
                                            <Text style={styles.taskTitle}>{task.title}</Text>
                                            {assigneeName ? (
                                                <Text style={styles.taskAssignee}>Assignee: @{assigneeName}</Text>
                                            ) : null}
                                            {reporterName ? (
                                                <Text style={styles.taskReporter}>Reporter: {reporterName}</Text>
                                            ) : null}
                                            {lastComment && lastCommentAuthor ? (
                                                <Text style={styles.taskCommentSummary} numberOfLines={2}>
                                                    {lastCommentAuthor}: {lastComment.content}
                                                </Text>
                                            ) : null}
                                            {humanLockLabel ? (
                                                <View style={styles.taskHumanLockBadge}>
                                                    <Ionicons name="hand-left-outline" size={12} color="#C26A00" />
                                                    <Text style={styles.taskHumanLockText}>{humanLockLabel}</Text>
                                                </View>
                                            ) : null}

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
