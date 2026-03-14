import * as React from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native-unistyles';

import { Text } from '@/components/ui/StyledText';
import { DecryptedArtifact } from '@/sync/artifactTypes';
import { useArtifacts } from '@/sync/storage';
import { sync } from '@/sync/sync';
import { getThreeColumnShellTokens, ThreeColumnShellVariant } from './ThreeColumnShell';

const styles = StyleSheet.create(() => ({
    container: {
        flex: 1,
        minHeight: 0,
    },
    header: {
        paddingHorizontal: 18,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    leading: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    info: {
        flex: 1,
        minWidth: 0,
    },
    eyebrow: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.7,
        marginBottom: 6,
    },
    title: {
        fontSize: 17,
        fontWeight: '700',
    },
    subtitle: {
        fontSize: 12,
        marginTop: 4,
    },
    action: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
    },
    actionText: {
        fontSize: 13,
        fontWeight: '600',
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 10,
    },
    chip: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
    },
    chipText: {
        fontSize: 11,
        fontWeight: '600',
    },
    body: {
        flex: 1,
        minHeight: 0,
    },
    listContent: {
        padding: 18,
        paddingBottom: 28,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    teamCard: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#7A8C9B',
        shadowOffset: { width: 0, height: 7 },
        shadowOpacity: 0.08,
        shadowRadius: 18,
        elevation: 3,
    },
    teamRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    teamAvatar: {
        width: 40,
        height: 40,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    teamAvatarText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    teamTextWrap: {
        flex: 1,
        minWidth: 0,
    },
    teamTitle: {
        fontSize: 15,
        fontWeight: '700',
    },
    teamMetaText: {
        fontSize: 12,
        lineHeight: 18,
        marginTop: 4,
    },
    teamMetaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 12,
    },
    teamMetaPill: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
    },
    teamMetaPillText: {
        fontSize: 11,
        fontWeight: '600',
    },
    chevronWrap: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
}));

interface SidebarTeamsPanelProps {
    variant?: ThreeColumnShellVariant;
}

export const SidebarTeamsPanel = React.memo(({ variant = 'default' }: SidebarTeamsPanelProps) => {
    const tokens = getThreeColumnShellTokens(variant);
    const router = useRouter();
    const pathname = usePathname();
    const allArtifacts = useArtifacts();
    const [isLoading, setIsLoading] = React.useState(false);

    const selectedTeamId = React.useMemo(() => {
        if (!pathname.startsWith('/teams/')) {
            return null;
        }

        const [, , teamId] = pathname.split('/');
        return teamId || null;
    }, [pathname]);

    const teams = React.useMemo(() => {
        return allArtifacts
            .filter((artifact) => artifact.type === 'team')
            .sort((left, right) => right.updatedAt - left.updatedAt);
    }, [allArtifacts]);

    React.useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                if (!sync.getCredentials()) {
                    return;
                }

                setIsLoading(true);
                await sync.fetchArtifactsList();
            } catch (error) {
                console.error('Failed to refresh team artifacts for sidebar:', error);
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    const renderItem = React.useCallback(({ item }: { item: DecryptedArtifact }) => {
        const teamName = item.title || 'Untitled Team';
        const memberCount = item.sessions?.length || 0;
        const isSelected = selectedTeamId === item.id;

        return (
            <Pressable
                style={[
                    styles.teamCard,
                    {
                        backgroundColor: isSelected ? '#EAF1F5' : tokens.cardBackground,
                        borderColor: isSelected ? tokens.actionText : tokens.cardBorder,
                    },
                ]}
                onPress={() => router.push(`/teams/${item.id}`)}
            >
                <View style={styles.teamRow}>
                    <View style={[styles.teamAvatar, { backgroundColor: tokens.avatarBackground }]}>
                        <Text style={styles.teamAvatarText}>
                            {teamName.slice(0, 2).toUpperCase()}
                        </Text>
                    </View>
                    <View style={styles.teamTextWrap}>
                        <Text style={[styles.teamTitle, { color: tokens.panelTitle }]} numberOfLines={1}>
                            {teamName}
                        </Text>
                        <Text style={[styles.teamMetaText, { color: tokens.panelTextSecondary }]} numberOfLines={2}>
                            {memberCount} members • Updated {new Date(item.updatedAt).toLocaleDateString()}
                        </Text>
                        <View style={styles.teamMetaRow}>
                            <View
                                style={[
                                    styles.teamMetaPill,
                                    {
                                        backgroundColor: tokens.chipBackground,
                                        borderColor: tokens.chipBorder,
                                    },
                                ]}
                            >
                                <Text style={[styles.teamMetaPillText, { color: tokens.chipText }]}>
                                    {memberCount} agents
                                </Text>
                            </View>
                        </View>
                    </View>
                    <View
                        style={[
                            styles.chevronWrap,
                            {
                                backgroundColor: '#F8FBFD',
                                borderColor: tokens.cardBorder,
                            },
                        ]}
                    >
                        <Ionicons name="arrow-forward" size={15} color={tokens.actionText} />
                    </View>
                </View>
            </Pressable>
        );
    }, [router, selectedTeamId, tokens]);

    return (
        <View style={styles.container}>
            <View style={[styles.header, { borderBottomColor: tokens.panelDivider }]}>
                <View style={styles.headerRow}>
                    <View
                        style={[
                            styles.leading,
                            {
                                backgroundColor: tokens.softIconBackground,
                                borderColor: tokens.panelBorder,
                            },
                        ]}
                    >
                        <Ionicons name="people-outline" size={16} color={tokens.softIconForeground} />
                    </View>
                    <View style={styles.info}>
                        <Text style={[styles.eyebrow, { color: tokens.panelEyebrow }]}>Teams</Text>
                        <Text style={[styles.title, { color: tokens.panelTitle }]}>Workspace Teams</Text>
                        <Text style={[styles.subtitle, { color: tokens.panelTextSecondary }]}>
                            Quick team navigation inside the new three-column shell.
                        </Text>
                    </View>
                    <Pressable
                        style={[
                            styles.action,
                            {
                                backgroundColor: tokens.primaryActionBackground,
                                borderColor: tokens.primaryActionBackground,
                            },
                        ]}
                        onPress={() => router.push('/teams/new')}
                    >
                        <Text style={[styles.actionText, { color: tokens.primaryActionText }]}>New Team</Text>
                    </Pressable>
                </View>
                <View style={styles.chipRow}>
                    <View
                        style={[
                            styles.chip,
                            {
                                backgroundColor: tokens.chipBackground,
                                borderColor: tokens.chipBorder,
                            },
                        ]}
                    >
                        <Text style={[styles.chipText, { color: tokens.chipText }]}>
                            {teams.length} total
                        </Text>
                    </View>
                </View>
            </View>

            <View style={styles.body}>
                {isLoading && teams.length === 0 ? (
                    <View style={styles.emptyState}>
                        <ActivityIndicator size="small" color={tokens.actionText} />
                        <Text style={{ color: tokens.panelTextSecondary, marginTop: 14 }}>
                            Loading teams...
                        </Text>
                    </View>
                ) : teams.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="people-outline" size={34} color={tokens.emptyIcon} />
                        <Text style={{ color: tokens.panelTitle, marginTop: 14, fontSize: 16, fontWeight: '700' }}>
                            No Teams Yet
                        </Text>
                        <Text style={{ color: tokens.panelTextSecondary, marginTop: 8, textAlign: 'center' }}>
                            Create a team and it will appear here.
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={teams}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>
        </View>
    );
});
