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
    addGenomeFavorite,
    fetchGenomeById,
    fetchGenomeFavoriteStatus,
    removeGenomeFavorite,
    parseSpec,
    parseFeedback,
    parseTags,
    parseCorpsSpec,
    type GenomeRecord,
    type GenomeSpec,
    type GenomeFeedback,
} from '@/utils/genomeHub';
import { fetchAccessibleGenomeById } from '@/utils/agentMarketplace';
import {
    loadFavoriteGenomeIdsFromStorage,
    toggleFavoriteGenomeIdInStorage,
} from '@/utils/favoriteGenomesStorage';
import { isFavoriteGenomeId } from '@/utils/favoriteGenomes';
import { sync } from '@/sync/sync';
import { useProfile } from '@/sync/storage';

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

function formatLatestAction(action: GenomeFeedback['latestAction']): string {
    return action
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
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
    const profile = useProfile();
    const actorId = profile.id || null;

    const [genome, setGenome] = React.useState<GenomeRecord | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [favoriteIds, setFavoriteIds] = React.useState<string[]>(() => loadFavoriteGenomeIdsFromStorage());
    const [serverFavorited, setServerFavorited] = React.useState(false);
    const [favoriteLoading, setFavoriteLoading] = React.useState(false);

    React.useEffect(() => {
        if (!id) {
            setLoading(false);
            setGenome(null);
            return;
        }
        let cancelled = false;
        setLoading(true);

        fetchAccessibleGenomeById(id, {
            credentials: sync.getCredentials(),
            fetchPublicGenomeById: fetchGenomeById,
        }).then((g) => {
            if (!cancelled) {
                setGenome(g);
                setLoading(false);
            }
        }).catch(() => {
            if (!cancelled) {
                setGenome(null);
                setLoading(false);
            }
        });

        return () => { cancelled = true; };
    }, [id]);

    React.useEffect(() => {
        if (!genome) return;
        let cancelled = false;

        if (genome.isPublic && actorId) {
            fetchGenomeFavoriteStatus(genome.id, actorId).then((result) => {
                if (!cancelled) {
                    setServerFavorited(result?.isFavorited ?? false);
                }
            });
            return () => { cancelled = true; };
        }

        setServerFavorited(false);
        return () => { cancelled = true; };
    }, [actorId, genome]);

    const spec = React.useMemo(() => genome ? parseSpec(genome.spec) : null, [genome]);
    const feedback = React.useMemo(() => genome ? parseFeedback(genome.feedbackData) : null, [genome]);
    const tags = React.useMemo(() => genome ? parseTags(genome.tags) : [], [genome]);
    const corpsSpec = React.useMemo(() => (genome?.category === 'corps') ? parseCorpsSpec(genome.spec) : null, [genome]);
    const storefrontRating = React.useMemo(() => {
        if (typeof feedback?.avgScore === 'number') {
            return feedback.avgScore;
        }
        if (typeof spec?.resume?.performanceRating === 'number') {
            return spec.resume.performanceRating;
        }
        return null;
    }, [feedback?.avgScore, spec?.resume?.performanceRating]);
    const isFav = genome
        ? (genome.isPublic && actorId ? serverFavorited : isFavoriteGenomeId(genome.id, favoriteIds))
        : false;
    const modelScores = React.useMemo(
        () => Object.entries(spec?.modelScores ?? {}).sort((left, right) => right[1] - left[1]),
        [spec?.modelScores]
    );
    const crowdReviewCount = feedback?.evaluationCount ?? spec?.resume?.totalSessions ?? null;

    const toggleFavorite = React.useCallback(async () => {
        if (!genome) return;
        if (favoriteLoading) return;

        if (!genome.isPublic || !actorId) {
            setFavoriteIds(toggleFavoriteGenomeIdInStorage(genome.id));
            return;
        }

        setFavoriteLoading(true);
        try {
            if (serverFavorited) {
                const result = await removeGenomeFavorite(genome.id, actorId);
                setGenome(result.genome);
                setServerFavorited(false);
            } else {
                const result = await addGenomeFavorite(genome.id, actorId);
                setGenome(result.genome);
                setServerFavorited(true);
            }
        } finally {
            setFavoriteLoading(false);
        }
    }, [actorId, favoriteLoading, genome, serverFavorited]);

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
                            {spec?.runtimeType ? (
                                <View style={[styles.badge, { backgroundColor: theme.colors.surfaceHigh }]}>
                                    <Text style={[styles.badgeText, { color: theme.colors.textSecondary }]}>
                                        {spec.runtimeType}
                                    </Text>
                                </View>
                            ) : null}
                            <Text style={[styles.versionText, { color: theme.colors.textSecondary }]}>
                                {t('agents.versionLabel', { version: genome.version })}
                            </Text>
                        </View>
                        <Pressable onPress={toggleFavorite} hitSlop={12} disabled={favoriteLoading}>
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
                        <Ionicons name="star-outline" size={14} color={theme.colors.textSecondary} style={styles.statIconSpacer} />
                        <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                            {genome.starCount}
                        </Text>
                        <Ionicons name="download-outline" size={14} color={theme.colors.textSecondary} style={styles.statIconSpacer} />
                        <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                            {genome.downloadCount}
                        </Text>
                        {storefrontRating != null ? (
                            <>
                                <View style={{ width: 12 }} />
                                <Ionicons name="people-outline" size={14} color={scoreColor(storefrontRating)} />
                                <Text style={[styles.statText, { color: scoreColor(storefrontRating), fontWeight: '600' }]}>
                                    {t('agents.crowd')} {Math.round(storefrontRating)}
                                    {crowdReviewCount ? ` · ${crowdReviewCount}` : ''}
                                </Text>
                            </>
                        ) : null}
                    </View>
                </View>

                <ItemList>
                    {/* ── Storefront / Resume ── */}
                    {(spec?.resume?.specialties?.length || storefrontRating != null || spec?.preferredModel || modelScores.length > 0) ? (
                        <ItemGroup title="Storefront">
                            {spec?.resume?.specialties?.length ? (
                                <Item title="Specialties" subtitle={spec.resume.specialties.join(', ')} subtitleLines={0} />
                            ) : null}
                            {storefrontRating != null ? (
                                <Item title="Performance Rating" detail={String(Math.round(storefrontRating))} detailStyle={{ color: scoreColor(storefrontRating), fontWeight: '700', fontSize: 17 }} />
                            ) : null}
                            {spec?.preferredModel ? (
                                <Item title="Preferred Model" detail={spec.preferredModel} />
                            ) : null}
                            {modelScores.slice(0, 5).map(([model, score]) => (
                                <Item key={model} title={model} detail={String(score)} />
                            ))}
                        </ItemGroup>
                    ) : null}

                    {/* ── Configuration ── */}
                    <ItemGroup title={t('agents.configuration')}>
                        {spec?.runtimeType ? <Item title="Runtime" detail={spec.runtimeType} /> : null}
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

                    {(spec?.operations?.commonPatterns?.length || spec?.handoffProtocol?.length || spec?.operations?.recentChanges?.length) ? (
                        <ItemGroup title="Operational Patterns">
                            {spec?.operations?.commonPatterns?.map((pattern, index) => (
                                <Item key={`pattern-${index}`} title={pattern} subtitle="" />
                            ))}
                            {spec?.handoffProtocol?.map((rule, index) => (
                                <Item key={`handoff-${index}`} title={rule} subtitle="" />
                            ))}
                            {spec?.operations?.recentChanges?.map((change, index) => (
                                <Item key={`change-${index}`} title={change} subtitle="" />
                            ))}
                        </ItemGroup>
                    ) : null}

                    {(spec?.memory?.learnings?.length || spec?.memory?.iterationGuide || spec?.memory?.knowledgeBase?.length) ? (
                        <ItemGroup title="Memory & Learning">
                            {spec?.memory?.learnings?.map((learning, index) => (
                                <Item key={`learning-${index}`} title={learning} subtitle="" />
                            ))}
                            {spec?.memory?.iterationGuide?.recentChanges?.length ? (
                                <Item title="Recent Changes" subtitle={spec.memory.iterationGuide.recentChanges.join('\n')} subtitleLines={0} />
                            ) : null}
                            {spec?.memory?.iterationGuide?.discoveries?.length ? (
                                <Item title="Discoveries" subtitle={spec.memory.iterationGuide.discoveries.join('\n')} subtitleLines={0} />
                            ) : null}
                            {spec?.memory?.iterationGuide?.improvements?.length ? (
                                <Item title="Improvements" subtitle={spec.memory.iterationGuide.improvements.join('\n')} subtitleLines={0} />
                            ) : null}
                            {spec?.memory?.knowledgeBase?.length ? (
                                <Item title="Knowledge Base" subtitle={spec.memory.knowledgeBase.join('\n')} subtitleLines={0} />
                            ) : null}
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
                            <Item title={t('agents.evaluations', { count: feedback.evaluationCount })} />
                            <Item title={t('agents.latestVerdict')} detail={formatLatestAction(feedback.latestAction)} />
                            {feedback.sessionScore ? (
                                <>
                                    <Item title={t('agents.taskCompletion')} detail={`${feedback.sessionScore.taskCompletion}`} />
                                    <Item title={t('agents.codeQuality')} detail={`${feedback.sessionScore.codeQuality}`} />
                                    <Item title={t('agents.collaborationScore')} detail={`${feedback.sessionScore.collaboration}`} />
                                </>
                            ) : null}
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
                        {genome.parentId ? <Item title="Parent Genome" detail={genome.parentId} /> : null}
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
    statIconSpacer: {
        marginLeft: 8,
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
