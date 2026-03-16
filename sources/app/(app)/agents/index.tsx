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
import { SidebarView } from '@/components/layout/SidebarView';
import { t } from '@/text';
import { searchGenomes, parseTags, parseCorpsSpec, type GenomeRecord } from '@/utils/genomeHub';
import { useHappyAction } from '@/hooks/useHappyAction';
import { trackAgentsPageViewed } from '@/track';

// ─── Types ───────────────────────────────────────────────────────────────────

type PageTab = 'agents' | 'corps';
const AGENT_CATEGORIES = ['all', 'coordination', 'support', 'execution'] as const;
type AgentCategory = typeof AGENT_CATEGORIES[number];

function getCategoryLabel(cat: AgentCategory): string {
    const map: Record<AgentCategory, string> = {
        all: t('agents.all'),
        coordination: t('agents.coordination'),
        support: t('agents.support'),
        execution: t('agents.execution'),
    };
    return map[cat];
}

// ─── Genome Card ─────────────────────────────────────────────────────────────

function GenomeCard({ genome }: { genome: GenomeRecord }) {
    const { theme } = useUnistyles();
    const tags = parseTags(genome.tags);
    const namespace = genome.namespace ?? '@public';
    const isOfficial = namespace === '@official';

    return (
        <View style={[stylesheet.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider }]}>
            <View style={stylesheet.cardHeader}>
                <View style={stylesheet.cardMeta}>
                    <View style={[
                        stylesheet.namespaceBadge,
                        isOfficial ? { backgroundColor: '#007AFF18' } : { backgroundColor: theme.colors.surfaceHigh }
                    ]}>
                        <Text style={[stylesheet.namespaceText, { color: isOfficial ? '#007AFF' : theme.colors.textSecondary }]}>
                            {namespace}
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
                <Text style={[stylesheet.versionText, { color: theme.colors.textSecondary }]}>
                    {t('agents.versionLabel', { version: genome.version })}
                </Text>
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
            </View>
        </View>
    );
}

// ─── Corps Card ──────────────────────────────────────────────────────────────

function CorpsCard({ genome }: { genome: GenomeRecord }) {
    const { theme } = useUnistyles();
    const namespace = genome.namespace ?? '@public';
    const isOfficial = namespace === '@official';
    const corps = parseCorpsSpec(genome.spec);
    const memberCount = corps?.members?.length ?? 0;
    const tags = parseTags(genome.tags);

    return (
        <View style={[stylesheet.card, stylesheet.corpsCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider }]}>
            <View style={stylesheet.cardHeader}>
                <View style={stylesheet.cardMeta}>
                    <View style={[
                        stylesheet.namespaceBadge,
                        isOfficial ? { backgroundColor: '#FF950018' } : { backgroundColor: theme.colors.surfaceHigh }
                    ]}>
                        <Text style={[stylesheet.namespaceText, { color: isOfficial ? '#FF9500' : theme.colors.textSecondary }]}>
                            {namespace}
                        </Text>
                    </View>
                    <View style={[stylesheet.categoryBadge, { backgroundColor: '#FF950018' }]}>
                        <Text style={[stylesheet.categoryText, { color: '#FF9500' }]}>
                            {t('agents.corpsTab')}
                        </Text>
                    </View>
                </View>
                <Text style={[stylesheet.versionText, { color: theme.colors.textSecondary }]}>
                    {t('agents.versionLabel', { version: genome.version })}
                </Text>
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
        </View>
    );
}

const GenomeCardMemo = React.memo(GenomeCard);
const CorpsCardMemo = React.memo(CorpsCard);

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default React.memo(function AgentsScreen() {
    const { theme } = useUnistyles();
    const [tab, setTab] = React.useState<PageTab>('agents');
    const [query, setQuery] = React.useState('');
    const [category, setCategory] = React.useState<AgentCategory>('all');
    const [genomes, setGenomes] = React.useState<GenomeRecord[]>([]);
    const [total, setTotal] = React.useState(0);
    const [loaded, setLoaded] = React.useState(false);
    const debouncedQuery = useDebounce(query, 300);

    React.useEffect(() => {
        trackAgentsPageViewed();
    }, []);

    const doLoad = React.useCallback(async () => {
        if (tab === 'corps') {
            const result = await searchGenomes({
                q: debouncedQuery || undefined,
                category: 'corps',
                limit: 50,
            });
            setGenomes(result.genomes);
            setTotal(result.total);
        } else {
            const result = await searchGenomes({
                q: debouncedQuery || undefined,
                category: category === 'all' ? undefined : category,
                limit: 50,
            });
            // Filter out corps from agents tab
            const filtered = result.genomes.filter(g => g.category !== 'corps');
            setGenomes(filtered);
            setTotal(filtered.length);
        }
        setLoaded(true);
    }, [debouncedQuery, category, tab]);

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

    const isCorpsTab = tab === 'corps';

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
            ) : genomes.length === 0 && loaded ? (
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
                    {isCorpsTab
                        ? genomes.map(g => <CorpsCardMemo key={g.id} genome={g} />)
                        : genomes.map(g => <GenomeCardMemo key={g.id} genome={g} />)
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
