import * as React from 'react';
import { View, Pressable } from 'react-native';
import type { DimensionValue } from 'react-native';
import { Text } from '@/components/ui/StyledText';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import type { KanbanTask } from '@/sync/kanbanTypes';
import { countSignals } from './teamStatusSignals';

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

type SignalItem = {
    key: StatusSignal;
    count: number;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    bg: string;
    label: string;
};

interface TeamStatusBarProps {
    tasks: KanbanTask[];
    onSignalPress?: (signal: StatusSignal) => void;
    /** Compact single-row layout for use inside a header or banner */
    compact?: boolean;
}

function getBarPercent(count: number, maxCount: number, minPercent: number = 18): DimensionValue {
    if (count <= 0 || maxCount <= 0) {
        return '0%';
    }

    return `${Math.min(100, Math.max(minPercent, Math.round((count / maxCount) * 100)))}%` as `${number}%`;
}

export const TeamStatusBar: React.FC<TeamStatusBarProps> = ({ tasks, onSignalPress, compact = false }) => {
    const { theme } = useUnistyles();
    const counts = React.useMemo(() => countSignals(tasks), [tasks]);
    const allSignals = React.useMemo(() => {
        const items: SignalItem[] = [
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
        ];

        return items;
    }, [counts]);
    const signals = React.useMemo(() => allSignals.filter(signal => signal.count > 0), [allSignals]);
    const maxSignalCount = React.useMemo(
        () => signals.reduce((max, signal) => Math.max(max, signal.count), 0),
        [signals]
    );
    const hasActivity = signals.length > 0;
    const renderSignals = hasActivity ? signals : allSignals;
    const effectiveMaxSignalCount = hasActivity
        ? maxSignalCount
        : allSignals.reduce((max, signal) => Math.max(max, signal.count), 0);

    if (compact) {
        return (
            <View style={styles.compactRow}>
                {renderSignals.map(s => (
                    <Pressable
                        key={s.key}
                        style={[
                            styles.compactChip,
                            { backgroundColor: s.bg },
                            !hasActivity && styles.inactiveChip,
                        ]}
                        onPress={() => onSignalPress?.(s.key)}
                        accessibilityRole="button"
                        accessibilityLabel={`${s.count} ${s.label}`}
                    >
                        <Ionicons name={s.icon as any} size={13} color={s.color} />
                        <View style={styles.compactValueWrap}>
                            <Text style={[styles.compactChipCount, { color: s.color }]}>
                                {s.count}
                            </Text>
                            <View style={[styles.compactBarTrack, { backgroundColor: s.color + '20' }]}>
                                <View
                                    style={[
                                        styles.compactBarFill,
                                        {
                                            backgroundColor: s.color,
                                            width: getBarPercent(s.count, effectiveMaxSignalCount),
                                        },
                                    ]}
                                />
                            </View>
                        </View>
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
            {renderSignals.map((s, idx) => (
                <React.Fragment key={s.key}>
                    {idx > 0 && <View style={[styles.divider, { backgroundColor: theme.colors.divider }]} />}
                    <Pressable
                        style={[styles.signalCell, !hasActivity && styles.inactiveCell]}
                        onPress={() => onSignalPress?.(s.key)}
                        accessibilityRole="button"
                        accessibilityLabel={`${s.count} tasks ${s.label}`}
                    >
                        <View style={[styles.signalIconWrap, { backgroundColor: s.bg }]}>
                            <Ionicons name={s.icon as any} size={18} color={s.color} />
                        </View>
                        <View style={styles.signalValueRow}>
                            <Text style={[styles.signalCount, { color: s.color }]}>
                                {s.count}
                            </Text>
                            <View style={[styles.signalBarTrack, { backgroundColor: s.color + '20' }]}>
                                <View
                                    style={[
                                        styles.signalBarFill,
                                        {
                                            backgroundColor: s.color,
                                            width: getBarPercent(s.count, effectiveMaxSignalCount),
                                        },
                                    ]}
                                />
                            </View>
                        </View>
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
    inactiveCell: {
        opacity: 0.55,
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
    signalValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    signalBarTrack: {
        width: 40,
        height: 6,
        borderRadius: 999,
        overflow: 'hidden',
    },
    signalBarFill: {
        height: '100%',
        borderRadius: 999,
        minWidth: 6,
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
    inactiveChip: {
        opacity: 0.55,
    },
    compactChipCount: {
        fontSize: 13,
        fontWeight: '700',
    },
    compactValueWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    compactBarTrack: {
        width: 28,
        height: 4,
        borderRadius: 999,
        overflow: 'hidden',
    },
    compactBarFill: {
        height: '100%',
        borderRadius: 999,
        minWidth: 4,
    },
    compactChipLabel: {
        fontSize: 12,
        fontWeight: '500',
    },
}));
