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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SidebarView } from '@/components/layout/SidebarView';
import { t } from '@/text';
import {
    addGenomeFavorite,
    fetchFavoriteGenomes,
    getLegionMemberDisplayName,
    getLegionMemberReference,
    parseLegionImage,
    parseAgentVerdict,
    parseAgentImage,
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
    sortGenomesByScore,
    type AgentMarketplaceCategory,
    type MarketplacePageTab,
    type MarketplaceSortMode,
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
import {
    getGenomeImageEmptyState,
    getGenomeImageKind,
    getGenomeImageLabel,
    getGenomeImagePluralLabel,
} from '@/utils/genomeImageSemantics';
import { DeployCorpsModal } from './DeployCorpsModal';
import { RunStandaloneModal } from './RunStandaloneModal';
import { JoinTeamModal } from './JoinTeamModal';
import { ManualCorpsBuilderModal } from './ManualCorpsBuilderModal';

// ─── Types ───────────────────────────────────────────────────────────────────

type PageTab = MarketplacePageTab;
type SourceTab = MarketplaceSourceTab;
type AgentCategory = AgentMarketplaceCategory;
type AgentSourceFilter = SourceTab | 'deployed';

function upsertGenomeRecord(records: GenomeRecord[], genome: GenomeRecord): GenomeRecord[] {
    const next = records.filter((record) => record.id !== genome.id);
    return [...next, genome];
}

function getStorefrontRating(genome: GenomeRecord): number | null {
    const feedback = parseAgentVerdict(genome.feedbackData);
    if (typeof feedback?.avgScore === 'number') {
        return feedback.avgScore;
    }

    const spec = parseAgentImage(genome.spec);
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

function getGenomeStatusColor(status: GenomeRecord['status'], fallbackTextColor?: string) {
    if (status === 'official') return { text: '#007AFF', background: '#007AFF18' };
    if (status === 'verified') return { text: '#22c55e', background: '#22c55e18' };
    if (status === 'unverified') return { text: '#f59e0b', background: '#f59e0b18' };
    if (status === 'archived') return { text: '#6b7280', background: '#6b728018' };
    const text = fallbackTextColor ?? '#8A7F74';
    return { text, background: `${text}18` };
}

function isSpecialGenome(tags: string[], genomeName: string): boolean {
    const normalizedTags = tags.map((tag) => tag.toLowerCase());
    const normalizedName = genomeName.toLowerCase();
    return normalizedTags.includes('special')
        || normalizedTags.includes('agent-builder')
        || normalizedName.includes('agent-builder');
}

// ─── Genome Card ─────────────────────────────────────────────────────────────

function GenomeCard({
    genome,
    isFavorited,
    onToggleFavorite,
    onPress,
    onRunStandalone,
    onJoinTeam,
}: {
    genome: GenomeRecord;
    isFavorited: boolean;
    onToggleFavorite: (genomeId: string) => void;
    onPress?: () => void;
    onRunStandalone?: () => void;
    onJoinTeam?: () => void;
}) {
    const { theme } = useUnistyles();
    const spec = React.useMemo(() => parseAgentImage(genome.spec), [genome.spec]);
    const imageKind = getGenomeImageKind(genome);
    const imageLabel = getGenomeImageLabel(imageKind);
    const feedback = React.useMemo(() => parseAgentVerdict(genome.feedbackData), [genome.feedbackData]);
    const storefrontRating = getStorefrontRating(genome);
    const crowdReviewCount = feedback?.evaluationCount ?? spec?.resume?.totalSessions ?? null;
    const tags = parseTags(genome.tags);
    const categoryLabel = genome.category || spec?.category || null;
    const isSpecial = isSpecialGenome(tags, genome.name);

    // What it does — from spec responsibilities or description
    const whatItDoes = spec?.responsibilities?.slice(0, 2)?.join(' · ')
        || genome.description
        || '';

    // Special badges — authority/celebrity tags + verified status
    const isOfficial = genome.status === 'official';
    const isVerified = genome.status === 'verified';
    const specialTags = tags.filter(tag =>
        tag.toLowerCase().includes('expert') ||
        tag.toLowerCase().includes('exclusive') ||
        tag.toLowerCase().includes('pro') ||
        tag.toLowerCase().includes('karpathy') ||
        tag.toLowerCase().includes('official') ||
        tag.toLowerCase().includes('special') ||
        tag.toLowerCase().includes('agent-builder')
    );

    // Rating color
    const ratingColor = storefrontRating != null
        ? (storefrontRating >= 85 ? '#22c55e' : storefrontRating >= 70 ? '#f59e0b' : '#ef4444')
        : theme.colors.textSecondary;

    return (
        <Pressable onPress={onPress} style={[stylesheet.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider }]}>
            <View style={stylesheet.cardHeader}>
                <View style={stylesheet.cardTitleWrap}>
                    <Text style={[stylesheet.cardName, { color: theme.colors.text }]} numberOfLines={1}>
                        {spec?.displayName || genome.name}
                    </Text>
                    {isOfficial ? (
                        <View style={[stylesheet.trustBadge, { backgroundColor: '#007AFF18' }]}>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: '#007AFF' }}>{t('agents.official')}</Text>
                        </View>
                    ) : isVerified ? (
                        <View style={[stylesheet.trustBadge, { backgroundColor: '#22c55e18' }]}>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: '#22c55e' }}>{t('agents.verified')}</Text>
                        </View>
                    ) : null}
                    <View style={[stylesheet.categoryBadge, { backgroundColor: '#007AFF18' }]}>
                        <Text style={[stylesheet.categoryText, { color: '#007AFF' }]}>
                            {imageLabel}
                        </Text>
                    </View>
                </View>
                <View style={stylesheet.headerRight}>
                    {storefrontRating != null ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                            <Ionicons name="star" size={13} color={ratingColor} />
                            <Text style={{ fontSize: 14, fontWeight: '700', color: ratingColor }}>
                                {Math.round(storefrontRating)}
                            </Text>
                            {crowdReviewCount ? (
                                <Text style={{ fontSize: 11, color: theme.colors.textSecondary }}>
                                    ({crowdReviewCount})
                                </Text>
                            ) : null}
                        </View>
                    ) : null}
                    <Pressable onPress={() => onToggleFavorite(genome.id)} hitSlop={8}>
                        <Ionicons
                            name={isFavorited ? 'star' : 'star-outline'}
                            size={15}
                            color={isFavorited ? '#FFB547' : theme.colors.textSecondary}
                        />
                    </Pressable>
                </View>
            </View>

            {whatItDoes ? (
                <Text style={[stylesheet.cardDesc, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                    {whatItDoes}
                </Text>
            ) : null}

            <View style={stylesheet.cardMetaRow}>
                {categoryLabel ? (
                    <View style={[stylesheet.metaBadge, { backgroundColor: theme.colors.surfaceHigh }]}>
                        <Text style={[stylesheet.metaBadgeText, { color: theme.colors.textSecondary }]}>
                            {categoryLabel}
                        </Text>
                    </View>
                ) : null}
                {isSpecial ? (
                    <View style={[stylesheet.metaBadge, { backgroundColor: '#0EA5E914' }]}>
                        <Text style={[stylesheet.metaBadgeText, { color: '#0EA5E9' }]}>
                            {t('agents.specialBadge')}
                        </Text>
                    </View>
                ) : null}
                {spec?.runtimeType ? (
                    <View style={[stylesheet.metaBadge, { backgroundColor: theme.colors.surfaceHigh }]}>
                        <Text style={[stylesheet.metaBadgeText, { color: theme.colors.textSecondary }]}>
                            {spec.runtimeType}
                        </Text>
                    </View>
                ) : null}
                <View style={[stylesheet.metaBadge, { backgroundColor: theme.colors.surfaceHigh }]}>
                    <Text style={[stylesheet.metaBadgeText, stylesheet.versionText, { color: theme.colors.textSecondary }]}>
                        v{genome.version}
                    </Text>
                </View>
                {specialTags.length > 0 ? (
                    <View style={[stylesheet.specialTag, { backgroundColor: '#FFB54720' }]}>
                        <Text style={{ fontSize: 10, fontWeight: '600', color: '#D4870A' }}>{specialTags[0]}</Text>
                    </View>
                ) : null}
            </View>

            <View style={stylesheet.cardFooter}>
                {genome.spawnCount > 0 ? (
                    <Text style={[stylesheet.metricText, { color: theme.colors.textSecondary }]}>
                        {t('agents.spawnCount', { count: genome.spawnCount })}
                    </Text>
                ) : null}
                <View style={{ flex: 1 }} />
                {onRunStandalone ? (
                    <Pressable onPress={onRunStandalone} hitSlop={6} style={[stylesheet.miniAction, { borderColor: theme.colors.divider }]}>
                        <Ionicons name="play" size={12} color={theme.colors.textSecondary} />
                    </Pressable>
                ) : null}
                {onJoinTeam ? (
                    <Pressable onPress={onJoinTeam} hitSlop={6} style={[stylesheet.miniAction, { borderColor: theme.colors.divider }]}>
                        <Ionicons name="people" size={12} color={theme.colors.textSecondary} />
                    </Pressable>
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
    onRunStandalone,
}: {
    genome: GenomeRecord;
    isFavorited: boolean;
    onToggleFavorite: (genomeId: string) => void;
    onPress?: () => void;
    onRunStandalone?: () => void;
}) {
    const { theme } = useUnistyles();
    const corps = parseLegionImage(genome.spec);
    const imageLabel = getGenomeImageLabel(getGenomeImageKind(genome));
    const memberCount = corps?.members?.length ?? 0;
    const status = getGenomeStatusColor(genome.status, theme.colors.textSecondary);
    const memberPreview = corps?.members?.slice(0, 3) ?? [];
    const whatItDoes = genome.description || `Ready-to-deploy ${imageLabel} with ${memberCount} AgentImage members.`;

    return (
        <Pressable onPress={onPress} style={[stylesheet.card, stylesheet.corpsCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider }]}>
            <View style={stylesheet.cardHeader}>
                <View style={stylesheet.cardTitleWrap}>
                    <Text style={[stylesheet.cardName, { color: theme.colors.text }]} numberOfLines={1}>
                        {genome.name}
                    </Text>
                    <View style={[stylesheet.categoryBadge, { backgroundColor: '#FF950018' }]}>
                        <Text style={[stylesheet.categoryText, { color: '#FF9500' }]}>
                            {imageLabel}
                        </Text>
                    </View>
                    <View style={[stylesheet.categoryBadge, { backgroundColor: status.background }]}>
                        <Text style={[stylesheet.categoryText, { color: status.text }]}>
                            {getGenomeStatusLabel(genome.status)}
                        </Text>
                    </View>
                </View>
                <View style={stylesheet.headerRight}>
                    <Pressable onPress={() => onToggleFavorite(genome.id)} hitSlop={8}>
                        <Ionicons
                            name={isFavorited ? 'star' : 'star-outline'}
                            size={15}
                            color={isFavorited ? '#FFB547' : theme.colors.textSecondary}
                        />
                    </Pressable>
                </View>
            </View>

            {whatItDoes ? (
                <Text style={[stylesheet.cardDesc, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                    {whatItDoes}
                </Text>
            ) : null}

            <View style={stylesheet.cardMetaRow}>
                <View style={[stylesheet.metaBadge, { backgroundColor: theme.colors.surfaceHigh }]}>
                    <Text style={[stylesheet.metaBadgeText, { color: theme.colors.textSecondary }]}>
                        {t('agents.memberCount', { count: memberCount })}
                    </Text>
                </View>
                <View style={[stylesheet.metaBadge, { backgroundColor: theme.colors.surfaceHigh }]}>
                    <Text style={[stylesheet.metaBadgeText, stylesheet.versionText, { color: theme.colors.textSecondary }]}>
                        v{genome.version}
                    </Text>
                </View>
                {memberPreview.map((member, index) => (
                    <View
                        key={`${getLegionMemberReference(member) ?? getLegionMemberDisplayName(member)}-${index}`}
                        style={[stylesheet.metaBadge, { backgroundColor: theme.colors.surfaceHigh }]}
                    >
                        <Text style={[stylesheet.metaBadgeText, { color: theme.colors.textSecondary }]}>
                            {getLegionMemberDisplayName(member)}
                        </Text>
                    </View>
                ))}
            </View>

            <View style={stylesheet.cardFooter}>
                <Text style={[stylesheet.metricText, { color: theme.colors.textSecondary }]}>
                    {t('agents.spawnCount', { count: genome.spawnCount })}
                </Text>
                <Text style={[stylesheet.metricText, { color: theme.colors.textSecondary }]}>
                    {t('agents.savesCount', { count: genome.starCount })}
                </Text>
                <View style={{ flex: 1 }} />
                {onRunStandalone ? (
                    <Pressable onPress={onRunStandalone} hitSlop={6} style={[stylesheet.miniAction, { borderColor: theme.colors.divider }]}>
                        <Ionicons name="play" size={12} color={theme.colors.textSecondary} />
                    </Pressable>
                ) : null}
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
    const params = useLocalSearchParams<{ launchHint?: string | string[] }>();
    const launchHint = Array.isArray(params.launchHint) ? params.launchHint[0] : params.launchHint;
    const profile = useProfile();
    const actorId = profile.id || null;
    const [tab, setTab] = React.useState<PageTab>('agents');
    const [sourceFilter, setSourceFilter] = React.useState<AgentSourceFilter>('market');
    const [query, setQuery] = React.useState('');
    const [category, setCategory] = React.useState<AgentCategory>('all');
    const [sortMode, setSortMode] = React.useState<MarketplaceSortMode>('default');
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

    // ── Marketplace action modals ──
    const [activeGenome, setActiveGenome] = React.useState<GenomeRecord | null>(null);
    const [runModal, setRunModal] = React.useState(false);
    const [joinModal, setJoinModal] = React.useState(false);
    const [showManualCorpsModal, setShowManualCorpsModal] = React.useState(false);

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
    }, [sourceFilter]);

    React.useEffect(() => {
        if (tab === 'agents' && sourceFilter === 'deployed') {
            loadMyAgents();
        }
    }, [loadMyAgents, sourceFilter, tab]);

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

    React.useEffect(() => {
        if (launchHint === 'great-agent') {
            setTab('agents');
            setSourceFilter('market');
        }
    }, [launchHint]);

    const doLoad = React.useCallback(async () => {
        const credentials = sync.getCredentials();
        const isCorps = tab === 'corps';
        const marketplaceSource = sourceFilter === 'deployed' ? 'market' : sourceFilter;

        const publicPromise = marketplaceSource === 'market' || (!actorId && marketplaceSource === 'favorites')
            ? searchGenomes({
                q: debouncedQuery || undefined,
                category: isCorps ? undefined : (category === 'all' ? undefined : category),
                limit: 50,
            }).catch(() => ({ genomes: [] as GenomeRecord[], total: 0 }))
            : Promise.resolve({ genomes: [] as GenomeRecord[], total: 0 });

        const favoritePublicPromise = actorId
            ? fetchFavoriteGenomes(actorId).catch(() => ({ genomes: [] as GenomeRecord[], total: 0 }))
            : Promise.resolve({ genomes: [] as GenomeRecord[], total: 0 });

        const privatePromise = credentials && marketplaceSource !== 'market'
            ? fetchGenomes(credentials, { ownedOnly: marketplaceSource === 'mine', limit: 100 }).catch(() => ({ genomes: [], total: 0 }))
            : Promise.resolve({ genomes: [], total: 0 });

        const [publicResult, favoritePublicResult, privateResult] = await Promise.all([
            publicPromise,
            favoritePublicPromise,
            privatePromise,
        ]);

        setServerFavoriteGenomes(favoritePublicResult.genomes);
        setPublicGenomes(marketplaceSource === 'favorites' && actorId ? favoritePublicResult.genomes : publicResult.genomes);
        setPrivateGenomes(mapOwnedPrivateGenomesToRecords(privateResult.genomes));
        setLoaded(true);
    }, [actorId, category, debouncedQuery, profile.id, sourceFilter, tab]);

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
        if (newTab === 'corps' && sourceFilter === 'deployed') {
            setSourceFilter('market');
        }
    }, [sourceFilter]);

    const handleSourceTabChange = React.useCallback((nextSourceTab: AgentSourceFilter) => {
        setSourceFilter(nextSourceTab);
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
                if (sourceFilter === 'favorites' && isFavorited) {
                    return next.filter((item) => item.id !== genomeId);
                }
                return next;
            });
        } catch {
            setLocalFavoriteGenomeIds(toggleFavoriteGenomeIdInStorage(genomeId));
        }
    }, [actorId, genomeById, serverFavoriteGenomes, sourceFilter]);

    const isLegionTab = tab === 'corps';
    const marketplaceSource = sourceFilter === 'deployed' ? 'market' : sourceFilter;
    const selectedGenomes = React.useMemo(() => selectMarketplaceGenomes({
        sourceTab: marketplaceSource,
        publicGenomes,
        privateGenomes,
        favoriteGenomeIds,
        tab,
        category,
        query: debouncedQuery,
    }), [category, debouncedQuery, favoriteGenomeIds, marketplaceSource, privateGenomes, publicGenomes, tab]);
    const displayedGenomes = React.useMemo(
        () => sortMode === 'rank'
            ? sortGenomesByScore(selectedGenomes)
            : sortGenomesForDisplay(selectedGenomes, favoriteGenomeIds),
        [favoriteGenomeIds, selectedGenomes, sortMode]
    );
    const favoriteGenomes = React.useMemo(
        () => displayedGenomes.filter((genome) => isFavoriteGenomeId(genome.id, favoriteGenomeIds)).slice(0, 8),
        [displayedGenomes, favoriteGenomeIds]
    );
    const showDeployedList = tab === 'agents' && sourceFilter === 'deployed';
    const sourceOptions = React.useMemo(() => (
        isLegionTab
            ? ([
                { key: 'market', label: t('agents.market'), icon: 'globe-outline' },
                { key: 'favorites', label: t('favorites.title'), icon: 'star-outline' },
                { key: 'mine', label: t('agents.mine'), icon: 'person-outline' },
            ] as const)
            : ([
                { key: 'market', label: t('agents.market'), icon: 'globe-outline' },
                { key: 'favorites', label: t('favorites.title'), icon: 'star-outline' },
                { key: 'mine', label: t('agents.mine'), icon: 'person-outline' },
                { key: 'deployed', label: t('agents.myAgentsTab'), icon: 'flash-outline' },
            ] as const)
    ), [isLegionTab]);
    const headerTitle = showDeployedList
        ? t('agents.myAgents')
        : isLegionTab
            ? getGenomeImagePluralLabel('legion')
            : getGenomeImagePluralLabel('agent');
    const headerSubtitle = showDeployedList
        ? t('agents.myAgentsEmptyHint')
        : isLegionTab
            ? 'Multi-agent images: AgentImage member refs plus LegionLayer coordination.'
            : 'Single-agent images with full package metadata and evolution history.';
    const emptyState = isLegionTab
        ? getGenomeImageEmptyState('legion')
        : getGenomeImageEmptyState('agent');

    const mainPanel = (
        <View style={[stylesheet.root, { backgroundColor: theme.colors.groupped.background }]}>
            {/* Header */}
            <View style={[stylesheet.header, { backgroundColor: theme.colors.header.background, borderBottomColor: theme.colors.divider }]}>
                <View style={stylesheet.headerTop}>
                    <View>
                        <Text style={[stylesheet.headerTitle, { color: theme.colors.text }]}>
                            {headerTitle}
                        </Text>
                        <Text style={[stylesheet.headerSub, { color: theme.colors.textSecondary }]}>
                            {headerSubtitle}
                        </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Pressable
                            onPress={() => router.push('/agents/new' as any)}
                            style={[stylesheet.headerCreateButton, { backgroundColor: theme.colors.button.primary.background }]}
                        >
                            <Ionicons name="add" size={14} color={theme.colors.button.primary.tint} />
                            <Text style={[stylesheet.headerCreateButtonText, { color: theme.colors.button.primary.tint }]}>
                                {t('agents.createAgent')}
                            </Text>
                        </Pressable>
                        <Pressable
                            onPress={() => setShowManualCorpsModal(true)}
                            style={[stylesheet.headerCreateButton, { backgroundColor: theme.colors.button.primary.background }]}
                        >
                            <Ionicons name="add" size={14} color={theme.colors.button.primary.tint} />
                            <Text style={[stylesheet.headerCreateButtonText, { color: theme.colors.button.primary.tint }]}>
                                {t('agents.newCorps')}
                            </Text>
                        </Pressable>
                    </View>
                </View>

                {launchHint === 'great-agent' ? (
                    <View style={[stylesheet.launchHintBanner, { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider }]}>
                        <View style={{ flex: 1, gap: 4 }}>
                            <Text style={[stylesheet.launchHintTitle, { color: theme.colors.text }]}>
                                {t('agents.marketHintTitle')}
                            </Text>
                            <Text style={[stylesheet.launchHintBody, { color: theme.colors.textSecondary }]}>
                                {t('agents.marketHintBody')}
                            </Text>
                        </View>
                        <Pressable onPress={() => router.replace('/agents' as any)} hitSlop={8}>
                            <Ionicons name="close" size={16} color={theme.colors.textSecondary} />
                        </Pressable>
                    </View>
                ) : null}

                <View style={[stylesheet.tabBar, { backgroundColor: theme.colors.surfaceHigh }]}>
                    {(['agents', 'corps'] as PageTab[]).map(tabKey => {
                        const active = tab === tabKey;
                        const kind = tabKey === 'agents' ? 'agent' : 'legion';
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
                                    name={tabKey === 'agents' ? 'cube-outline' : 'layers-outline'}
                                    size={14}
                                    color={active ? theme.colors.text : theme.colors.textSecondary}
                                    style={{ marginRight: 5 }}
                                />
                                <Text style={[stylesheet.tabText, { color: active ? theme.colors.text : theme.colors.textSecondary, fontWeight: active ? '600' : '400' }]}>
                                    {getGenomeImageLabel(kind)}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={stylesheet.filterScroll}
                    contentContainerStyle={[stylesheet.filterContent, { paddingTop: 12 }]}
                >
                    {sourceOptions.map(({ key, label, icon }) => {
                        const active = sourceFilter === key;
                        return (
                            <Pressable
                                key={key}
                                onPress={() => handleSourceTabChange(key as AgentSourceFilter)}
                                style={[
                                    stylesheet.filterChip,
                                    active
                                        ? { backgroundColor: theme.colors.button.primary.background }
                                        : { backgroundColor: theme.colors.surfaceHigh, borderColor: theme.colors.divider, borderWidth: 1 }
                                ]}
                            >
                                <Ionicons
                                    name={icon as any}
                                    size={14}
                                    color={active ? theme.colors.button.primary.tint : theme.colors.textSecondary}
                                    style={{ marginRight: 5 }}
                                />
                                <Text style={[stylesheet.filterChipText, { color: active ? theme.colors.button.primary.tint : theme.colors.textSecondary }]}>
                                    {label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </ScrollView>

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
                {!isLegionTab && !showDeployedList ? (
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
                {!isLegionTab && !showDeployedList && (
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingBottom: 8 }}>
                        <Pressable
                            onPress={() => setSortMode((prev) => prev === 'default' ? 'rank' : 'default')}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 4,
                                paddingHorizontal: 10,
                                paddingVertical: 4,
                                borderRadius: 999,
                                backgroundColor: sortMode === 'rank' ? theme.colors.button.primary.background : theme.colors.surfaceHigh,
                            }}
                        >
                            <Ionicons
                                name="trophy-outline"
                                size={14}
                                color={sortMode === 'rank' ? theme.colors.button.primary.tint : theme.colors.textSecondary}
                            />
                            <Text style={{
                                fontSize: 12,
                                fontWeight: '600',
                                color: sortMode === 'rank' ? theme.colors.button.primary.tint : theme.colors.textSecondary,
                            }}>
                                Rank
                            </Text>
                        </Pressable>
                    </View>
                )}
            </View>

            {/* Content — Deployed Instances */}
            {showDeployedList ? (
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
                                    onPress={() => router.push({ pathname: '/agents/[id]', params: { id: agent.id } } as any)}
                                    onDelete={handleDeleteMyAgent}
                                    theme={theme}
                                />
                            ))}
                        </ScrollView>
                    )}
                    <FAB onPress={() => router.push('/agents/new' as any)} />
                </View>
            ) : (
                <View style={{ flex: 1 }}>
                    {loading && !loaded ? (
                        <View style={stylesheet.center}>
                            <ActivityIndicator color={theme.colors.textSecondary} />
                        </View>
                    ) : displayedGenomes.length === 0 && loaded ? (
                        <View style={stylesheet.center}>
                            <Ionicons
                                name={isLegionTab ? 'layers-outline' : 'cube-outline'}
                                size={48}
                                color={theme.colors.textSecondary}
                                style={{ marginBottom: 12 }}
                            />
                            <Text style={[stylesheet.emptyTitle, { color: theme.colors.text }]}>
                                {emptyState.title}
                            </Text>
                            <Text style={[stylesheet.emptyHint, { color: theme.colors.textSecondary }]}>
                                {emptyState.hint}
                            </Text>
                        </View>
                    ) : (
                        <ScrollView
                            style={stylesheet.list}
                            contentContainerStyle={stylesheet.listContent}
                            showsVerticalScrollIndicator={true}
                        >
                            {loading ? <ActivityIndicator color={theme.colors.textSecondary} style={{ marginBottom: 12 }} /> : null}
                            {favoriteGenomes.length > 0 && sourceFilter !== 'favorites' ? (
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
                            <View style={stylesheet.cardGrid}>
                                {isLegionTab
                                    ? displayedGenomes.map(g => (
                                        <CorpsCardMemo
                                            key={g.id}
                                            genome={g}
                                            isFavorited={isFavoriteGenomeId(g.id, favoriteGenomeIds)}
                                            onToggleFavorite={handleToggleFavorite}
                                            onPress={() => router.push({ pathname: '/agents/[id]', params: { id: g.id } } as any)}
                                            onRunStandalone={() => { setActiveGenome(g); setRunModal(true); }}
                                        />
                                    ))
                                    : displayedGenomes.map(g => (
                                        <GenomeCardMemo
                                            key={g.id}
                                            genome={g}
                                            isFavorited={isFavoriteGenomeId(g.id, favoriteGenomeIds)}
                                            onToggleFavorite={handleToggleFavorite}
                                            onPress={() => router.push({ pathname: '/agents/[id]', params: { id: g.id } } as any)}
                                            onRunStandalone={() => { setActiveGenome(g); setRunModal(true); }}
                                            onJoinTeam={() => { setActiveGenome(g); setJoinModal(true); }}
                                        />
                                    ))
                                }
                            </View>
                        </ScrollView>
                    )}
                </View>
            )}
        </View>
    );

    return (
        <>
            <SidebarView mainPanel={mainPanel} />
            {runModal && activeGenome ? (
                getGenomeImageKind(activeGenome) === 'legion' ? (
                    <DeployCorpsModal
                        genome={activeGenome}
                        onClose={() => { setRunModal(false); setActiveGenome(null); }}
                        onSuccess={(teamId) => {
                            setRunModal(false);
                            setActiveGenome(null);
                            router.push(`/teams/${teamId}` as any);
                        }}
                    />
                ) : (
                    <RunStandaloneModal
                        genome={activeGenome}
                        onClose={() => { setRunModal(false); setActiveGenome(null); }}
                        onSuccess={() => {
                            setRunModal(false);
                            setActiveGenome(null);
                            if (tab === 'agents' && sourceFilter === 'deployed') {
                                loadMyAgents();
                            }
                        }}
                    />
                )
            ) : null}
            {joinModal && activeGenome ? (
                <JoinTeamModal
                    genome={activeGenome}
                    onClose={() => { setJoinModal(false); setActiveGenome(null); }}
                />
            ) : null}
            {showManualCorpsModal ? (
                <ManualCorpsBuilderModal
                    onClose={() => setShowManualCorpsModal(false)}
                    onSuccess={(teamId) => {
                        setShowManualCorpsModal(false);
                        router.push(`/teams/${teamId}` as any);
                    }}
                />
            ) : null}
        </>
    );
});

// ─── MyAgentRow ──────────────────────────────────────────────────────────────

interface MyAgentRowProps {
    agent: AgentRecord;
    onPress: () => void;
    onDelete: (agent: AgentRecord) => void;
    theme: any;
}

const MyAgentRow = React.memo(function MyAgentRow({ agent, onPress, onDelete, theme }: MyAgentRowProps) {
    const statusColor = agent.status === 'active' ? '#22c55e' : '#f59e0b';
    return (
        <Pressable onPress={onPress} style={[rowStyles.row, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.divider }]}>
            <View style={[rowStyles.statusDot, { backgroundColor: statusColor }]} />
            <View style={rowStyles.info}>
                <Text style={[rowStyles.name, { color: theme.colors.text }]} numberOfLines={1}>
                    {agent.displayName}
                </Text>
                <Text style={[rowStyles.meta, { color: theme.colors.textSecondary }]}>
                    {agent.runtimeType} · {agent.status}
                </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
            <Pressable onPress={() => onDelete(agent)} hitSlop={12} style={rowStyles.deleteBtn}>
                <Ionicons name="trash-outline" size={18} color={theme.colors.textSecondary} />
            </Pressable>
        </Pressable>
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
        marginBottom: 8,
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
    headerCreateButton: {
        minHeight: 36,
        paddingHorizontal: 12,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    headerCreateButtonText: {
        fontSize: 13,
        fontWeight: '700',
    },
    launchHintBanner: {
        borderRadius: 14,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    launchHintTitle: {
        fontSize: 14,
        fontWeight: '700',
    },
    launchHintBody: {
        fontSize: 12,
        lineHeight: 18,
    },
    tabBar: {
        flexDirection: 'row',
        borderRadius: 12,
        padding: 3,
        marginBottom: 4,
    },
    tabItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        borderRadius: 9,
    },
    tabText: {
        fontSize: 13,
        fontWeight: '600',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 40,
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
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 7,
        flexDirection: 'row',
        alignItems: 'center',
    },
    filterChipText: {
        fontSize: 12,
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
        padding: 14,
        gap: 14,
    },
    cardGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        alignItems: 'stretch',
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
        borderRadius: 14,
        borderWidth: StyleSheet.hairlineWidth,
        padding: 12,
        gap: 8,
        flexBasis: Platform.select({ web: '49%', default: '100%' }) as any,
        flexGrow: 1,
        minWidth: Platform.select({ web: 280, default: 0 }),
    },
    trustBadge: {
        borderRadius: 4,
        paddingHorizontal: 6,
        paddingVertical: 1,
    },
    specialTag: {
        borderRadius: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    corpsCard: {
        borderLeftWidth: 2,
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
        gap: 8,
    },
    cardTitleWrap: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap',
    },
    cardMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flex: 1,
    },
    namespaceBadge: {
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    namespaceText: {
        fontSize: 10,
        fontWeight: '600',
        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    },
    categoryBadge: {
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    categoryText: {
        fontSize: 10,
        fontWeight: '500',
    },
    versionText: {
        fontSize: 10,
        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    },
    cardName: {
        fontSize: 15,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    cardDesc: {
        fontSize: 12,
        lineHeight: 17,
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
    cardMetaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 2,
    },
    metaBadge: {
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    metaBadgeText: {
        fontSize: 10,
        fontWeight: '500',
    },
    tagText: { fontSize: 11 },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
        minHeight: 24,
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
    // Small icon buttons in card header
    miniAction: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
}));
