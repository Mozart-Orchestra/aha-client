/**
 * SwipeableTaskCard
 *
 * A task card that supports horizontal swipe to change status — the
 * mobile-first alternative to drag-and-drop.
 *
 * UX rationale (from Mom Test interviews):
 *   • 80% of users don't drag on mobile; they want a faster gesture.
 *   • U7 and U9 independently described "swipe right = forward" as the
 *     most intuitive action (analogous to iOS Mail archive, WeChat).
 *   • Swipe shows a colour hint strip so the user knows what they're
 *     committing to before releasing.
 *
 * Gesture thresholds:
 *   • >80 px horizontal translation  → commit status change on release
 *   • <80 px                         → spring back (no change)
 *
 * Direction mapping:
 *   Right swipe → forward  (todo → in-progress → review → done)
 *   Left  swipe → backward (done → review → in-progress → todo)
 */
import * as React from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    runOnJS,
    interpolate,
    Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import * as Haptics from 'expo-haptics';
import type { KanbanTask } from '@/sync/kanbanTypes';
import type { KanbanDnDHandlers, ColumnId } from '@/hooks/useKanbanDnD';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SWIPE_THRESHOLD = 80; // px required to commit a status change
const HINT_MAX_OPACITY = 0.85;

const FORWARD_COLOR = '#34C759'; // green — "progressing"
const BACKWARD_COLOR = '#FF9500'; // orange — "stepping back"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SwipeableTaskCardProps {
    task: KanbanTask;
    columnId: ColumnId;
    handlers: KanbanDnDHandlers;
    onPress?: (taskId: string) => void;
    /** Human-readable label of the status the card would move to on right-swipe. */
    forwardColumnTitle?: string;
    /** Human-readable label of the status the card would move to on left-swipe. */
    backwardColumnTitle?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const SwipeableTaskCard = React.memo<SwipeableTaskCardProps>(({
    task,
    columnId,
    handlers,
    onPress,
    forwardColumnTitle,
    backwardColumnTitle,
}) => {
    const { theme } = useUnistyles();
    const translateX = useSharedValue(0);
    const isCommitted = useSharedValue(false);

    // JS-side callbacks — called via runOnJS from worklet context.
    const handleSwipeForward = React.useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        handlers.onSwipeMove(task.id, columnId, 'forward');
    }, [handlers, task.id, columnId]);

    const handleSwipeBackward = React.useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        handlers.onSwipeMove(task.id, columnId, 'backward');
    }, [handlers, task.id, columnId]);

    const handleImpact = React.useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
    }, []);

    // -----------------------------------------------------------------------
    // Gesture
    // -----------------------------------------------------------------------

    const panGesture = Gesture.Pan()
        .activeOffsetX([-12, 12]) // require horizontal intent before activating
        .failOffsetY([-20, 20])   // yield to vertical scroll if mostly vertical
        .onUpdate((e) => {
            'worklet';
            translateX.value = e.translationX;

            // Trigger haptic when crossing the commit threshold (once per swipe).
            const crossed = Math.abs(e.translationX) >= SWIPE_THRESHOLD;
            if (crossed && !isCommitted.value) {
                isCommitted.value = true;
                runOnJS(handleImpact)();
            } else if (!crossed && isCommitted.value) {
                isCommitted.value = false;
            }
        })
        .onEnd((e) => {
            'worklet';
            const committed = Math.abs(e.translationX) >= SWIPE_THRESHOLD;

            if (committed) {
                if (e.translationX > 0) {
                    runOnJS(handleSwipeForward)();
                } else {
                    runOnJS(handleSwipeBackward)();
                }
            }

            // Always spring back — the card stays in the list; state update
            // causes it to re-render under the new column.
            translateX.value = withSpring(0, { damping: 18, stiffness: 220 });
            isCommitted.value = false;
        })
        .onFinalize(() => {
            'worklet';
            translateX.value = withSpring(0, { damping: 18, stiffness: 220 });
            isCommitted.value = false;
        });

    // -----------------------------------------------------------------------
    // Animated styles
    // -----------------------------------------------------------------------

    const cardStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    // Right-swipe (forward) hint strip — green, shown on left edge.
    const forwardHintStyle = useAnimatedStyle(() => {
        const progress = interpolate(
            translateX.value,
            [0, SWIPE_THRESHOLD],
            [0, HINT_MAX_OPACITY],
            Extrapolation.CLAMP,
        );
        return {
            opacity: translateX.value > 0 ? progress : 0,
        };
    });

    // Left-swipe (backward) hint strip — orange, shown on right edge.
    const backwardHintStyle = useAnimatedStyle(() => {
        const progress = interpolate(
            translateX.value,
            [-SWIPE_THRESHOLD, 0],
            [HINT_MAX_OPACITY, 0],
            Extrapolation.CLAMP,
        );
        return {
            opacity: translateX.value < 0 ? progress : 0,
        };
    });

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------

    return (
        <View style={styles.wrapper}>
            {/* Forward (right-swipe) hint */}
            <Animated.View style={[styles.hintLeft, { backgroundColor: FORWARD_COLOR }, forwardHintStyle]}>
                <Text style={styles.hintText}>{forwardColumnTitle ?? 'Next'}</Text>
            </Animated.View>

            {/* Backward (left-swipe) hint */}
            <Animated.View style={[styles.hintRight, { backgroundColor: BACKWARD_COLOR }, backwardHintStyle]}>
                <Text style={styles.hintText}>{backwardColumnTitle ?? 'Back'}</Text>
            </Animated.View>

            <GestureDetector gesture={panGesture}>
                <Animated.View style={[styles.card, cardStyle, {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.divider,
                    shadowColor: theme.colors.shadow.color,
                }]}>
                    <Pressable
                        onPress={() => onPress?.(task.id)}
                        style={styles.cardInner}
                    >
                        <Text
                            style={[styles.title, { color: theme.colors.text }]}
                            numberOfLines={2}
                        >
                            {task.title}
                        </Text>

                        {task.priority && (
                            <Text style={[styles.priority, { color: theme.colors.textSecondary }]}>
                                {task.priority}
                            </Text>
                        )}
                    </Pressable>
                </Animated.View>
            </GestureDetector>
        </View>
    );
});

SwipeableTaskCard.displayName = 'SwipeableTaskCard';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
    wrapper: {
        marginBottom: 8,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 10,
    },
    hintLeft: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        width: '100%',
        borderRadius: 10,
        justifyContent: 'center',
        paddingLeft: 16,
    },
    hintRight: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingRight: 16,
    },
    hintText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 13,
    },
    card: {
        borderRadius: 10,
        borderWidth: 1,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    cardInner: {
        padding: 12,
    },
    title: {
        fontSize: 14,
        fontWeight: '500',
        lineHeight: 20,
    },
    priority: {
        fontSize: 11,
        marginTop: 4,
        textTransform: 'capitalize',
    },
});
