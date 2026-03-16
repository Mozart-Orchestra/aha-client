import * as React from 'react';
import { View, ScrollView, Text, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '@/text';
import { layout } from '@/utils/layout';
import { ZenHeader } from './components/ZenHeader';
import { TodoList } from './components/TodoList';
import { useUnistyles } from 'react-native-unistyles';
import { router } from 'expo-router';
import { storage } from '@/sync/storage';
import { toggleTodo as toggleTodoSync, reorderTodos as reorderTodosSync, convertTodoToKanban } from '@/-zen/model/ops';
import { useAuth } from '@/auth/AuthContext';
import { useShallow } from 'zustand/react/shallow';
import type { KanbanBoard, KanbanTask } from '@/sync/kanbanTypes';

export const ZenHome = () => {
    const insets = useSafeAreaInsets();
    const { theme } = useUnistyles();
    const auth = useAuth();

    // Get todos from storage
    const todoState = storage(useShallow(state => state.todoState));
    const todosLoaded = storage(state => state.todosLoaded);

    // Process todos
    const { undoneTodos, doneTodos } = React.useMemo(() => {
        if (!todoState) {
            return { undoneTodos: [], doneTodos: [] };
        }

        const undone = todoState.undoneOrder
            .map(id => todoState.todos[id])
            .filter(Boolean)
            .map(t => ({
                id: t.id,
                title: t.title,
                done: t.done,
                kanbanTaskId: t.kanbanTaskId,
                teamId: t.teamId
            }));

        const done = todoState.doneOrder
            .map(id => todoState.todos[id])
            .filter(Boolean)
            .map(t => ({
                id: t.id,
                title: t.title,
                done: t.done,
                kanbanTaskId: t.kanbanTaskId,
                teamId: t.teamId
            }));

        return { undoneTodos: undone, doneTodos: done };
    }, [todoState]);

    // Handle toggle action
    const handleToggle = React.useCallback(async (id: string) => {
        if (auth?.credentials) {
            await toggleTodoSync(auth.credentials, id);
        }
    }, [auth?.credentials]);

    // Handle reorder action
    const handleReorder = React.useCallback(async (id: string, newIndex: number) => {
        if (auth?.credentials) {
            await reorderTodosSync(auth.credentials, id, newIndex, 'undone');
        }
    }, [auth?.credentials]);

    // Handle convert Todo to Kanban task
    const handleConvertTodoToTask = React.useCallback(async (todoId: string) => {
        if (!auth?.credentials) return;

        // Check if user has any teams
        const artifacts = storage.getState().artifacts;
        const teamIds = Object.keys(artifacts).filter(id =>
            artifacts[id].type === 'team' && artifacts[id].body
        );

        if (teamIds.length === 0) {
            Alert.alert('提示', '您还没有创建任何团队，请先创建团队后再转换任务。');
            return;
        }

        // For simplicity, use the first team (could add team selector in the future)
        const teamId = teamIds[0];

        try {
            // Create a Kanban task from the Todo
            const kanbanTask = await convertTodoToKanban(
                auth.credentials,
                todoId,
                teamId,
                async (taskData: Partial<KanbanTask>): Promise<KanbanTask> => {
                    // This callback creates the actual Kanban task
                    const artifact = artifacts[teamId];
                    if (!artifact?.body) throw new Error('Team not found');

                    let board: KanbanBoard;
                    try {
                        board = JSON.parse(artifact.body);
                    } catch (error) {
                        throw new Error('Invalid team board data');
                    }

                    if (!board || typeof board !== 'object') {
                        throw new Error('Invalid team board data');
                    }

                    if (!Array.isArray(board.tasks)) {
                        board.tasks = [];
                    }

                    const profileId = storage.getState().profile?.id ?? null;
                    const newTask: KanbanTask = {
                        id: Math.random().toString(36).substring(2, 15),
                        title: taskData.title || '',
                        description: taskData.description,
                        status: 'todo',
                        priority: taskData.priority || 'medium',
                        tags: taskData.tags || [],
                        dueDate: taskData.dueDate,
                        todoId: taskData.todoId,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                        assigneeId: taskData.assigneeId ?? profileId,
                        reporterId: profileId ?? undefined
                    };

                    board.tasks.push(newTask);

                    // Update artifact
                    const { sync } = await import('@/sync/sync');
                    await sync.updateArtifact(
                        teamId,
                        artifact.title,
                        JSON.stringify(board, null, 2),
                        artifact.sessions,
                        artifact.draft,
                        artifact.type
                    );

                    return newTask;
                }
            );

            if (kanbanTask) {
                Alert.alert(
                    '转换成功',
                    `Todo 已转换为 Kanban 任务`,
                    [
                        { text: '查看任务', onPress: () => router.push(`/teams/${teamId}`) },
                        { text: '好的' }
                    ]
                );
            }
        } catch (error) {
            console.error('Failed to convert Todo to Kanban task:', error);
            Alert.alert('转换失败', '无法将 Todo 转换为 Kanban 任务，请重试。');
        }
    }, [auth?.credentials]);

    // Handle view linked Kanban task
    const handleViewKanbanTask = React.useCallback((taskId: string, teamId: string) => {
        router.push(`/teams/${teamId}`);
    }, []);

    // Add keyboard shortcut for "T" to open new task (Web only)
    React.useEffect(() => {
        if (Platform.OS !== 'web') {
            return;
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            // Check if no input is focused (to avoid triggering when typing)
            const activeElement = document.activeElement as HTMLElement;
            const isInputFocused = activeElement?.tagName === 'INPUT' ||
                                   activeElement?.tagName === 'TEXTAREA' ||
                                   activeElement?.contentEditable === 'true';

            // Trigger on simple "T" key press when no modifier keys are pressed and no input is focused
            if (e.key === 't' && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey && !isInputFocused) {
                e.preventDefault();
                router.push('/zen/new');
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    return (
        <>
            <ZenHeader />
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ flexGrow: 1 }}
                showsVerticalScrollIndicator={false}
            >
                <View style={{ flexDirection: 'row', flex: 1, justifyContent: 'center' }}>
                    <View style={{
                        flex: 1,
                        maxWidth: layout.maxWidth,
                        alignSelf: 'stretch',
                        paddingTop: 20,
                    }}>
                        {undoneTodos.length === 0 ? (
                            <View style={{ padding: 20, alignItems: 'center' }}>
                                <Text style={{ color: theme.colors.textSecondary, fontSize: 16 }}>
                                    {t('zen.noTasksYet')}
                                </Text>
                            </View>
                        ) : (
                            <TodoList
                                todos={undoneTodos}
                                onToggleTodo={handleToggle}
                                onReorderTodo={handleReorder}
                                onConvertTodoToTask={handleConvertTodoToTask}
                                onViewKanbanTask={handleViewKanbanTask}
                            />
                        )}
                    </View>
                </View>
            </ScrollView>
        </>
    );
};
