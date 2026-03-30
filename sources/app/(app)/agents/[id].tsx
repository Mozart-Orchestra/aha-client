import * as React from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import { ItemList } from '@/components/ui/ItemList';
import { ItemGroup } from '@/components/ui/ItemGroup';
import { Item } from '@/components/ui/Item';
import { CodeView } from '@/components/session/CodeView';
import { SidebarView } from '@/components/layout/SidebarView';
import { DesktopShellContext } from '@/components/layout/DesktopShellContext';
import { layout } from '@/utils/layout';
import { t } from '@/text';
import {
    addGenomeFavorite,
    fetchAgentPlugs,
    fetchGenomeById,
    fetchGenomeFavoriteStatus,
    fetchGenomeSeed,
    removeGenomeFavorite,
    parseAgentImage,
    parseAgentVerdict,
    parseTags,
    parseLegionImage,
    type AgentPlug,
    type GenomeRecord,
    type AgentImage,
    type AgentVerdict,
} from '@/utils/genomeHub';
import {
    describeGenomeDiffChange,
    getGenomeEnvDeclaration,
    getGenomeDiffChangeKindLabel,
    getAgentPlugChanges,
    getGenomeHookDisplay,
    getGenomeInlineFileEntries,
    getGenomeMcpServerList,
    getGenomeSkillEntries,
    getGenomeVersionIdentity,
    getGenomeWorkspaceConfig,
    stringifyGenomeSpec,
} from '@/utils/genomeObservability';
import {
    getGenomeImageKind,
    getGenomeImageLabel,
    getGenomeImageMirrorTitle,
    getGenomeImageSeedTitle,
    getGenomeImageSurfaceTitle,
    getLegionLayerFacts,
} from '@/utils/genomeImageSemantics';
import { fetchAccessibleGenomeById } from '@/utils/agentMarketplace';
import {
    loadFavoriteGenomeIdsFromStorage,
    toggleFavoriteGenomeIdInStorage,
} from '@/utils/favoriteGenomesStorage';
import { isFavoriteGenomeId } from '@/utils/favoriteGenomes';
import { sync } from '@/sync/sync';
import { useProfile, useSession } from '@/sync/storage';
import { DeployCorpsModal } from './DeployCorpsModal';
import { RunStandaloneModal } from './RunStandaloneModal';
import { JoinTeamModal } from './JoinTeamModal';
import { getAgent, type AgentDetailRecord } from '@/sync/apiAgents';
import { getStandaloneAgentStatusVisual } from '@/utils/standaloneAgentStatus';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getStatusColor(status: GenomeRecord['status']) {
    if (status === 'official') return { text: '#007AFF', bg: '#007AFF18' };
    if (status === 'verified') return { text: '#22c55e', bg: '#22c55e18' };
    if (status === 'unverified') return { text: '#f59e0b', bg: '#f59e0b18' };
    if (status === 'archived') return { text: '#6b7280', bg: '#6b728018' };
    return { text: '#8A7F74', bg: '#8A7F7418' };
}

function getStatusLabel(status: GenomeRecord['status']): string {
    if (status === 'official') return t('agents.official');
    if (status === 'verified') return t('agents.verified');
    if (status === 'unverified') return t('agents.unverified');
    if (status === 'archived') return t('agents.archived');
    return t('agents.draft');
}

function isSpecialGenome(tags: string[], genomeName: string): boolean {
    const normalizedTags = tags.map((tag) => tag.toLowerCase());
    const normalizedName = genomeName.toLowerCase();
    return normalizedTags.includes('special')
        || normalizedTags.includes('agent-builder')
        || normalizedName.includes('agent-builder');
}

function scoreColor(score: number): string {
    if (score >= 85) return '#22c55e';
    if (score >= 70) return '#f59e0b';
    return '#ef4444';
}

/** Compact horizontal score bar for Crowd Review dimensions */
function ScoreBar({ label, value, compact }: { label: string; value: number; compact?: boolean }) {
    const color = scoreColor(value);
    const height = compact ? 6 : 8;
    const fontSize = compact ? 11 : 12;
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize, width: compact ? 80 : 100, color: '#8A7F74' }} numberOfLines={1}>{label}</Text>
            <View style={{ flex: 1, height, backgroundColor: '#f0f0f0', borderRadius: height / 2, overflow: 'hidden' }}>
                <View style={{ width: `${Math.min(100, value)}%`, height, backgroundColor: color, borderRadius: height / 2 }} />
            </View>
            <Text style={{ fontSize, fontWeight: '600', color, width: 28, textAlign: 'right' }}>{value}</Text>
        </View>
    );
}

function formatLatestAction(action: AgentVerdict['latestAction']): string {
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

function splitPromptLines(text: string): string[] {
    return text
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
}

function formatDiffMeta(iso: string, authorRole?: string | null): string {
    const dateLabel = formatDate(iso);
    return authorRole ? `${dateLabel} · ${authorRole}` : dateLabel;
}

function parseAgentDetailSpec(agent: AgentDetailRecord | null): AgentImage | null {
    if (!agent) return null;

    const embeddedGenome = agent.genome as { spec?: string } | null | undefined;
    if (embeddedGenome?.spec && typeof embeddedGenome.spec === 'string') {
        return parseAgentImage(embeddedGenome.spec);
    }

    if (agent.genomeSpec && typeof agent.genomeSpec === 'object') {
        return agent.genomeSpec as AgentImage;
    }

    return null;
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default React.memo(function AgentDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { theme } = useUnistyles();
    const profile = useProfile();
    const actorId = profile.id || null;
    const desktopShell = React.useContext(DesktopShellContext);

    const [genome, setGenome] = React.useState<GenomeRecord | null>(null);
    const [agentDetail, setAgentDetail] = React.useState<AgentDetailRecord | null>(null);
    const [linkedGenome, setLinkedGenome] = React.useState<GenomeRecord | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [favoriteIds, setFavoriteIds] = React.useState<string[]>(() => loadFavoriteGenomeIdsFromStorage());
    const [serverFavorited, setServerFavorited] = React.useState(false);
    const [favoriteLoading, setFavoriteLoading] = React.useState(false);
    const [showRunStandalone, setShowRunStandalone] = React.useState(false);
    const [showJoinTeam, setShowJoinTeam] = React.useState(false);
    const [diffs, setDiffs] = React.useState<AgentPlug[]>([]);
    const [seedSpec, setSeedSpec] = React.useState<string | null>(null);
    const [historyLoading, setHistoryLoading] = React.useState(false);

    React.useEffect(() => {
        if (!id) {
            setLoading(false);
            setGenome(null);
            setAgentDetail(null);
            setLinkedGenome(null);
            return;
        }
        let cancelled = false;
        setLoading(true);

        fetchAccessibleGenomeById(id, {
            credentials: sync.getCredentials(),
            fetchPublicGenomeById: fetchGenomeById,
        }).then(async (g) => {
            if (!cancelled) {
                if (g) {
                    setGenome(g);
                    setAgentDetail(null);
                    setLinkedGenome(null);
                    setLoading(false);
                    return;
                }

                const credentials = sync.getCredentials();
                const agent = credentials ? await getAgent(credentials, id) : null;
                if (!cancelled) {
                    setGenome(null);
                    setAgentDetail(agent);
                    setLinkedGenome(null);
                    setLoading(false);
                }

                if (!cancelled && credentials && agent?.genomeId) {
                    fetchAccessibleGenomeById(agent.genomeId, {
                        credentials,
                        fetchPublicGenomeById: fetchGenomeById,
                    }).then((resolvedGenome) => {
                        if (!cancelled) {
                            setLinkedGenome(resolvedGenome);
                        }
                    }).catch(() => {
                        if (!cancelled) {
                            setLinkedGenome(null);
                        }
                    });
                }
            }
        }).catch(() => {
            if (!cancelled) {
                setGenome(null);
                setAgentDetail(null);
                setLinkedGenome(null);
                setLoading(false);
            }
        });

        return () => { cancelled = true; };
    }, [id]);

    React.useEffect(() => {
        if (!genome) {
            setServerFavorited(false);
            return;
        }
        let cancelled = false;

        if (genome.isPublic && actorId) {
            fetchGenomeFavoriteStatus(genome.id, actorId).then((result) => {
                if (!cancelled) {
                    setServerFavorited(result?.isFavorited ?? false);
                }
            });
            return () => { cancelled = true; };
        }

        return () => { cancelled = true; };
    }, [actorId, genome]);

    const spec = React.useMemo(() => {
        if (genome) {
            return parseAgentImage(genome.spec);
        }
        return parseAgentDetailSpec(agentDetail);
    }, [agentDetail, genome]);
    const templateGenome = genome ?? linkedGenome;
    const versionIdentity = React.useMemo(
        () => getGenomeVersionIdentity(templateGenome, spec),
        [spec, templateGenome]
    );
    const formattedSpecJson = React.useMemo(() => {
        if (templateGenome?.spec) {
            return stringifyGenomeSpec(templateGenome.spec);
        }
        if (agentDetail?.genomeSpec) {
            try {
                return JSON.stringify(agentDetail.genomeSpec, null, 2);
            } catch {
                return String(agentDetail.genomeSpec);
            }
        }
        return null;
    }, [agentDetail?.genomeSpec, templateGenome?.spec]);
    const workspaceConfig = React.useMemo(() => getGenomeWorkspaceConfig(spec), [spec]);
    const envDeclaration = React.useMemo(() => getGenomeEnvDeclaration(spec), [spec]);
    const inlineFiles = React.useMemo(() => getGenomeInlineFileEntries(spec), [spec]);
    const observedSkills = React.useMemo(() => getGenomeSkillEntries(spec), [spec]);
    const observedMcpServers = React.useMemo(() => getGenomeMcpServerList(spec), [spec]);
    const hookDisplay = React.useMemo(
        () => getGenomeHookDisplay(spec, templateGenome?.namespace ?? null),
        [spec, templateGenome?.namespace],
    );
    const feedback = React.useMemo(() => templateGenome ? parseAgentVerdict(templateGenome.feedbackData) : null, [templateGenome]);
    const tags = React.useMemo(() => templateGenome ? parseTags(templateGenome.tags) : [], [templateGenome]);
    const isSpecialTemplate = React.useMemo(
        () => templateGenome ? isSpecialGenome(tags, templateGenome.name) : false,
        [tags, templateGenome],
    );
    const legionSpec = React.useMemo(() => (
        templateGenome && (templateGenome.kind === 'legion' || templateGenome.category === 'corps')
            ? parseLegionImage(templateGenome.spec)
            : null
    ), [templateGenome]);
    const imageKind = React.useMemo(() => getGenomeImageKind(templateGenome), [templateGenome]);
    const imageLabel = React.useMemo(() => getGenomeImageLabel(imageKind), [imageKind]);
    const corpsTeamPrompt = React.useMemo(
        () => legionSpec?.bootContext?.teamDescription?.trim() ?? '',
        [legionSpec]
    );
    const corpsInitialObjective = React.useMemo(
        () => legionSpec?.bootContext?.initialObjective?.trim() ?? '',
        [legionSpec]
    );
    const corpsPromptLines = React.useMemo(() => splitPromptLines(corpsTeamPrompt), [corpsTeamPrompt]);
    const corpsPromptTitle = corpsPromptLines[0] ?? '';
    const corpsPromptBody = corpsPromptLines.slice(corpsPromptTitle ? 1 : 0);
    const legionLayerFacts = React.useMemo(() => getLegionLayerFacts(legionSpec), [legionSpec]);
    const standaloneSession = useSession(agentDetail?.sessionId ?? '');
    const storefrontRating = React.useMemo(() => {
        if (typeof feedback?.avgScore === 'number') {
            return feedback.avgScore;
        }
        if (typeof spec?.resume?.performanceRating === 'number') {
            return spec.resume.performanceRating;
        }
        return null;
    }, [feedback?.avgScore, spec?.resume?.performanceRating]);
    const isTemplateDetail = !!genome;
    const isFav = genome
        ? (genome.isPublic && actorId ? serverFavorited : isFavoriteGenomeId(genome.id, favoriteIds))
        : false;
    const modelScores = React.useMemo(
        () => Object.entries(spec?.modelScores ?? {}).sort((left, right) => right[1] - left[1]),
        [spec?.modelScores]
    );
    const crowdReviewCount = feedback?.evaluationCount ?? spec?.resume?.totalSessions ?? null;
    const hasAgentJsonKernelObservability = Boolean(
        workspaceConfig
        || envDeclaration
        || observedMcpServers.length > 0
        || observedSkills.length > 0
        || inlineFiles.length > 0
        || hookDisplay.visibility !== 'absent'
    );
    const packageSurfaceIntro = imageKind === 'legion'
        ? 'authoring truth = team.json + team.norms.json · LegionImage remains the TypeScript compatibility projection'
        : 'authoring truth = agent.json · AgentImage remains the TypeScript compatibility projection';

    React.useEffect(() => {
        const namespace = templateGenome?.namespace;
        const name = templateGenome?.name;
        if (!namespace || !name) {
            setDiffs([]);
            setSeedSpec(null);
            setHistoryLoading(false);
            return;
        }

        let cancelled = false;
        setHistoryLoading(true);
        Promise.all([
            fetchAgentPlugs(namespace, name),
            fetchGenomeSeed(namespace, name),
        ]).then(([nextDiffs, nextSeed]) => {
            if (cancelled) return;
            setDiffs(nextDiffs);
            setSeedSpec(nextSeed);
            setHistoryLoading(false);
        }).catch(() => {
            if (cancelled) return;
            setDiffs([]);
            setSeedSpec(null);
            setHistoryLoading(false);
        });

        return () => {
            cancelled = true;
        };
    }, [templateGenome?.name, templateGenome?.namespace]);

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
        const loadingView = (
            <View style={[styles.center, { backgroundColor: theme.colors.groupped.background }]}>
                <ActivityIndicator color={theme.colors.textSecondary} />
            </View>
        );

        return (
            <>
                <Stack.Screen options={{ headerTitle: t('agents.title'), headerShown: !desktopShell }} />
                {desktopShell ? <SidebarView mainPanel={loadingView} /> : loadingView}
            </>
        );
    }

    if (!genome && !agentDetail) {
        const emptyView = (
            <View style={[styles.center, { backgroundColor: theme.colors.groupped.background }]}>
                <Ionicons name="alert-circle-outline" size={48} color={theme.colors.textSecondary} />
                <Text style={{ color: theme.colors.textSecondary, marginTop: 12, fontSize: 15 }}>
                    {t('agents.noResults')}
                </Text>
            </View>
        );

        return (
            <>
                <Stack.Screen options={{ headerTitle: t('agents.title'), headerShown: !desktopShell }} />
                {desktopShell ? <SidebarView mainPanel={emptyView} /> : emptyView}
            </>
        );
    }

    const status = genome ? getStatusColor(genome.status) : null;
    const isCorps = imageKind === 'legion' || legionSpec != null;
    const standaloneStatusColor = agentDetail?.status === 'active'
        ? '#22c55e'
        : agentDetail?.status === 'paused'
            ? '#f59e0b'
            : '#6b7280';
    const standalonePath = standaloneSession?.metadata?.path;
    const standaloneResolvedModel = standaloneSession?.metadata?.resolvedModel;
    const standaloneLiveStatus = agentDetail ? getStandaloneAgentStatusVisual(agentDetail, standaloneSession) : null;
    const standaloneLiveStatusLabel = standaloneLiveStatus
        ? standaloneLiveStatus.liveState === 'online'
            ? t('status.online')
            : standaloneLiveStatus.liveState === 'ended'
                ? t('status.ended')
                : t('status.offline')
        : null;

    const detailView = (
        <View style={{ flex: 1, backgroundColor: theme.colors.groupped.background }}>
            <ScrollView contentContainerStyle={[styles.scrollContent, { maxWidth: layout.maxWidth, alignSelf: 'center', width: '100%' }]}>

                {/* ── Header Card ── */}
                <View style={[styles.headerCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider }]}>
                    <View style={styles.headerRow}>
                        <View style={styles.badgeRow}>
                            {genome ? (
                                <View style={[styles.badge, { backgroundColor: theme.colors.surfaceHigh }]}>
                                    <Text style={[styles.badgeText, styles.mono, { color: theme.colors.textSecondary }]}>
                                        {genome.namespace ?? '@public'}
                                    </Text>
                                </View>
                            ) : (
                                <View style={[styles.badge, { backgroundColor: theme.colors.surfaceHigh }]}>
                                    <Text style={[styles.badgeText, { color: theme.colors.textSecondary }]}>
                                        Standalone Agent
                                    </Text>
                                </View>
                            )}
                            {genome && status ? (
                                <View style={[styles.badge, { backgroundColor: status.bg }]}>
                                    <Text style={[styles.badgeText, { color: status.text }]}>
                                        {getStatusLabel(genome.status)}
                                    </Text>
                                </View>
                            ) : null}
                            {genome && isSpecialTemplate ? (
                                <View style={[styles.badge, { backgroundColor: '#0EA5E914' }]}>
                                    <Text style={[styles.badgeText, { color: '#0EA5E9' }]}>
                                        SPECIAL
                                    </Text>
                                </View>
                            ) : null}
                            {agentDetail ? (
                                <View style={[styles.badge, { backgroundColor: `${standaloneStatusColor}18` }]}>
                                    <Text style={[styles.badgeText, { color: standaloneStatusColor }]}>
                                        {agentDetail.status}
                                    </Text>
                                </View>
                            ) : null}
                            {standaloneLiveStatus && standaloneLiveStatusLabel ? (
                                <View style={[styles.badge, { backgroundColor: `${standaloneLiveStatus.dotColor}18` }]}>
                                    <Text style={[styles.badgeText, { color: standaloneLiveStatus.dotColor }]}>
                                        {standaloneLiveStatusLabel}
                                    </Text>
                                </View>
                            ) : null}
                            {isCorps ? (
                                <View style={[styles.badge, { backgroundColor: '#FF950018' }]}>
                                    <Text style={[styles.badgeText, { color: '#FF9500' }]}>{imageLabel}</Text>
                                </View>
                            ) : null}
                            {!isCorps ? (
                                <View style={[styles.badge, { backgroundColor: '#007AFF18' }]}>
                                    <Text style={[styles.badgeText, { color: '#007AFF' }]}>{imageLabel}</Text>
                                </View>
                            ) : null}
                            {spec?.runtimeType ? (
                                <View style={[styles.badge, { backgroundColor: theme.colors.surfaceHigh }]}>
                                    <Text style={[styles.badgeText, { color: theme.colors.textSecondary }]}>
                                        {spec.runtimeType}
                                    </Text>
                                </View>
                            ) : null}
                            {versionIdentity.displayVersion != null ? (
                                <Text style={[styles.versionText, { color: theme.colors.textSecondary }]}>
                                    {t('agents.versionLabel', { version: versionIdentity.displayVersion })}
                                </Text>
                            ) : null}
                            {versionIdentity.mismatch ? (
                                <View style={[styles.badge, { backgroundColor: '#FF950018' }]}>
                                    <Text style={[styles.badgeText, { color: '#FF9500' }]}>
                                        Legacy spec v{versionIdentity.specVersion}
                                    </Text>
                                </View>
                            ) : null}
                        </View>
                        {genome ? (
                            <Pressable onPress={toggleFavorite} hitSlop={12} disabled={favoriteLoading}>
                                <Ionicons
                                    name={isFav ? 'star' : 'star-outline'}
                                    size={22}
                                    color={isFav ? '#FFB547' : theme.colors.textSecondary}
                                />
                            </Pressable>
                        ) : (
                            <Pressable onPress={() => agentDetail?.sessionId ? router.push(`/session/${agentDetail.sessionId}` as any) : undefined} hitSlop={12}>
                                <Ionicons
                                    name="open-outline"
                                    size={22}
                                    color={agentDetail?.sessionId ? theme.colors.textSecondary : theme.colors.divider}
                                />
                            </Pressable>
                        )}
                    </View>
                    <Text style={[styles.name, { color: theme.colors.text }]}>{genome?.name ?? agentDetail?.displayName}</Text>
                    {genome?.description ? (
                        <Text style={[styles.description, { color: theme.colors.textSecondary }]}>{genome.description}</Text>
                    ) : agentDetail?.metadata?.source ? (
                        <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
                            {`Source: ${String(agentDetail.metadata.source)}`}
                        </Text>
                    ) : null}

                    {isTemplateDetail ? (
                        <View style={styles.actionRow}>
                            <Pressable
                                style={[styles.primaryAction, { backgroundColor: theme.colors.button.primary.background }]}
                                onPress={() => setShowRunStandalone(true)}
                            >
                                <Ionicons name="play" size={14} color={theme.colors.button.primary.tint} style={{ marginRight: 6 }} />
                                <Text style={[styles.primaryActionText, { color: theme.colors.button.primary.tint }]}>
                                    {isCorps ? t('agents.deployCorps') : t('agents.runStandalone')}
                                </Text>
                            </Pressable>
                            {!isCorps ? (
                                <Pressable
                                    style={[styles.secondaryAction, { borderColor: theme.colors.divider, backgroundColor: theme.colors.surfaceHigh }]}
                                    onPress={() => setShowJoinTeam(true)}
                                >
                                    <Ionicons name="people-outline" size={14} color={theme.colors.text} style={{ marginRight: 6 }} />
                                    <Text style={[styles.secondaryActionText, { color: theme.colors.text }]}>
                                        {t('agents.joinTeamTitle')}
                                    </Text>
                                </Pressable>
                            ) : null}
                        </View>
                    ) : null}

                    {/* Spawn & score row */}
                    <View style={[styles.statsRow, { borderTopColor: theme.colors.divider }]}>
                        {genome ? (
                            <>
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
                            </>
                        ) : (
                            <>
                                <Ionicons name="radio-button-on-outline" size={14} color={standaloneStatusColor} />
                                <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                                    {agentDetail?.sessionId ? 'Running instance linked to session' : 'Standalone registry record'}
                                </Text>
                            </>
                        )}
                    </View>
                </View>

                <ItemList>
                    {agentDetail ? (
                        <ItemGroup title="Instance">
                            <Item title="Status" detail={agentDetail.status} />
                            {agentDetail.sessionId ? <Item title="Session ID" detail={agentDetail.sessionId} /> : null}
                            {agentDetail.sessionTag ? <Item title="Session Tag" detail={agentDetail.sessionTag} /> : null}
                            {agentDetail.memberId ? <Item title="Member ID" detail={agentDetail.memberId} /> : null}
                            {standaloneSession?.active != null ? (
                                <Item title="Session Active" detail={standaloneSession.active ? 'Yes' : 'No'} />
                            ) : null}
                            {agentDetail.runtimeType ? <Item title="Runtime" detail={agentDetail.runtimeType} /> : null}
                            {standaloneResolvedModel ? <Item title="Resolved Model" detail={standaloneResolvedModel} /> : null}
                            {standalonePath ? <Item title="Working Directory" subtitle={standalonePath} subtitleLines={0} /> : null}
                            {standaloneSession?.metadata?.machineId ? <Item title="Machine ID" detail={standaloneSession.metadata.machineId} /> : null}
                            {agentDetail.genomeId ? <Item title="Genome ID" detail={agentDetail.genomeId} /> : null}
                        </ItemGroup>
                    ) : null}

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
                        {versionIdentity.hubVersion != null ? <Item title="Canonical Version" detail={`v${versionIdentity.hubVersion}`} /> : null}
                        {versionIdentity.hubVersion == null && versionIdentity.specVersion != null ? <Item title="Spec Snapshot Version" detail={`v${versionIdentity.specVersion}`} /> : null}
                        {versionIdentity.mismatch ? (
                            <Item
                                title="Legacy Embedded Version"
                                subtitle={`Embedded spec still reports v${versionIdentity.specVersion}; canonical runtime identity is entity version v${versionIdentity.hubVersion}.`}
                                detail={`v${versionIdentity.specVersion}`}
                                detailStyle={{ color: '#FF9500', fontWeight: '700' }}
                                showChevron={false}
                            />
                        ) : versionIdentity.hubVersion != null ? (
                            <Item
                                title="Version Source"
                                subtitle="Runtime version is sourced from the genome entity row."
                                detail="Entity"
                                detailStyle={{ color: '#22c55e', fontWeight: '700' }}
                                showChevron={false}
                            />
                        ) : null}
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

                    {(historyLoading || seedSpec || diffs.length > 0) ? (
                        <ItemGroup title="view-diff · Evolution Ledger">
                            {historyLoading ? (
                                <Item
                                    title="Loading evolution history…"
                                    icon={<ActivityIndicator size="small" color={theme.colors.textSecondary} />}
                                    showChevron={false}
                                />
                            ) : null}
                            {seedSpec ? (
                                <View style={styles.ledgerSection}>
                                    <Text style={[styles.ledgerSectionTitle, { color: theme.colors.textSecondary }]}>
                                        {getGenomeImageSeedTitle(imageKind)}
                                    </Text>
                                    <CodeView code={stringifyGenomeSpec(seedSpec)} />
                                </View>
                            ) : null}
                            {diffs.map((diff) => {
                                let changes: ReturnType<typeof getAgentPlugChanges> = [];
                                let diffError: string | null = null;
                                try {
                                    changes = getAgentPlugChanges(diff);
                                } catch (error) {
                                    diffError = error instanceof Error ? error.message : 'Failed to parse diff payload.';
                                }
                                return (
                                    <View
                                        key={diff.id}
                                        style={[
                                            styles.ledgerCard,
                                            {
                                                backgroundColor: theme.colors.surfaceHigh,
                                                borderColor: theme.colors.divider,
                                            },
                                        ]}
                                    >
                                        <View style={styles.ledgerHeader}>
                                            <Text style={[styles.ledgerVersion, { color: theme.colors.text }]}>
                                                v{diff.version}
                                            </Text>
                                            {diff.strategy ? (
                                                <View style={[styles.ledgerBadge, { backgroundColor: `${theme.colors.textLink}18` }]}>
                                                    <Text style={[styles.ledgerBadgeText, { color: theme.colors.textLink }]}>
                                                        {diff.strategy}
                                                    </Text>
                                                </View>
                                            ) : null}
                                        </View>
                                        <Text style={[styles.ledgerTitle, { color: theme.colors.text }]}>
                                            {diff.description}
                                        </Text>
                                        <Text style={[styles.ledgerMeta, { color: theme.colors.textSecondary }]}>
                                            {formatDiffMeta(diff.createdAt, diff.authorRole)}
                                        </Text>
                                        {diffError ? (
                                            <Text style={[styles.ledgerError, { color: theme.colors.textDestructive }]}>
                                                Invalid diff payload: {diffError}
                                            </Text>
                                        ) : changes.length > 0 ? (
                                            <View style={styles.ledgerChanges}>
                                                {changes.map((change, index) => (
                                                    <View key={`${diff.id}-${index}`} style={styles.ledgerChangeRow}>
                                                        <View
                                                            style={[
                                                                styles.ledgerBadge,
                                                                {
                                                                    backgroundColor: change.type === 'narrative'
                                                                        ? '#FF950018'
                                                                        : change.type === 'string'
                                                                            ? '#34C75918'
                                                                            : '#007AFF18',
                                                                },
                                                            ]}
                                                        >
                                                            <Text
                                                                style={[
                                                                    styles.ledgerBadgeText,
                                                                    {
                                                                        color: change.type === 'narrative'
                                                                            ? '#FF9500'
                                                                            : change.type === 'string'
                                                                                ? '#34C759'
                                                                                : '#007AFF',
                                                                    },
                                                                ]}
                                                            >
                                                                {getGenomeDiffChangeKindLabel(change)}
                                                            </Text>
                                                        </View>
                                                        <Text style={[styles.ledgerChangeText, { color: theme.colors.textSecondary }]}>
                                                            {describeGenomeDiffChange(change)}
                                                        </Text>
                                                    </View>
                                                ))}
                                            </View>
                                        ) : (
                                            <Text style={[styles.ledgerMeta, { color: theme.colors.textSecondary, marginTop: 8 }]}>
                                                No structured diff payload was recorded for this version.
                                            </Text>
                                        )}
                                    </View>
                                );
                            })}
                        </ItemGroup>
                    ) : null}

                    {formattedSpecJson ? (
                        <ItemGroup title={getGenomeImageMirrorTitle(imageKind)}>
                            <View style={styles.ledgerSection}>
                                <Text style={[styles.ledgerSectionTitle, { color: theme.colors.textSecondary }]}>
                                    Full {imageLabel} JSON
                                </Text>
                                <CodeView code={formattedSpecJson} />
                            </View>
                        </ItemGroup>
                    ) : null}

                    {/* ── Tools allow/deny ── */}
                    {(spec?.allowedTools?.length || spec?.disallowedTools?.length) ? (
                        <ItemGroup title={t('agents.toolsAndMcps')}>
                            {spec?.allowedTools?.length ? (
                                <Item title={t('agents.allowedTools')} subtitle={spec.allowedTools.join(', ')} subtitleLines={0} />
                            ) : null}
                            {spec?.disallowedTools?.length ? (
                                <Item title={t('agents.blockedTools')} subtitle={spec.disallowedTools.join(', ')} subtitleLines={0} />
                            ) : null}
                        </ItemGroup>
                    ) : null}

                    {/* ── agent.json kernel observability ── */}
                    {hasAgentJsonKernelObservability ? (
                        <ItemGroup title={getGenomeImageSurfaceTitle(imageKind)}>
                            <View style={styles.ledgerSection}>
                                <Text style={[styles.ledgerSectionTitle, { color: theme.colors.textSecondary }]}>
                                    {imageKind === 'legion' ? 'Portable composition package' : 'Portable runtime package'}
                                </Text>
                                <Text style={[styles.ledgerMeta, { color: theme.colors.textSecondary }]}>
                                    {packageSurfaceIntro}
                                </Text>
                            </View>

                            {workspaceConfig ? (
                                <Item
                                    title="Workspace"
                                    subtitle={[
                                        workspaceConfig.defaultMode ? `defaultMode: ${workspaceConfig.defaultMode}` : null,
                                        workspaceConfig.allowedModes.length > 0
                                            ? `allowedModes: ${workspaceConfig.allowedModes.join(', ')}`
                                            : null,
                                    ].filter(Boolean).join('\n')}
                                    subtitleLines={0}
                                    icon={<Ionicons name="folder-open-outline" size={18} color={theme.colors.textSecondary} />}
                                />
                            ) : null}

                            {envDeclaration ? (
                                <Item
                                    title="Env Contract"
                                    subtitle={[
                                        envDeclaration.required.length > 0
                                            ? `required: ${envDeclaration.required.join(', ')}`
                                            : 'required: —',
                                        envDeclaration.optional.length > 0
                                            ? `optional: ${envDeclaration.optional.join(', ')}`
                                            : 'optional: —',
                                        envDeclaration.secretsPolicy.length > 0
                                            ? `secretsPolicy: ${envDeclaration.secretsPolicy.join(', ')}`
                                            : null,
                                    ].filter(Boolean).join('\n')}
                                    subtitleLines={0}
                                    icon={<Ionicons name="key-outline" size={18} color={theme.colors.textSecondary} />}
                                />
                            ) : null}

                            {observedMcpServers.length > 0 ? (
                                <Item
                                    title={`MCP Servers (${observedMcpServers.length})`}
                                    subtitle={observedMcpServers.join('\n')}
                                    subtitleLines={0}
                                    icon={<Ionicons name="server-outline" size={18} color={theme.colors.textSecondary} />}
                                />
                            ) : null}

                            {observedSkills.length > 0 ? (
                                <View style={styles.ledgerSection}>
                                    <Text style={[styles.ledgerSectionTitle, { color: theme.colors.textSecondary }]}>
                                        Skills ({observedSkills.length})
                                    </Text>
                                    {observedSkills.map((skill) => (
                                        <View
                                            key={`${skill.name}-${skill.source}`}
                                            style={[
                                                styles.packageCard,
                                                { backgroundColor: theme.colors.surfaceHigh, borderColor: theme.colors.divider },
                                            ]}
                                        >
                                            <View style={styles.packageCardHeader}>
                                                <Text style={[styles.packageCardTitle, { color: theme.colors.text }]}>
                                                    {skill.name}
                                                </Text>
                                                <View
                                                    style={[
                                                        styles.ledgerBadge,
                                                        {
                                                            backgroundColor: skill.source === 'inline'
                                                                ? '#34C75918'
                                                                : '#007AFF18',
                                                        },
                                                    ]}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.ledgerBadgeText,
                                                            {
                                                                color: skill.source === 'inline' ? '#34C759' : '#007AFF',
                                                            },
                                                        ]}
                                                    >
                                                        {skill.source === 'inline' ? 'INLINE' : 'REF'}
                                                    </Text>
                                                </View>
                                            </View>
                                            <Text style={[styles.ledgerMeta, { color: theme.colors.textSecondary }]}>
                                                {skill.inlinePath ?? 'runtime-lib reference'}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            ) : null}

                            {hookDisplay.visibility === 'security-trimmed' ? (
                                <Item
                                    title="Hooks"
                                    subtitle="已安全裁剪 · only @official genomes expose hook commands in the UI."
                                    subtitleLines={0}
                                    icon={<Ionicons name="shield-checkmark-outline" size={18} color={theme.colors.textSecondary} />}
                                />
                            ) : null}

                            {hookDisplay.visibility === 'visible' ? (
                                <View style={styles.ledgerSection}>
                                    <Text style={[styles.ledgerSectionTitle, { color: theme.colors.textSecondary }]}>
                                        Hooks ({hookDisplay.entries.length})
                                    </Text>
                                    {hookDisplay.entries.map((entry, index) => (
                                        <Item
                                            key={`${entry.phase}-${entry.command}-${index}`}
                                            title={entry.description ?? entry.matcher ?? entry.phase}
                                            subtitle={[
                                                entry.matcher ? `${entry.phase} · ${entry.matcher}` : entry.phase,
                                                entry.command,
                                            ].join('\n')}
                                            subtitleLines={0}
                                            icon={<Ionicons name="code-slash-outline" size={18} color={theme.colors.textSecondary} />}
                                        />
                                    ))}
                                </View>
                            ) : null}

                            {inlineFiles.length > 0 ? (
                                <View style={styles.ledgerSection}>
                                    <Text style={[styles.ledgerSectionTitle, { color: theme.colors.textSecondary }]}>
                                        Inline Files ({inlineFiles.length})
                                    </Text>
                                    {inlineFiles.map((file) => (
                                        <View
                                            key={file.path}
                                            style={[
                                                styles.packageCard,
                                                { backgroundColor: theme.colors.surfaceHigh, borderColor: theme.colors.divider },
                                            ]}
                                        >
                                            <View style={styles.packageCardHeader}>
                                                <Text style={[styles.packageCardTitle, styles.mono, { color: theme.colors.text }]}>
                                                    {file.path}
                                                </Text>
                                                <View style={styles.packageBadges}>
                                                    {file.inlineSkillName ? (
                                                        <View style={[styles.ledgerBadge, { backgroundColor: '#34C75918' }]}>
                                                            <Text style={[styles.ledgerBadgeText, { color: '#34C759' }]}>
                                                                skill:{file.inlineSkillName}
                                                            </Text>
                                                        </View>
                                                    ) : null}
                                                    {file.truncated ? (
                                                        <View style={[styles.ledgerBadge, { backgroundColor: '#FF950018' }]}>
                                                            <Text style={[styles.ledgerBadgeText, { color: '#FF9500' }]}>
                                                                preview
                                                            </Text>
                                                        </View>
                                                    ) : null}
                                                </View>
                                            </View>
                                            <Text style={[styles.ledgerMeta, { color: theme.colors.textSecondary }]}>
                                                {file.lineCount} {file.lineCount === 1 ? 'line' : 'lines'}
                                                {file.truncated ? ' · preview truncated' : ''}
                                            </Text>
                                            <CodeView code={file.preview} />
                                        </View>
                                    ))}
                                </View>
                            ) : null}
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
                    {legionSpec?.members?.length ? (
                        <ItemGroup title="LegionImage Members">
                            {legionSpec.members.map((m, i) => (
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

                    {legionLayerFacts.length > 0 ? (
                        <ItemGroup title="LegionLayer · Coordination">
                            {legionLayerFacts.map((fact) => (
                                <Item
                                    key={`${fact.label}-${fact.value}`}
                                    title={fact.label}
                                    subtitle={fact.value}
                                    subtitleLines={0}
                                />
                            ))}
                        </ItemGroup>
                    ) : null}

                    {corpsTeamPrompt ? (
                        <ItemGroup title="LegionLayer · Boot Context">
                            <View style={[styles.promptShowcaseCard, { backgroundColor: theme.colors.surfaceHigh, borderColor: theme.colors.divider }]}>
                                <Text style={[styles.promptShowcaseEyebrow, { color: theme.colors.textSecondary }]}>
                                    Shared LegionLayer boot context
                                </Text>
                                <Text style={[styles.promptShowcaseTitle, { color: theme.colors.text }]}>
                                    {corpsPromptTitle || 'Legion boot prompt'}
                                </Text>
                                {corpsPromptBody.map((line, index) => (
                                    <Text key={`${line}-${index}`} style={[styles.promptShowcaseLine, { color: theme.colors.text }]}>
                                        {line}
                                    </Text>
                                ))}
                            </View>
                            {corpsInitialObjective ? (
                                <Item
                                    title={t('newTeam.teamGoalLabel')}
                                    subtitle={corpsInitialObjective}
                                    subtitleLines={0}
                                    copy={corpsInitialObjective}
                                />
                            ) : null}
                        </ItemGroup>
                    ) : null}

                    {/* ── Feedback ── */}
                    {feedback ? (
                        <ItemGroup title={t('agents.feedbackSection')}>
                            <Item title={t('agents.overallScore')} detail={String(feedback.avgScore)} detailStyle={{ color: scoreColor(feedback.avgScore), fontWeight: '700', fontSize: 17 }} />
                            <Item title={t('agents.evaluations', { count: feedback.evaluationCount })} />
                            <Item title={t('agents.latestVerdict')} detail={formatLatestAction(feedback.latestAction)} />
                            {feedback.sessionScore ? (
                                <View style={{ paddingHorizontal: 16, paddingVertical: 8, gap: 6 }}>
                                    <ScoreBar label={t('agents.taskCompletion')} value={feedback.sessionScore.taskCompletion} />
                                    <ScoreBar label={t('agents.codeQuality')} value={feedback.sessionScore.codeQuality} />
                                    <ScoreBar label={t('agents.collaborationScore')} value={feedback.sessionScore.collaboration} />
                                </View>
                            ) : null}
                            <View style={{ paddingHorizontal: 16, paddingVertical: 8, gap: 4 }}>
                                <Text style={{ fontSize: 11, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 2 }}>Dimensions</Text>
                                <ScoreBar label="Delivery" value={feedback.dimensions.delivery} compact />
                                <ScoreBar label="Integrity" value={feedback.dimensions.integrity} compact />
                                <ScoreBar label="Efficiency" value={feedback.dimensions.efficiency} compact />
                                <ScoreBar label="Collaboration" value={feedback.dimensions.collaboration} compact />
                                <ScoreBar label="Reliability" value={feedback.dimensions.reliability} compact />
                            </View>
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
                        <Item
                            title={t('agents.createdAt')}
                            detail={formatDate(
                                genome?.createdAt
                                    ?? new Date(agentDetail?.createdAt ?? Date.now()).toISOString()
                            )}
                        />
                        {genome?.publisherId ? <Item title={t('agents.publisher')} detail={genome.publisherId} /> : null}
                        {genome?.parentId ? <Item title="Parent Genome" detail={genome.parentId} /> : null}
                        {agentDetail?.metadata?.source ? <Item title="Source" detail={String(agentDetail.metadata.source)} /> : null}
                    </ItemGroup>
                </ItemList>
            </ScrollView>
            {showRunStandalone && genome ? (
                isCorps ? (
                    <DeployCorpsModal
                        genome={genome}
                        onClose={() => setShowRunStandalone(false)}
                        onSuccess={(teamId) => {
                            setShowRunStandalone(false);
                            router.push(`/teams/${teamId}` as any);
                        }}
                    />
                ) : (
                    <RunStandaloneModal
                        genome={genome}
                        onClose={() => setShowRunStandalone(false)}
                        onSuccess={() => setShowRunStandalone(false)}
                    />
                )
            ) : null}
            {showJoinTeam && genome ? (
                <JoinTeamModal
                    genome={genome}
                    onClose={() => setShowJoinTeam(false)}
                />
            ) : null}
        </View>
    );

    return (
        <>
            <Stack.Screen options={{ headerTitle: genome?.name ?? agentDetail?.displayName ?? t('agents.title'), headerShown: !desktopShell }} />
            {desktopShell ? <SidebarView mainPanel={detailView} /> : detailView}
        </>
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
    actionRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 12,
        flexWrap: 'wrap',
    },
    primaryAction: {
        minHeight: 38,
        borderRadius: 10,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
    },
    primaryActionText: {
        fontSize: 13,
        fontWeight: '600',
    },
    secondaryAction: {
        minHeight: 38,
        borderRadius: 10,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
    },
    secondaryActionText: {
        fontSize: 13,
        fontWeight: '500',
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
    ledgerSection: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 10,
    },
    ledgerSectionTitle: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    ledgerCard: {
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        padding: 14,
        gap: 8,
    },
    ledgerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    ledgerVersion: {
        fontSize: 15,
        fontWeight: '700',
    },
    ledgerTitle: {
        fontSize: 14,
        fontWeight: '600',
        lineHeight: 20,
    },
    ledgerMeta: {
        fontSize: 12,
        lineHeight: 18,
    },
    ledgerError: {
        fontSize: 12,
        lineHeight: 18,
        fontWeight: '600',
    },
    ledgerChanges: {
        gap: 8,
    },
    ledgerChangeRow: {
        gap: 6,
    },
    ledgerChangeText: {
        fontSize: 13,
        lineHeight: 19,
    },
    ledgerBadge: {
        alignSelf: 'flex-start',
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    ledgerBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    packageCard: {
        marginHorizontal: 16,
        marginVertical: 6,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        padding: 14,
        gap: 8,
    },
    packageCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    packageCardTitle: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
        lineHeight: 18,
    },
    packageBadges: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
    },
    promptShowcaseCard: {
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginHorizontal: 16,
        marginVertical: 12,
    },
    promptShowcaseEyebrow: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    promptShowcaseTitle: {
        fontSize: 16,
        fontWeight: '700',
        lineHeight: 22,
    },
    promptShowcaseLine: {
        fontSize: 13,
        lineHeight: 19,
        marginTop: 8,
    },
}));
