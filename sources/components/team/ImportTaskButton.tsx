/**
 * ImportTaskButton — standalone, pluggable component.
 *
 * Drop this anywhere in a team view to give users access to the cross-team
 * task import flow.  It owns the modal state internally so that the parent
 * page (e.g. teams/[id].tsx) doesn't need to manage it.
 *
 * Usage:
 *   <ImportTaskButton
 *     teamId={teamId}
 *     onTasksImported={async (tasks) => { ... persist KanbanTask[] to kanban ... }}
 *     existingTasks={currentBoardTasks}
 *     targetColumns={boardColumns}
 *   />
 */
import React from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import { TaskImportModal } from '@/components/team/TaskImportModal';
import type { KanbanTask, KanbanColumn } from '@/sync/kanbanTypes';

export interface ImportTaskButtonProps {
    /** ID of the current team — used to exclude it from the import list. */
    teamId: string;
    /**
     * Called after the user confirms the import selection.
     * Receives ready-to-insert KanbanTask objects from the data-layer hook.
     * Should merge these tasks into the team's kanban artifact (e.g. via the team API).
     */
    onTasksImported: (tasks: KanbanTask[]) => Promise<void>;
    /**
     * Current tasks on the board — passed to useTaskImport for conflict detection.
     * When omitted, no conflict detection is performed (all tasks are imported).
     */
    existingTasks?: KanbanTask[];
    /**
     * Column definitions of the target board — passed to useTaskImport for status mapping.
     * When omitted, unmapped statuses fall back to 'todo'.
     */
    targetColumns?: KanbanColumn[];
    /** Override the button label. */
    label?: string;
}

export function ImportTaskButton({
    teamId,
    onTasksImported,
    existingTasks = [],
    targetColumns = [],
    label = '导入任务',
}: ImportTaskButtonProps) {
    const { theme } = useUnistyles();
    const [modalVisible, setModalVisible] = React.useState(false);
    const [isBusy, setIsBusy] = React.useState(false);

    const handleImport = React.useCallback(async (tasks: KanbanTask[]) => {
        setIsBusy(true);
        try {
            await onTasksImported(tasks);
        } finally {
            setIsBusy(false);
        }
    }, [onTasksImported]);

    return (
        <>
            <Pressable
                onPress={() => setModalVisible(true)}
                disabled={isBusy}
                style={({ pressed }) => [
                    styles.button,
                    {
                        backgroundColor: pressed
                            ? theme.colors.surfaceHighest
                            : theme.colors.surfaceHigh,
                        borderColor: theme.colors.divider,
                        opacity: isBusy ? 0.6 : 1,
                    },
                ]}
                accessibilityRole="button"
                accessibilityLabel={label}
            >
                {isBusy ? (
                    <ActivityIndicator size="small" color={theme.colors.textSecondary} />
                ) : (
                    <Ionicons name="download-outline" size={15} color={theme.colors.textSecondary} />
                )}
                <Text style={[styles.label, { color: theme.colors.text }]}>
                    {label}
                </Text>
            </Pressable>

            <TaskImportModal
                visible={modalVisible}
                currentTeamId={teamId}
                existingTasks={existingTasks}
                targetColumns={targetColumns}
                onClose={() => setModalVisible(false)}
                onImport={handleImport}
            />
        </>
    );
}

const styles = StyleSheet.create({
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 10,
        borderWidth: 1,
        // @ts-ignore — web transition
        transition: 'background-color 0.15s ease',
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
    },
});
