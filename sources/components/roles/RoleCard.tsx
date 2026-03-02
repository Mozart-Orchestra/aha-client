import * as React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/components/StyledText';
import { StyleSheet } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import type { CustomRole, PublicRole, RoleTemplate } from '@/sync/apiRoles';

interface RoleCardProps {
    role: CustomRole | PublicRole | RoleTemplate;
    onPress?: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    showActions?: boolean;
    onTagPress?: (tag: string) => void;
}

export function RoleCard({ role, onPress, onEdit, onDelete, showActions = false, onTagPress }: RoleCardProps) {
    const roleMeta = role as unknown as Record<string, unknown>;
    const isCustom = Boolean(roleMeta.isCustom);
    const isPool = Boolean(roleMeta.isPool);
    const isServerDefault = Boolean(roleMeta.isServerDefault);
    const stats = roleMeta.stats as PublicRole['stats'] | undefined;
    const skills = Array.isArray(roleMeta.assignedSkills)
        ? (roleMeta.assignedSkills as string[])
        : undefined;
    const category = typeof roleMeta.category === 'string' ? roleMeta.category : undefined;
    const tags = React.useMemo(() => {
        const rawTags = [
            ...(skills || []),
            ...(category ? [category] : []),
        ];
        return Array.from(new Set(
            rawTags
                .map((item) => String(item).trim().toLowerCase())
                .filter(Boolean)
        ));
    }, [skills, category]);

    return (
        <Pressable
            style={({ pressed }) => [
                styles.container,
                pressed && styles.containerPressed,
            ]}
            onPress={onPress}
        >
            <View style={styles.header}>
                <View style={styles.titleSection}>
                    <Text style={styles.icon}>{role.icon || '🤖'}</Text>
                    <View style={styles.titleContainer}>
                        <View style={styles.badgeRow}>
                            <Text style={styles.title} numberOfLines={1}>
                                {role.title}
                            </Text>
                            {isCustom && (
                                <View style={[styles.badge, styles.customBadge]}>
                                    <Text style={styles.badgeText}>CUSTOM</Text>
                                </View>
                            )}
                            {isPool && (
                                <View style={[styles.badge, styles.poolBadge]}>
                                    <Text style={styles.badgeText}>POOL</Text>
                                </View>
                            )}
                            {isServerDefault && (
                                <View style={[styles.badge, styles.defaultBadge]}>
                                    <Text style={styles.badgeText}>DEFAULT</Text>
                                </View>
                            )}
                        </View>
                        <Text style={styles.summary} numberOfLines={2}>
                            {role.summary || 'No description'}
                        </Text>
                    </View>
                </View>

                {stats && (
                    <View style={styles.statsSection}>
                        <View style={styles.statItem}>
                            <Ionicons name="star" size={12} color="#FFD700" />
                            <Text style={styles.statValue}>
                                {stats.averageRating?.toFixed(1) || '0.0'}
                            </Text>
                        </View>
                        <View style={styles.statItem}>
                            <Ionicons name="chatbubble" size={12} color="#999" />
                            <Text style={styles.statValue}>
                                {stats.reviewCount || 0}
                            </Text>
                        </View>
                        {stats.cumulativeCode > 0 && (
                            <View style={styles.statItem}>
                                <Ionicons name="code-slash" size={12} color="#2196F3" />
                                <Text style={styles.statValue}>
                                    {(stats.cumulativeCode / 1000).toFixed(1)}k
                                </Text>
                            </View>
                        )}
                        {stats.completionCount > 0 && (
                            <View style={styles.statItem}>
                                <Ionicons name="checkmark-circle" size={12} color="#4CAF50" />
                                <Text style={styles.statValue}>
                                    {stats.completionCount}
                                </Text>
                            </View>
                        )}
                    </View>
                )}
            </View>

            {tags.length > 0 && (
                <View style={styles.skillsContainer}>
                    {tags.slice(0, 4).map((tag) => (
                        <Pressable
                            key={tag}
                            style={styles.skillBadge}
                            onPress={(e) => {
                                if (onTagPress) {
                                    e.stopPropagation();
                                    onTagPress(tag);
                                }
                            }}
                            disabled={!onTagPress}
                        >
                            <Text style={styles.skillText}>#{tag}</Text>
                        </Pressable>
                    ))}
                    {tags.length > 4 && (
                        <View style={styles.skillBadge}>
                            <Text style={styles.skillText}>+{tags.length - 4}</Text>
                        </View>
                    )}
                </View>
            )}

            {showActions && (
                <View style={styles.actions}>
                    {onEdit && (
                        <Pressable
                            style={styles.actionButton}
                            onPress={(e) => {
                                e.stopPropagation();
                                onEdit();
                            }}
                        >
                            <Ionicons name="create-outline" size={18} color={theme.colors.text} />
                        </Pressable>
                    )}
                    {onDelete && (
                        <Pressable
                            style={styles.actionButton}
                            onPress={(e) => {
                                e.stopPropagation();
                                onDelete();
                            }}
                        >
                            <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                        </Pressable>
                    )}
                </View>
            )}
        </Pressable>
    );
}

let theme: any;

const styles = StyleSheet.create((t) => {
    theme = t;
    return {
        container: {
            backgroundColor: t.colors.surface,
            borderRadius: 12,
            padding: 16,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: t.colors.divider,
        },
        containerPressed: {
            opacity: 0.8,
            backgroundColor: t.colors.surfacePressed,
        },
        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
        },
        titleSection: {
            flexDirection: 'row',
            flex: 1,
            marginRight: 12,
        },
        icon: {
            fontSize: 32,
            marginRight: 12,
        },
        titleContainer: {
            flex: 1,
        },
        badgeRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
        },
        title: {
            fontSize: 16,
            fontWeight: '600',
            color: t.colors.text,
        },
        badge: {
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 4,
        },
        customBadge: {
            backgroundColor: t.colors.button.primary.background,
        },
        poolBadge: {
            backgroundColor: '#4A90E2',
        },
        defaultBadge: {
            backgroundColor: '#6C7A89',
        },
        badgeText: {
            fontSize: 10,
            color: '#FFF',
            fontWeight: '600',
        },
        summary: {
            fontSize: 13,
            color: t.colors.textSecondary,
            marginTop: 4,
        },
        statsSection: {
            flexDirection: 'row',
            gap: 12,
            alignItems: 'center',
        },
        statItem: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
        },
        statValue: {
            fontSize: 13,
            color: t.colors.textSecondary,
            fontWeight: '500',
        },
        skillsContainer: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 6,
            marginTop: 12,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: t.colors.divider,
        },
        skillBadge: {
            backgroundColor: t.colors.groupped?.background || '#1a1a2e',
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 6,
        },
        skillText: {
            fontSize: 11,
            color: t.colors.textSecondary,
        },
        actions: {
            flexDirection: 'row',
            justifyContent: 'flex-end',
            gap: 12,
            marginTop: 12,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: t.colors.divider,
        },
        actionButton: {
            padding: 8,
            borderRadius: 8,
            backgroundColor: t.colors.groupped?.background,
        },
    };
});
