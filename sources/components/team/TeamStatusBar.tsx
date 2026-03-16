import * as React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui/StyledText';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import type { KanbanTask } from '@/sync/kanbanTypes';

/**
 * TeamStatusBar — 移动端三信号状态面板
 *
 * 三个信号：
 *   🟢 Running   — tasks currently in-progress (有 active executionLinks)
 *   🟡 Deciding  — tasks with approvalStatus === 'pending'
 *   🔴 Blocked   — tasks with unresolved blockers
 *
 * Tapping a signal calls onSignalPress(signal) so the parent can navigate
 * to the relevant filtered task list or approval modal.
 */

export type StatusSignal = 'running' | 'deciding' | 'blocked';

interface TeamStatusBarProps {
    tasks: KanbanTask[];
    onSignalPress?: (signal: StatusSignal) => void;
    /** Compact single-row layout for use inside a header or banner */
    compact?: boolean;
}

function countSignals(tasks: KanbanTask[]) {
    let running = 0;
    let deciding = 0;
    let blocked = 0;

    for (const task of tasks) {
        if (task.isDeleted) continue;

        // Running: has at least one active execution link
        if (task.executionLinks?.some(l => l.status === 'active')) {
            running++;
        }

        // Deciding: awaiting human approval
        if (task.approvalStatus === 'pending') {
            deciding++;
        }

        // Blocked: has unresolved blockers
        const unresolvedBlockers = task.blockers?.filter(b => !b.resolvedAt) ?? [];
        if (unresolvedBlockers.length > 0) {
            blocked++;
        }
    }

    return { running, deciding, blocked };
}

export const TeamStatusBar: React.FC<TeamStatusBarProps> = ({ tasks, onSignalPress, compact = false }) => {
    const { theme } = useUnistyles();
    const counts = React.useMemo(() => countSignals(tasks), [tasks]);
    const hasActivity = counts.running > 0 || counts.deciding > 0 || counts.blocked > 0;

    if (!hasActivity) return null;

    const signals: Array<{
        key: StatusSignal;
        count: number;
        icon: string;
        color: string;
        bg: string;
        label: string;
    }> = [
        {
            key: 'running',
            count: counts.running,
            icon: 'pulse-outline',
            color: '#16A34A',
            bg: '#DCFCE7',
            label: 'Running',
        },
        {
            key: 'deciding',
            count: counts.deciding,
            icon: 'hand-left-outline',
            color: '#D97706',
            bg: '#FEF3C7',
            label: 'Needs you',
        },
        {
            key: 'blocked',
            count: counts.blocked,
            icon: 'warning-outline',
            color: '#DC2626',
            bg: '#FEE2E2',
            label: 'Blocked',
        },
    ].filter(s => s.count > 0);

    if (compact) {
        return (
            <View style={styles.compactRow}>
                {signals.map(s => (
                    <Pressable
                        key={s.key}
                        style={[styles.compactChip, { backgroundColor: s.bg }]}
                        onPress={() => onSignalPress?.(s.key)}
                        accessibilityRole="button"
                        accessibilityLabel={`${s.count} ${s.label}`}
                    >
                        <Ionicons name={s.icon as any} size={13} color={s.color} />
                        <Text style={[styles.compactChipCount, { color: s.color }]}>
                            {s.count}
                        </Text>
                        <Text style={[styles.compactChipLabel, { color: s.color }]}>
                            {s.label}
                        </Text>
                    </Pressable>
                ))}
            </View>
        );
    }

    return (
        <View style={[styles.panel, { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider }]}>
            {signals.map((s, idx) => (
                <React.Fragment key={s.key}>
                    {idx > 0 && <View style={[styles.divider, { backgroundColor: theme.colors.divider }]} />}
                    <Pressable
                        style={styles.signalCell}
                        onPress={() => onSignalPress?.(s.key)}
                        accessibilityRole="button"
                        accessibilityLabel={`${s.count} tasks ${s.label}`}
                    >
                        <View style={[styles.signalIconWrap, { backgroundColor: s.bg }]}>
                            <Ionicons name={s.icon as any} size={18} color={s.color} />
                        </View>
                        <Text style={[styles.signalCount, { color: s.color }]}>
                            {s.count}
                        </Text>
                        <Text style={[styles.signalLabel, { color: theme.colors.textSecondary }]}>
                            {s.label}
                        </Text>
                    </Pressable>
                </React.Fragment>
            ))}
        </View>
    );
};

const styles = StyleSheet.create((_theme) => ({
    panel: {
        flexDirection: 'row',
        borderRadius: 12,
        borderWidth: 1,
        marginHorizontal: 16,
        marginTop: 12,
        overflow: 'hidden',
    },
    signalCell: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 8,
        gap: 6,
    },
    signalIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    signalCount: {
        fontSize: 22,
        fontWeight: '700',
        lineHeight: 26,
    },
    signalLabel: {
        fontSize: 11,
        fontWeight: '500',
        textAlign: 'center',
    },
    divider: {
        width: 1,
        marginVertical: 12,
    },
    compactRow: {
        flexDirection: 'row',
        gap: 6,
        flexWrap: 'wrap',
    },
    compactChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        gap: 5,
    },
    compactChipCount: {
        fontSize: 13,
        fontWeight: '700',
    },
    compactChipLabel: {
        fontSize: 12,
        fontWeight: '500',
    },
}));
