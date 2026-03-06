import React from 'react';
import {
    ActivityIndicator,
    Platform,
    Pressable,
    ScrollView,
    TextInput,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/StyledText';
import { useAuth } from '@/auth/AuthContext';
import { t } from '@/text';
import { getLocalizedTeamRoles } from '@/team-config/i18n';
import { fetchCustomRoles, fetchDefaultRoles, fetchRoleMarket, fetchRolePool } from '@/sync/apiRoles';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import {
    applyRoleMarketInsights,
    buildRecommendedRoleMarketOptions,
    buildRoleMarketOptions,
    buildRoleMarketSkillSuggestions,
    createRoleConfigFromMarketRole,
    filterRoleMarketOptions,
    type RoleMarketOption,
    type RoleMarketSource,
} from './roleMarket';
import type { RoleConfig } from './types';

const SOURCE_ORDER: RoleMarketSource[] = ['built-in', 'default', 'custom', 'public'];

const SOURCE_LABELS: Record<RoleMarketSource, string> = {
    'built-in': 'Built-in',
    'default': 'Defaults',
    'custom': 'My Roles',
    'public': 'Market',
};

interface RoleMarketModalProps {
    goal?: string;
    context?: string;
    defaultMachineId?: string;
    existingRoleIds: string[];
    onClose: () => void;
    onSelectRole: (role: RoleConfig) => void;
}

function formatRating(role: RoleMarketOption): string | null {
    if (!role.stats || role.stats.reviewCount <= 0) {
        return null;
    }

    return `${role.stats.averageRating.toFixed(1)} ★ · ${role.stats.reviewCount} reviews`;
}

export const RoleMarketModal = React.memo(function RoleMarketModal({
    goal,
    context,
    defaultMachineId,
    existingRoleIds,
    onClose,
    onSelectRole,
}: RoleMarketModalProps) {
    const styles = stylesheet;
    const { theme } = useUnistyles();
    const { credentials } = useAuth();
    const [searchQuery, setSearchQuery] = React.useState('');
    const [allRoles, setAllRoles] = React.useState<RoleMarketOption[]>(() =>
        buildRoleMarketOptions({
            builtInRoles: getLocalizedTeamRoles(),
            defaultRoles: [],
            customRoles: [],
            publicRoles: [],
        })
    );
    const [isLoading, setIsLoading] = React.useState(false);
    const [loadError, setLoadError] = React.useState<string | null>(null);
    const permissionNotice = credentials
        ? null
        : 'Sign in to load your private workspace roles, public market evidence, and goal-based recommendations.';

    const loadRoles = React.useCallback(async () => {
        const builtInRoles = getLocalizedTeamRoles();

        if (!credentials) {
            setAllRoles(
                buildRoleMarketOptions({
                    builtInRoles,
                    defaultRoles: [],
                    customRoles: [],
                    publicRoles: [],
                })
            );
            setLoadError(null);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setLoadError(null);

        try {
            const [customResult, defaultResult, publicResult, marketResult] = await Promise.allSettled([
                fetchCustomRoles(credentials),
                fetchDefaultRoles(credentials),
                fetchRolePool(credentials, { limit: 100 }),
                fetchRoleMarket(credentials, {
                    goal,
                    context,
                    limit: 4,
                }),
            ]);

            const baseRoles = buildRoleMarketOptions({
                builtInRoles,
                customRoles: customResult.status === 'fulfilled' ? customResult.value : [],
                defaultRoles: defaultResult.status === 'fulfilled' ? defaultResult.value : [],
                publicRoles: publicResult.status === 'fulfilled' ? publicResult.value : [],
            });

            const nextRoles = marketResult.status === 'fulfilled'
                ? applyRoleMarketInsights(baseRoles, marketResult.value.roles)
                : baseRoles;

            setAllRoles(nextRoles);

            const hasAnyFailure = [customResult, defaultResult, publicResult].some((result) => result.status === 'rejected');
            const marketInsightFailed = marketResult.status === 'rejected';

            if (hasAnyFailure && marketInsightFailed) {
                setLoadError('Some market sources and recommendation signals did not load. Showing the roles we have.');
            } else if (hasAnyFailure) {
                setLoadError('Some market sources did not load. Showing the roles we have.');
            } else if (marketInsightFailed) {
                setLoadError('Recommendation signals did not load. Showing the raw role catalog instead.');
            } else {
                setLoadError(null);
            }
        } catch (error) {
            setAllRoles(
                buildRoleMarketOptions({
                    builtInRoles,
                    defaultRoles: [],
                    customRoles: [],
                    publicRoles: [],
                })
            );
            setLoadError(error instanceof Error ? error.message : 'Failed to load role market.');
        } finally {
            setIsLoading(false);
        }
    }, [context, credentials, goal]);

    React.useEffect(() => {
        void loadRoles();
    }, [loadRoles]);

    const existingRoleIdSet = React.useMemo(() => new Set(existingRoleIds), [existingRoleIds]);

    const filteredRoles = React.useMemo(
        () => filterRoleMarketOptions(allRoles, searchQuery),
        [allRoles, searchQuery]
    );

    const suggestedSkills = React.useMemo(
        () => buildRoleMarketSkillSuggestions(allRoles),
        [allRoles]
    );

    const groupedRoles = React.useMemo(
        () =>
            SOURCE_ORDER.map((source) => ({
                source,
                label: SOURCE_LABELS[source],
                roles: filteredRoles.filter((role) => role.source === source),
            })).filter((group) => group.roles.length > 0),
        [filteredRoles]
    );

    const recommendedRoles = React.useMemo(
        () => buildRecommendedRoleMarketOptions(filteredRoles, existingRoleIds, 4),
        [existingRoleIds, filteredRoles]
    );

    const handleSelectRole = React.useCallback(
        (role: RoleMarketOption) => {
            onSelectRole(createRoleConfigFromMarketRole(role, defaultMachineId));
            onClose();
        },
        [defaultMachineId, onClose, onSelectRole]
    );

    return (
        <View style={styles.wrapper}>
            <View style={styles.header}>
                <View style={styles.headerText}>
                    <Text style={styles.title}>Role Market</Text>
                    <Text style={styles.subtitle}>Browse default, custom, and public agents for this team.</Text>
                </View>
                <Pressable onPress={onClose} hitSlop={8} style={styles.closeButton}>
                    <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
                </Pressable>
            </View>

            <View style={styles.searchRow}>
                <Ionicons name="search" size={16} color={theme.colors.textSecondary} />
                <TextInput
                    style={[styles.searchInput, Platform.OS === 'web' && ({ outlineStyle: 'none' } as never)]}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search roles, skills, or ratings"
                    placeholderTextColor={theme.colors.input.placeholder}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
                {searchQuery.length > 0 ? (
                    <Pressable onPress={() => setSearchQuery('')} hitSlop={6}>
                        <Ionicons name="close-circle" size={18} color={theme.colors.textSecondary} />
                    </Pressable>
                ) : null}
            </View>

            {suggestedSkills.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.skillRow}>
                    {suggestedSkills.map((skill) => {
                        const isActive = searchQuery.replace(/^#/, '') === skill;
                        return (
                            <Pressable
                                key={skill}
                                style={[styles.skillChip, isActive && styles.skillChipActive]}
                                onPress={() => setSearchQuery((currentQuery) => (currentQuery.replace(/^#/, '') === skill ? '' : `#${skill}`))}
                            >
                                <Text style={[styles.skillChipText, isActive && styles.skillChipTextActive]}>#{skill}</Text>
                            </Pressable>
                        );
                    })}
                </ScrollView>
            ) : null}

            {loadError ? (
                <View style={styles.noticeCard}>
                    <Ionicons name="information-circle-outline" size={16} color={theme.colors.textSecondary} />
                    <Text style={styles.noticeText}>{loadError}</Text>
                    <Pressable onPress={() => void loadRoles()} style={styles.noticeAction}>
                        <Text style={styles.noticeActionText}>{t('common.retry')}</Text>
                    </Pressable>
                </View>
            ) : null}

            {permissionNotice ? (
                <View style={styles.noticeCard}>
                    <Ionicons name="lock-closed-outline" size={16} color={theme.colors.textSecondary} />
                    <Text style={styles.noticeText}>{permissionNotice}</Text>
                </View>
            ) : null}

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                {isLoading ? (
                    <View style={styles.stateCard}>
                        <ActivityIndicator size="small" color={theme.colors.textSecondary} />
                        <Text style={styles.stateText}>{t('common.loading')}</Text>
                    </View>
                ) : groupedRoles.length === 0 ? (
                    <View style={styles.stateCard}>
                        <Ionicons name="search" size={24} color={theme.colors.textSecondary} />
                        <Text style={styles.stateTitle}>No roles match this search</Text>
                        <Text style={styles.stateText}>Try a broader keyword, clear the filters, or create a custom role first.</Text>
                    </View>
                ) : (
                    <>
                        {recommendedRoles.length > 0 ? (
                            <View style={styles.section}>
                                <View style={styles.sectionHeading}>
                                    <Text style={styles.sectionTitle}>Recommended</Text>
                                    {goal ? <Text style={styles.sectionCaption}>{goal}</Text> : null}
                                </View>
                                <View style={styles.sectionList}>
                                    {recommendedRoles.map((role) => {
                                        const alreadyAdded = existingRoleIdSet.has(role.id);
                                        const rating = formatRating(role);
                                        return (
                                            <View key={`recommended-${role.id}`} style={[styles.roleCard, styles.recommendedCard]}>
                                                <View style={styles.roleHeader}>
                                                    <View style={styles.roleHeaderMain}>
                                                        <Text style={styles.roleTitle}>{role.title}</Text>
                                                        <View style={styles.badgeRow}>
                                                            <View style={styles.sourceBadge}>
                                                                <Text style={styles.sourceBadgeText}>{SOURCE_LABELS[role.source]}</Text>
                                                            </View>
                                                            {role.market ? (
                                                                <View style={styles.scoreBadge}>
                                                                    <Text style={styles.scoreBadgeText}>{role.market.score.toFixed(1)}</Text>
                                                                </View>
                                                            ) : null}
                                                            {role.market ? (
                                                                <View style={styles.metaBadge}>
                                                                    <Text style={styles.metaBadgeText}>{role.market.access.label}</Text>
                                                                </View>
                                                            ) : null}
                                                            {rating ? <Text style={styles.ratingText}>{rating}</Text> : null}
                                                        </View>
                                                    </View>
                                                    <Pressable
                                                        style={[styles.addButton, alreadyAdded && styles.addButtonDisabled]}
                                                        disabled={alreadyAdded}
                                                        onPress={() => handleSelectRole(role)}
                                                    >
                                                        <Text style={[styles.addButtonText, alreadyAdded && styles.addButtonTextDisabled]}>
                                                            {alreadyAdded ? 'Added' : 'Add'}
                                                        </Text>
                                                    </Pressable>
                                                </View>
                                                <Text style={styles.roleSummary}>{role.summary}</Text>
                                                {role.market ? (
                                                    <Text style={styles.marketMetaText}>{role.market.variant.label}: {role.market.variant.detail}</Text>
                                                ) : null}
                                                {role.market?.why?.length ? (
                                                    <View style={styles.whyList}>
                                                        {role.market.why.slice(0, 3).map((reason) => (
                                                            <View key={`${role.id}-${reason}`} style={styles.whyRow}>
                                                                <View style={styles.whyBullet} />
                                                                <Text style={styles.whyText}>{reason}</Text>
                                                            </View>
                                                        ))}
                                                    </View>
                                                ) : null}
                                                {role.market?.goalMatches?.length ? (
                                                    <View style={styles.tagRow}>
                                                        {role.market.goalMatches.map((match) => (
                                                            <View key={`${role.id}-${match}`} style={styles.goalChip}>
                                                                <Text style={styles.goalChipText}>{match}</Text>
                                                            </View>
                                                        ))}
                                                    </View>
                                                ) : null}
                                                {role.assignedSkills?.length ? (
                                                    <View style={styles.tagRow}>
                                                        {role.assignedSkills.slice(0, 4).map((skill) => (
                                                            <View key={`${role.id}-${skill}`} style={styles.tagChip}>
                                                                <Text style={styles.tagChipText}>#{skill}</Text>
                                                            </View>
                                                        ))}
                                                    </View>
                                                ) : null}
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>
                        ) : null}

                        {groupedRoles.map((group) => (
                            <View key={group.source} style={styles.section}>
                                <Text style={styles.sectionTitle}>{group.label}</Text>
                                <View style={styles.sectionList}>
                                    {group.roles.map((role) => {
                                        const alreadyAdded = existingRoleIdSet.has(role.id);
                                        const rating = formatRating(role);
                                        return (
                                            <View key={`${group.source}-${role.id}`} style={styles.roleCard}>
                                                <View style={styles.roleHeader}>
                                                    <View style={styles.roleHeaderMain}>
                                                        <Text style={styles.roleTitle}>{role.title}</Text>
                                                        <View style={styles.badgeRow}>
                                                            <View style={styles.sourceBadge}>
                                                                <Text style={styles.sourceBadgeText}>{SOURCE_LABELS[role.source]}</Text>
                                                            </View>
                                                            {role.market ? (
                                                                <View style={styles.metaBadge}>
                                                                    <Text style={styles.metaBadgeText}>{role.market.access.label}</Text>
                                                                </View>
                                                            ) : null}
                                                            {role.market ? (
                                                                <View style={styles.scoreBadge}>
                                                                    <Text style={styles.scoreBadgeText}>{role.market.score.toFixed(1)}</Text>
                                                                </View>
                                                            ) : null}
                                                            {rating ? <Text style={styles.ratingText}>{rating}</Text> : null}
                                                        </View>
                                                    </View>
                                                    <Pressable
                                                        style={[styles.addButton, alreadyAdded && styles.addButtonDisabled]}
                                                        disabled={alreadyAdded}
                                                        onPress={() => handleSelectRole(role)}
                                                    >
                                                        <Text style={[styles.addButtonText, alreadyAdded && styles.addButtonTextDisabled]}>
                                                            {alreadyAdded ? 'Added' : 'Add'}
                                                        </Text>
                                                    </Pressable>
                                                </View>
                                                <Text style={styles.roleSummary}>{role.summary}</Text>
                                                {role.market?.why?.[0] ? (
                                                    <Text style={styles.marketMetaText}>{role.market.why[0]}</Text>
                                                ) : null}
                                                {role.market ? (
                                                    <Text style={styles.marketMetaText}>{role.market.variant.label}: {role.market.variant.detail}</Text>
                                                ) : null}
                                                {role.assignedSkills?.length ? (
                                                    <View style={styles.tagRow}>
                                                        {role.assignedSkills.slice(0, 4).map((skill) => (
                                                            <View key={`${role.id}-${skill}`} style={styles.tagChip}>
                                                                <Text style={styles.tagChipText}>#{skill}</Text>
                                                            </View>
                                                        ))}
                                                    </View>
                                                ) : null}
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>
                        ))}
                    </>
                )}
            </ScrollView>
        </View>
    );
});

const stylesheet = StyleSheet.create((theme) => ({
    wrapper: {
        width: '92%',
        maxWidth: 720,
        maxHeight: '82%',
        backgroundColor: theme.colors.surface,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        padding: 18,
        gap: 14,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
    },
    headerText: {
        flex: 1,
        gap: 4,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: theme.colors.text,
    },
    subtitle: {
        fontSize: 14,
        lineHeight: 20,
        color: theme.colors.textSecondary,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        backgroundColor: theme.colors.groupped.background,
        paddingHorizontal: 12,
        paddingVertical: Platform.OS === 'web' ? 12 : 8,
    },
    searchInput: {
        flex: 1,
        minWidth: 0,
        fontSize: 14,
        color: theme.colors.text,
    },
    skillRow: {
        gap: 8,
        paddingRight: 12,
    },
    skillChip: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: theme.colors.groupped.background,
        borderWidth: 1,
        borderColor: theme.colors.divider,
    },
    skillChipActive: {
        backgroundColor: '#EAF5EE',
        borderColor: '#3D8A5A',
    },
    skillChipText: {
        fontSize: 12,
        fontWeight: '500',
        color: theme.colors.textSecondary,
    },
    skillChipTextActive: {
        color: '#3D8A5A',
        fontWeight: '600',
    },
    noticeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderRadius: 12,
        backgroundColor: theme.colors.groupped.background,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    noticeText: {
        flex: 1,
        fontSize: 12,
        lineHeight: 18,
        color: theme.colors.textSecondary,
    },
    noticeAction: {
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    noticeActionText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#3D8A5A',
    },
    scrollView: {
        minHeight: 120,
    },
    scrollContent: {
        gap: 18,
        paddingBottom: 4,
    },
    section: {
        gap: 10,
    },
    sectionHeading: {
        gap: 4,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.text,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    sectionCaption: {
        fontSize: 12,
        lineHeight: 18,
        color: theme.colors.textSecondary,
    },
    sectionList: {
        gap: 10,
    },
    roleCard: {
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        backgroundColor: theme.colors.surface,
        padding: 14,
        gap: 10,
    },
    recommendedCard: {
        borderColor: '#3D8A5A',
        backgroundColor: '#F7FBF8',
    },
    roleHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
    },
    roleHeaderMain: {
        flex: 1,
        gap: 6,
    },
    roleTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
    },
    sourceBadge: {
        borderRadius: 999,
        backgroundColor: '#EAF5EE',
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    sourceBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#3D8A5A',
    },
    metaBadge: {
        borderRadius: 999,
        backgroundColor: theme.colors.groupped.background,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    metaBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    scoreBadge: {
        borderRadius: 999,
        backgroundColor: '#E8F2F7',
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    scoreBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#2F7A9B',
    },
    ratingText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    roleSummary: {
        fontSize: 13,
        lineHeight: 19,
        color: theme.colors.textSecondary,
    },
    marketMetaText: {
        fontSize: 12,
        lineHeight: 18,
        color: theme.colors.textSecondary,
    },
    whyList: {
        gap: 6,
    },
    whyRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
    },
    whyBullet: {
        width: 6,
        height: 6,
        marginTop: 6,
        borderRadius: 3,
        backgroundColor: '#3D8A5A',
    },
    whyText: {
        flex: 1,
        fontSize: 12,
        lineHeight: 18,
        color: theme.colors.text,
    },
    addButton: {
        minWidth: 72,
        borderRadius: 10,
        backgroundColor: '#3D8A5A',
        paddingHorizontal: 12,
        paddingVertical: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addButtonDisabled: {
        backgroundColor: theme.colors.groupped.background,
    },
    addButtonText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    addButtonTextDisabled: {
        color: theme.colors.textSecondary,
    },
    tagRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    tagChip: {
        borderRadius: 999,
        backgroundColor: theme.colors.groupped.background,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    tagChipText: {
        fontSize: 11,
        color: theme.colors.textSecondary,
    },
    goalChip: {
        borderRadius: 999,
        backgroundColor: '#E8F2F7',
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    goalChipText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#2F7A9B',
    },
    stateCard: {
        minHeight: 160,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        backgroundColor: theme.colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
        gap: 10,
    },
    stateTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
    stateText: {
        fontSize: 13,
        lineHeight: 19,
        textAlign: 'center',
        color: theme.colors.textSecondary,
    },
}));
