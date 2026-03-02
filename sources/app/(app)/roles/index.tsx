import * as React from 'react';
import { View, ScrollView, Pressable, ActivityIndicator, TextInput, Modal as NativeModal } from 'react-native';
import { Text } from '@/components/StyledText';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { RoleCard } from '@/components/roles/RoleCard';
import { RoleForm } from '@/components/roles/RoleForm';
import { RolePreview } from '@/components/RolePreview';
import { SearchSuggestions } from '@/components/SearchSuggestions';
import { useAuth } from '@/auth/AuthContext';
import { Modal as AppModal } from '@/modal';
import {
    createCustomRole,
    fetchCustomRoles,
    fetchDefaultRoles,
    fetchRolePool,
    deleteCustomRole,
    updateCustomRole,
    CustomRole,
    PublicRole,
    RoleTemplate,
} from '@/sync/apiRoles';

type RoleItem = CustomRole | PublicRole | RoleTemplate;

const normalizeTag = (value: string): string =>
    value.trim().toLowerCase().replace(/^#/, '');

const parseSearchQuery = (query: string): { keywords: string[]; queryTags: string[] } => {
    const keywords: string[] = [];
    const queryTags: string[] = [];

    const tokens = query
        .split(/\s+/)
        .map((token) => token.trim())
        .filter(Boolean);

    for (const token of tokens) {
        if (token.startsWith('#') && token.length > 1) {
            queryTags.push(normalizeTag(token));
        } else {
            keywords.push(token.toLowerCase());
        }
    }

    return { keywords, queryTags };
};

const getRoleTags = (role: RoleItem): string[] => {
    const roleMeta = role as unknown as Record<string, unknown>;
    const skills = Array.isArray(roleMeta.assignedSkills)
        ? (roleMeta.assignedSkills as string[])
        : [];
    const category = 'category' in role && typeof role.category === 'string'
        ? [role.category]
        : [];

    return Array.from(new Set(
        [...skills, ...category]
            .map((item) => normalizeTag(String(item)))
            .filter(Boolean)
    ));
};

export default function RolesScreen() {
    const router = useRouter();
    const { credentials } = useAuth();
    const { theme } = useUnistyles();

    const [activeTab, setActiveTab] = React.useState<'all' | 'my' | 'pool' | 'defaults'>('all');
    const [customRoles, setCustomRoles] = React.useState<CustomRole[]>([]);
    const [poolRoles, setPoolRoles] = React.useState<PublicRole[]>([]);
    const [defaultRoles, setDefaultRoles] = React.useState<RoleTemplate[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [refreshing, setRefreshing] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
    const [isRoleEditorVisible, setIsRoleEditorVisible] = React.useState(false);
    const [editingRole, setEditingRole] = React.useState<CustomRole | null>(null);
    const [isSavingRole, setIsSavingRole] = React.useState(false);
    const [previewRole, setPreviewRole] = React.useState<RoleItem | null>(null);
    const [searchHistory, setSearchHistory] = React.useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = React.useState(false);

    const mergedRoles = React.useMemo(() => {
        const roleMap = new Map<string, RoleItem>();

        // Priority: defaults < pool < my roles (my role should win on id conflict)
        defaultRoles.forEach((role) => roleMap.set(role.id, { ...role, isServerDefault: true } as RoleItem));
        poolRoles.forEach((role) => roleMap.set(role.id, { ...role, isPool: true } as RoleItem));
        customRoles.forEach((role) => roleMap.set(role.id, { ...role, isCustom: true } as RoleItem));

        return Array.from(roleMap.values());
    }, [customRoles, poolRoles, defaultRoles]);

    const loadRoles = React.useCallback(async (showLoading = true) => {
        if (!credentials) {
            setCustomRoles([]);
            setPoolRoles([]);
            setDefaultRoles([]);
            setIsLoading(false);
            setRefreshing(false);
            return;
        }

        if (showLoading) setIsLoading(true);
        setRefreshing(true);

        try {
            const [customResult, poolResult, defaultsResult] = await Promise.allSettled([
                fetchCustomRoles(credentials),
                fetchRolePool(credentials, { limit: 50 }),
                fetchDefaultRoles(credentials),
            ]);

            if (customResult.status === 'fulfilled') {
                setCustomRoles(customResult.value);
            } else {
                setCustomRoles([]);
                console.error('Failed to load custom roles:', customResult.reason);
            }

            if (poolResult.status === 'fulfilled') {
                setPoolRoles(poolResult.value);
            } else {
                setPoolRoles([]);
                console.warn('Failed to load role pool:', poolResult.reason);
            }

            if (defaultsResult.status === 'fulfilled') {
                setDefaultRoles(defaultsResult.value);
            } else {
                setDefaultRoles([]);
                console.warn('Failed to load default roles:', defaultsResult.reason);
            }

            if (
                customResult.status === 'rejected' &&
                poolResult.status === 'rejected' &&
                defaultsResult.status === 'rejected'
            ) {
                AppModal.alert('Error', 'Failed to load roles. Please try again.');
            }
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [credentials]);

    const openCreateRoleModal = React.useCallback(() => {
        setEditingRole(null);
        setIsRoleEditorVisible(true);
    }, []);

    const openEditRoleModal = React.useCallback((role: RoleItem) => {
        setEditingRole(role as CustomRole);
        setIsRoleEditorVisible(true);
    }, []);

    const closeRoleEditorModal = React.useCallback(() => {
        if (isSavingRole) return;
        setIsRoleEditorVisible(false);
        setEditingRole(null);
    }, [isSavingRole]);

    const handleSaveRole = React.useCallback(async (formData: Partial<CustomRole>) => {
        if (!credentials) {
            AppModal.alert('Error', 'Not authenticated');
            return;
        }

        const targetRole = editingRole;
        setIsSavingRole(true);

        try {
            if (targetRole?.id) {
                await updateCustomRole(credentials, targetRole.id, formData);
            } else {
                await createCustomRole(credentials, formData);
            }

            await loadRoles(false);
            setIsRoleEditorVisible(false);
            setEditingRole(null);
            AppModal.alert('Success', targetRole?.id ? 'Role updated successfully.' : 'Role created successfully.');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to save role.';
            AppModal.alert('Error', message);
        } finally {
            setIsSavingRole(false);
        }
    }, [credentials, editingRole, loadRoles]);

    useFocusEffect(
        React.useCallback(() => {
            loadRoles(false);
        }, [loadRoles])
    );

    const handleDeleteRole = (roleId: string) => {
        AppModal.alert(
            'Delete Role?',
            'This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        if (!credentials) return;
                        try {
                            await deleteCustomRole(credentials, roleId);
                            await loadRoles(false);
                            AppModal.alert('Success', 'Role deleted successfully.');
                        } catch (error) {
                            AppModal.alert('Error', 'Failed to delete role.');
                        }
                    },
                },
            ]
        );
    };

    const getCurrentRoles = (): RoleItem[] => {
        switch (activeTab) {
            case 'all':
                return mergedRoles;
            case 'my':
                return customRoles.map((r) => ({ ...r, isCustom: true }));
            case 'pool':
                return poolRoles.map((r) => ({ ...r, isPool: true }));
            case 'defaults':
                return defaultRoles.map((r) => ({ ...r, isServerDefault: true }));
            default:
                return [];
        }
    };

    const visibleRoles = React.useMemo(() => {
        const roles = getCurrentRoles();
        const { keywords, queryTags } = parseSearchQuery(searchQuery);
        const requiredTags = new Set([...selectedTags, ...queryTags].map((tag) => normalizeTag(tag)));
        const hasKeyword = keywords.length > 0;
        const hasTags = requiredTags.size > 0;

        if (!hasKeyword && !hasTags) {
            return roles;
        }

        return roles.filter((role) => {
            const tags = getRoleTags(role);
            if (hasTags && Array.from(requiredTags).some((tag) => !tags.includes(tag))) {
                return false;
            }

            const category = 'category' in role && typeof role.category === 'string' ? role.category : '';
            const haystack = [role.id, role.title, role.summary, category, tags.join(' ')]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return keywords.every((keyword) => haystack.includes(keyword));
        });
    }, [activeTab, mergedRoles, customRoles, poolRoles, defaultRoles, searchQuery, selectedTags]);

    const availableTags = React.useMemo(() => {
        const tagCounts = new Map<string, number>();
        for (const role of getCurrentRoles()) {
            for (const tag of getRoleTags(role)) {
                tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
            }
        }
        return Array.from(tagCounts.entries())
            .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
            .slice(0, 12)
            .map(([tag]) => tag);
    }, [activeTab, mergedRoles, customRoles, poolRoles, defaultRoles]);

    // Extract all skills from roles for search suggestions
    const availableSkills = React.useMemo(() => {
        const skillsSet = new Set<string>();
        for (const role of getCurrentRoles()) {
            const roleMeta = role as unknown as Record<string, unknown>;
            if (Array.isArray(roleMeta.assignedSkills)) {
                roleMeta.assignedSkills.forEach((skill: string) =>
                    skillsSet.add(skill.trim())
                );
            }
            if (role.category) {
                skillsSet.add(role.category);
            }
        }
        return Array.from(skillsSet).sort();
    }, [getCurrentRoles]);

    // Popular tags with counts for suggestions
    const popularTags = React.useMemo(() => {
        const tagCounts = new Map<string, number>();
        for (const role of getCurrentRoles()) {
            for (const tag of getRoleTags(role)) {
                tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
            }
        }
        return Array.from(tagCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([tag, count]) => ({ tag, count }));
    }, [getCurrentRoles]);

    const toggleTag = React.useCallback((tag: string) => {
        setSelectedTags((prev) => {
            if (prev.includes(tag)) {
                return prev.filter((item) => item !== tag);
            }
            return [...prev, tag];
        });
    }, []);

    const handleTagPress = React.useCallback((tag: string) => {
        // Set search query to #tag format
        setSearchQuery(`#${tag}`);
        // Also add to selectedTags for visual feedback
        setSelectedTags((prev) => {
            if (prev.includes(tag)) {
                return prev;
            }
            return [...prev, tag];
        });
    }, []);

    // Handle suggestion selection
    const handleSuggestionSelect = React.useCallback((suggestion: string) => {
        setSearchQuery(suggestion);
    }, []);

    // Handle tag selection from suggestions
    const handleTagSelectFromSuggestion = React.useCallback((tag: string) => {
        const cleanTag = tag.replace(/^#/, '');
        setSearchQuery(`#${cleanTag}`);
        setSelectedTags((prev) => {
            if (prev.includes(cleanTag)) return prev;
            return [...prev, cleanTag];
        });
    }, []);

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: 'Role Management',
                    headerRight: () => (
                        <Pressable
                            style={styles.headerButton}
                            onPress={openCreateRoleModal}
                        >
                            <Ionicons name="add" size={28} color={theme.colors.header.tint} />
                        </Pressable>
                    ),
                }}
            />

            {/* Tab Navigation */}
            <View style={styles.tabContainer}>
                <Pressable
                    style={[styles.tab, activeTab === 'all' && styles.tabActive]}
                    onPress={() => setActiveTab('all')}
                >
                    <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
                        All
                    </Text>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{mergedRoles.length}</Text>
                    </View>
                </Pressable>
                <Pressable
                    style={[styles.tab, activeTab === 'my' && styles.tabActive]}
                    onPress={() => setActiveTab('my')}
                >
                    <Text style={[styles.tabText, activeTab === 'my' && styles.tabTextActive]}>
                        My Roles
                    </Text>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{customRoles.length}</Text>
                    </View>
                </Pressable>
                <Pressable
                    style={[styles.tab, activeTab === 'pool' && styles.tabActive]}
                    onPress={() => setActiveTab('pool')}
                >
                    <Text style={[styles.tabText, activeTab === 'pool' && styles.tabTextActive]}>
                        Pool
                    </Text>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{poolRoles.length}</Text>
                    </View>
                </Pressable>
                <Pressable
                    style={[styles.tab, activeTab === 'defaults' && styles.tabActive]}
                    onPress={() => setActiveTab('defaults')}
                >
                    <Text style={[styles.tabText, activeTab === 'defaults' && styles.tabTextActive]}>
                        Defaults
                    </Text>
                </Pressable>
            </View>

            <View style={styles.searchContainer}>
                <Ionicons name="search" size={16} color={theme.colors.textSecondary} />
                <TextInput
                    style={styles.searchInput}
                    value={searchQuery}
                    onChangeText={(text) => {
                        setSearchQuery(text);
                        setShowSuggestions(text.length > 0 || searchHistory.length > 0);
                    }}
                    placeholder="Search roles or #tags (e.g. #frontend)"
                    placeholderTextColor={theme.colors.textSecondary}
                    onFocus={() => setShowSuggestions(searchQuery.length > 0 || searchHistory.length > 0)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                />
                {searchQuery.length > 0 && (
                    <Pressable onPress={() => {
                        setSearchQuery('');
                        setShowSuggestions(searchHistory.length > 0);
                    }}>
                        <Ionicons name="close-circle" size={18} color={theme.colors.textSecondary} />
                    </Pressable>
                )}
            </View>
            {showSuggestions && (
                <SearchSuggestions
                    query={searchQuery}
                    availableSkills={availableSkills}
                    recentSearches={searchHistory}
                    popularTags={popularTags}
                    onSelect={handleSuggestionSelect}
                    onTagSelect={handleTagSelectFromSuggestion}
                />
            )}
            {availableTags.length > 0 && (
                <View style={styles.tagFilterRow}>
                    <Text style={styles.tagFilterLabel}>Tags</Text>
                    {availableTags.map((tag) => {
                        const active = selectedTags.includes(tag);
                        return (
                            <Pressable
                                key={tag}
                                style={[styles.tagChip, active && styles.tagChipActive]}
                                onPress={() => toggleTag(tag)}
                            >
                                <Text style={[styles.tagChipText, active && styles.tagChipTextActive]}>
                                    #{tag}
                                </Text>
                            </Pressable>
                        );
                    })}
                    {selectedTags.length > 0 && (
                        <Pressable
                            style={styles.clearTagChip}
                            onPress={() => setSelectedTags([])}
                        >
                            <Text style={styles.clearTagChipText}>Clear</Text>
                        </Pressable>
                    )}
                </View>
            )}

            {/* Content */}
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" />
                </View>
            ) : (
                <ScrollView
                    style={styles.content}
                    contentContainerStyle={styles.contentInner}
                >
                    {visibleRoles.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons
                                name="shield-outline"
                                size={48}
                                color={theme.colors.textSecondary}
                            />
                            <Text style={styles.emptyTitle}>
                                {searchQuery.trim()
                                    ? 'No Matching Roles'
                                    : activeTab === 'all'
                                    ? 'No Roles Found'
                                    : activeTab === 'my'
                                    ? 'No Custom Roles'
                                    : activeTab === 'pool'
                                        ? 'No Public Roles'
                                        : 'No Default Roles'}
                            </Text>
                            <Text style={styles.emptySubtitle}>
                                {searchQuery.trim()
                                    ? 'Try another keyword or clear search'
                                    : activeTab === 'all'
                                    ? 'Unable to load role library from server'
                                    : activeTab === 'my'
                                    ? 'Create your first custom role to get started'
                                    : activeTab === 'pool'
                                        ? 'No roles available in the public pool'
                                        : 'Server default roles not loaded'}
                            </Text>
                            {searchQuery.trim() ? (
                                <Pressable
                                    style={styles.emptyButton}
                                    onPress={() => setSearchQuery('')}
                                >
                                    <Text style={styles.emptyButtonText}>Clear Search</Text>
                                </Pressable>
                            ) : activeTab === 'my' && (
                                <Pressable
                                    style={styles.emptyButton}
                                    onPress={openCreateRoleModal}
                                >
                                    <Text style={styles.emptyButtonText}>Create Role</Text>
                                </Pressable>
                            )}
                        </View>
                    ) : (
                        visibleRoles.map((role) => (
                            <RoleCard
                                key={role.id}
                                role={role}
                                onPress={() => setPreviewRole(role)}
                                onEdit={
                                    activeTab === 'my'
                                        ? () => openEditRoleModal(role)
                                        : undefined
                                }
                                onDelete={
                                    activeTab === 'my'
                                        ? () => handleDeleteRole(role.id)
                                        : undefined
                                }
                                showActions={activeTab === 'my'}
                                onTagPress={handleTagPress}
                            />
                        ))
                    )}
                </ScrollView>
            )}

            {/* FAB for My Roles tab */}
            {activeTab === 'my' && (
                <Pressable
                    style={styles.fab}
                    onPress={openCreateRoleModal}
                >
                    <Ionicons name="add" size={28} color="#FFF" />
                </Pressable>
            )}

            <NativeModal
                visible={isRoleEditorVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={closeRoleEditorModal}
            >
                <View style={styles.editorContainer}>
                    <View style={styles.editorHeader}>
                        <Text style={styles.editorTitle}>
                            {editingRole ? 'Edit Role' : 'Create Role'}
                        </Text>
                        <Pressable
                            style={styles.editorCloseButton}
                            onPress={closeRoleEditorModal}
                            disabled={isSavingRole}
                        >
                            <Ionicons name="close" size={22} color={theme.colors.text} />
                        </Pressable>
                    </View>
                    <RoleForm
                        initialData={editingRole ?? undefined}
                        onSubmit={handleSaveRole}
                        onCancel={closeRoleEditorModal}
                        isLoading={isSavingRole}
                        submitLabel={editingRole ? 'Save Changes' : 'Create Role'}
                    />
                </View>
            </NativeModal>

            {/* Role Preview Modal */}
            {previewRole && (
                <NativeModal
                    visible={true}
                    animationType="slide"
                    presentationStyle="pageSheet"
                    onRequestClose={() => setPreviewRole(null)}
                >
                    <RolePreview
                        roleId={previewRole.id}
                        title={previewRole.title}
                        summary={previewRole.summary || ''}
                        icon={previewRole.icon}
                        averageRating={(previewRole as any).stats?.averageRating || 0}
                        completedTasks={(previewRole as any).stats?.reviewCount || 0}
                        successRate={(previewRole as any).stats?.successRate || 0}
                        skills={(previewRole as any).assignedSkills || []}
                        responsibilities={(previewRole as any).responsibilities || []}
                        onTryRole={() => {
                            // TODO: Implement trial role logic
                            AppModal.alert('Coming Soon', 'Trial role feature will be available soon!');
                        }}
                        onAddToTeam={() => {
                            // TODO: Implement add to team logic
                            router.push({ pathname: '/roles/[id]', params: { id: previewRole.id } } as never);
                            setPreviewRole(null);
                        }}
                        onClose={() => setPreviewRole(null)}
                    />
                </NativeModal>
            )}
        </View>
    );
}

const styles = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.colors.groupped.background,
    },
    headerButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.divider,
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginRight: 8,
        borderRadius: 8,
    },
    tabActive: {
        backgroundColor: theme.colors.button.primary.background,
    },
    tabText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        fontWeight: '600',
    },
    tabTextActive: {
        color: '#FFF',
    },
    badge: {
        backgroundColor: theme.colors.groupped.background,
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginLeft: 6,
    },
    badgeText: {
        fontSize: 11,
        color: theme.colors.text,
        fontWeight: '600',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 4,
        paddingHorizontal: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        backgroundColor: theme.colors.surface,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 10,
        color: theme.colors.text,
        fontSize: 14,
    },
    tagFilterRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 8,
        marginHorizontal: 16,
        marginBottom: 10,
    },
    tagFilterLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        fontWeight: '600',
        marginRight: 4,
    },
    tagChip: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        backgroundColor: theme.colors.surface,
    },
    tagChipActive: {
        backgroundColor: theme.colors.button.primary.background,
        borderColor: theme.colors.button.primary.background,
    },
    tagChipText: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        fontWeight: '600',
    },
    tagChipTextActive: {
        color: '#FFF',
    },
    clearTagChip: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        backgroundColor: theme.colors.groupped.background,
    },
    clearTagChipText: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        fontWeight: '600',
    },
    content: {
        flex: 1,
    },
    contentInner: {
        padding: 16,
        paddingBottom: 80,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.text,
        marginTop: 16,
    },
    emptySubtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginTop: 8,
        textAlign: 'center',
        maxWidth: 250,
    },
    emptyButton: {
        marginTop: 20,
        backgroundColor: theme.colors.button.primary.background,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    emptyButtonText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 15,
    },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: theme.colors.button.primary.background,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    editorContainer: {
        flex: 1,
        backgroundColor: theme.colors.groupped.background,
    },
    editorHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.divider,
        backgroundColor: theme.colors.surface,
    },
    editorTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
    },
    editorCloseButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.groupped.background,
    },
}));
