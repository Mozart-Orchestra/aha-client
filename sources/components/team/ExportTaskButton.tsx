/**
 * ExportTaskButton — downloads the current team's tasks as a JSON file.
 *
 * Delegates to exportTasksToJson() from taskExportCache (data-layer).
 * The downloaded JSON can be re-imported via TaskImportModal "Load JSON".
 *
 * Usage:
 *   <ExportTaskButton
 *     teamId={teamId}
 *     teamName={teamName}
 *     tasks={kanbanData.tasks}
 *     columns={kanbanData.columns}
 *   />
 */
import React from 'react';
import { ActivityIndicator, Platform, Pressable, Text } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import { exportTasksToJson } from '@/sync/taskExportCache';
import type { KanbanTask, KanbanColumn } from '@/sync/kanbanTypes';

export interface ExportTaskButtonProps {
    teamId: string;
    teamName: string;
    tasks: KanbanTask[];
    columns: KanbanColumn[];
    /** Override the button label. */
    label?: string;
}

export function ExportTaskButton({
    teamId,
    teamName,
    tasks,
    columns,
    label = '导出任务',
}: ExportTaskButtonProps) {
    const { theme } = useUnistyles();
    const [isBusy, setIsBusy] = React.useState(false);
    const [didExport, setDidExport] = React.useState(false);

    const handleExport = React.useCallback(async () => {
        if (isBusy || Platform.OS !== 'web') return;
        setIsBusy(true);
        try {
            exportTasksToJson(teamId, teamName, tasks, columns);
            setDidExport(true);
            setTimeout(() => setDidExport(false), 2000);
        } finally {
            setIsBusy(false);
        }
    }, [isBusy, teamId, teamName, tasks, columns]);

    // Only render on web (export uses Blob URL API)
    if (Platform.OS !== 'web') return null;

    const iconColor = didExport ? theme.colors.success : theme.colors.textSecondary;

    return (
        <Pressable
            onPress={handleExport}
            disabled={isBusy || tasks.length === 0}
            style={({ pressed }) => [
                styles.button,
                {
                    backgroundColor: pressed
                        ? theme.colors.surfaceHighest
                        : theme.colors.surfaceHigh,
                    borderColor: didExport ? theme.colors.success : theme.colors.divider,
                    opacity: (isBusy || tasks.length === 0) ? 0.5 : 1,
                },
            ]}
            accessibilityRole="button"
            accessibilityLabel={label}
        >
            {isBusy ? (
                <ActivityIndicator size="small" color={theme.colors.textSecondary} />
            ) : (
                <Ionicons
                    name={didExport ? 'checkmark-circle-outline' : 'share-outline'}
                    size={15}
                    color={iconColor}
                />
            )}
            <Text style={[styles.label, { color: didExport ? theme.colors.success : theme.colors.text }]}>
                {didExport ? '已导出' : label}
            </Text>
        </Pressable>
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
        transition: 'background-color 0.15s ease, border-color 0.15s ease',
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
    },
});
