import React from 'react';
import { View, Pressable, ActivityIndicator } from 'react-native';
import { Text } from '@/components/StyledText';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

/**
 * RalphControlPanel - UI Control Panel for Ralph Loop Autonomous Agent
 *
 * Features:
 * - Start/Stop buttons for Ralph Loop
 * - Status badge (running/idle/complete/error)
 * - Progress bar showing X/Y stories complete
 * - Iteration counter from master-state.json
 */

export type RalphLoopStatus = 'idle' | 'running' | 'complete' | 'error';

export interface RalphLoopState {
    status: RalphLoopStatus;
    currentTask: string | null;
    iterationCount: number;
    completedStories: number;
    totalStories: number;
    lastHeartbeat: string | null;
    errorMessage?: string;
}

export interface RalphControlPanelProps {
    state: RalphLoopState;
    onStart: () => Promise<void>;
    onStop: () => Promise<void>;
    onRefresh?: () => Promise<void>;
    isLoading?: boolean;
}

const stylesheet = StyleSheet.create((theme) => ({
    container: {
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: theme.colors.divider,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '500',
        textTransform: 'capitalize',
    },
    // Status colors
    statusIdle: {
        backgroundColor: theme.colors.groupped.background,
    },
    statusRunning: {
        backgroundColor: '#1a4d1a', // Dark green
    },
    statusComplete: {
        backgroundColor: '#1a3d5c', // Dark blue
    },
    statusError: {
        backgroundColor: '#4d1a1a', // Dark red
    },
    dotIdle: {
        backgroundColor: theme.colors.textSecondary,
    },
    dotRunning: {
        backgroundColor: '#4ade80', // Green
    },
    dotComplete: {
        backgroundColor: '#60a5fa', // Blue
    },
    dotError: {
        backgroundColor: '#f87171', // Red
    },
    textIdle: {
        color: theme.colors.textSecondary,
    },
    textRunning: {
        color: '#4ade80',
    },
    textComplete: {
        color: '#60a5fa',
    },
    textError: {
        color: '#f87171',
    },
    // Progress section
    progressSection: {
        marginBottom: 16,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    progressLabel: {
        fontSize: 13,
        color: theme.colors.textSecondary,
    },
    progressValue: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.text,
    },
    progressBar: {
        height: 8,
        backgroundColor: theme.colors.groupped.background,
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    // Stats row
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 16,
        paddingVertical: 12,
        backgroundColor: theme.colors.groupped.background,
        borderRadius: 8,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
    },
    statLabel: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    // Current task
    currentTask: {
        marginBottom: 16,
        padding: 12,
        backgroundColor: theme.colors.groupped.background,
        borderRadius: 8,
    },
    currentTaskLabel: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    currentTaskText: {
        fontSize: 14,
        color: theme.colors.text,
        marginTop: 4,
    },
    // Error message
    errorBox: {
        marginBottom: 16,
        padding: 12,
        backgroundColor: '#2d1515',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#5c2020',
    },
    errorText: {
        fontSize: 13,
        color: '#f87171',
    },
    // Buttons
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
    },
    button: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 10,
    },
    buttonPrimary: {
        backgroundColor: '#4ade80', // Green
    },
    buttonSecondary: {
        backgroundColor: theme.colors.groupped.background,
        borderWidth: 1,
        borderColor: theme.colors.divider,
    },
    buttonDanger: {
        backgroundColor: '#5c2020',
    },
    buttonText: {
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 6,
    },
    buttonTextPrimary: {
        color: '#0a0a0a',
    },
    buttonTextSecondary: {
        color: theme.colors.text,
    },
    buttonTextDanger: {
        color: '#f87171',
    },
    // Loading overlay
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
}));

const getStatusStyles = (status: RalphLoopStatus, styles: ReturnType<typeof stylesheet.useStyles>['styles']) => {
    switch (status) {
        case 'running':
            return {
                badge: styles.statusRunning,
                dot: styles.dotRunning,
                text: styles.textRunning,
                icon: 'sync-outline' as const,
            };
        case 'complete':
            return {
                badge: styles.statusComplete,
                dot: styles.dotComplete,
                text: styles.textComplete,
                icon: 'checkmark-circle-outline' as const,
            };
        case 'error':
            return {
                badge: styles.statusError,
                dot: styles.dotError,
                text: styles.textError,
                icon: 'alert-circle-outline' as const,
            };
        default:
            return {
                badge: styles.statusIdle,
                dot: styles.dotIdle,
                text: styles.textIdle,
                icon: 'ellipse-outline' as const,
            };
    }
};

export function RalphControlPanel({
    state,
    onStart,
    onStop,
    onRefresh,
    isLoading = false,
}: RalphControlPanelProps) {
    const { theme } = useUnistyles();
    const styles = stylesheet.useStyles().styles;
    const statusStyles = getStatusStyles(state.status, styles);

    const progressPercent = state.totalStories > 0
        ? Math.round((state.completedStories / state.totalStories) * 100)
        : 0;

    const progressColor = state.status === 'error'
        ? '#f87171'
        : state.status === 'complete'
            ? '#60a5fa'
            : '#4ade80';

    return (
        <View style={styles.container}>
            {/* Header with Status */}
            <View style={styles.header}>
                <Text style={styles.title}>Ralph Loop</Text>
                <View style={[styles.statusBadge, statusStyles.badge]}>
                    <View style={[styles.statusDot, statusStyles.dot]} />
                    <Ionicons name={statusStyles.icon} size={14} color={theme.colors.text} />
                    <Text style={[styles.statusText, statusStyles.text, { marginLeft: 4 }]}>
                        {state.status}
                    </Text>
                </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                    <Text style={styles.progressLabel}>Progress</Text>
                    <Text style={styles.progressValue}>
                        {state.completedStories}/{state.totalStories} stories
                    </Text>
                </View>
                <View style={styles.progressBar}>
                    <View
                        style={[
                            styles.progressFill,
                            { width: `${progressPercent}%`, backgroundColor: progressColor }
                        ]}
                    />
                </View>
            </View>

            {/* Stats Row */}
            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{state.iterationCount}</Text>
                    <Text style={styles.statLabel}>Iterations</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{progressPercent}%</Text>
                    <Text style={styles.statLabel}>Complete</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{state.totalStories - state.completedStories}</Text>
                    <Text style={styles.statLabel}>Remaining</Text>
                </View>
            </View>

            {/* Current Task */}
            {state.currentTask && state.status === 'running' && (
                <View style={styles.currentTask}>
                    <Text style={styles.currentTaskLabel}>Current Task</Text>
                    <Text style={styles.currentTaskText}>{state.currentTask}</Text>
                </View>
            )}

            {/* Error Message */}
            {state.status === 'error' && state.errorMessage && (
                <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{state.errorMessage}</Text>
                </View>
            )}

            {/* Action Buttons */}
            <View style={styles.buttonRow}>
                {state.status === 'idle' || state.status === 'complete' || state.status === 'error' ? (
                    <>
                        <Pressable
                            style={[styles.button, styles.buttonPrimary]}
                            onPress={onStart}
                            disabled={isLoading}
                        >
                            <Ionicons name="play" size={18} color="#0a0a0a" />
                            <Text style={[styles.buttonText, styles.buttonTextPrimary]}>Start</Text>
                        </Pressable>
                        {onRefresh && (
                            <Pressable
                                style={[styles.button, styles.buttonSecondary]}
                                onPress={onRefresh}
                                disabled={isLoading}
                            >
                                <Ionicons name="refresh" size={18} color={theme.colors.text} />
                                <Text style={[styles.buttonText, styles.buttonTextSecondary]}>Refresh</Text>
                            </Pressable>
                        )}
                    </>
                ) : (
                    <Pressable
                        style={[styles.button, styles.buttonDanger]}
                        onPress={onStop}
                        disabled={isLoading}
                    >
                        <Ionicons name="stop" size={18} color="#f87171" />
                        <Text style={[styles.buttonText, styles.buttonTextDanger]}>Stop</Text>
                    </Pressable>
                )}
            </View>

            {/* Loading Overlay */}
            {isLoading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={theme.colors.text} />
                </View>
            )}
        </View>
    );
}

export default RalphControlPanel;
