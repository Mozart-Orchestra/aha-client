/**
 * PermissionRequestSheet
 *
 * Bottom sheet shown when an Agent running in supervised/manual mode requests
 * permission to perform a potentially dangerous action (write, delete, network
 * call, etc.).
 *
 * Design spec: PRD-设计桥接文档.md § S20
 *
 * Behaviour:
 *   • Slides in from the bottom with a spring animation (250ms).
 *   • A 30-second countdown progress bar drives auto-deny on timeout.
 *   • Three decisions: Allow Once, Allow Session, Deny.
 *   • If more requests are queued, a badge shows how many are pending.
 *   • Risk level drives the header colour using the Permission colour system
 *     defined in the design tokens.
 *
 * Constraints:
 *   • No `any` types.
 *   • Immutable — callbacks receive the decision; no internal state mutation.
 *   • Styles at the bottom of the file (project convention).
 */

import * as React from 'react';
import {
    View,
    Text,
    Pressable,
    Modal,
    ScrollView,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    Easing,
    runOnJS,
} from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import { Typography } from '@/constants/Typography';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RiskLevel = 'critical' | 'warning' | 'info';
export type PermissionScope = 'once' | 'session';

export interface PermissionRequest {
    /** Unique identifier for this permission request */
    id: string;
    /** Display name of the requesting agent (e.g. "Builder-1") */
    agentName: string;
    /** Role label of the agent (e.g. "Builder", "QA") */
    agentRole: string;
    /** Human-readable description (e.g. "wants to delete 12 build artifacts") */
    action: string;
    /** Exact shell command or operation string shown in the code block */
    command: string;
    /** Visual severity of the action */
    riskLevel: RiskLevel;
    /** How many additional requests are queued behind this one */
    pendingCount: number;
    /** Unix timestamp (ms) when this request expires and will be auto-denied */
    expiresAt: number;
}

export interface PermissionRequestSheetProps {
    /** The current permission request to display, or null when no request is active */
    request: PermissionRequest | null;
    /** Called when the user approves the request */
    onAllow: (requestId: string, scope: PermissionScope) => void;
    /** Called when the user explicitly denies the request */
    onDeny: (requestId: string) => void;
    /** Called when the sheet should be dismissed (e.g. backdrop tap) */
    onDismiss: () => void;
}

// ---------------------------------------------------------------------------
// Risk level colour mapping (PRD design tokens)
// ---------------------------------------------------------------------------

interface RiskColours {
    background: string;
    text: string;
    icon: string;
    iconName: React.ComponentProps<typeof Ionicons>['name'];
    label: string;
}

const RISK_COLOURS: Record<RiskLevel, RiskColours> = {
    critical: {
        background: '#D08068',
        text: '#7A2D1A',
        icon: '#7A2D1A',
        iconName: 'warning',
        label: 'Critical Action',
    },
    warning: {
        background: '#D4A64A',
        text: '#6B4A0E',
        icon: '#6B4A0E',
        iconName: 'alert-circle',
        label: 'Warning',
    },
    info: {
        background: '#5B8DB8',
        text: '#1B3D5A',
        icon: '#1B3D5A',
        iconName: 'information-circle',
        label: 'Action Required',
    },
};

const TIMEOUT_DURATION_MS = 30_000;

// ---------------------------------------------------------------------------
// CountdownBar
// ---------------------------------------------------------------------------

interface CountdownBarProps {
    expiresAt: number;
    onExpire: () => void;
    riskLevel: RiskLevel;
}

const CountdownBar = React.memo(({ expiresAt, onExpire, riskLevel }: CountdownBarProps) => {
    const progress = useSharedValue(1);
    const [secondsLeft, setSecondsLeft] = React.useState<number>(
        Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)),
    );
    const onExpireRef = React.useRef(onExpire);
    onExpireRef.current = onExpire;

    React.useEffect(() => {
        const remaining = Math.max(0, expiresAt - Date.now());
        const initialProgress = remaining / TIMEOUT_DURATION_MS;

        // Animate from current progress → 0 over the remaining time
        progress.value = initialProgress;
        progress.value = withTiming(0, {
            duration: remaining,
            easing: Easing.linear,
        });

        // Tick the seconds display
        const tick = setInterval(() => {
            const secs = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
            setSecondsLeft(secs);
            if (secs <= 0) {
                clearInterval(tick);
                runOnJS(onExpireRef.current)();
            }
        }, 500);

        return () => clearInterval(tick);
    }, [expiresAt, progress]);

    const barStyle = useAnimatedStyle(() => ({
        width: `${progress.value * 100}%` as `${number}%`,
    }));

    const colours = RISK_COLOURS[riskLevel];

    return (
        <View style={countdownStyles.wrapper}>
            <View style={countdownStyles.row}>
                <Ionicons name="time-outline" size={14} color="#6D6C6A" />
                <Text style={countdownStyles.label}>
                    {' '}Expires in {secondsLeft}s
                </Text>
            </View>
            <View style={countdownStyles.track}>
                <Animated.View
                    style={[
                        countdownStyles.fill,
                        { backgroundColor: colours.background },
                        barStyle,
                    ]}
                />
            </View>
        </View>
    );
});

CountdownBar.displayName = 'CountdownBar';

const countdownStyles = StyleSheet.create({
    wrapper: {
        marginTop: 16,
        marginBottom: 4,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    label: {
        fontSize: 12,
        color: '#6D6C6A',
        ...Typography.default(),
    },
    track: {
        height: 4,
        borderRadius: 2,
        backgroundColor: '#E8E6E1',
        overflow: 'hidden',
    },
    fill: {
        height: 4,
        borderRadius: 2,
    },
});

// ---------------------------------------------------------------------------
// PermissionRequestSheet
// ---------------------------------------------------------------------------

export const PermissionRequestSheet = React.memo(
    ({ request, onAllow, onDeny, onDismiss }: PermissionRequestSheetProps) => {
        const { theme } = useUnistyles();
        const translateY = useSharedValue(600);
        const isVisible = request !== null;

        // Slide-in / slide-out animation
        React.useEffect(() => {
            if (isVisible) {
                translateY.value = withSpring(0, {
                    mass: 1,
                    stiffness: 200,
                    damping: 24,
                });
            } else {
                translateY.value = withTiming(600, {
                    duration: 250,
                    easing: Easing.in(Easing.quad),
                });
            }
        }, [isVisible, translateY]);

        const sheetStyle = useAnimatedStyle(() => ({
            transform: [{ translateY: translateY.value }],
        }));

        const handleAllow = React.useCallback(
            (scope: PermissionScope) => {
                if (request) {
                    onAllow(request.id, scope);
                }
            },
            [request, onAllow],
        );

        const handleDeny = React.useCallback(() => {
            if (request) {
                onDeny(request.id);
            }
        }, [request, onDeny]);

        const handleExpire = React.useCallback(() => {
            if (request) {
                onDeny(request.id);
            }
        }, [request, onDeny]);

        if (!request) {
            return null;
        }

        const colours = RISK_COLOURS[request.riskLevel];

        return (
            <Modal
                visible={isVisible}
                animationType="none"
                transparent
                onRequestClose={onDismiss}
            >
                {/* Backdrop */}
                <Pressable style={styles.backdrop} onPress={onDismiss}>
                    {/* Sheet (inner Pressable prevents backdrop tap from closing) */}
                    <Pressable onPress={() => { /* absorb */ }} style={styles.sheetWrapper}>
                        <Animated.View
                            style={[
                                styles.sheet,
                                { backgroundColor: theme.colors.surface },
                                sheetStyle,
                            ]}
                        >
                            {/* Drag handle */}
                            <View style={styles.dragHandle} />

                            {/* Risk banner */}
                            <View
                                style={[
                                    styles.riskBanner,
                                    { backgroundColor: colours.background },
                                ]}
                            >
                                <Ionicons
                                    name={colours.iconName}
                                    size={18}
                                    color={colours.icon}
                                />
                                <Text
                                    style={[
                                        styles.riskLabel,
                                        { color: colours.text },
                                    ]}
                                >
                                    {colours.label}
                                </Text>
                            </View>

                            <ScrollView
                                style={styles.scrollArea}
                                showsVerticalScrollIndicator={false}
                                bounces={false}
                            >
                                {/* Agent description */}
                                <Text style={[styles.agentName, { color: theme.colors.text }]}>
                                    {request.agentName}
                                    <Text style={[styles.agentRole, { color: theme.colors.textSecondary }]}>
                                        {' '}({request.agentRole})
                                    </Text>
                                </Text>
                                <Text style={[styles.actionText, { color: theme.colors.text }]}>
                                    {request.action}
                                </Text>

                                {/* Command code block */}
                                <View
                                    style={[
                                        styles.codeBlock,
                                        { backgroundColor: theme.colors.surfaceHighest },
                                    ]}
                                >
                                    <Text style={styles.codeText}>
                                        $ {request.command}
                                    </Text>
                                </View>

                                {/* Countdown */}
                                <CountdownBar
                                    expiresAt={request.expiresAt}
                                    onExpire={handleExpire}
                                    riskLevel={request.riskLevel}
                                />

                                {/* Pending queue hint */}
                                {request.pendingCount > 0 && (
                                    <View style={styles.pendingRow}>
                                        <Ionicons
                                            name="layers-outline"
                                            size={14}
                                            color="#6D6C6A"
                                        />
                                        <Text style={styles.pendingText}>
                                            {' '}{request.pendingCount} more request
                                            {request.pendingCount > 1 ? 's' : ''} pending
                                        </Text>
                                    </View>
                                )}
                            </ScrollView>

                            {/* Action buttons */}
                            <View style={styles.actions}>
                                <Pressable
                                    style={[styles.btnAllowOnce, { borderColor: colours.background }]}
                                    onPress={() => handleAllow('once')}
                                    accessibilityRole="button"
                                    accessibilityLabel="Allow Once"
                                >
                                    <Text style={[styles.btnAllowOnceText, { color: colours.text }]}>
                                        Allow Once
                                    </Text>
                                </Pressable>

                                <Pressable
                                    style={[styles.btnAllowSession, { backgroundColor: colours.background }]}
                                    onPress={() => handleAllow('session')}
                                    accessibilityRole="button"
                                    accessibilityLabel="Allow for this Session"
                                >
                                    <Text style={[styles.btnAllowSessionText, { color: colours.text }]}>
                                        Allow Session
                                    </Text>
                                </Pressable>

                                <Pressable
                                    style={[styles.btnDeny, { backgroundColor: theme.colors.surfaceHighest }]}
                                    onPress={handleDeny}
                                    accessibilityRole="button"
                                    accessibilityLabel="Deny"
                                >
                                    <Ionicons name="close" size={16} color={theme.colors.textDestructive} />
                                    <Text style={[styles.btnDenyText, { color: theme.colors.textDestructive }]}>
                                        Deny
                                    </Text>
                                </Pressable>
                            </View>
                        </Animated.View>
                    </Pressable>
                </Pressable>
            </Modal>
        );
    },
);

PermissionRequestSheet.displayName = 'PermissionRequestSheet';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create((theme) => ({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.48)',
        justifyContent: 'flex-end',
    },
    sheetWrapper: {
        // Prevents backdrop press propagation
    },
    sheet: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 34, // safe area bottom
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.16,
        shadowRadius: 24,
        elevation: 12,
    },
    dragHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#C4C2BE',
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 16,
    },
    riskBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        marginBottom: 16,
        gap: 6,
    },
    riskLabel: {
        fontSize: 13,
        fontWeight: '600',
        ...Typography.default('semiBold'),
    },
    scrollArea: {
        paddingHorizontal: 20,
        maxHeight: 340,
    },
    agentName: {
        fontSize: 17,
        fontWeight: '600',
        marginBottom: 4,
        ...Typography.default('semiBold'),
    },
    agentRole: {
        fontSize: 14,
        fontWeight: '400',
        ...Typography.default(),
    },
    actionText: {
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 12,
        ...Typography.default(),
    },
    codeBlock: {
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 4,
    },
    codeText: {
        fontSize: 13,
        color: '#3D8A5A',
        ...Typography.mono(),
    },
    pendingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        marginBottom: 4,
    },
    pendingText: {
        fontSize: 12,
        color: '#6D6C6A',
        ...Typography.default(),
    },
    actions: {
        paddingHorizontal: 20,
        paddingTop: 16,
        gap: 10,
    },
    btnAllowOnce: {
        borderWidth: 1.5,
        borderRadius: 12,
        paddingVertical: 13,
        alignItems: 'center',
    },
    btnAllowOnceText: {
        fontSize: 15,
        fontWeight: '600',
        ...Typography.default('semiBold'),
    },
    btnAllowSession: {
        borderRadius: 12,
        paddingVertical: 13,
        alignItems: 'center',
    },
    btnAllowSessionText: {
        fontSize: 15,
        fontWeight: '600',
        ...Typography.default('semiBold'),
    },
    btnDeny: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        paddingVertical: 13,
        gap: 6,
    },
    btnDenyText: {
        fontSize: 15,
        fontWeight: '600',
        ...Typography.default('semiBold'),
    },
}));
