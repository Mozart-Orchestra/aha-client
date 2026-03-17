import * as React from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import { ItemList } from '@/components/ui/ItemList';
import { ItemGroup } from '@/components/ui/ItemGroup';
import { Item } from '@/components/ui/Item';
import { layout } from '@/utils/layout';
import { t } from '@/text';
import {
    fetchGenomeById,
    parseSpec,
    parseFeedback,
    parseTags,
    parseCorpsSpec,
    type GenomeRecord,
    type GenomeSpec,
    type GenomeFeedback,
} from '@/utils/genomeHub';
import {
    loadFavoriteGenomeIdsFromStorage,
    toggleFavoriteGenomeIdInStorage,
} from '@/utils/favoriteGenomesStorage';
import { isFavoriteGenomeId } from '@/utils/favoriteGenomes';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getStatusColor(status: GenomeRecord['status']) {
    if (status === 'official') return { text: '#007AFF', bg: '#007AFF18' };
    if (status === 'verified') return { text: '#22c55e', bg: '#22c55e18' };
    return { text: '#8A7F74', bg: '#8A7F7418' };
}

function getStatusLabel(status: GenomeRecord['status']): string {
    if (status === 'official') return t('agents.official');
    if (status === 'verified') return t('agents.verified');
    return t('agents.draft');
}

function scoreColor(score: number): string {
    if (score >= 85) return '#22c55e';
    if (score >= 70) return '#f59e0b';
    return '#ef4444';
}

function formatDate(iso: string): string {
    try {
        return new Date(iso).toLocaleDateString();
    } catch {
        return iso;
    }
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default React.memo(function AgentDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { theme } = useUnistyles();

    const [genome, setGenome] = React.useState<GenomeRecord | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [favoriteIds, setFavoriteIds] = React.useState<string[]>(() => loadFavoriteGenomeIdsFromStorage());

    React.useEffect(() => {
        if (!id) return;
        let cancelled = false;
        setLoading(true);
        fetchGenomeById(id).then((g) => {
            if (!cancelled) {
                setGenome(g);
                setLoading(false);
            }
        });
        return () => { cancelled = true; };
    }, [id]);

    const spec = React.useMemo(() => genome ? parseSpec(genome.spec) : null, [genome]);
    const feedback = React.useMemo(() => genome ? parseFeedback(genome.feedbackData) : null, [genome]);
    const tags = React.useMemo(() => genome ? parseTags(genome.tags) : [], [genome]);
    const corpsSpec = React.useMemo(() => (genome?.category === 'corps') ? parseCorpsSpec(genome.spec) : null, [genome]);
    const isFav = genome ? isFavoriteGenomeId(genome.id, favoriteIds) : false;

    const toggleFavorite = React.useCallback(() => {
        if (!genome) return;
        setFavoriteIds(toggleFavoriteGenomeIdInStorage(genome.id));
    }, [genome]);

    if (loading) {
        return (
            <View style={[styles.center, { backgroundColor: theme.colors.groupped.background }]}>
                <Stack.Screen options={{ headerTitle: t('agents.title') }} />
                <ActivityIndicator color={theme.colors.textSecondary} />
            </View>
        );
    }

    if (!genome) {
        return (
            <View style={[styles.center, { backgroundColor: theme.colors.groupped.background }]}>
                <Stack.Screen options={{ headerTitle: t('agents.title') }} />
                <Ionicons name="alert-circle-outline" size={48} color={theme.colors.textSecondary} />
                <Text style={{ color: theme.colors.textSecondary, marginTop: 12, fontSize: 15 }}>
                    {t('agents.noResults')}
                </Text>
            </View>
        );
    }

    const status = getStatusColor(genome.status);
    const isCorps = genome.category === 'corps';

    return (
        <View style={{ flex: 1, backgroundColor: theme.colors.groupped.background }}>
            <Stack.Screen options={{ headerTitle: genome.name }} />
            <ScrollView contentContainerStyle={[styles.scrollContent, { maxWidth: layout.maxWidth, alignSelf: 'center', width: '100%' }]}>

                {/* ── Header Card ── */}
                <View style={[styles.headerCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider }]}>
                    <View style={styles.headerRow}>
                        <View style={styles.badgeRow}>
                            <View style={[styles.badge, { backgroundColor: theme.colors.surfaceHigh }]}>
                                <Text style={[styles.badgeText, styles.mono, { color: theme.colors.textSecondary }]}>
                                    {genome.namespace ?? '@public'}
                                </Text>
                            </View>
                            <View style={[styles.badge, { backgroundColor: status.bg }]}>
                                <Text style={[styles.badgeText, { color: status.text }]}>
                                    {getStatusLabel(genome.status)}
                                </Text>
                            </View>
                            {isCorps ? (
                                <View style={[styles.badge, { backgroundColor: '#FF950018' }]}>
                                    <Text style={[styles.badgeText, { color: '#FF9500' }]}>Corps</Text>
                                </View>
                            ) : null}
                            <Text style={[styles.versionText, { color: theme.colors.textSecondary }]}>
                                {t('agents.versionLabel', { version: genome.version })}
                            </Text>
                        </View>
                        <Pressable onPress={toggleFavorite} hitSlop={12}>
                            <Ionicons
                                name={isFav ? 'star' : 'star-outline'}
                                size={22}
                                color={isFav ? '#FFB547' : theme.colors.textSecondary}
                            />
                        </Pressable>
                    </View>
                    <Text style={[styles.name, { color: theme.colors.text }]}>{genome.name}</Text>
                    {genome.description ? (
                        <Text style={[styles.description, { color: theme.colors.textSecondary }]}>{genome.description}</Text>
                    ) : null}

                    {/* Spawn & score row */}
                    <View style={[styles.statsRow, { borderTopColor: theme.colors.divider }]}>
                        <Ionicons name="flash-outline" size={14} color={theme.colors.textSecondary} />
                        <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                            {t('agents.spawnCount', { count: genome.spawnCount })}
                        </Text>
                        {feedback ? (
                            <>
                                <View style={{ width: 12 }} />
                                <Ionicons name="star" size={14} color={scoreColor(feedback.avgScore)} />
                                <Text style={[styles.statText, { color: scoreColor(feedback.avgScore), fontWeight: '600' }]}>
                                    {feedback.avgScore} ({feedback.evaluationCount})
                                </Text>
                            </>
                        ) : null}
                    </View>
                </View>

                <ItemList>
                    {/* ── Configuration ── */}
                    <ItemGroup title={t('agents.configuration')}>
                        <Item title={t('agents.model')} detail={spec?.modelId ?? 'Default'} />
                        <Item title={t('agents.executionPlane')} detail={spec?.executionPlane ?? 'mainline'} />
                        <Item title={t('agents.permissionMode')} detail={spec?.permissionMode ?? 'default'} />
                        <Item title={t('agents.accessLevel')} detail={spec?.accessLevel ?? 'full-access'} />
                        {spec?.maxTurns ? <Item title={t('agents.maxTurns')} detail={String(spec.maxTurns)} /> : null}
                    </ItemGroup>

                    {/* ── Capabilities ── */}
                    {(spec?.responsibilities?.length || spec?.capabilities?.length) ? (
                        <ItemGroup title={t('agents.capabilities')}>
                            {spec?.responsibilities?.map((r, i) => (
                                <Item key={`r-${i}`} title={r} icon={<Ionicons name="checkmark-circle-outline" size={18} color="#22c55e" />} />
                            ))}
                            {spec?.capabilities?.map((c, i) => (
                                <Item key={`c-${i}`} title={c} icon={<Ionicons name="flash-outline" size={18} color="#f59e0b" />} />
                            ))}
                        </ItemGroup>
                    ) : null}

                    {/* ── Protocol ── */}
                    {spec?.protocol?.length ? (
                        <ItemGroup title={t('agents.protocolRules')}>
                            {spec.protocol.map((p, i) => (
                                <Item key={`p-${i}`} title={p} subtitle="" />
                            ))}
                        </ItemGroup>
                    ) : null}

                    {/* ── Tools & MCPs ── */}
                    {(spec?.allowedTools?.length || spec?.disallowedTools?.length || spec?.mcpServers?.length) ? (
                        <ItemGroup title={t('agents.toolsAndMcps')}>
                            {spec?.allowedTools?.length ? (
                                <Item title={t('agents.allowedTools')} subtitle={spec.allowedTools.join(', ')} subtitleLines={0} />
                            ) : null}
                            {spec?.disallowedTools?.length ? (
                                <Item title={t('agents.blockedTools')} subtitle={spec.disallowedTools.join(', ')} subtitleLines={0} />
                            ) : null}
                            {spec?.mcpServers?.length ? (
                                <Item title={t('agents.mcpServers')} subtitle={spec.mcpServers.join(', ')} subtitleLines={0} />
                            ) : null}
                        </ItemGroup>
                    ) : null}

                    {/* ── Hooks (Tier 8) ── */}
                    {spec?.hooks ? (
                        <ItemGroup title={t('agents.hooksSection')}>
                            {spec.hooks.preToolUse?.map((h, i) => (
                                <Item
                                    key={`pre-${i}`}
                                    title={h.description ?? h.matcher}
                                    subtitle={`PreToolUse: ${h.command}`}
                                    subtitleLines={0}
                                    icon={<Ionicons name="code-slash-outline" size={18} color={theme.colors.textSecondary} />}
                                />
                            ))}
                            {spec.hooks.postToolUse?.map((h, i) => (
                                <Item
                                    key={`post-${i}`}
                                    title={h.description ?? h.matcher}
                                    subtitle={`PostToolUse: ${h.command}`}
                                    subtitleLines={0}
                                    icon={<Ionicons name="code-slash-outline" size={18} color={theme.colors.textSecondary} />}
                                />
                            ))}
                            {spec.hooks.stop?.map((h, i) => (
                                <Item
                                    key={`stop-${i}`}
                                    title={h.description ?? 'Stop hook'}
                                    subtitle={`Stop: ${h.command}`}
                                    subtitleLines={0}
                                    icon={<Ionicons name="stop-circle-outline" size={18} color={theme.colors.textSecondary} />}
                                />
                            ))}
                        </ItemGroup>
                    ) : null}

                    {/* ── Skills (Tier 9) ── */}
                    {spec?.skills?.length ? (
                        <ItemGroup title={t('agents.skillsSection')}>
                            {spec.skills.map((skill) => (
                                <Item
                                    key={skill}
                                    title={skill}
                                    icon={<Ionicons name="extension-puzzle-outline" size={18} color="#007AFF" />}
                                />
                            ))}
                        </ItemGroup>
                    ) : null}

                    {/* ── Behavior ── */}
                    {(spec?.messaging || spec?.behavior) ? (
                        <ItemGroup title={t('agents.behaviorSection')}>
                            {spec?.messaging?.replyMode ? (
                                <Item title={t('agents.replyMode')} detail={spec.messaging.replyMode} />
                            ) : null}
                            {spec?.behavior?.onIdle ? (
                                <Item title={t('agents.onIdle')} detail={spec.behavior.onIdle} />
                            ) : null}
                            {spec?.behavior?.onBlocked ? (
                                <Item title={t('agents.onBlocked')} detail={spec.behavior.onBlocked} />
                            ) : null}
                            {spec?.behavior?.canSpawnAgents != null ? (
                                <Item title={t('agents.canSpawnAgents')} detail={spec.behavior.canSpawnAgents ? 'Yes' : 'No'} />
                            ) : null}
                        </ItemGroup>
                    ) : null}

                    {/* ── Corps Members ── */}
                    {corpsSpec?.members?.length ? (
                        <ItemGroup title={t('agents.members')}>
                            {corpsSpec.members.map((m, i) => (
                                <Item
                                    key={`m-${i}`}
                                    title={m.roleAlias ?? m.genome.split('/').pop()?.split('@')[0] ?? '?'}
                                    subtitle={m.genome}
                                    detail={m.count && m.count > 1 ? `x${m.count}` : undefined}
                                    icon={<Ionicons name="person-outline" size={18} color={theme.colors.textSecondary} />}
                                />
                            ))}
                        </ItemGroup>
                    ) : null}

                    {/* ── Feedback ── */}
                    {feedback ? (
                        <ItemGroup title={t('agents.feedbackSection')}>
                            <Item title={t('agents.overallScore')} detail={String(feedback.avgScore)} detailStyle={{ color: scoreColor(feedback.avgScore), fontWeight: '700', fontSize: 17 }} />
                            <Item title={t('agents.evaluations', { count: feedback.evaluationCount })} detail={feedback.latestAction} />
                            <Item title="Delivery" detail={`${feedback.dimensions.delivery}`} />
                            <Item title="Integrity" detail={`${feedback.dimensions.integrity}`} />
                            <Item title="Efficiency" detail={`${feedback.dimensions.efficiency}`} />
                            <Item title="Collaboration" detail={`${feedback.dimensions.collaboration}`} />
                            <Item title="Reliability" detail={`${feedback.dimensions.reliability}`} />
                            {feedback.suggestions?.length ? (
                                <Item
                                    title={t('agents.suggestions')}
                                    subtitle={feedback.suggestions.join('\n')}
                                    subtitleLines={0}
                                />
                            ) : null}
                        </ItemGroup>
                    ) : null}

                    {/* ── Tags ── */}
                    {tags.length > 0 ? (
                        <View style={styles.tagsSection}>
                            {tags.map(tag => (
                                <View key={tag} style={[styles.tagChip, { backgroundColor: theme.colors.surfaceHigh }]}>
                                    <Text style={[styles.tagChipText, { color: theme.colors.textSecondary }]}>{tag}</Text>
                                </View>
                            ))}
                        </View>
                    ) : null}

                    {/* ── Metadata ── */}
                    <ItemGroup title={t('agents.metadata')}>
                        <Item title={t('agents.createdAt')} detail={formatDate(genome.createdAt)} />
                        {genome.publisherId ? <Item title={t('agents.publisher')} detail={genome.publisherId} /> : null}
                    </ItemGroup>
                </ItemList>
            </ScrollView>
        </View>
    );
});

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create((theme) => ({
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollContent: {
        paddingBottom: 40,
    },
    headerCard: {
        margin: 16,
        padding: 16,
        borderRadius: 14,
        borderWidth: StyleSheet.hairlineWidth,
        gap: 6,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flex: 1,
        flexWrap: 'wrap',
    },
    badge: {
        borderRadius: 6,
        paddingHorizontal: 7,
        paddingVertical: 2,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '500',
    },
    mono: {
        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
        fontWeight: '600',
    },
    versionText: {
        fontSize: 11,
        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    },
    name: {
        fontSize: 22,
        fontWeight: '700',
        letterSpacing: -0.3,
        marginTop: 4,
    },
    description: {
        fontSize: 14,
        lineHeight: 20,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 8,
        paddingTop: 10,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    statText: {
        fontSize: 13,
    },
    tagsSection: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    tagChip: {
        borderRadius: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    tagChipText: {
        fontSize: 12,
    },
}));
