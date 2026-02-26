import * as React from 'react';
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Text } from '@/components/StyledText';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { RoleCard } from '@/components/roles/RoleCard';
import { useAuth } from '@/auth/AuthContext';
import { Modal } from '@/modal';
import {
    fetchCustomRoles,
    fetchDefaultRoles,
    fetchRolePool,
    deleteCustomRole,
    CustomRole,
    PublicRole,
    RoleTemplate,
} from '@/sync/apiRoles';

type RoleItem = CustomRole | PublicRole | RoleTemplate;

export default function RolesScreen() {
    const router = useRouter();
    const { credentials } = useAuth();
    const { theme } = useUnistyles();

    const [activeTab, setActiveTab] = React.useState<'my' | 'pool' | 'defaults'>('my');
    const [customRoles, setCustomRoles] = React.useState<CustomRole[]>([]);
    const [poolRoles, setPoolRoles] = React.useState<PublicRole[]>([]);
    const [defaultRoles, setDefaultRoles] = React.useState<RoleTemplate[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [refreshing, setRefreshing] = React.useState(false);

    const loadRoles = React.useCallback(async (showLoading = true) => {
        if (!credentials) return;

        if (showLoading) setIsLoading(true);
        setRefreshing(true);

        try {
            const [custom, pool, defaults] = await Promise.all([
                fetchCustomRoles(credentials),
                fetchRolePool(credentials, { limit: 50 }),
                fetchDefaultRoles(credentials),
            ]);
            setCustomRoles(custom);
            setPoolRoles(pool);
            setDefaultRoles(defaults);
        } catch (error) {
            console.error('Failed to load roles:', error);
            Modal.alert('Error', 'Failed to load roles. Please try again.');
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [credentials]);

    React.useEffect(() => {
        loadRoles();
    }, [loadRoles]);

    const handleDeleteRole = (roleId: string) => {
        Modal.alert(
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
                            Modal.alert('Success', 'Role deleted successfully.');
                        } catch (error) {
                            Modal.alert('Error', 'Failed to delete role.');
                        }
                    },
                },
            ]
        );
    };

    const getCurrentRoles = (): RoleItem[] => {
        switch (activeTab) {
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

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: 'Role Management',
                    headerRight: () => (
                        <Pressable
                            style={styles.headerButton}
                            onPress={() => router.push('/roles/new')}
                        >
                            <Ionicons name="add" size={28} color={theme.colors.header.tint} />
                        </Pressable>
                    ),
                }}
            />

            {/* Tab Navigation */}
            <View style={styles.tabContainer}>
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
                    {getCurrentRoles().length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons
                                name="shield-outline"
                                size={48}
                                color={theme.colors.textSecondary}
                            />
                            <Text style={styles.emptyTitle}>
                                {activeTab === 'my'
                                    ? 'No Custom Roles'
                                    : activeTab === 'pool'
                                        ? 'No Public Roles'
                                        : 'No Default Roles'}
                            </Text>
                            <Text style={styles.emptySubtitle}>
                                {activeTab === 'my'
                                    ? 'Create your first custom role to get started'
                                    : activeTab === 'pool'
                                        ? 'No roles available in the public pool'
                                        : 'Server default roles not loaded'}
                            </Text>
                            {activeTab === 'my' && (
                                <Pressable
                                    style={styles.emptyButton}
                                    onPress={() => router.push('/roles/new')}
                                >
                                    <Text style={styles.emptyButtonText}>Create Role</Text>
                                </Pressable>
                            )}
                        </View>
                    ) : (
                        getCurrentRoles().map((role) => (
                            <RoleCard
                                key={role.id}
                                role={role}
                                onPress={() => router.push(`/roles/${role.id}`)}
                                onEdit={
                                    activeTab === 'my'
                                        ? () => router.push(`/roles/${role.id}`)
                                        : undefined
                                }
                                onDelete={
                                    activeTab === 'my'
                                        ? () => handleDeleteRole(role.id)
                                        : undefined
                                }
                                showActions={activeTab === 'my'}
                            />
                        ))
                    )}
                </ScrollView>
            )}

            {/* FAB for My Roles tab */}
            {activeTab === 'my' && (
                <Pressable
                    style={styles.fab}
                    onPress={() => router.push('/roles/new')}
                >
                    <Ionicons name="add" size={28} color="#FFF" />
                </Pressable>
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
}));
