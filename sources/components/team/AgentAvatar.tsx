/**
 * AgentAvatar — reusable agent identity component.
 *
 * Renders a coloured circle avatar (role icon or initials) with an optional
 * display-name label and online indicator dot.  Clicking navigates to the
 * agent's session view.
 *
 * Usage:
 *   // Minimal — just the avatar circle
 *   <AgentAvatar sessionId="cmn1farze..." roleId="master" displayName="Master Coordinator" />
 *
 *   // With inline name label
 *   <AgentAvatar sessionId="cmn1farze..." roleId="master" displayName="Master Coordinator" showName />
 *
 *   // With a custom press handler instead of default navigation
 *   <AgentAvatar sessionId="cmn1farze..." roleId="master" onPress={(id) => doSomething(id)} />
 *
 *   // Non-interactive (read-only chip in a card)
 *   <AgentAvatar sessionId="cmn1farze..." roleId="builder" showName size="sm" disablePress />
 */
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
    getRoleVisual,
    getRoleLabel,
    getAvatarInitials,
    resolveDisplayName,
} from '@/utils/roleVisualUtils';
import { pushSessionRoute } from '@/utils/returnNavigation';

// ─── Size tokens ──────────────────────────────────────────────────────────────

const SIZE = {
    xs: { circle: 20, icon: 10, font: 9,  badge: 11, nameFont: 11 },
    sm: { circle: 28, icon: 12, font: 11, badge: 12, nameFont: 12 },
    md: { circle: 36, icon: 16, font: 14, badge: 14, nameFont: 13 },
    lg: { circle: 48, icon: 20, font: 17, badge: 16, nameFont: 14 },
} as const;

type AvatarSize = keyof typeof SIZE;

// ─── Props ────────────────────────────────────────────────────────────────────

export interface AgentAvatarProps {
    sessionId: string;
    roleId?: string;
    displayName?: string;
    /** Whether to show a name label to the right of the avatar. Default false. */
    showName?: boolean;
    /** Whether to show an online presence dot. Default false. */
    isOnline?: boolean;
    /** Avatar size preset. Default 'md'. */
    size?: AvatarSize;
    /**
     * Optional custom press handler. Receives the sessionId.
     * If omitted, tapping navigates to the session view.
     */
    onPress?: (sessionId: string) => void;
    /** When true, the avatar is not pressable. Useful in read-only contexts. */
    disablePress?: boolean;
    /**
     * Inline style override for the outer container.
     * Accept the full React Native style object.
     */
    style?: object;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const AgentAvatar = React.memo(function AgentAvatar({
    sessionId,
    roleId,
    displayName,
    showName = false,
    isOnline = false,
    size = 'md',
    onPress,
    disablePress = false,
    style,
}: AgentAvatarProps) {
    const router = useRouter();
    const { theme } = useUnistyles();
    const tokens = SIZE[size];

    const visual = React.useMemo(() => getRoleVisual(roleId, displayName), [roleId, displayName]);
    const nameLabel = React.useMemo(
        () => resolveDisplayName(displayName, roleId, sessionId),
        [displayName, roleId, sessionId],
    );
    const roleLabel = getRoleLabel(roleId);

    const handlePress = React.useCallback(() => {
        if (disablePress) return;
        if (onPress) {
            onPress(sessionId);
        } else {
            pushSessionRoute(router, { id: sessionId });
        }
    }, [disablePress, onPress, router, sessionId]);

    // ── Avatar circle content ─────────────────────────────────────────────────

    const avatarContent = () => {
        if (visual.avatarIcon) {
            return <Ionicons name={visual.avatarIcon} size={tokens.icon} color="#FFFFFF" />;
        }
        if (visual.avatarLabel) {
            return <Text style={{ fontSize: tokens.font }}>{visual.avatarLabel}</Text>;
        }
        return (
            <Text style={{ fontSize: tokens.font, fontWeight: '600', color: '#FFFFFF', lineHeight: tokens.font + 2 }}>
                {getAvatarInitials(roleId, displayName)}
            </Text>
        );
    };

    // ── Wrapper decides pressability ──────────────────────────────────────────

    const CircleWrapper = disablePress
        ? (props: { children: React.ReactNode; style?: object }) => (
            <View {...props} />
        )
        : (props: { children: React.ReactNode; style?: object }) => (
            <Pressable
                onPress={handlePress}
                style={({ pressed }) => [
                    props.style,
                    { opacity: pressed ? 0.75 : 1 },
                    // @ts-ignore — web only
                    { transition: 'opacity 0.15s ease' },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Open session for ${nameLabel}`}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
                {props.children}
            </Pressable>
        );

    return (
        <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 7 }, style]}>
            <CircleWrapper>
                <View
                    style={{
                        width: tokens.circle,
                        height: tokens.circle,
                        borderRadius: tokens.circle / 2,
                        backgroundColor: visual.avatarBackground,
                        alignItems: 'center',
                        justifyContent: 'center',
                        // Subtle inner shadow via border
                        borderWidth: 1.5,
                        borderColor: `${visual.avatarBackground}88`,
                    }}
                >
                    {avatarContent()}

                    {/* Online indicator dot */}
                    {isOnline && (
                        <View
                            style={{
                                position: 'absolute',
                                bottom: -1,
                                right: -1,
                                width: tokens.circle * 0.33,
                                height: tokens.circle * 0.33,
                                borderRadius: tokens.circle * 0.165,
                                backgroundColor: theme.colors.success,
                                borderWidth: 1.5,
                                borderColor: theme.colors.surface,
                            }}
                        />
                    )}
                </View>
            </CircleWrapper>

            {/* Optional name + role label */}
            {showName && (
                <View style={{ gap: 1 }}>
                    <Text
                        style={{
                            fontSize: tokens.nameFont,
                            fontWeight: '600',
                            color: theme.colors.text,
                            lineHeight: tokens.nameFont + 3,
                        }}
                        numberOfLines={1}
                    >
                        {nameLabel}
                    </Text>
                    {roleLabel !== nameLabel && (
                        <Text
                            style={{
                                fontSize: tokens.nameFont - 1,
                                color: theme.colors.textSecondary,
                                lineHeight: tokens.nameFont + 1,
                            }}
                            numberOfLines={1}
                        >
                            {roleLabel}
                        </Text>
                    )}
                </View>
            )}
        </View>
    );
});

// ─── Inline chip variant ──────────────────────────────────────────────────────
// Renders a compact pill: [avatar] name that can be embedded inside text flows
// or task cards in place of a raw @sessionId mention.

export interface AgentChipProps {
    sessionId: string;
    roleId?: string;
    displayName?: string;
    onPress?: (sessionId: string) => void;
}

export const AgentChip = React.memo(function AgentChip({
    sessionId,
    roleId,
    displayName,
    onPress,
}: AgentChipProps) {
    const router = useRouter();
    const { theme } = useUnistyles();
    const visual = React.useMemo(() => getRoleVisual(roleId, displayName), [roleId, displayName]);
    const nameLabel = React.useMemo(
        () => resolveDisplayName(displayName, roleId, sessionId),
        [displayName, roleId, sessionId],
    );

    const handlePress = React.useCallback(() => {
        if (onPress) {
            onPress(sessionId);
        } else {
            pushSessionRoute(router, { id: sessionId });
        }
    }, [onPress, router, sessionId]);

    return (
        <Pressable
            onPress={handlePress}
            style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingHorizontal: 7,
                paddingVertical: 3,
                borderRadius: 999,
                backgroundColor: pressed
                    ? `${visual.avatarBackground}44`
                    : `${visual.avatarBackground}22`,
                borderWidth: 1,
                borderColor: `${visual.avatarBackground}66`,
                // @ts-ignore
                transition: 'background-color 0.15s ease',
            })}
            accessibilityRole="button"
            accessibilityLabel={`Go to ${nameLabel}`}
        >
            {/* Tiny dot with role colour */}
            <View
                style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: visual.avatarBackground,
                }}
            />
            <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.text }}>
                @{nameLabel}
            </Text>
        </Pressable>
    );
});
