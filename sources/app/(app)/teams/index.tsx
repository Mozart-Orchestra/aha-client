import React from 'react';
import { View, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { Text } from '@/components/StyledText';
import { useArtifacts, storage } from '@/sync/storage';
import { DecryptedArtifact } from '@/sync/artifactTypes';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { t } from '@/text';
import { layout } from '@/components/layout';
import { sync } from '@/sync/sync';
import { FAB } from '@/components/FAB';
import { Modal } from '@/modal/ModalManager';

const stylesheet = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.colors.groupped.background,
    },
    contentContainer: {
        paddingBottom: 100,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    emptyIcon: {
        marginBottom: 16,
        color: theme.colors.textSecondary,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyDescription: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    teamItem: {
        backgroundColor: theme.colors.surface,
        marginHorizontal: 16,
        marginBottom: 1,
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
    },
    teamItemFirst: {
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        marginTop: 16,
    },
    teamItemLast: {
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        marginBottom: 16,
    },
    teamItemSingle: {
        borderRadius: 12,
        marginTop: 16,
        marginBottom: 16,
    },
    teamContent: {
        flex: 1,
        marginRight: 8,
    },
    teamTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: theme.colors.text,
        marginBottom: 4,
    },
    teamUntitled: {
        color: theme.colors.textSecondary,
        fontStyle: 'italic',
    },
    teamMeta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    teamDate: {
        fontSize: 13,
        color: theme.colors.textSecondary,
    },
    teamChevron: {
        color: theme.colors.textSecondary,
    },
}));

export default function TeamsScreen() {
    const { theme } = useUnistyles();
    const styles = stylesheet;
    const router = useRouter();
    const allArtifacts = useArtifacts();

    // Filter for team artifacts
    const teams = React.useMemo(() => {
        return allArtifacts.filter(a => a.type === 'team');
    }, [allArtifacts]);

    const [isLoading, setIsLoading] = React.useState(false);

    React.useEffect(() => {
        let cancelled = false;
        let isMounted = true;

        (async () => {
            try {
                const credentials = sync.getCredentials();
                if (!credentials) {
                    return;
                }

                setIsLoading(true);
                await sync.fetchArtifactsList();
            } catch (error) {
                console.error('Failed to fetch artifacts:', error);
            } finally {
                if (isMounted && !cancelled) {
                    setIsLoading(false);
                }
            }
        })();

        return () => {
            cancelled = true;
            isMounted = false;
        };
    }, []);

    const handleDelete = React.useCallback(async (teamId: string, event: any) => {
        event.stopPropagation();
        const confirm = await Modal.confirm(
            'Delete Team',
            'Are you sure you want to delete this team? This action cannot be undone.'
        );

        if (confirm) {
            try {
                await sync.deleteArtifact(teamId);
            } catch (error) {
                console.error('Failed to delete team:', error);
                await Modal.alert(t('common.error'), 'Failed to delete team');
            }
        }
    }, []);

    const renderItem = React.useCallback(({ item, index }: { item: DecryptedArtifact; index: number }) => {
        const isFirst = index === 0;
        const isLast = index === teams.length - 1;
        const isSingle = teams.length === 1;

        return (
            <Pressable
                style={[
                    styles.teamItem,
                    isSingle ? styles.teamItemSingle :
                        isFirst ? styles.teamItemFirst :
                            isLast ? styles.teamItemLast : {}
                ]}
                onPress={() => router.push(`/teams/${item.id}`)}
            >
                <View style={styles.teamContent}>
                    <Text
                        style={[
                            styles.teamTitle,
                            !item.title && styles.teamUntitled
                        ]}
                        numberOfLines={1}
                    >
                        {item.title || 'Untitled Team'}
                    </Text>
                    <View style={styles.teamMeta}>
                        <Text style={styles.teamDate}>
                            {item.sessions?.length || 0} members • {new Date(item.updatedAt).toLocaleDateString()}
                        </Text>
                    </View>
                </View>
                <Pressable
                    onPress={(e) => handleDelete(item.id, e)}
                    style={{ padding: 8, marginRight: 4 }}
                    hitSlop={8}
                >
                    <Ionicons
                        name="trash-outline"
                        size={20}
                        color={theme.colors.textSecondary}
                    />
                </Pressable>
                <Ionicons
                    name="chevron-forward"
                    size={18}
                    style={styles.teamChevron}
                    color={theme.colors.textSecondary}
                />
            </Pressable>
        );
    }, [teams, router, styles, handleDelete]);

    const keyExtractor = React.useCallback((item: DecryptedArtifact) => item.id, []);

    const ListEmptyComponent = React.useCallback(() => {
        if (isLoading) {
            return (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" />
                    <Text style={[styles.emptyDescription, { marginTop: 16 }]}>
                        Loading teams...
                    </Text>
                </View>
            );
        }

        return (
            <View style={styles.emptyContainer}>
                <Ionicons
                    name="people-outline"
                    size={64}
                    style={styles.emptyIcon}
                    color={theme.colors.textSecondary}
                />
                <Text style={styles.emptyTitle}>
                    No Teams Yet
                </Text>
                <Text style={styles.emptyDescription}>
                    Create a team to collaborate with multiple agents.
                </Text>
            </View>
        );
    }, [isLoading, styles, teams, theme]);

    return (
        <View style={styles.container}>
            <FlatList
                data={teams}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                contentContainerStyle={[
                    styles.contentContainer,
                    teams.length === 0 && { flex: 1 },
                    { maxWidth: layout.maxWidth, alignSelf: 'center', width: '100%' }
                ]}
                ListEmptyComponent={ListEmptyComponent}
            />

            {/* Floating Action Button */}
            <FAB onPress={() => router.push('/teams/new')} />
        </View>
    );
}
