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
import { searchGenomes, parseTags, parseCorpsSpec, parseFeedback, type GenomeRecord } from '@/utils/genomeHub';
import { useHappyAction } from '@/hooks/useHappyAction';
import { trackAgentsPageViewed } from '@/track';
import { isFavoriteGenomeId } from '@/utils/favoriteGenomes';
import { loadFavoriteGenomeIdsFromStorage, toggleFavoriteGenomeIdInStorage } from '@/utils/favoriteGenomesStorage';
import { fetchGenomes, type Genome as PrivateGenome } from '@/sync/apiEvolution';
import { sync } from '@/sync/sync';
import { useProfile } from '@/sync/storage';

// ─── Types ───────────────────────────────────────────────────────────────────

type PageTab = 'agents' | 'corps';
type SourceTab = 'market' | 'favorites' | 'mine';
const AGENT_CATEGORIES = ['all', 'coordination', 'support', 'execution'] as const;
type AgentCategory = typeof AGENT_CATEGORIES[number];
const STATUS_PRIORITY: Record<GenomeRecord['status'], number> = {
    official: 0,
    verified: 1,
    draft: 2,
};

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
    return t('agents.draft');
}

function getGenomeStatusColor(status: GenomeRecord['status']) {
    if (status === 'official') return { text: '#007AFF', background: '#007AFF18' };
    if (status === 'verified') return { text: '#22c55e', background: '#22c55e18' };
    return { text: '#8A7F74', background: '#8A7F7418' };
}

function sortGenomesForDisplay(genomes: GenomeRecord[], favoriteGenomeIds: string[]): GenomeRecord[] {
    return [...genomes].sort((left, right) => {
        const favoriteDelta = Number(isFavoriteGenomeId(right.id, favoriteGenomeIds)) - Number(isFavoriteGenomeId(left.id, favoriteGenomeIds));
        if (favoriteDelta !== 0) {
            return favoriteDelta;
        }

        const statusDelta = STATUS_PRIORITY[left.status] - STATUS_PRIORITY[right.status];
        if (statusDelta !== 0) {
            return statusDelta;
        }

        return right.updatedAt.localeCompare(left.updatedAt);
    });
}

function toGenomeRecordFromPrivateGenome(genome: PrivateGenome): GenomeRecord {
    return {
        id: genome.id,
        namespace: genome.namespace ?? '@private',
        name: genome.name,
        version: genome.version ?? 1,
        status: genome.namespace === '@official' ? 'official' : 'draft',
        description: genome.description,
        spec: genome.spec,
        tags: genome.tags ?? null,
        category: genome.category ?? null,
        isPublic: genome.isPublic,
        spawnCount: genome.spawnCount,
        feedbackData: genome.feedbackData ?? null,
        publisherId: genome.accountId,
        createdAt: genome.createdAt,
        updatedAt: genome.updatedAt,
    };
}

function mergeGenomeRecords(genomes: GenomeRecord[]): GenomeRecord[] {
    const byId = new Map<string, GenomeRecord>();

    genomes.forEach((genome) => {
        byId.set(genome.id, genome);
    });

    return Array.from(byId.values());
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
    const namespace = genome.namespace ?? '@public';
    const status = getGenomeStatusColor(genome.status);

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

            <View style={[stylesheet.cardFooter, { borderTopColor: theme.colors.divider }]}>
                <Ionicons name="flash-outline" size={13} color={theme.colors.textSecondary} />
                <Text style={[stylesheet.spawnText, { color: theme.colors.textSecondary }]}>
                    {t('agents.spawnCount', { count: genome.spawnCount })}
                </Text>
                {(() => {
                    const fb = parseFeedback(genome.feedbackData);
                    if (!fb || fb.evaluationCount < 1) return null;
                    const score = fb.avgScore;
                    const color = score >= 85 ? '#22c55e' : score >= 70 ? '#f59e0b' : '#ef4444';
                    return (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 8 }}>
                            <Ionicons name="star" size={11} color={color} />
                            <Text style={{ fontSize: 11, color, fontWeight: '600' }}>
                                {score} ({fb.evaluationCount})
                            </Text>
                        </View>
                    );
                })()}
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
    const [tab, setTab] = React.useState<PageTab>('agents');
    const [sourceTab, setSourceTab] = React.useState<SourceTab>('market');
    const [query, setQuery] = React.useState('');
    const [category, setCategory] = React.useState<AgentCategory>('all');
    const [genomes, setGenomes] = React.useState<GenomeRecord[]>([]);
    const [favoriteGenomeIds, setFavoriteGenomeIds] = React.useState<string[]>(() => loadFavoriteGenomeIdsFromStorage());
    const [total, setTotal] = React.useState(0);
    const [loaded, setLoaded] = React.useState(false);
    const debouncedQuery = useDebounce(query, 300);

    React.useEffect(() => {
        trackAgentsPageViewed();
    }, []);

    const doLoad = React.useCallback(async () => {
        const credentials = sync.getCredentials();
        const isCorps = tab === 'corps';

        const publicPromise = searchGenomes({
            q: debouncedQuery || undefined,
            category: isCorps ? 'corps' : (category === 'all' ? undefined : category),
            limit: 50,
        }).catch(() => ({ genomes: [] as GenomeRecord[], total: 0 }));

        const privatePromise = credentials
            ? fetchGenomes(credentials, { limit: 100 }).catch(() => ({ genomes: [] as PrivateGenome[], total: 0 }))
            : Promise.resolve({ genomes: [] as PrivateGenome[], total: 0 });

        const [publicResult, privateResult] = await Promise.all([publicPromise, privatePromise]);

        const filteredPublic = isCorps
            ? publicResult.genomes
            : publicResult.genomes.filter((g) => g.category !== 'corps');

        const privateGenomes = privateResult.genomes
            .filter((genome) => {
                const mine = profile.id ? genome.accountId === profile.id : true;
                const isCorpsGenome = (genome.category ?? '') === 'corps';
                return mine && (isCorps ? isCorpsGenome : !isCorpsGenome);
            })
            .map(toGenomeRecordFromPrivateGenome);

        let nextGenomes: GenomeRecord[];
        if (sourceTab === 'mine') {
            nextGenomes = privateGenomes;
        } else if (sourceTab === 'favorites') {
            nextGenomes = mergeGenomeRecords([...filteredPublic, ...privateGenomes])
                .filter((genome) => isFavoriteGenomeId(genome.id, favoriteGenomeIds));
        } else {
            nextGenomes = filteredPublic;
        }

        setGenomes(nextGenomes);
        setTotal(nextGenomes.length);
        setLoaded(true);
    }, [category, debouncedQuery, favoriteGenomeIds, profile.id, sourceTab, tab]);

    const [loading, load] = useHappyAction(doLoad);

    React.useEffect(() => {
        setLoaded(false);
        setGenomes([]);
        load();
    }, [load]);

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

    const handleToggleFavorite = React.useCallback((genomeId: string) => {
        setFavoriteGenomeIds(toggleFavoriteGenomeIdInStorage(genomeId));
    }, []);

    const isCorpsTab = tab === 'corps';
    const displayedGenomes = React.useMemo(
        () => sortGenomesForDisplay(genomes, favoriteGenomeIds),
        [favoriteGenomeIds, genomes]
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
                            {t('agents.marketplace')}
                        </Text>
                        <Text style={[stylesheet.headerSub, { color: theme.colors.textSecondary }]}>
                            {isCorpsTab ? t('agents.corpsSubtitle') : t('agents.marketplaceSubtitle')}
                        </Text>
                    </View>
                </View>

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
                        {AGENT_CATEGORIES.map(cat => {
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
            </View>

            {/* Content */}
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
                                onPress={() => router.push(`/agents/${g.id}`)}
                            />
                        ))
                        : displayedGenomes.map(g => (
                            <GenomeCardMemo
                                key={g.id}
                                genome={g}
                                isFavorited={isFavoriteGenomeId(g.id, favoriteGenomeIds)}
                                onToggleFavorite={handleToggleFavorite}
                                onPress={() => router.push(`/agents/${g.id}`)}
                            />
                        ))
                    }
                </ScrollView>
            )}
        </View>
    );

    return <SidebarView mainPanel={mainPanel} />;
});

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
