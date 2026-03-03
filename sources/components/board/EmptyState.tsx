/**
 * EmptyState (board)
 *
 * A board-specific empty state component with two layout variants:
 *   • `full-screen` — centred in the full available space (e.g. whole tab area)
 *   • `inline`      — compact, rendered inside a column or section
 *
 * Supports an optional primary and secondary action button so callers can
 * provide contextual CTAs without coupling this component to navigation.
 *
 * Design spec: PRD-设计桥接文档.md § S21, S22
 *
 * Usage:
 * ```tsx
 * // Full-screen — new user has no teams
 * <BoardEmptyState
 *   icon="git-branch-outline"
 *   title="Your Legion awaits"
 *   subtitle="Connect a repo to get started"
 *   primaryAction={{ label: 'Connect Repository', onPress: () => router.push('/connect') }}
 *   secondaryAction={{ label: 'Browse Templates', onPress: () => router.push('/templates') }}
 *   variant="full-screen"
 * />
 *
 * // Inline — empty Kanban column
 * <BoardEmptyState
 *   icon="checkmark-circle-outline"
 *   title="No tasks yet"
 *   subtitle='Say "add task" or tap +'
 *   variant="inline"
 * />
 * ```
 *
 * Constraints:
 *   • No `any` types.
 *   • Immutable props — no internal state mutation.
 *   • Styles at the bottom of the file (project convention).
 */

import * as React from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withDelay,
    Easing,
} from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import { Typography } from '@/constants/Typography';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EmptyStateVariant = 'full-screen' | 'inline';

export interface EmptyStateAction {
    label: string;
    onPress: () => void;
}

export interface BoardEmptyStateProps {
    /**
     * Ionicons icon name displayed above the title.
     * Defaults to 'albums-outline'.
     */
    icon?: React.ComponentProps<typeof Ionicons>['name'];
    /** Bold heading text */
    title: string;
    /** Optional softer subheading text */
    subtitle?: string;
    /** Primary (filled) action button */
    primaryAction?: EmptyStateAction;
    /** Secondary (ghost) action button */
    secondaryAction?: EmptyStateAction;
    /**
     * Layout variant:
     *   - `full-screen` centres content with generous padding, icon at 64px
     *   - `inline` uses a compact layout, icon at 40px
     */
    variant?: EmptyStateVariant;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const BoardEmptyState = React.memo(
    ({
        icon = 'albums-outline',
        title,
        subtitle,
        primaryAction,
        secondaryAction,
        variant = 'full-screen',
    }: BoardEmptyStateProps) => {
        const { theme } = useUnistyles();

        // Fade + slide-up entrance animation
        const opacity = useSharedValue(0);
        const translateY = useSharedValue(variant === 'full-screen' ? 24 : 12);

        React.useEffect(() => {
            opacity.value = withDelay(
                80,
                withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) }),
            );
            translateY.value = withDelay(
                80,
                withTiming(0, { duration: 400, easing: Easing.out(Easing.quad) }),
            );
        }, [opacity, translateY]);

        const animatedStyle = useAnimatedStyle(() => ({
            opacity: opacity.value,
            transform: [{ translateY: translateY.value }],
        }));

        const iconSize = variant === 'full-screen' ? 64 : 40;

        return (
            <Animated.View
                style={[
                    styles.container,
                    variant === 'full-screen'
                        ? styles.containerFullScreen
                        : styles.containerInline,
                    animatedStyle,
                ]}
            >
                {/* Icon */}
                <View
                    style={[
                        styles.iconWrapper,
                        variant === 'inline' && styles.iconWrapperInline,
                    ]}
                >
                    <Ionicons
                        name={icon}
                        size={iconSize}
                        color={theme.colors.textSecondary}
                    />
                </View>

                {/* Text */}
                <Text
                    style={[
                        styles.title,
                        { color: theme.colors.text },
                        variant === 'inline' && styles.titleInline,
                    ]}
                >
                    {title}
                </Text>

                {subtitle !== undefined && (
                    <Text
                        style={[
                            styles.subtitle,
                            { color: theme.colors.textSecondary },
                            variant === 'inline' && styles.subtitleInline,
                        ]}
                    >
                        {subtitle}
                    </Text>
                )}

                {/* Actions */}
                {(primaryAction !== undefined || secondaryAction !== undefined) && (
                    <View style={styles.actionsWrapper}>
                        {primaryAction !== undefined && (
                            <Pressable
                                style={[
                                    styles.primaryBtn,
                                    { backgroundColor: theme.colors.button.primary.background },
                                ]}
                                onPress={primaryAction.onPress}
                                accessibilityRole="button"
                                accessibilityLabel={primaryAction.label}
                            >
                                <Text
                                    style={[
                                        styles.primaryBtnText,
                                        { color: theme.colors.button.primary.text },
                                    ]}
                                >
                                    {primaryAction.label}
                                </Text>
                            </Pressable>
                        )}

                        {secondaryAction !== undefined && (
                            <Pressable
                                style={styles.secondaryBtn}
                                onPress={secondaryAction.onPress}
                                accessibilityRole="button"
                                accessibilityLabel={secondaryAction.label}
                            >
                                <Text
                                    style={[
                                        styles.secondaryBtnText,
                                        { color: theme.colors.textSecondary },
                                    ]}
                                >
                                    {secondaryAction.label}
                                </Text>
                            </Pressable>
                        )}
                    </View>
                )}
            </Animated.View>
        );
    },
);

BoardEmptyState.displayName = 'BoardEmptyState';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
    },
    containerFullScreen: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 48,
        paddingVertical: 48,
    },
    containerInline: {
        paddingHorizontal: 24,
        paddingVertical: 32,
    },
    iconWrapper: {
        opacity: 0.4,
        marginBottom: 20,
    },
    iconWrapperInline: {
        marginBottom: 12,
        opacity: 0.35,
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 8,
        ...Typography.default('semiBold'),
    },
    titleInline: {
        fontSize: 15,
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        maxWidth: 280,
        marginBottom: 0,
        ...Typography.default(),
    },
    subtitleInline: {
        fontSize: 13,
        maxWidth: 220,
    },
    actionsWrapper: {
        marginTop: 28,
        alignItems: 'center',
        gap: 12,
        width: '100%',
        maxWidth: 300,
    },
    primaryBtn: {
        width: '100%',
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
    },
    primaryBtnText: {
        fontSize: 15,
        fontWeight: '600',
        ...Typography.default('semiBold'),
    },
    secondaryBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    secondaryBtnText: {
        fontSize: 14,
        ...Typography.default(),
    },
});
