import React from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    View,
} from 'react-native';
import { Text } from '@/components/ui/StyledText';
import { Stack, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { sync } from '@/sync/sync';
import { useAllSessions } from '@/sync/storage';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import { listAgents, AgentRecord } from '@/sync/apiAgents';
import { t } from '@/text';
import { getStandaloneAgentStatusVisual } from '@/utils/standaloneAgentStatus';
import { resolveImageRef } from '@/utils/imageRef';

/**
 * Solo Agents detail page — /teams/solo
 *
 * Virtual team view listing all standalone agents (not in any team).
 * Uses the same visual style as team detail pages but simpler:
 * no chat, no kanban board, just an agent roster with status + actions.
 */
export default React.memo(function SoloAgentsScreen() {
    const { theme } = useUnistyles();
    const router = useRouter();
    const allSessions = useAllSessions();

    const [agents, setAgents] = React.useState<AgentRecord[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    const refreshAgents = React.useCallback(async () => {
        const creds = sync.getCredentials();
        if (!creds) {
            setAgents([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const { agents: fetched } = await listAgents(creds, { type: 'standalone', limit: 100 });
            setAgents(fetched.filter((a) => a.status !== 'archived'));
        } catch (error) {
            console.error('Failed to fetch standalone agents:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useFocusEffect(
        React.useCallback(() => {
            void refreshAgents();
            return undefined;
        }, [refreshAgents]),
    );

    const handleAgentPress = React.useCallback((agent: AgentRecord) => {
        if (agent.sessionId) {
            const imageRef = resolveImageRef({
                sourceImageId: agent.sourceImageId ?? null,
                sourceImageVersion: agent.sourceImageVersion ?? null,
                genomeId: agent.genomeId ?? null,
            });
            const path = imageRef?.id
                ? `/session/${agent.sessionId}?specId=${imageRef.id}`
                : `/session/${agent.sessionId}`;
            router.push(path as any);
        }
    }, [router]);

    const handleNewAgent = React.useCallback(() => {
        router.push('/agents' as any);
    }, [router]);

    const sessionById = React.useMemo(() => {
        return new Map(allSessions.map((session) => [session.id, session]));
    }, [allSessions]);

    const renderAgentItem = React.useCallback(({ item, index }: { item: AgentRecord; index: number }) => {
        const isFirst = index === 0;
        const isLast = index === agents.length - 1;
        const isSingle = agents.length === 1;
        const session = item.sessionId ? sessionById.get(item.sessionId) ?? null : null;
        const liveStatus = getStandaloneAgentStatusVisual(item, session);
        const liveStatusLabel = liveStatus.liveState === 'online'
            ? t('status.online')
            : liveStatus.liveState === 'ended'
                ? t('status.ended')
                : t('status.offline');
        const metaParts = [item.runtimeType, liveStatusLabel];

        if (item.status !== 'active') {
            metaParts.push(item.status);
        }

        return (
            <Pressable
                style={[
                    styles.agentItem,
                    isSingle ? styles.agentItemSingle
                        : isFirst ? styles.agentItemFirst
                            : isLast ? styles.agentItemLast
                                : {},
                ]}
                onPress={() => handleAgentPress(item)}
            >
                <View
                    style={[
                        styles.statusDot,
                        { backgroundColor: liveStatus.dotColor },
                    ]}
                />
                <View style={styles.agentContent}>
                    <Text style={styles.agentName} numberOfLines={1}>
                        {item.displayName}
                    </Text>
                    <View style={styles.agentMeta}>
                        <Text style={styles.agentMetaText}>
                            {metaParts.join(' · ')}
                        </Text>
                    </View>
                </View>
                {item.sessionId ? (
                    <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={theme.colors.textSecondary}
                    />
                ) : null}
            </Pressable>
        );
    }, [agents.length, handleAgentPress, sessionById, theme.colors.textSecondary]);

    const ListHeaderComponent = React.useMemo(() => (
        <View style={styles.header}>
            <View style={[styles.headerIcon, { backgroundColor: theme.colors.button.primary.background }]}>
                <Ionicons name="person" size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.headerTitle}>{t('teams.soloAgentsTitle')}</Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
                {t('teams.soloAgentsCount', { count: agents.length })}
            </Text>
        </View>
    ), [agents.length, theme.colors]);

    const ListEmptyComponent = React.useCallback(() => {
        if (isLoading) {
            return (
                <View style={styles.emptyContainer}>
                    <ActivityIndicator size="large" />
                </View>
            );
        }

        return (
            <View style={styles.emptyContainer}>
                <Ionicons name="person-outline" size={48} color={theme.colors.textSecondary} />
                <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                    {t('teams.soloAgentsEmpty')}
                </Text>
                <Text style={[styles.emptyHint, { color: theme.colors.textSecondary }]}>
                    {t('teams.soloAgentsEmptyHint')}
                </Text>
            </View>
        );
    }, [isLoading, theme.colors]);

    return (
        <>
            <Stack.Screen
                options={{
                    headerTitle: t('teams.soloAgents'),
                }}
            />
            <View style={styles.container}>
                <FlatList
                    data={agents}
                    renderItem={renderAgentItem}
                    keyExtractor={(item) => item.id}
                    ListHeaderComponent={ListHeaderComponent}
                    ListEmptyComponent={ListEmptyComponent}
                    contentContainerStyle={styles.contentContainer}
                />
                <Pressable
                    style={[styles.newAgentButton, { backgroundColor: theme.colors.button.primary.background }]}
                    onPress={handleNewAgent}
                >
                    <Ionicons name="add" size={20} color="#FFFFFF" />
                    <Text style={styles.newAgentButtonText}>{t('teams.soloAgentsNewAgent')}</Text>
                </Pressable>
            </View>
        </>
    );
});

const styles = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.colors.groupped.background,
    },
    contentContainer: {
        paddingBottom: 100,
    },
    header: {
        alignItems: 'center',
        paddingVertical: 24,
        paddingHorizontal: 16,
    },
    headerIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
    },
    agentItem: {
        backgroundColor: theme.colors.surface,
        marginHorizontal: 16,
        marginBottom: 1,
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
    },
    agentItemFirst: {
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
    },
    agentItemLast: {
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        marginBottom: 16,
    },
    agentItemSingle: {
        borderRadius: 12,
        marginBottom: 16,
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 12,
    },
    agentContent: {
        flex: 1,
        marginRight: 8,
    },
    agentName: {
        fontSize: 16,
        fontWeight: '500',
        color: theme.colors.text,
        marginBottom: 2,
    },
    agentMeta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    agentMetaText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        paddingTop: 40,
        gap: 8,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
    },
    emptyHint: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    newAgentButton: {
        position: 'absolute',
        bottom: 32,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 24,
        gap: 6,
    },
    newAgentButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFFFFF',
    },
}));
