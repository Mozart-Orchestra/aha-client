import React from 'react';
import {
    ActivityIndicator,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    Text,
    View,
} from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import type { ExportedTask, TaskExportSnapshot } from '@/sync/taskExportCache';
import { importSnapshotFromJson } from '@/sync/taskExportCache';
import { useTaskImport } from '@/hooks/useTaskImport';
import type { KanbanTask, KanbanColumn } from '@/sync/kanbanTypes';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * @deprecated Use KanbanTask instead — ImportTaskButton.onTasksImported now
 * receives KanbanTask[] directly from the data-layer hook.
 * Kept as an alias for backwards compatibility only.
 */
export type ImportableTask = ExportedTask;

export interface TaskImportModalProps {
    visible: boolean;
    /** ID of the current (destination) team — excluded from the import list. */
    currentTeamId: string;
    onClose: () => void;
    /**
     * Called with the new KanbanTask objects to add to the board.
     * Should persist them into the current team's kanban board.
     */
    onImport: (tasks: KanbanTask[]) => Promise<void>;
    /**
     * Current tasks on the board — used for conflict detection (skip duplicate ids).
     * Defaults to [] (no conflict detection) when omitted.
     */
    existingTasks?: KanbanTask[];
    /**
     * Column definitions of the target board — used for status mapping.
     * Defaults to [] (unmapped statuses fall back to 'todo') when omitted.
     */
    targetColumns?: KanbanColumn[];
}

// ─── Helper: format a cached timestamp into a human-readable age ─────────────

function formatCacheAge(ts: number): string {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Priority badge ───────────────────────────────────────────────────────────

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
    urgent: { bg: 'rgba(220,38,38,0.15)', text: '#F87171' },
    high:   { bg: 'rgba(234,88,12,0.15)', text: '#FB923C' },
    medium: { bg: 'rgba(234,179,8,0.15)',  text: '#FBBF24' },
    low:    { bg: 'rgba(34,197,94,0.12)',  text: '#4ADE80' },
};

function PriorityBadge({ priority }: { priority?: ExportedTask['priority'] }) {
    if (!priority) return null;
    const colors = PRIORITY_COLORS[priority];
    if (!colors) return null;
    return (
        <View style={{ backgroundColor: colors.bg, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                {priority}
            </Text>
        </View>
    );
}

// ─── Status chip ──────────────────────────────────────────────────────────────

function StatusChip({ status }: { status: string }) {
    const { theme } = useUnistyles();
    return (
        <View style={{ backgroundColor: theme.colors.groupped.background, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 }}>
            <Text style={{ fontSize: 11, color: theme.colors.textSecondary, textTransform: 'capitalize' }}>
                {status.replace(/-/g, ' ')}
            </Text>
        </View>
    );
}

// ─── Single task row ──────────────────────────────────────────────────────────

interface TaskRowProps {
    task: ExportedTask;
    selected: boolean;
    onToggle: () => void;
}

function TaskRow({ task, selected, onToggle }: TaskRowProps) {
    const { theme } = useUnistyles();
    return (
        <Pressable
            onPress={onToggle}
            style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 10,
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 10,
                backgroundColor: pressed
                    ? theme.colors.surfacePressed
                    : selected
                        ? theme.colors.surfaceHigh
                        : 'transparent',
                borderWidth: 1,
                borderColor: selected ? theme.colors.textSecondary : theme.colors.divider,
                marginBottom: 6,
                // @ts-ignore — web-only transition
                transition: 'background-color 0.15s ease, border-color 0.15s ease',
            })}
        >
            {/* Checkbox */}
            <View style={{
                width: 18,
                height: 18,
                borderRadius: 4,
                borderWidth: 1.5,
                borderColor: selected ? theme.colors.button.primary.background : theme.colors.textSecondary,
                backgroundColor: selected ? theme.colors.button.primary.background : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 2,
                flexShrink: 0,
            }}>
                {selected && <Ionicons name="checkmark" size={12} color={theme.colors.button.primary.tint} />}
            </View>

            {/* Task content */}
            <View style={{ flex: 1, gap: 4 }}>
                <Text
                    style={{ fontSize: 14, fontWeight: '500', color: theme.colors.text, lineHeight: 20 }}
                    numberOfLines={2}
                >
                    {task.title}
                </Text>
                {task.description ? (
                    <Text style={{ fontSize: 12, color: theme.colors.textSecondary, lineHeight: 17 }} numberOfLines={1}>
                        {task.description}
                    </Text>
                ) : null}
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                    <StatusChip status={task.status} />
                    <PriorityBadge priority={task.priority} />
                </View>
            </View>
        </Pressable>
    );
}

// ─── Team section header ──────────────────────────────────────────────────────

interface TeamSectionProps {
    snapshot: TaskExportSnapshot;
    selectedIds: Set<string>;
    onToggleAll: () => void;
    onToggleTask: (taskId: string) => void;
}

function TeamSection({ snapshot, selectedIds, onToggleAll, onToggleTask }: TeamSectionProps) {
    const { theme } = useUnistyles();
    const allSelected = snapshot.tasks.every(t => selectedIds.has(t.id));
    const someSelected = snapshot.tasks.some(t => selectedIds.has(t.id));

    return (
        <View style={{ marginBottom: 20 }}>
            {/* Team header row */}
            <Pressable
                onPress={onToggleAll}
                style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 10,
                    backgroundColor: pressed ? theme.colors.surfacePressed : theme.colors.groupped.background,
                    marginBottom: 8,
                    // @ts-ignore
                    transition: 'background-color 0.15s ease',
                })}
            >
                {/* Indeterminate / all checkbox */}
                <View style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    borderWidth: 1.5,
                    borderColor: (allSelected || someSelected) ? theme.colors.button.primary.background : theme.colors.textSecondary,
                    backgroundColor: allSelected ? theme.colors.button.primary.background : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                }}>
                    {allSelected && <Ionicons name="checkmark" size={12} color={theme.colors.button.primary.tint} />}
                    {!allSelected && someSelected && (
                        <View style={{ width: 8, height: 2, backgroundColor: theme.colors.button.primary.background, borderRadius: 1 }} />
                    )}
                </View>

                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: theme.colors.text }}>
                        {snapshot.teamName || snapshot.teamId.slice(0, 8)}
                    </Text>
                </View>

                {/* Badges */}
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                    <View style={{ backgroundColor: theme.colors.divider, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Text style={{ fontSize: 11, color: theme.colors.textSecondary }}>
                            {snapshot.tasks.length} task{snapshot.tasks.length !== 1 ? 's' : ''}
                        </Text>
                    </View>
                    <Text style={{ fontSize: 11, color: theme.colors.textSecondary }}>
                        {formatCacheAge(snapshot.exportedAt)}
                    </Text>
                </View>
            </Pressable>

            {/* Task rows */}
            {snapshot.tasks.map(task => (
                <TaskRow
                    key={task.id}
                    task={task}
                    selected={selectedIds.has(task.id)}
                    onToggle={() => onToggleTask(task.id)}
                />
            ))}
        </View>
    );
}

// ─── Feedback banner ──────────────────────────────────────────────────────────

type FeedbackKind = 'success' | 'error' | null;

function FeedbackBanner({ kind, count }: { kind: FeedbackKind; count: number }) {
    const { theme } = useUnistyles();
    if (!kind) return null;
    const isSuccess = kind === 'success';
    const color = isSuccess ? theme.colors.success : theme.colors.warningCritical;
    return (
        <View style={{
            marginHorizontal: 16,
            marginBottom: 8,
            borderRadius: 10,
            padding: 12,
            backgroundColor: isSuccess ? `${theme.colors.success}22` : `${theme.colors.warningCritical}22`,
            borderWidth: 1,
            borderColor: isSuccess ? `${theme.colors.success}66` : `${theme.colors.warningCritical}66`,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        }}>
            <Ionicons
                name={isSuccess ? 'checkmark-circle' : 'alert-circle'}
                size={18}
                color={color}
            />
            <Text style={{ color, fontSize: 13, flex: 1 }}>
                {isSuccess
                    ? `Successfully imported ${count} task${count !== 1 ? 's' : ''}`
                    : 'Import failed. Please try again.'}
            </Text>
        </View>
    );
}

// ─── File-import helper (web only) ───────────────────────────────────────────

function pickJsonFile(): Promise<string | null> {
    return new Promise(resolve => {
        if (Platform.OS !== 'web') { resolve(null); return; }
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.onchange = () => {
            const file = input.files?.[0];
            if (!file) { resolve(null); return; }
            const reader = new FileReader();
            reader.onload = e => resolve((e.target?.result as string) ?? null);
            reader.onerror = () => resolve(null);
            reader.readAsText(file);
        };
        input.click();
    });
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export function TaskImportModal({
    visible,
    currentTeamId,
    onClose,
    onImport,
    existingTasks = [],
    targetColumns = [],
}: TaskImportModalProps) {
    const { theme } = useUnistyles();

    const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
    const [isImporting, setIsImporting] = React.useState(false);
    const [feedback, setFeedback] = React.useState<FeedbackKind>(null);
    const [importedCount, setImportedCount] = React.useState(0);
    const [isLoadingFile, setIsLoadingFile] = React.useState(false);

    // ── Data layer hook ───────────────────────────────────────────────────────

    const { availableSnapshots, isLoading, executeImport, refresh } = useTaskImport({
        currentTeamId,
        existingTasks,
        targetColumns,
        onImport,
    });

    // Reload & reset UI state when modal opens
    React.useEffect(() => {
        if (!visible) {
            setSelectedIds(new Set());
            setFeedback(null);
            return;
        }
        setSelectedIds(new Set());
        setFeedback(null);
        refresh();
    }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Selection helpers ─────────────────────────────────────────────────────

    const toggleTask = React.useCallback((taskId: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(taskId)) {
                next.delete(taskId);
            } else {
                next.add(taskId);
            }
            return next;
        });
    }, []);

    const toggleTeam = React.useCallback((snapshot: TaskExportSnapshot) => {
        const taskIds = snapshot.tasks.map(t => t.id);
        const allSelected = taskIds.every(id => selectedIds.has(id));
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (allSelected) {
                taskIds.forEach(id => next.delete(id));
            } else {
                taskIds.forEach(id => next.add(id));
            }
            return next;
        });
    }, [selectedIds]);

    // ── Import action ─────────────────────────────────────────────────────────

    const handleImport = React.useCallback(async () => {
        if (selectedIds.size === 0 || isImporting) return;

        setIsImporting(true);
        setFeedback(null);
        try {
            const snapshotsWithSelections = availableSnapshots.filter(
                s => s.tasks.some(t => selectedIds.has(t.id))
            );

            let totalAdded = 0;
            for (const snapshot of snapshotsWithSelections) {
                const taskIds = snapshot.tasks
                    .filter(t => selectedIds.has(t.id))
                    .map(t => t.id);
                const summary = await executeImport(snapshot, {
                    taskIds,
                    conflictPolicy: 'skip',
                });
                totalAdded += summary.added.length;
            }

            setImportedCount(totalAdded);
            setFeedback('success');
            setTimeout(() => { onClose(); }, 1500);
        } catch {
            setFeedback('error');
        } finally {
            setIsImporting(false);
        }
    }, [selectedIds, availableSnapshots, isImporting, executeImport, onClose]);

    // ── Load from JSON file ───────────────────────────────────────────────────

    const handleLoadFile = React.useCallback(async () => {
        if (Platform.OS !== 'web') return;
        setIsLoadingFile(true);
        try {
            const raw = await pickJsonFile();
            if (!raw) return;
            const snapshot = importSnapshotFromJson(raw);
            if (!snapshot) {
                setFeedback('error');
                return;
            }
            setIsImporting(true);
            setFeedback(null);
            try {
                const summary = await executeImport(snapshot, { conflictPolicy: 'skip' });
                setImportedCount(summary.added.length);
                setFeedback('success');
                setTimeout(() => { onClose(); }, 1500);
            } catch {
                setFeedback('error');
            } finally {
                setIsImporting(false);
            }
        } catch {
            setFeedback('error');
        } finally {
            setIsLoadingFile(false);
        }
    }, [executeImport, onClose]);

    const totalSelected = selectedIds.size;
    const hasSnapshots = availableSnapshots.length > 0;
    const isWeb = Platform.OS === 'web';

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                {/* Sheet container */}
                <View style={[styles.sheet, { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider }]}>
                    {/* Drag handle */}
                    <View style={styles.dragHandleWrap}>
                        <View style={[styles.dragHandle, { backgroundColor: theme.colors.divider }]} />
                    </View>

                    {/* Header */}
                    <View style={[styles.header, { borderBottomColor: theme.colors.divider }]}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
                                Import Tasks
                            </Text>
                            {hasSnapshots && (
                                <Text style={[styles.headerSub, { color: theme.colors.textSecondary }]}>
                                    {availableSnapshots.length} team{availableSnapshots.length !== 1 ? 's' : ''} cached
                                    {totalSelected > 0 ? ` · ${totalSelected} selected` : ''}
                                </Text>
                            )}
                        </View>
                        {/* Load from file (web only) */}
                        {isWeb && (
                            <Pressable
                                onPress={handleLoadFile}
                                disabled={isLoadingFile || isImporting}
                                style={({ pressed }) => [
                                    styles.fileButton,
                                    {
                                        backgroundColor: pressed ? theme.colors.surfaceHighest : theme.colors.surfaceHigh,
                                        borderColor: theme.colors.divider,
                                        opacity: (isLoadingFile || isImporting) ? 0.5 : 1,
                                    },
                                ]}
                            >
                                {isLoadingFile ? (
                                    <ActivityIndicator size="small" color={theme.colors.textSecondary} />
                                ) : (
                                    <Ionicons name="folder-open-outline" size={15} color={theme.colors.textSecondary} />
                                )}
                                <Text style={[styles.fileButtonLabel, { color: theme.colors.textSecondary }]}>
                                    Load JSON
                                </Text>
                            </Pressable>
                        )}
                        <Pressable
                            onPress={onClose}
                            style={({ pressed }) => ({
                                padding: 8,
                                borderRadius: 20,
                                backgroundColor: pressed ? theme.colors.surfaceHigh : 'transparent',
                                // @ts-ignore
                                transition: 'background-color 0.15s ease',
                            })}
                        >
                            <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
                        </Pressable>
                    </View>

                    {/* Feedback banner */}
                    {feedback && (
                        <View style={{ paddingTop: 12 }}>
                            <FeedbackBanner kind={feedback} count={importedCount} />
                        </View>
                    )}

                    {/* Body */}
                    {isLoading ? (
                        <View style={styles.emptyState}>
                            <ActivityIndicator size="large" color={theme.colors.button.primary.background} />
                        </View>
                    ) : !hasSnapshots ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="archive-outline" size={48} color={theme.colors.textSecondary} />
                            <Text style={[styles.emptyTitle, { color: theme.colors.textSecondary }]}>
                                No cached tasks found
                            </Text>
                            <Text style={[styles.emptyDesc, { color: theme.colors.textSecondary }]}>
                                Tasks from other teams appear here once they have been exported or cached.
                                {isWeb ? '\n\nUse "Load JSON" above to import from a saved file.' : ''}
                            </Text>
                        </View>
                    ) : (
                        <ScrollView
                            style={{ flex: 1 }}
                            contentContainerStyle={styles.scrollContent}
                            showsVerticalScrollIndicator={false}
                        >
                            {availableSnapshots.map(snapshot => (
                                <TeamSection
                                    key={snapshot.teamId}
                                    snapshot={snapshot}
                                    selectedIds={selectedIds}
                                    onToggleAll={() => toggleTeam(snapshot)}
                                    onToggleTask={toggleTask}
                                />
                            ))}
                        </ScrollView>
                    )}

                    {/* Footer */}
                    {hasSnapshots && (
                        <View style={[styles.footer, { borderTopColor: theme.colors.divider }]}>
                            <Pressable
                                onPress={onClose}
                                disabled={isImporting}
                                style={({ pressed }) => [
                                    styles.footerButton,
                                    {
                                        backgroundColor: pressed ? theme.colors.surfaceHighest : theme.colors.groupped.background,
                                        borderColor: theme.colors.divider,
                                        opacity: isImporting ? 0.5 : 1,
                                    },
                                ]}
                            >
                                <Text style={[styles.cancelText, { color: theme.colors.textSecondary }]}>Cancel</Text>
                            </Pressable>

                            <Pressable
                                onPress={handleImport}
                                disabled={totalSelected === 0 || isImporting}
                                style={({ pressed }) => [
                                    styles.footerButton,
                                    styles.importButton,
                                    {
                                        backgroundColor: (totalSelected === 0 || isImporting)
                                            ? theme.colors.groupped.background
                                            : pressed
                                                ? theme.colors.surfaceHighest
                                                : theme.colors.button.primary.background,
                                        borderColor: (totalSelected === 0 || isImporting)
                                            ? theme.colors.divider
                                            : theme.colors.button.primary.background,
                                        opacity: totalSelected === 0 ? 0.45 : 1,
                                    },
                                ]}
                            >
                                {isImporting ? (
                                    <ActivityIndicator size="small" color={theme.colors.textSecondary} />
                                ) : (
                                    <>
                                        <Ionicons
                                            name="download-outline"
                                            size={16}
                                            color={totalSelected === 0 ? theme.colors.textSecondary : theme.colors.button.primary.tint}
                                        />
                                        <Text style={[
                                            styles.importText,
                                            { color: totalSelected === 0 ? theme.colors.textSecondary : theme.colors.button.primary.tint },
                                        ]}>
                                            {totalSelected === 0
                                                ? 'Select tasks to import'
                                                : `Import ${totalSelected} task${totalSelected !== 1 ? 's' : ''}`}
                                        </Text>
                                    </>
                                )}
                            </Pressable>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    sheet: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        borderWidth: 1,
        borderBottomWidth: 0,
        maxHeight: '85%',
        overflow: 'hidden',
    },
    dragHandleWrap: {
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 4,
    },
    dragHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    headerSub: {
        fontSize: 12,
        marginTop: 2,
    },
    fileButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        // @ts-ignore
        transition: 'background-color 0.15s ease',
    },
    fileButtonLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    scrollContent: {
        padding: 16,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 48,
        paddingHorizontal: 24,
        gap: 12,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    emptyDesc: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 20,
    },
    footer: {
        flexDirection: 'row',
        gap: 10,
        padding: 16,
        borderTopWidth: 1,
    },
    footerButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        borderWidth: 1,
        // @ts-ignore
        transition: 'background-color 0.15s ease',
    },
    importButton: {
        flex: 2,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    cancelText: {
        fontSize: 14,
        fontWeight: '600',
    },
    importText: {
        fontSize: 14,
        fontWeight: '700',
    },
});
