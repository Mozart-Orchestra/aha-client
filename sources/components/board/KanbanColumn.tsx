/**
 * KanbanColumn
 *
 * Renders a single kanban column: header with task count, a scrollable list
 * of task cards (either DraggableTaskCard or SwipeableTaskCard depending on
 * the interaction mode), and an "Add task" button.
 *
 * When isDropTarget is true the column background brightens to indicate the
 * user can release their dragged card here.
 */
import * as React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import type { KanbanColumn as KanbanColumnType, KanbanTask } from '@/sync/kanbanTypes';
import type { KanbanDnDHandlers, ColumnId } from '@/hooks/useKanbanDnD';
import { DraggableTaskCard } from './DraggableTaskCard';
import { SwipeableTaskCard } from './SwipeableTaskCard';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InteractionMode = 'drag' | 'swipe';

interface ColumnBoundary {
    columnId: ColumnId;
    startX: number;
    endX: number;
}

interface KanbanColumnProps {
    column: KanbanColumnType;
    tasks: KanbanTask[];
    isDropTarget: boolean;
    handlers: KanbanDnDHandlers;
    interactionMode: InteractionMode;
    columnBoundaries: ColumnBoundary[];
    /** Adjacent column titles for swipe hint labels. */
    forwardColumnTitle?: string;
    backwardColumnTitle?: string;
    onTaskPress?: (taskId: string) => void;
    onAddTask?: (columnId: ColumnId) => void;
}

// ---------------------------------------------------------------------------
// Column colour accents
// ---------------------------------------------------------------------------

const COLUMN_ACCENT: Record<string, string> = {
    todo: '#8E8E93',
    'in-progress': '#007AFF',
    review: '#FF9500',
    done: '#34C759',
};

function resolveAccent(columnId: string): string {
    return COLUMN_ACCENT[columnId] ?? '#007AFF';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const KanbanColumn = React.memo<KanbanColumnProps>(({
    column,
    tasks,
    isDropTarget,
    handlers,
    interactionMode,
    columnBoundaries,
    forwardColumnTitle,
    backwardColumnTitle,
    onTaskPress,
    onAddTask,
}) => {
    const { theme } = useUnistyles();
    const accent = resolveAccent(column.id);

    // Animated background tint when the column is a drop target.
    const dropTargetStyle = useAnimatedStyle(() => ({
        backgroundColor: withTiming(
            isDropTarget ? accent + '18' : theme.colors.groupped.background,
            { duration: 150 },
        ),
    }));

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------

    return (
        <Animated.View
            style={[styles.column, dropTargetStyle]}
            testID={`kanban-column-${column.id}`}
            // data-column attribute for Playwright web tests
            accessibilityLabel={`Column: ${column.title}`}
        >
            {/* Column header */}
            <View style={styles.header}>
                <View style={[styles.accentDot, { backgroundColor: accent }]} />
                <Text style={[styles.columnTitle, { color: theme.colors.text }]}>
                    {column.title}
                </Text>
                <View style={[styles.countBadge, { backgroundColor: theme.colors.surface }]}>
                    <Text style={[styles.countText, { color: theme.colors.textSecondary }]}>
                        {tasks.length}
                    </Text>
                </View>
            </View>

            {/* Task list */}
            <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.taskList}
                contentContainerStyle={styles.taskListContent}
                // Prevent the inner scroll from conflicting with the outer
                // horizontal scroll view — let gesture handler manage priority.
                scrollEventThrottle={16}
            >
                {tasks.map(task => (
                    interactionMode === 'drag' ? (
                        <DraggableTaskCard
                            key={task.id}
                            task={task}
                            columnId={column.id}
                            handlers={handlers}
                            onPress={onTaskPress}
                            columnBoundaries={columnBoundaries}
                        />
                    ) : (
                        <SwipeableTaskCard
                            key={task.id}
                            task={task}
                            columnId={column.id}
                            handlers={handlers}
                            onPress={onTaskPress}
                            forwardColumnTitle={forwardColumnTitle}
                            backwardColumnTitle={backwardColumnTitle}
                        />
                    )
                ))}

                {tasks.length === 0 && (
                    <View style={styles.emptyState}>
                        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                            No tasks
                        </Text>
                    </View>
                )}
            </ScrollView>

            {/* Add task button */}
            {onAddTask && (
                <Pressable
                    style={({ pressed }) => [
                        styles.addButton,
                        {
                            borderColor: theme.colors.divider,
                            backgroundColor: pressed ? theme.colors.surfacePressed : 'transparent',
                        },
                    ]}
                    onPress={() => onAddTask(column.id)}
                    accessibilityLabel={`Add task to ${column.title}`}
                >
                    <Ionicons name="add" size={16} color={theme.colors.textSecondary} />
                    <Text style={[styles.addButtonText, { color: theme.colors.textSecondary }]}>
                        Add task
                    </Text>
                </Pressable>
            )}
        </Animated.View>
    );
});

KanbanColumn.displayName = 'KanbanColumn';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create((theme) => ({
    column: {
        width: 280,
        borderRadius: 14,
        marginHorizontal: 6,
        padding: 12,
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    accentDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 8,
    },
    columnTitle: {
        fontSize: 15,
        fontWeight: '600',
        flex: 1,
    },
    countBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: theme.colors.divider,
    },
    countText: {
        fontSize: 12,
        fontWeight: '600',
    },
    taskList: {
        flex: 1,
    },
    taskListContent: {
        paddingBottom: 8,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 24,
    },
    emptyText: {
        fontSize: 13,
        fontStyle: 'italic',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderStyle: 'dashed',
        marginTop: 4,
        gap: 4,
    },
    addButtonText: {
        fontSize: 13,
    },
}));
