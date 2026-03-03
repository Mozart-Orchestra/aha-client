/**
 * DraggableTaskCard
 *
 * A task card that activates drag-and-drop on long-press (500 ms).
 * While dragging the card scales up and casts a shadow; the original
 * position shows a translucent placeholder.
 *
 * Gesture pipeline:
 *   LongPress (500 ms) → activates Pan → tracks x/y → onEnd triggers move
 *
 * Haptic sequence:
 *   • Activation  → ImpactFeedbackStyle.Medium
 *   • Drop        → handled by useKanbanDnD (Success / Error)
 */
import * as React from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import * as Haptics from 'expo-haptics';
import type { KanbanTask } from '@/sync/kanbanTypes';
import type { KanbanDnDHandlers, ColumnId } from '@/hooks/useKanbanDnD';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DraggableTaskCardProps {
    task: KanbanTask;
    columnId: ColumnId;
    handlers: KanbanDnDHandlers;
    onPress?: (taskId: string) => void;
    /** x-position thresholds for each column — used to compute drop target. */
    columnBoundaries: Array<{ columnId: ColumnId; startX: number; endX: number }>;
}

// ---------------------------------------------------------------------------
// Priority badge helpers
// ---------------------------------------------------------------------------

const PRIORITY_COLORS: Record<string, string> = {
    urgent: '#FF3B30',
    high: '#FF9500',
    medium: '#007AFF',
    low: '#8E8E93',
};

const PRIORITY_LABELS: Record<string, string> = {
    urgent: 'Urgent',
    high: 'High',
    medium: 'Med',
    low: 'Low',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const DraggableTaskCard = React.memo<DraggableTaskCardProps>(({
    task,
    columnId,
    handlers,
    onPress,
    columnBoundaries,
}) => {
    const { theme } = useUnistyles();

    // Reanimated shared values.
    const isDragging = useSharedValue(false);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const scale = useSharedValue(1);
    const cardOpacity = useSharedValue(1);

    // Absolute screen position captured at drag start.
    const startAbsX = useSharedValue(0);
    const startAbsY = useSharedValue(0);

    // JS-side callbacks for cross-thread coordination.
    const handleDragStart = React.useCallback(() => {
        handlers.onDragStart(task.id, columnId);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, [handlers, task.id, columnId]);

    const resolveDropTarget = React.useCallback((absX: number): ColumnId | null => {
        const match = columnBoundaries.find(b => absX >= b.startX && absX < b.endX);
        return match?.columnId ?? null;
    }, [columnBoundaries]);

    const handleDragMove = React.useCallback((absX: number) => {
        handlers.onDragMove(resolveDropTarget(absX));
    }, [handlers, resolveDropTarget]);

    const handleDragEnd = React.useCallback(() => {
        handlers.onDragEnd();
    }, [handlers]);

    // -----------------------------------------------------------------------
    // Gesture: long-press activates pan drag
    // -----------------------------------------------------------------------

    const panGesture = Gesture.Pan()
        .activateAfterLongPress(500)
        .onStart((e) => {
            'worklet';
            isDragging.value = true;
            startAbsX.value = e.absoluteX - e.translationX;
            startAbsY.value = e.absoluteY - e.translationY;
            scale.value = withSpring(1.05, { damping: 14, stiffness: 200 });
            cardOpacity.value = withSpring(0.92);
            runOnJS(handleDragStart)();
        })
        .onUpdate((e) => {
            'worklet';
            translateX.value = e.translationX;
            translateY.value = e.translationY;
            runOnJS(handleDragMove)(startAbsX.value + e.translationX + 60); // +60 = card center offset
        })
        .onEnd(() => {
            'worklet';
            isDragging.value = false;
            translateX.value = withSpring(0, { damping: 18, stiffness: 250 });
            translateY.value = withSpring(0, { damping: 18, stiffness: 250 });
            scale.value = withSpring(1, { damping: 18, stiffness: 250 });
            cardOpacity.value = withSpring(1);
            runOnJS(handleDragEnd)();
        })
        .onFinalize(() => {
            'worklet';
            // Ensure clean-up even on gesture cancellation.
            isDragging.value = false;
            translateX.value = withSpring(0);
            translateY.value = withSpring(0);
            scale.value = withSpring(1);
            cardOpacity.value = withSpring(1);
        });

    // -----------------------------------------------------------------------
    // Animated styles
    // -----------------------------------------------------------------------

    const cardAnimatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value },
        ],
        opacity: cardOpacity.value,
        zIndex: isDragging.value ? 999 : 1,
        shadowOpacity: isDragging.value ? 0.25 : 0.06,
        shadowRadius: isDragging.value ? 12 : 4,
        elevation: isDragging.value ? 12 : 2,
    }));

    const placeholderStyle = useAnimatedStyle(() => ({
        opacity: isDragging.value ? 0.35 : 0,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    }));

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------

    const priorityColor = task.priority ? PRIORITY_COLORS[task.priority] : undefined;
    const priorityLabel = task.priority ? PRIORITY_LABELS[task.priority] : undefined;

    return (
        <View style={styles.wrapper}>
            {/* Translucent placeholder shown at the origin while dragging */}
            <Animated.View style={[styles.placeholder, placeholderStyle, {
                borderColor: theme.colors.divider,
                borderRadius: 10,
            }]} />

            <GestureDetector gesture={panGesture}>
                <Animated.View style={[styles.card, cardAnimatedStyle, {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.divider,
                    shadowColor: theme.colors.shadow.color,
                }]}>
                    <Pressable
                        onPress={() => onPress?.(task.id)}
                        style={styles.cardInner}
                    >
                        {/* Title */}
                        <Text
                            style={[styles.title, { color: theme.colors.text }]}
                            numberOfLines={2}
                        >
                            {task.title}
                        </Text>

                        {/* Footer row */}
                        <View style={styles.footer}>
                            {priorityColor && priorityLabel && (
                                <View style={[styles.priorityBadge, { backgroundColor: priorityColor + '22' }]}>
                                    <Text style={[styles.priorityText, { color: priorityColor }]}>
                                        {priorityLabel}
                                    </Text>
                                </View>
                            )}

                            {task.dueDate && (
                                <Text style={[styles.dueDate, { color: theme.colors.textSecondary }]}>
                                    {new Date(task.dueDate).toLocaleDateString()}
                                </Text>
                            )}
                        </View>
                    </Pressable>
                </Animated.View>
            </GestureDetector>
        </View>
    );
});

DraggableTaskCard.displayName = 'DraggableTaskCard';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
    wrapper: {
        marginBottom: 8,
        position: 'relative',
    },
    placeholder: {
        borderWidth: 2,
        borderStyle: 'dashed',
        borderRadius: 10,
        height: 72,
    },
    card: {
        borderRadius: 10,
        borderWidth: 1,
        shadowOffset: { width: 0, height: 2 },
    },
    cardInner: {
        padding: 12,
    },
    title: {
        fontSize: 14,
        fontWeight: '500',
        lineHeight: 20,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        gap: 6,
    },
    priorityBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    priorityText: {
        fontSize: 11,
        fontWeight: '600',
    },
    dueDate: {
        fontSize: 11,
    },
});
