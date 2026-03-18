import * as React from 'react';
import {
    View,
    Text,
    TextInput,
    ScrollView,
    Pressable,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SidebarView } from '@/components/layout/SidebarView';
import { t } from '@/text';
import {
    addGenomeFavorite,
    fetchFavoriteGenomes,
    parseCorpsSpec,
    parseFeedback,
    parseSpec,
    parseTags,
    removeGenomeFavorite,
    searchGenomes,
    type GenomeRecord,
} from '@/utils/genomeHub';
import {
    AGENT_MARKETPLACE_CATEGORIES,
    mapOwnedPrivateGenomesToRecords,
    selectMarketplaceGenomes,
    sortGenomesForDisplay,
    type AgentMarketplaceCategory,
    type MarketplacePageTab,
    type MarketplaceSourceTab,
} from '@/utils/agentMarketplace';
import { useHappyAction } from '@/hooks/useHappyAction';
import { trackAgentsPageViewed } from '@/track';
import { isFavoriteGenomeId } from '@/utils/favoriteGenomes';
import { loadFavoriteGenomeIdsFromStorage, toggleFavoriteGenomeIdInStorage } from '@/utils/favoriteGenomesStorage';
import { fetchGenomes } from '@/sync/apiEvolution';
import { sync } from '@/sync/sync';
import { useProfile } from '@/sync/storage';
import { FAB } from '@/components/ui/FAB';
import { listAgents, deleteAgent, type AgentRecord } from '@/sync/apiAgents';
import { Modal } from '@/modal';

// ─── Types ───────────────────────────────────────────────────────────────────

type TopTab = 'marketplace' | 'mine';
type PageTab = MarketplacePageTab;
type SourceTab = MarketplaceSourceTab;
type AgentCategory = AgentMarketplaceCategory;

function upsertGenomeRecord(records: GenomeRecord[], genome: GenomeRecord): GenomeRecord[] {
    const next = records.filter((record) => record.id !== genome.id);
    return [...next, genome];
}

function getStorefrontRating(genome: GenomeRecord): number | null {
    const feedback = parseFeedback(genome.feedbackData);
    if (typeof feedback?.avgScore === 'number') {
        return feedback.avgScore;
    }

    const spec = parseSpec(genome.spec);
    if (typeof spec?.resume?.performanceRating === 'number') {
        return spec.resume.performanceRating;
    }
    return null;
}

function getCategoryLabel(cat: AgentCategory): string {
    const map: Record<AgentCategory, string> = {
        all: t('agents.all'),
        coordination: t('agents.coordination'),
        support: t('agents.support'),
        execution: t('agents.execution'),
    };
    return map[cat];
}

function getGenomeStatusLabel(status: GenomeRecord['status']): string {
    if (status === 'official') return t('agents.official');
    if (status === 'verified') return t('agents.verified');
    if (status === 'unverified') return t('agents.unverified');
    if (status === 'archived') return t('agents.archived');
    return t('agents.draft');
}

function getGenomeStatusColor(status: GenomeRecord['status']) {
    if (status === 'official') return { text: '#007AFF', background: '#007AFF18' };
    if (status === 'verified') return { text: '#22c55e', background: '#22c55e18' };
    if (status === 'unverified') return { text: '#f59e0b', background: '#f59e0b18' };
    if (status === 'archived') return { text: '#6b7280', background: '#6b728018' };
    return { text: '#8A7F74', background: '#8A7F7418' };
}

// ─── Genome Card ─────────────────────────────────────────────────────────────

function GenomeCard({
    genome,
    isFavorited,
    onToggleFavorite,
    onPress,
}: {
    genome: GenomeRecord;
    isFavorited: boolean;
    onToggleFavorite: (genomeId: string) => void;
    onPress?: () => void;
}) {
    const { theme } = useUnistyles();
    const tags = parseTags(genome.tags);
    const spec = React.useMemo(() => parseSpec(genome.spec), [genome.spec]);
    const feedback = React.useMemo(() => parseFeedback(genome.feedbackData), [genome.feedbackData]);
    const specialties = spec?.resume?.specialties ?? [];
    const runtimeType = spec?.runtimeType ?? null;
    const namespace = genome.namespace ?? '@public';
    const status = getGenomeStatusColor(genome.status);
    const storefrontRating = getStorefrontRating(genome);
    const crowdReviewCount = feedback?.evaluationCount ?? spec?.resume?.totalSessions ?? null;

    return (
        <Pressable onPress={onPress} style={[stylesheet.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider }]}>
            <View style={stylesheet.cardHeader}>
                <View style={stylesheet.cardMeta}>
                    <View style={[stylesheet.namespaceBadge, { backgroundColor: theme.colors.surfaceHigh }]}>
                        <Text style={[stylesheet.namespaceText, { color: theme.colors.textSecondary }]}>
                            {namespace}
                        </Text>
                    </View>
                    <View style={[stylesheet.categoryBadge, { backgroundColor: status.background }]}>
                        <Text style={[stylesheet.categoryText, { color: status.text }]}>
                            {getGenomeStatusLabel(genome.status)}
                        </Text>
                    </View>
                    {genome.category ? (
                        <View style={[stylesheet.categoryBadge, { backgroundColor: theme.colors.surfaceHighest }]}>
                            <Text style={[stylesheet.categoryText, { color: theme.colors.textSecondary }]}>
                                {genome.category}
                            </Text>
                        </View>
                    ) : null}
                    {runtimeType ? (
                        <View style={[stylesheet.categoryBadge, { backgroundColor: theme.colors.surfaceHighest }]}>
                            <Text style={[stylesheet.categoryText, { color: theme.colors.textSecondary }]}>
                                {runtimeType}
                            </Text>
                        </View>
                    ) : null}
                </View>
                <View style={stylesheet.headerRight}>
                    <Text style={[stylesheet.versionText, { color: theme.colors.textSecondary }]}>
                        {t('agents.versionLabel', { version: genome.version })}
                    </Text>
                    <Pressable onPress={() => onToggleFavorite(genome.id)} hitSlop={8}>
                        <Ionicons
                            name={isFavorited ? 'star' : 'star-outline'}
                            size={16}
                            color={isFavorited ? '#FFB547' : theme.colors.textSecondary}
                        />
                    </Pressable>
                </View>
            </View>

            <Text style={[stylesheet.cardName, { color: theme.colors.text }]} numberOfLines={1}>
                {genome.name}
            </Text>

            {genome.description ? (
                <Text style={[stylesheet.cardDesc, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                    {genome.description}
                </Text>
            ) : null}

            {tags.length > 0 ? (
                <View style={stylesheet.tagRow}>
                    {tags.slice(0, 4).map(tag => (
                        <View key={tag} style={[stylesheet.tag, { backgroundColor: theme.colors.surfaceHigh }]}>
                            <Text style={[stylesheet.tagText, { color: theme.colors.textSecondary }]}>{tag}</Text>
                        </View>
                    ))}
                </View>
            ) : null}

            {specialties.length > 0 ? (
                <View style={stylesheet.tagRow}>
                    {specialties.slice(0, 2).map((specialty) => (
                        <View key={specialty} style={[stylesheet.specialtyTag, { backgroundColor: theme.colors.surfaceHighest }]}>
                            <Text style={[stylesheet.tagText, { color: theme.colors.textSecondary }]}>{specialty}</Text>
                        </View>
                    ))}
                </View>
            ) : null}

            <View style={[stylesheet.cardFooter, { borderTopColor: theme.colors.divider }]}>
                <Ionicons name="flash-outline" size={13} color={theme.colors.textSecondary} />
                <Text style={[stylesheet.spawnText, { color: theme.colors.textSecondary }]}>
                    {t('agents.spawnCount', { count: genome.spawnCount })}
                </Text>
                <View style={stylesheet.metricGroup}>
                    <Ionicons name="star-outline" size={12} color={theme.colors.textSecondary} />
                    <Text style={[stylesheet.metricText, { color: theme.colors.textSecondary }]}>
                        {genome.starCount}
                    </Text>
                </View>
                <View style={stylesheet.metricGroup}>
                    <Ionicons name="download-outline" size={12} color={theme.colors.textSecondary} />
                    <Text style={[stylesheet.metricText, { color: theme.colors.textSecondary }]}>
                        {genome.downloadCount}
                    </Text>
                </View>
                {storefrontRating != null ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 8 }}>
                        <Ionicons
                            name="people-outline"
                            size={11}
                            color={storefrontRating >= 85 ? '#22c55e' : storefrontRating >= 70 ? '#f59e0b' : '#ef4444'}
                        />
                        <Text
                            style={{
                                fontSize: 11,
                                color: storefrontRating >= 85 ? '#22c55e' : storefrontRating >= 70 ? '#f59e0b' : '#ef4444',
                                fontWeight: '600'
                            }}
                        >
                            {t('agents.crowd')} {Math.round(storefrontRating)}
                            {crowdReviewCount ? ` · ${crowdReviewCount}` : ''}
                        </Text>
                    </View>
                ) : null}
            </View>
        </Pressable>
    );
}

// ─── Corps Card ──────────────────────────────────────────────────────────────

function CorpsCard({
    genome,
    isFavorited,
    onToggleFavorite,
    onPress,
}: {
    genome: GenomeRecord;
    isFavorited: boolean;
    onToggleFavorite: (genomeId: string) => void;
    onPress?: () => void;
}) {
    const { theme } = useUnistyles();
    const namespace = genome.namespace ?? '@public';
    const corps = parseCorpsSpec(genome.spec);
    const spec = React.useMemo(() => parseSpec(genome.spec), [genome.spec]);
    const runtimeType = spec?.runtimeType ?? null;
    const memberCount = corps?.members?.length ?? 0;
    const tags = parseTags(genome.tags);
    const status = getGenomeStatusColor(genome.status);

    return (
        <Pressable onPress={onPress} style={[stylesheet.card, stylesheet.corpsCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider }]}>
            <View style={stylesheet.cardHeader}>
                <View style={stylesheet.cardMeta}>
                    <View style={[stylesheet.namespaceBadge, { backgroundColor: theme.colors.surfaceHigh }]}>
                        <Text style={[stylesheet.namespaceText, { color: theme.colors.textSecondary }]}>
                            {namespace}
                        </Text>
                    </View>
                    <View style={[stylesheet.categoryBadge, { backgroundColor: status.background }]}>
                        <Text style={[stylesheet.categoryText, { color: status.text }]}>
                            {getGenomeStatusLabel(genome.status)}
                        </Text>
                    </View>
                    <View style={[stylesheet.categoryBadge, { backgroundColor: '#FF950018' }]}>
                        <Text style={[stylesheet.categoryText, { color: '#FF9500' }]}>
                            {t('agents.corpsTab')}
                        </Text>
                    </View>
                    {runtimeType ? (
                        <View style={[stylesheet.categoryBadge, { backgroundColor: theme.colors.surfaceHighest }]}>
                            <Text style={[stylesheet.categoryText, { color: theme.colors.textSecondary }]}>
                                {runtimeType}
                            </Text>
                        </View>
                    ) : null}
                </View>
                <View style={stylesheet.headerRight}>
                    <Text style={[stylesheet.versionText, { color: theme.colors.textSecondary }]}>
                        {t('agents.versionLabel', { version: genome.version })}
                    </Text>
                    <Pressable onPress={() => onToggleFavorite(genome.id)} hitSlop={8}>
                        <Ionicons
                            name={isFavorited ? 'star' : 'star-outline'}
                            size={16}
                            color={isFavorited ? '#FFB547' : theme.colors.textSecondary}
                        />
                    </Pressable>
                </View>
            </View>

            <Text style={[stylesheet.cardName, { color: theme.colors.text }]} numberOfLines={1}>
                {genome.name}
            </Text>

            {genome.description ? (
                <Text style={[stylesheet.cardDesc, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                    {genome.description}
                </Text>
            ) : null}

            {memberCount > 0 ? (
                <View style={stylesheet.membersRow}>
                    <Ionicons name="people-outline" size={13} color={theme.colors.textSecondary} />
                    <Text style={[stylesheet.memberCountText, { color: theme.colors.textSecondary }]}>
                        {t('agents.memberCount', { count: memberCount })}
                    </Text>
                    {corps?.members?.slice(0, 5).map((m, i) => (
                        <View key={i} style={[stylesheet.memberChip, { backgroundColor: theme.colors.surfaceHigh }]}>
                            <Text style={[stylesheet.memberChipText, { color: theme.colors.textSecondary }]}>
                                {m.roleAlias ?? m.genome.split('/').pop()?.split('@')[0] ?? '?'}
                            </Text>
                        </View>
                    ))}
                </View>
            ) : null}

            {tags.length > 0 ? (
                <View style={stylesheet.tagRow}>
                    {tags.slice(0, 3).map(tag => (
                        <View key={tag} style={[stylesheet.tag, { backgroundColor: theme.colors.surfaceHigh }]}>
                            <Text style={[stylesheet.tagText, { color: theme.colors.textSecondary }]}>{tag}</Text>
                        </View>
                    ))}
                </View>
            ) : null}

            <View style={[stylesheet.cardFooter, { borderTopColor: theme.colors.divider }]}>
                <Ionicons name="flash-outline" size={13} color={theme.colors.textSecondary} />
                <Text style={[stylesheet.spawnText, { color: theme.colors.textSecondary }]}>
                    {t('agents.spawnCount', { count: genome.spawnCount })}
                </Text>
                <View style={stylesheet.metricGroup}>
                    <Ionicons name="star-outline" size={12} color={theme.colors.textSecondary} />
                    <Text style={[stylesheet.metricText, { color: theme.colors.textSecondary }]}>
                        {genome.starCount}
                    </Text>
                </View>
                <View style={stylesheet.metricGroup}>
                    <Ionicons name="download-outline" size={12} color={theme.colors.textSecondary} />
                    <Text style={[stylesheet.metricText, { color: theme.colors.textSecondary }]}>
                        {genome.downloadCount}
                    </Text>
                </View>
            </View>
        </Pressable>
    );
}

const GenomeCardMemo = React.memo(GenomeCard);
const CorpsCardMemo = React.memo(CorpsCard);

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default React.memo(function AgentsScreen() {
    const { theme } = useUnistyles();
    const router = useRouter();
    const profile = useProfile();
    const actorId = profile.id || null;
    const [topTab, setTopTab] = React.useState<TopTab>('marketplace');
    const [tab, setTab] = React.useState<PageTab>('agents');
    const [sourceTab, setSourceTab] = React.useState<SourceTab>('market');
    const [query, setQuery] = React.useState('');
    const [category, setCategory] = React.useState<AgentCategory>('all');
    const [publicGenomes, setPublicGenomes] = React.useState<GenomeRecord[]>([]);
    const [privateGenomes, setPrivateGenomes] = React.useState<GenomeRecord[]>([]);
    const [serverFavoriteGenomes, setServerFavoriteGenomes] = React.useState<GenomeRecord[]>([]);
    const [localFavoriteGenomeIds, setLocalFavoriteGenomeIds] = React.useState<string[]>(() => loadFavoriteGenomeIdsFromStorage());
    const [loaded, setLoaded] = React.useState(false);
    const debouncedQuery = useDebounce(query, 300);

    // ── My Agents (deployed instances) ──
    const [myAgents, setMyAgents] = React.useState<AgentRecord[]>([]);
    const [myAgentsLoaded, setMyAgentsLoaded] = React.useState(false);
    const [myAgentsLoading, setMyAgentsLoading] = React.useState(false);

    const loadMyAgents = React.useCallback(async () => {
        const credentials = sync.getCredentials();
        if (!credentials) return;
        setMyAgentsLoading(true);
        try {
            const result = await listAgents(credentials, { type: 'standalone', limit: 50 });
            setMyAgents(result.agents.filter(a => a.status !== 'archived'));
        } catch {
            // silently ignore
        } finally {
            setMyAgentsLoading(false);
            setMyAgentsLoaded(true);
        }
    }, []);

    React.useEffect(() => {
        if (topTab === 'mine') {
            loadMyAgents();
        }
    }, [topTab, loadMyAgents]);

    const handleDeleteMyAgent = React.useCallback(async (agent: AgentRecord) => {
        const confirmed = await Modal.confirm(
            t('agents.agentDeleteAction'),
            t('agents.agentDeleteConfirm'),
            { confirmText: t('agents.agentDeleteAction'), destructive: true },
        );
        if (!confirmed) return;

        const credentials = sync.getCredentials();
        if (!credentials) return;
        try {
            await deleteAgent(credentials, agent.id);
            setMyAgents(prev => prev.filter(a => a.id !== agent.id));
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            await Modal.alert(t('common.error'), msg);
        }
    }, []);

    React.useEffect(() => {
        trackAgentsPageViewed();
    }, []);

    const doLoad = React.useCallback(async () => {
        const credentials = sync.getCredentials();
        const isCorps = tab === 'corps';

        const publicPromise = sourceTab === 'market' || (!actorId && sourceTab === 'favorites')
            ? searchGenomes({
                q: debouncedQuery || undefined,
                category: isCorps ? 'corps' : (category === 'all' ? undefined : category),
                limit: 50,
            }).catch(() => ({ genomes: [] as GenomeRecord[], total: 0 }))
            : Promise.resolve({ genomes: [] as GenomeRecord[], total: 0 });

        const favoritePublicPromise = actorId
            ? fetchFavoriteGenomes(actorId).catch(() => ({ genomes: [] as GenomeRecord[], total: 0 }))
            : Promise.resolve({ genomes: [] as GenomeRecord[], total: 0 });

        const privatePromise = credentials && sourceTab !== 'market'
            ? fetchGenomes(credentials, { ownedOnly: sourceTab === 'mine', limit: 100 }).catch(() => ({ genomes: [], total: 0 }))
            : Promise.resolve({ genomes: [], total: 0 });

        const [publicResult, favoritePublicResult, privateResult] = await Promise.all([
            publicPromise,
            favoritePublicPromise,
            privatePromise,
        ]);

        setServerFavoriteGenomes(favoritePublicResult.genomes);
        setPublicGenomes(sourceTab === 'favorites' && actorId ? favoritePublicResult.genomes : publicResult.genomes);
        setPrivateGenomes(mapOwnedPrivateGenomesToRecords(privateResult.genomes));
        setLoaded(true);
    }, [actorId, category, debouncedQuery, profile.id, sourceTab, tab]);

    const [loading, load] = useHappyAction(doLoad);

    React.useEffect(() => {
        setLoaded(false);
        setPublicGenomes([]);
        setPrivateGenomes([]);
        if (!actorId) {
            setServerFavoriteGenomes([]);
        }
        load();
    }, [actorId, load]);

    const privateGenomeIdSet = React.useMemo(
        () => new Set(privateGenomes.map((genome) => genome.id)),
        [privateGenomes]
    );
    const favoriteGenomeIds = React.useMemo(() => {
        const localIds = actorId
            ? localFavoriteGenomeIds.filter((id) => privateGenomeIdSet.has(id))
            : localFavoriteGenomeIds;

        return Array.from(new Set([
            ...serverFavoriteGenomes.map((genome) => genome.id),
            ...localIds,
        ]));
    }, [actorId, localFavoriteGenomeIds, privateGenomeIdSet, serverFavoriteGenomes]);
    const genomeById = React.useMemo(
        () => new Map([...publicGenomes, ...privateGenomes, ...serverFavoriteGenomes].map((genome) => [genome.id, genome])),
        [privateGenomes, publicGenomes, serverFavoriteGenomes]
    );

    // Reset category when switching tabs
    const handleTabChange = React.useCallback((newTab: PageTab) => {
        setTab(newTab);
        setQuery('');
        setCategory('all');
    }, []);

    const handleSourceTabChange = React.useCallback((nextSourceTab: SourceTab) => {
        setSourceTab(nextSourceTab);
        setQuery('');
    }, []);

    const handleToggleFavorite = React.useCallback(async (genomeId: string) => {
        const genome = genomeById.get(genomeId);
        if (!genome) {
            setLocalFavoriteGenomeIds(toggleFavoriteGenomeIdInStorage(genomeId));
            return;
        }

        if (!genome.isPublic || !actorId) {
            setLocalFavoriteGenomeIds(toggleFavoriteGenomeIdInStorage(genomeId));
            return;
        }

        const isFavorited = serverFavoriteGenomes.some((item) => item.id === genomeId);

        try {
            const response = isFavorited
                ? await removeGenomeFavorite(genomeId, actorId)
                : await addGenomeFavorite(genomeId, actorId);

            setServerFavoriteGenomes((current) => {
                if (isFavorited) {
                    return current.filter((item) => item.id !== genomeId);
                }

                return upsertGenomeRecord(current, response.genome);
            });

            setPublicGenomes((current) => {
                const next = current.map((item) => item.id === genomeId ? response.genome : item);
                if (sourceTab === 'favorites' && isFavorited) {
                    return next.filter((item) => item.id !== genomeId);
                }
                return next;
            });
        } catch {
            setLocalFavoriteGenomeIds(toggleFavoriteGenomeIdInStorage(genomeId));
        }
    }, [actorId, genomeById, serverFavoriteGenomes, sourceTab]);

    const isCorpsTab = tab === 'corps';
    const selectedGenomes = React.useMemo(() => selectMarketplaceGenomes({
        sourceTab,
        publicGenomes,
        privateGenomes,
        favoriteGenomeIds,
        tab,
        category,
        query: debouncedQuery,
    }), [category, debouncedQuery, favoriteGenomeIds, privateGenomes, publicGenomes, sourceTab, tab]);
    const displayedGenomes = React.useMemo(
        () => sortGenomesForDisplay(selectedGenomes, favoriteGenomeIds),
        [favoriteGenomeIds, selectedGenomes]
    );
    const favoriteGenomes = React.useMemo(
        () => displayedGenomes.filter((genome) => isFavoriteGenomeId(genome.id, favoriteGenomeIds)).slice(0, 8),
        [displayedGenomes, favoriteGenomeIds]
    );

    const mainPanel = (
        <View style={[stylesheet.root, { backgroundColor: theme.colors.groupped.background }]}>
            {/* Header */}
            <View style={[stylesheet.header, { backgroundColor: theme.colors.header.background, borderBottomColor: theme.colors.divider }]}>
                <View style={stylesheet.headerTop}>
                    <View>
                        <Text style={[stylesheet.headerTitle, { color: theme.colors.text }]}>
                            {topTab === 'mine' ? t('agents.myAgents') : t('agents.marketplace')}
                        </Text>
                        <Text style={[stylesheet.headerSub, { color: theme.colors.textSecondary }]}>
                            {topTab === 'mine'
                                ? t('agents.myAgentsEmptyHint')
                                : isCorpsTab ? t('agents.corpsSubtitle') : t('agents.marketplaceSubtitle')}
                        </Text>
                    </View>
                </View>

                {/* Top tab: Marketplace | My */}
                <View style={[stylesheet.tabBar, { backgroundColor: theme.colors.surfaceHigh, marginBottom: 12 }]}>
                    {(['marketplace', 'mine'] as TopTab[]).map(key => {
                        const active = topTab === key;
                        return (
                            <Pressable
                                key={key}
                                onPress={() => setTopTab(key)}
                                style={[stylesheet.tabItem, active && { backgroundColor: theme.colors.surface }]}
                            >
                                <Ionicons
                                    name={key === 'marketplace' ? 'storefront-outline' : 'flash-outline'}
                                    size={14}
                                    color={active ? theme.colors.text : theme.colors.textSecondary}
                                    style={{ marginRight: 5 }}
                                />
                                <Text style={[stylesheet.tabText, { color: active ? theme.colors.text : theme.colors.textSecondary, fontWeight: active ? '600' : '400' }]}>
                                    {key === 'marketplace' ? t('agents.marketplace') : t('agents.myAgentsTab')}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>

                {topTab === 'marketplace' ? (<>
                {/* Tab bar */}
                <View style={[stylesheet.tabBar, { backgroundColor: theme.colors.surfaceHigh }]}>
                    {(['agents', 'corps'] as PageTab[]).map(tabKey => {
                        const active = tab === tabKey;
                        return (
                            <Pressable
                                key={tabKey}
                                onPress={() => handleTabChange(tabKey)}
                                style={[
                                    stylesheet.tabItem,
                                    active && { backgroundColor: theme.colors.surface }
                                ]}
                            >
                                <Ionicons
                                    name={tabKey === 'agents' ? 'cube-outline' : 'people-outline'}
                                    size={14}
                                    color={active ? theme.colors.text : theme.colors.textSecondary}
                                    style={{ marginRight: 5 }}
                                />
                                <Text style={[stylesheet.tabText, { color: active ? theme.colors.text : theme.colors.textSecondary, fontWeight: active ? '600' : '400' }]}>
                                    {tabKey === 'agents' ? t('agents.agentsTab') : t('agents.corpsTab')}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>

                <View style={[stylesheet.tabBar, { backgroundColor: theme.colors.surfaceHigh, marginBottom: 12 }]}>
                    {(['market', 'favorites', 'mine'] as SourceTab[]).map(sourceKey => {
                        const active = sourceTab === sourceKey;
                        return (
                            <Pressable
                                key={sourceKey}
                                onPress={() => handleSourceTabChange(sourceKey)}
                                style={[
                                    stylesheet.tabItem,
                                    active && { backgroundColor: theme.colors.surface }
                                ]}
                            >
                                <Ionicons
                                    name={sourceKey === 'market' ? 'globe-outline' : sourceKey === 'favorites' ? 'star-outline' : 'person-outline'}
                                    size={14}
                                    color={active ? theme.colors.text : theme.colors.textSecondary}
                                    style={{ marginRight: 5 }}
                                />
                                <Text style={[stylesheet.tabText, { color: active ? theme.colors.text : theme.colors.textSecondary, fontWeight: active ? '600' : '400' }]}>
                                    {sourceKey === 'market' ? t('agents.market') : sourceKey === 'favorites' ? t('favorites.title') : t('agents.mine')}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>

                {/* Search bar */}
                <View style={[stylesheet.searchBar, { backgroundColor: theme.colors.input.background }]}>
                    <Ionicons name="search-outline" size={16} color={theme.colors.input.placeholder} style={stylesheet.searchIcon} />
                    <TextInput
                        style={[stylesheet.searchInput, { color: theme.colors.input.text }]}
                        placeholder={t('agents.searchPlaceholder')}
                        placeholderTextColor={theme.colors.input.placeholder}
                        value={query}
                        onChangeText={setQuery}
                        returnKeyType="search"
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    {query.length > 0 ? (
                        <Pressable onPress={() => setQuery('')} hitSlop={8}>
                            <Ionicons name="close-circle" size={16} color={theme.colors.input.placeholder} />
                        </Pressable>
                    ) : null}
                </View>

                {/* Category filters — only for agents tab */}
                {!isCorpsTab ? (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={stylesheet.filterScroll}
                        contentContainerStyle={stylesheet.filterContent}
                    >
                        {AGENT_MARKETPLACE_CATEGORIES.map(cat => {
                            const active = cat === category;
                            return (
                                <Pressable
                                    key={cat}
                                    onPress={() => setCategory(cat)}
                                    style={[
                                        stylesheet.filterChip,
                                        active
                                            ? { backgroundColor: theme.colors.button.primary.background }
                                            : { backgroundColor: theme.colors.surfaceHigh, borderColor: theme.colors.divider, borderWidth: 1 }
                                    ]}
                                >
                                    <Text style={[stylesheet.filterChipText, { color: active ? theme.colors.button.primary.tint : theme.colors.textSecondary }]}>
                                        {getCategoryLabel(cat)}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                ) : <View style={{ height: 12 }} />}
                </>) : null}
            </View>

            {/* Content — My Agents */}
            {topTab === 'mine' ? (
                <View style={{ flex: 1 }}>
                    {myAgentsLoading && !myAgentsLoaded ? (
                        <View style={stylesheet.center}>
                            <ActivityIndicator color={theme.colors.textSecondary} />
                        </View>
                    ) : myAgents.length === 0 && myAgentsLoaded ? (
                        <View style={stylesheet.center}>
                            <Ionicons name="flash-outline" size={48} color={theme.colors.textSecondary} style={{ marginBottom: 12 }} />
                            <Text style={[stylesheet.emptyTitle, { color: theme.colors.text }]}>
                                {t('agents.myAgentsEmpty')}
                            </Text>
                            <Text style={[stylesheet.emptyHint, { color: theme.colors.textSecondary }]}>
                                {t('agents.myAgentsEmptyHint')}
                            </Text>
                        </View>
                    ) : (
                        <ScrollView style={stylesheet.list} contentContainerStyle={[stylesheet.listContent, { paddingBottom: 100 }]}>
                            {myAgents.map(agent => (
                                <MyAgentRow
                                    key={agent.id}
                                    agent={agent}
                                    onDelete={handleDeleteMyAgent}
                                    theme={theme}
                                />
                            ))}
                        </ScrollView>
                    )}
                    <FAB onPress={() => router.push('/agents/new' as any)} />
                </View>
            ) : (
            /* Content — Marketplace */
            <View style={{ flex: 1 }}>
            {loading && !loaded ? (
                <View style={stylesheet.center}>
                    <ActivityIndicator color={theme.colors.textSecondary} />
                </View>
            ) : displayedGenomes.length === 0 && loaded ? (
                <View style={stylesheet.center}>
                    <Ionicons
                        name={isCorpsTab ? 'people-outline' : 'cube-outline'}
                        size={48}
                        color={theme.colors.textSecondary}
                        style={{ marginBottom: 12 }}
                    />
                    <Text style={[stylesheet.emptyTitle, { color: theme.colors.text }]}>
                        {isCorpsTab ? t('agents.noCorps') : t('agents.noResults')}
                    </Text>
                    <Text style={[stylesheet.emptyHint, { color: theme.colors.textSecondary }]}>
                        {isCorpsTab ? t('agents.noCorpsHint') : t('agents.noResultsHint')}
                    </Text>
                </View>
            ) : (
                <ScrollView
                    style={stylesheet.list}
                    contentContainerStyle={stylesheet.listContent}
                    showsVerticalScrollIndicator={true}
                >
                    {loading ? <ActivityIndicator color={theme.colors.textSecondary} style={{ marginBottom: 12 }} /> : null}
                    {favoriteGenomes.length > 0 && sourceTab !== 'favorites' ? (
                        <View style={stylesheet.favoritesSection}>
                            <Text style={[stylesheet.favoritesTitle, { color: theme.colors.text }]}>
                                {t('favorites.title')}
                            </Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={stylesheet.favoriteChipRow}>
                                {favoriteGenomes.map((genome) => (
                                    <Pressable
                                        key={genome.id}
                                        onPress={() => setQuery(genome.name)}
                                        style={[stylesheet.favoriteChip, { backgroundColor: theme.colors.surfaceHigh }]}
                                    >
                                        <Ionicons name="star" size={12} color="#FFB547" />
                                        <Text style={[stylesheet.favoriteChipText, { color: theme.colors.textSecondary }]}>
                                            {genome.name}
                                        </Text>
                                    </Pressable>
                                ))}
                            </ScrollView>
                        </View>
                    ) : null}
                    {isCorpsTab
                        ? displayedGenomes.map(g => (
                            <CorpsCardMemo
                                key={g.id}
                                genome={g}
                                isFavorited={isFavoriteGenomeId(g.id, favoriteGenomeIds)}
                                onToggleFavorite={handleToggleFavorite}
                                onPress={() => router.push({ pathname: '/agents/[id]', params: { id: g.id } } as any)}
                            />
                        ))
                        : displayedGenomes.map(g => (
                            <GenomeCardMemo
                                key={g.id}
                                genome={g}
                                isFavorited={isFavoriteGenomeId(g.id, favoriteGenomeIds)}
                                onToggleFavorite={handleToggleFavorite}
                                onPress={() => router.push({ pathname: '/agents/[id]', params: { id: g.id } } as any)}
                            />
                        ))
                    }
                </ScrollView>
            )}
            </View>
            )}
        </View>
    );

    return <SidebarView mainPanel={mainPanel} />;
});

// ─── MyAgentRow ──────────────────────────────────────────────────────────────

interface MyAgentRowProps {
    agent: AgentRecord;
    onDelete: (agent: AgentRecord) => void;
    theme: any;
}

const MyAgentRow = React.memo(function MyAgentRow({ agent, onDelete, theme }: MyAgentRowProps) {
    const statusColor = agent.status === 'active' ? '#22c55e' : '#f59e0b';
    return (
        <View style={[rowStyles.row, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.divider }]}>
            <View style={[rowStyles.statusDot, { backgroundColor: statusColor }]} />
            <View style={rowStyles.info}>
                <Text style={[rowStyles.name, { color: theme.colors.text }]} numberOfLines={1}>
                    {agent.displayName}
                </Text>
                <Text style={[rowStyles.meta, { color: theme.colors.textSecondary }]}>
                    {agent.runtimeType} · {agent.status}
                </Text>
            </View>
            <Pressable onPress={() => onDelete(agent)} hitSlop={12} style={rowStyles.deleteBtn}>
                <Ionicons name="trash-outline" size={18} color={theme.colors.textSecondary} />
            </Pressable>
        </View>
    );
});

const rowStyles = StyleSheet.create((theme) => ({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
        gap: 12,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    info: {
        flex: 1,
        gap: 2,
    },
    name: {
        fontSize: 15,
        fontWeight: '500',
    },
    meta: {
        fontSize: 12,
    },
    deleteBtn: {
        padding: 4,
    },
}));

// ─── Debounce ─────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
    const [debounced, setDebounced] = React.useState(value);
    React.useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debounced;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const stylesheet = StyleSheet.create((theme) => ({
    root: { flex: 1 },
    header: {
        paddingTop: Platform.select({ ios: 8, default: 16 }),
        paddingHorizontal: 16,
        paddingBottom: 0,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        letterSpacing: -0.3,
        marginBottom: 2,
    },
    headerSub: {
        fontSize: 13,
    },
    tabBar: {
        flexDirection: 'row',
        borderRadius: 10,
        padding: 3,
        marginBottom: 12,
    },
    tabItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 7,
        borderRadius: 8,
    },
    tabText: {
        fontSize: 13,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 10,
        paddingHorizontal: 10,
        height: 38,
        marginBottom: 12,
    },
    searchIcon: { marginRight: 7 },
    searchInput: {
        flex: 1,
        fontSize: 15,
        padding: 0,
    },
    filterScroll: { marginHorizontal: -16 },
    filterContent: {
        paddingHorizontal: 16,
        paddingBottom: 12,
        gap: 8,
        flexDirection: 'row',
    },
    filterChip: {
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 6,
    },
    filterChipText: {
        fontSize: 13,
        fontWeight: '500',
    },
    favoritesSection: {
        gap: 8,
        marginBottom: 4,
    },
    favoritesTitle: {
        fontSize: 13,
        fontWeight: '600',
    },
    favoriteChipRow: {
        gap: 8,
        flexDirection: 'row',
    },
    favoriteChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    favoriteChipText: {
        fontSize: 12,
        fontWeight: '500',
    },
    list: { flex: 1 },
    listContent: {
        padding: 12,
        gap: 10,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
    },
    emptyTitle: {
        fontSize: 17,
        fontWeight: '600',
        marginBottom: 6,
        textAlign: 'center',
    },
    emptyHint: {
        fontSize: 14,
        textAlign: 'center',
    },
    // Card
    card: {
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        padding: 14,
        gap: 6,
    },
    corpsCard: {
        borderLeftWidth: 3,
        borderLeftColor: '#FF9500',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    cardMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flex: 1,
    },
    namespaceBadge: {
        borderRadius: 6,
        paddingHorizontal: 7,
        paddingVertical: 2,
    },
    namespaceText: {
        fontSize: 11,
        fontWeight: '600',
        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    },
    categoryBadge: {
        borderRadius: 6,
        paddingHorizontal: 7,
        paddingVertical: 2,
    },
    categoryText: {
        fontSize: 11,
        fontWeight: '500',
    },
    versionText: {
        fontSize: 11,
        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    },
    cardName: {
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    cardDesc: {
        fontSize: 13,
        lineHeight: 18,
    },
    tagRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 5,
        marginTop: 2,
    },
    tag: {
        borderRadius: 5,
        paddingHorizontal: 7,
        paddingVertical: 2,
    },
    specialtyTag: {
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    tagText: { fontSize: 11 },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
        paddingTop: 8,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    spawnText: { fontSize: 12 },
    metricGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        marginLeft: 6,
    },
    metricText: {
        fontSize: 11,
    },
    // Corps-specific
    membersRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        flexWrap: 'wrap',
        marginTop: 2,
    },
    memberCountText: { fontSize: 12 },
    memberChip: {
        borderRadius: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    memberChipText: { fontSize: 11 },
}));
