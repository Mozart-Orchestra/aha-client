/**
 * KanbanBoard
 *
 * The complete board view: a horizontal ScrollView containing one KanbanColumn
 * per board column.  Handles:
 *   • Cross-column drag-and-drop (via useKanbanDnD)
 *   • Swipe-to-change-status (delegated to SwipeableTaskCard via handlers)
 *   • Optimistic local state with server rollback
 *   • Column boundary measurement for accurate drop-target detection
 *
 * Interaction mode toggle:
 *   Users can switch between 'drag' and 'swipe' modes.  Swipe is the default
 *   on mobile (Mom Test finding: 80% of users prefer swipe over drag).
 *
 * Layout:
 *   Each column is 280 px wide with 12 px horizontal margin.
 *   The outer ScrollView is horizontal; inner column ScrollViews are vertical.
 */
import * as React from 'react';
import { ScrollView, View, Text, Pressable } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import type { KanbanBoard as KanbanBoardType } from '@/sync/kanbanTypes';
import { useKanbanDnD } from '@/hooks/useKanbanDnD';
import { KanbanColumn, type InteractionMode } from './KanbanColumn';
import type { ColumnId } from '@/hooks/useKanbanDnD';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface KanbanBoardProps {
    board: KanbanBoardType;
    teamArtifactId: string;
    teamArtifactTitle: string;
    teamArtifactSessions: string[];
    onTaskPress?: (taskId: string) => void;
    onAddTask?: (columnId: ColumnId) => void;
}

// ---------------------------------------------------------------------------
// Column boundary helpers
// ---------------------------------------------------------------------------

const COLUMN_WIDTH = 280;
const COLUMN_MARGIN = 12; // horizontal margin each side
const COLUMN_STRIDE = COLUMN_WIDTH + COLUMN_MARGIN * 2;

function buildColumnBoundaries(columnIds: ColumnId[]) {
    return columnIds.map((columnId, index) => ({
        columnId,
        startX: index * COLUMN_STRIDE,
        endX: (index + 1) * COLUMN_STRIDE,
    }));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const KanbanBoard = React.memo<KanbanBoardProps>(({
    board,
    teamArtifactId,
    teamArtifactTitle,
    teamArtifactSessions,
    onTaskPress,
    onAddTask,
}) => {
    const { theme } = useUnistyles();

    // Default to swipe mode on mobile (Mom Test insight: users prefer it).
    const [interactionMode, setInteractionMode] = React.useState<InteractionMode>('swipe');

    // DnD state and handlers.
    const { state, handlers } = useKanbanDnD(
        board,
        teamArtifactId,
        teamArtifactTitle,
        teamArtifactSessions,
    );

    // Column boundaries for drag drop-target resolution.
    const columnIds = React.useMemo(
        () => board.columns.map(c => c.id),
        [board.columns],
    );
    const columnBoundaries = React.useMemo(
        () => buildColumnBoundaries(columnIds),
        [columnIds],
    );

    // Build a lookup: columnId → tasks (using optimistic state).
    const tasksByColumn = React.useMemo(() => {
        const result: Record<string, typeof board.tasks> = {};
        for (const column of board.columns) {
            result[column.id] = [];
        }
        for (const task of board.tasks) {
            if (task.isDeleted) continue;
            // Use optimistic position from DnD state, fall back to task.status.
            const columnId = state.columnByTask[task.id] ?? task.status;
            if (result[columnId]) {
                result[columnId].push(task);
            } else if (result[task.status]) {
                result[task.status].push(task);
            }
        }
        return result;
    }, [board.tasks, board.columns, state.columnByTask]);

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------

    return (
        <GestureHandlerRootView style={styles.root}>
            {/* Interaction mode toggle */}
            <View style={styles.modeToggleRow}>
                <ModeToggleButton
                    label="Swipe"
                    active={interactionMode === 'swipe'}
                    onPress={() => setInteractionMode('swipe')}
                />
                <ModeToggleButton
                    label="Drag"
                    active={interactionMode === 'drag'}
                    onPress={() => setInteractionMode('drag')}
                />
            </View>

            {/* Columns */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                // Allow horizontal scroll even when a pan gesture is active inside a column.
                scrollEventThrottle={16}
            >
                {board.columns.map((column, index) => {
                    const prevColumn = board.columns[index - 1];
                    const nextColumn = board.columns[index + 1];

                    return (
                        <KanbanColumn
                            key={column.id}
                            column={column}
                            tasks={tasksByColumn[column.id] ?? []}
                            isDropTarget={state.dropTargetColumnId === column.id}
                            handlers={handlers}
                            interactionMode={interactionMode}
                            columnBoundaries={columnBoundaries}
                            forwardColumnTitle={nextColumn?.title}
                            backwardColumnTitle={prevColumn?.title}
                            onTaskPress={onTaskPress}
                            onAddTask={onAddTask}
                        />
                    );
                })}
            </ScrollView>
        </GestureHandlerRootView>
    );
});

KanbanBoard.displayName = 'KanbanBoard';

// ---------------------------------------------------------------------------
// ModeToggleButton
// ---------------------------------------------------------------------------

interface ModeToggleButtonProps {
    label: string;
    active: boolean;
    onPress: () => void;
}

const ModeToggleButton = React.memo<ModeToggleButtonProps>(({ label, active, onPress }) => {
    const { theme } = useUnistyles();
    return (
        <Pressable
            onPress={onPress}
            style={[
                styles.toggleButton,
                {
                    backgroundColor: active
                        ? theme.colors.button.primary.background
                        : theme.colors.surface,
                    borderColor: active
                        ? theme.colors.button.primary.background
                        : theme.colors.divider,
                },
            ]}
        >
            <Text style={[
                styles.toggleText,
                { color: active ? theme.colors.button.primary.tint : theme.colors.textSecondary },
            ]}>
                {label}
            </Text>
        </Pressable>
    );
});

ModeToggleButton.displayName = 'ModeToggleButton';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create((theme) => ({
    root: {
        flex: 1,
    },
    modeToggleRow: {
        flexDirection: 'row',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.divider,
    },
    toggleButton: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
    },
    toggleText: {
        fontSize: 13,
        fontWeight: '600',
    },
    scrollContent: {
        paddingHorizontal: 10,
        paddingVertical: 16,
        alignItems: 'flex-start',
    },
}));
