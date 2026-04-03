import * as React from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Platform, TextInput } from 'react-native';
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
    fetchGenomeLedger,
    fetchGenomeSeed,
    fetchGenomeVersion,
    fetchGenomeVersions,
    getLegionMemberDisplayName,
    getLegionMemberReference,
    removeGenomeFavorite,
    parseAgentImage,
    parseAgentVerdict,
    parseTags,
    parseLegionImage,
    type AgentPlug,
    type DiffLedgerEntry,
    type GenomeRecord,
    type AgentImage,
    type AgentVerdict,
} from '@/utils/genomeHub';
import {
    describeGenomeLedgerEntry,
    describeGenomeDiffChange,
    getGenomeEnvDeclaration,
    getGenomeDiffChangeKindLabel,
    getAgentPlugChanges,
    getGenomeClosureState,
    getGenomeHookDisplay,
    getGenomeInlineFileEntries,
    getGenomeLedgerEntryKindLabel,
    getGenomeMcpServerList,
    getGenomeReplayAlignment,
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
import { Modal } from '@/modal';
import { sync } from '@/sync/sync';
import { useProfile, useSession, useSetting } from '@/sync/storage';
import { DeployCorpsModal } from './DeployCorpsModal';
import { RunStandaloneModal } from './RunStandaloneModal';
import { JoinTeamModal } from './JoinTeamModal';
import { getAgent, type AgentDetailRecord } from '@/sync/apiAgents';
import {
    fetchEntityTrials,
    fetchTrialVerdicts,
    forkGenome,
    rollbackGenome,
    submitUserVerdict,
    triggerEvolve,
    type EntityTrialRecord,
    type EntityVerdictRecord,
    type ManualEvolutionAction,
} from '@/sync/apiEvolution';
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

function formatStatusLabel(value: string): string {
    return value
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function getStatusTone(status: string): { text: string; bg: string } {
    if (status === 'established' || status === 'verified' || status === 'removed' || status === 'proven') {
        return { text: '#22c55e', bg: '#22c55e18' };
    }
    if (
        status === 'partial'
        || status === 'pending'
        || status === 'spawned'
        || status === 'tasks-migrated'
        || status === 'old-session-archived'
        || status === 'not-proven'
        || status === 'drift'
    ) {
        return { text: '#f59e0b', bg: '#f59e0b18' };
    }
    return { text: '#8A7F74', bg: '#8A7F7418' };
}

function parseVerdictDimensions(dimensions: string | null): Record<string, number> | null {
    if (!dimensions) {
        return null;
    }
    try {
        const parsed = JSON.parse(dimensions) as Record<string, number>;
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
        return null;
    }
}

function getManualActionLabel(action: ManualEvolutionAction): string {
    if (action === 'keep') return t('agents.actionKeep');
    if (action === 'keep_with_guardrails') return t('agents.actionGuardrails');
    if (action === 'mutate') return t('agents.actionMutate');
    return t('agents.actionDiscard');
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
    const professionalMode = useSetting('professionalMode');
    const actorId = profile.id || null;
    const credentials = sync.getCredentials();
    const authToken = credentials?.token ?? null;
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
    const [ledgerEntries, setLedgerEntries] = React.useState<DiffLedgerEntry[]>([]);
    const [seedSpec, setSeedSpec] = React.useState<string | null>(null);
    const [replayedSpec, setReplayedSpec] = React.useState<string | null>(null);
    const [historyLoading, setHistoryLoading] = React.useState(false);
    const [refreshNonce, setRefreshNonce] = React.useState(0);
    const [trials, setTrials] = React.useState<EntityTrialRecord[]>([]);
    const [verdictsByTrial, setVerdictsByTrial] = React.useState<Record<string, EntityVerdictRecord[]>>({});
    const [evidenceLoading, setEvidenceLoading] = React.useState(false);
    const [versionHistory, setVersionHistory] = React.useState<GenomeRecord[]>([]);
    const [versionsLoading, setVersionsLoading] = React.useState(false);
    const [verdictScore, setVerdictScore] = React.useState(4);
    const [verdictAction, setVerdictAction] = React.useState<ManualEvolutionAction>('keep');
    const [verdictText, setVerdictText] = React.useState('');
    const [verdictSubmitting, setVerdictSubmitting] = React.useState(false);
    const [evolveNote, setEvolveNote] = React.useState('');
    const [evolveSubmitting, setEvolveSubmitting] = React.useState(false);
    const [forkNamespace, setForkNamespace] = React.useState('');
    const [forkName, setForkName] = React.useState('');
    const [forkSubmitting, setForkSubmitting] = React.useState(false);
    const [rollbackVersion, setRollbackVersion] = React.useState<number | null>(null);

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
    }, [id, refreshNonce]);

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
    const hasEvolutionTarget = Boolean(templateGenome?.id && templateGenome?.namespace && templateGenome?.name);
    const refreshDetail = React.useCallback(() => {
        setRefreshNonce((current) => current + 1);
    }, []);

    React.useEffect(() => {
        if (!templateGenome?.id || !templateGenome.namespace || !templateGenome.name) {
            setTrials([]);
            setVerdictsByTrial({});
            setEvidenceLoading(false);
            return;
        }
        if (!credentials) {
            setTrials([]);
            setVerdictsByTrial({});
            setEvidenceLoading(false);
            return;
        }

        let cancelled = false;
        setEvidenceLoading(true);

        fetchEntityTrials(credentials, templateGenome.id).then(async (nextTrials) => {
            if (cancelled) return;
            const sortedTrials = [...nextTrials].sort(
                (left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime(),
            );
            setTrials(sortedTrials);

            const recentTrials = sortedTrials.slice(0, 6);
            const verdictEntries = await Promise.all(
                recentTrials.map(async (trial) => {
                    const verdicts = await fetchTrialVerdicts(credentials, trial.id);
                    return [trial.id, verdicts] as const;
                }),
            );
            if (cancelled) return;
            setVerdictsByTrial(Object.fromEntries(verdictEntries));
            setEvidenceLoading(false);
        }).catch(() => {
            if (cancelled) return;
            setTrials([]);
            setVerdictsByTrial({});
            setEvidenceLoading(false);
        });

        return () => {
            cancelled = true;
        };
    }, [authToken, templateGenome?.id, templateGenome?.name, templateGenome?.namespace, refreshNonce]);

    React.useEffect(() => {
        if (!templateGenome?.namespace || !templateGenome?.name) {
            setVersionHistory([]);
            setVersionsLoading(false);
            return;
        }

        let cancelled = false;
        setVersionsLoading(true);
        fetchGenomeVersions(templateGenome.namespace, templateGenome.name).then((versions) => {
            if (cancelled) return;
            const sortedVersions = [...versions].sort((left, right) => right.version - left.version);
            setVersionHistory(sortedVersions);
            setVersionsLoading(false);
        }).catch(() => {
            if (cancelled) return;
            setVersionHistory([]);
            setVersionsLoading(false);
        });

        return () => {
            cancelled = true;
        };
    }, [templateGenome?.name, templateGenome?.namespace, refreshNonce]);

    React.useEffect(() => {
        if (!templateGenome) {
            setForkNamespace('');
            setForkName('');
            return;
        }

        const nextNamespace = templateGenome.namespace === '@official'
            ? '@public'
            : templateGenome.namespace ?? '@public';
        setForkNamespace(nextNamespace);
        setForkName(`${templateGenome.name}-fork`);
    }, [templateGenome?.id]);

    React.useEffect(() => {
        const namespace = templateGenome?.namespace;
        const name = templateGenome?.name;
        if (!namespace || !name) {
            setDiffs([]);
            setLedgerEntries([]);
            setSeedSpec(null);
            setReplayedSpec(null);
            setHistoryLoading(false);
            return;
        }

        let cancelled = false;
        setHistoryLoading(true);
        Promise.all([
            fetchAgentPlugs(namespace, name),
            fetchGenomeSeed(namespace, name),
            fetchGenomeLedger(namespace, name),
        ]).then(([nextDiffs, nextSeed, nextLedger]) => {
            if (cancelled) return;
            setDiffs(nextDiffs);
            setLedgerEntries(nextLedger.ledger);
            setSeedSpec(nextSeed);
            setReplayedSpec(nextLedger.replayedSpec);
            setHistoryLoading(false);
        }).catch(() => {
            if (cancelled) return;
            setDiffs([]);
            setLedgerEntries([]);
            setSeedSpec(null);
            setReplayedSpec(null);
            setHistoryLoading(false);
        });

        return () => {
            cancelled = true;
        };
    }, [templateGenome?.name, templateGenome?.namespace]);
    const replayAlignment = React.useMemo(
        () => getGenomeReplayAlignment(templateGenome?.spec, replayedSpec),
        [replayedSpec, templateGenome?.spec],
    );
    const closureState = React.useMemo(
        () => getGenomeClosureState({
            versionIdentity,
            diffs,
            ledger: ledgerEntries,
            replayAlignment,
            agentStatus: agentDetail?.status ?? null,
            sessionActive: standaloneSession?.active ?? null,
        }),
        [agentDetail?.status, diffs, ledgerEntries, replayAlignment, standaloneSession?.active, versionIdentity],
    );
    const hasEvolutionEvidence = historyLoading
        || Boolean(seedSpec)
        || Boolean(replayedSpec)
        || diffs.length > 0
        || ledgerEntries.length > 0;
    const hasProfessionalDetails = Boolean(
        agentDetail
        || spec?.protocol?.length
        || spec?.operations?.commonPatterns?.length
        || spec?.handoffProtocol?.length
        || spec?.operations?.recentChanges?.length
        || spec?.memory?.learnings?.length
        || spec?.memory?.iterationGuide
        || spec?.memory?.knowledgeBase?.length
        || hasEvolutionEvidence
        || formattedSpecJson
        || spec?.allowedTools?.length
        || spec?.disallowedTools?.length
        || hasAgentJsonKernelObservability
        || spec?.messaging
        || spec?.behavior
        || legionSpec?.members?.length
        || legionLayerFacts.length > 0
        || corpsTeamPrompt
    );
    const visibleTrials = React.useMemo(() => trials.slice(0, 6), [trials]);
    const latestVerdictId = React.useMemo(() => {
        for (const trial of visibleTrials) {
            const verdicts = verdictsByTrial[trial.id] ?? [];
            const sortedVerdicts = [...verdicts].sort(
                (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
            );
            if (sortedVerdicts[0]?.id) {
                return sortedVerdicts[0].id;
            }
        }
        return null;
    }, [verdictsByTrial, visibleTrials]);

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

    const handleSubmitVerdict = React.useCallback(async () => {
        const activeCredentials = sync.getCredentials();
        if (!activeCredentials) {
            await Modal.alert(t('common.error'), t('agents.signInToEvolve'));
            return;
        }
        if (!templateGenome?.id || !templateGenome.namespace || !templateGenome.name) {
            await Modal.alert(t('common.error'), t('agents.noEvolutionTarget'));
            return;
        }
        if (!verdictText.trim()) {
            await Modal.alert(t('common.error'), t('agents.verdictNotesRequired'));
            return;
        }
        if (verdictSubmitting) {
            return;
        }

        setVerdictSubmitting(true);
        try {
            const score = verdictScore * 20;
            await submitUserVerdict(activeCredentials, {
                namespace: templateGenome.namespace,
                name: templateGenome.name,
                entityId: templateGenome.id,
                sessionId: agentDetail?.sessionId ?? undefined,
                contextNarrative: `Manual kanban verdict for ${templateGenome.namespace}/${templateGenome.name}`,
                readerRole: actorId ? `user:${actorId}` : 'user',
                content: verdictText.trim(),
                score,
                action: verdictAction,
                dimensions: {
                    delivery: score,
                    integrity: score,
                    efficiency: score,
                    collaboration: score,
                    reliability: score,
                },
                materializeFeedback: true,
            });
            if (verdictAction === 'mutate' && !evolveNote.trim()) {
                setEvolveNote(verdictText.trim());
            }
            setVerdictText('');
            refreshDetail();
            await Modal.alert(t('common.success'), t('agents.userVerdictSaved'));
        } catch (error) {
            await Modal.alert(
                t('common.error'),
                error instanceof Error ? error.message : t('agents.userVerdictFailed'),
            );
        } finally {
            setVerdictSubmitting(false);
        }
    }, [
        actorId,
        agentDetail?.sessionId,
        evolveNote,
        refreshDetail,
        templateGenome,
        verdictAction,
        verdictScore,
        verdictSubmitting,
        verdictText,
    ]);

    const handleTriggerEvolve = React.useCallback(async () => {
        const activeCredentials = sync.getCredentials();
        if (!activeCredentials) {
            await Modal.alert(t('common.error'), t('agents.signInToEvolve'));
            return;
        }
        if (!templateGenome?.namespace || !templateGenome.name) {
            await Modal.alert(t('common.error'), t('agents.noEvolutionTarget'));
            return;
        }
        if (!evolveNote.trim()) {
            await Modal.alert(t('common.error'), t('agents.evolveNoteRequired'));
            return;
        }
        if (evolveSubmitting) {
            return;
        }

        setEvolveSubmitting(true);
        try {
            await triggerEvolve(activeCredentials, {
                namespace: templateGenome.namespace,
                name: templateGenome.name,
                description: `Manual evolve from kanban: ${evolveNote.trim().slice(0, 120)}`,
                verdictRefs: latestVerdictId ? [latestVerdictId] : undefined,
                strategy: 'moderate',
                authorRole: actorId ? `user:${actorId}` : 'user',
                changes: [
                    {
                        type: 'string',
                        path: 'memory.learnings',
                        op: 'append',
                        content: evolveNote.trim(),
                    },
                    {
                        type: 'narrative',
                        content: evolveNote.trim(),
                    },
                ],
            });
            setEvolveNote('');
            refreshDetail();
            await Modal.alert(t('common.success'), t('agents.manualEvolveSuccess'));
        } catch (error) {
            await Modal.alert(
                t('common.error'),
                error instanceof Error ? error.message : t('agents.manualEvolveFailed'),
            );
        } finally {
            setEvolveSubmitting(false);
        }
    }, [actorId, evolveNote, evolveSubmitting, latestVerdictId, refreshDetail, templateGenome?.name, templateGenome?.namespace]);

    const handleForkGenome = React.useCallback(async () => {
        const activeCredentials = sync.getCredentials();
        if (!activeCredentials) {
            await Modal.alert(t('common.error'), t('agents.signInToEvolve'));
            return;
        }
        if (!templateGenome?.id) {
            await Modal.alert(t('common.error'), t('agents.noEvolutionTarget'));
            return;
        }
        if (!forkNamespace.trim() || !forkName.trim()) {
            await Modal.alert(t('common.error'), t('agents.forkFieldsRequired'));
            return;
        }
        if (forkSubmitting) {
            return;
        }

        setForkSubmitting(true);
        try {
            const result = await forkGenome(activeCredentials, templateGenome.id, {
                namespace: forkNamespace.trim(),
                name: forkName.trim(),
                description: templateGenome.description,
                tags: templateGenome.tags,
                category: templateGenome.category,
                isPublic: false,
                publisherId: actorId,
            });
            await Modal.alert(t('common.success'), t('agents.forkSuccess'));
            router.push({ pathname: '/agents/[id]', params: { id: result.genome.id } } as any);
        } catch (error) {
            await Modal.alert(
                t('common.error'),
                error instanceof Error ? error.message : t('agents.forkFailed'),
            );
        } finally {
            setForkSubmitting(false);
        }
    }, [actorId, forkName, forkNamespace, forkSubmitting, router, templateGenome]);

    const handleRollbackVersion = React.useCallback(async (targetVersion: number) => {
        const activeCredentials = sync.getCredentials();
        if (!activeCredentials) {
            await Modal.alert(t('common.error'), t('agents.signInToEvolve'));
            return;
        }
        if (!templateGenome?.namespace || !templateGenome.name) {
            await Modal.alert(t('common.error'), t('agents.noEvolutionTarget'));
            return;
        }
        if (rollbackVersion != null) {
            return;
        }

        setRollbackVersion(targetVersion);
        try {
            const targetGenome = await fetchGenomeVersion(templateGenome.namespace, templateGenome.name, targetVersion);
            if (!targetGenome) {
                throw new Error(t('agents.rollbackSourceMissing'));
            }
            await rollbackGenome(activeCredentials, {
                namespace: templateGenome.namespace,
                name: templateGenome.name,
                targetVersion,
                currentSpec: templateGenome.spec,
                targetSpec: targetGenome.spec,
                verdictRefs: latestVerdictId ? [latestVerdictId] : undefined,
                authorRole: actorId ? `user:${actorId}` : 'user',
                authorSession: agentDetail?.sessionId ?? undefined,
            });
            refreshDetail();
            await Modal.alert(t('common.success'), t('agents.rollbackSuccess', { version: targetVersion }));
        } catch (error) {
            await Modal.alert(
                t('common.error'),
                error instanceof Error ? error.message : t('agents.rollbackFailed'),
            );
        } finally {
            setRollbackVersion(null);
        }
    }, [actorId, agentDetail?.sessionId, latestVerdictId, refreshDetail, rollbackVersion, templateGenome]);

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
                    {!professionalMode && hasProfessionalDetails ? (
                        <ItemGroup title={t('settingsAccount.professionalMode')}>
                            <Item
                                title={t('settingsAccount.professionalMode')}
                                subtitle={t('settingsAccount.professionalModeLocked')}
                                subtitleLines={0}
                                icon={<Ionicons name="options-outline" size={18} color="#5856D6" />}
                                onPress={() => router.push('/settings/account')}
                            />
                        </ItemGroup>
                    ) : null}

                    {hasEvolutionTarget ? (
                        <ItemGroup title={t('agents.evolutionControls')}>
                            <Item
                                title={t('agents.evolutionTarget')}
                                subtitle={`${templateGenome?.namespace}/${templateGenome?.name} · ${templateGenome?.id}`}
                                subtitleLines={0}
                            />
                            {!credentials ? (
                                <Item
                                    title={t('agents.signInToEvolve')}
                                    subtitle={t('agents.signInToEvolveHint')}
                                    subtitleLines={0}
                                    icon={<Ionicons name="log-in-outline" size={18} color={theme.colors.textSecondary} />}
                                />
                            ) : (
                                <>
                                    <View style={[styles.formCard, { backgroundColor: theme.colors.surfaceHigh, borderColor: theme.colors.divider }]}>
                                        <Text style={[styles.formCardTitle, { color: theme.colors.text }]}>
                                            {t('agents.userVerdictTitle')}
                                        </Text>
                                        <Text style={[styles.formCardHint, { color: theme.colors.textSecondary }]}>
                                            {t('agents.userVerdictHint')}
                                        </Text>
                                        <Text style={[styles.formLabel, { color: theme.colors.textSecondary }]}>
                                            {t('agents.verdictScoreLabel')}
                                        </Text>
                                        <View style={styles.choiceRow}>
                                            {[1, 2, 3, 4, 5].map((score) => {
                                                const active = verdictScore === score;
                                                return (
                                                    <Pressable
                                                        key={`score-${score}`}
                                                        onPress={() => setVerdictScore(score)}
                                                        style={[
                                                            styles.choiceChip,
                                                            {
                                                                borderColor: active ? theme.colors.button.primary.background : theme.colors.divider,
                                                                backgroundColor: active ? theme.colors.groupped.background : theme.colors.surface,
                                                            },
                                                        ]}
                                                    >
                                                        <Text style={[styles.choiceChipText, { color: active ? theme.colors.button.primary.background : theme.colors.text }]}>
                                                            {score}
                                                        </Text>
                                                    </Pressable>
                                                );
                                            })}
                                        </View>
                                        <Text style={[styles.formLabel, { color: theme.colors.textSecondary }]}>
                                            {t('agents.verdictActionLabel')}
                                        </Text>
                                        <View style={styles.choiceRow}>
                                            {(['keep', 'keep_with_guardrails', 'mutate', 'discard'] as ManualEvolutionAction[]).map((action) => {
                                                const active = verdictAction === action;
                                                return (
                                                    <Pressable
                                                        key={action}
                                                        onPress={() => setVerdictAction(action)}
                                                        style={[
                                                            styles.choiceChip,
                                                            {
                                                                borderColor: active ? theme.colors.button.primary.background : theme.colors.divider,
                                                                backgroundColor: active ? theme.colors.groupped.background : theme.colors.surface,
                                                            },
                                                        ]}
                                                    >
                                                        <Text style={[styles.choiceChipText, { color: active ? theme.colors.button.primary.background : theme.colors.text }]}>
                                                            {getManualActionLabel(action)}
                                                        </Text>
                                                    </Pressable>
                                                );
                                            })}
                                        </View>
                                        <Text style={[styles.formLabel, { color: theme.colors.textSecondary }]}>
                                            {t('agents.verdictNotesLabel')}
                                        </Text>
                                        <TextInput
                                            style={[
                                                styles.multilineInput,
                                                {
                                                    color: theme.colors.text,
                                                    backgroundColor: theme.colors.surface,
                                                    borderColor: theme.colors.divider,
                                                },
                                                Platform.OS === 'web' && { outlineStyle: 'none' } as any,
                                            ]}
                                            value={verdictText}
                                            onChangeText={setVerdictText}
                                            multiline
                                            placeholder={t('agents.verdictNotesPlaceholder')}
                                            placeholderTextColor={theme.colors.input.placeholder}
                                            textAlignVertical="top"
                                        />
                                        <Pressable
                                            style={[styles.submitButton, { backgroundColor: theme.colors.button.primary.background }]}
                                            onPress={handleSubmitVerdict}
                                            disabled={verdictSubmitting}
                                        >
                                            {verdictSubmitting ? (
                                                <ActivityIndicator size="small" color={theme.colors.button.primary.tint} />
                                            ) : (
                                                <Text style={[styles.submitButtonText, { color: theme.colors.button.primary.tint }]}>
                                                    {t('agents.submitVerdict')}
                                                </Text>
                                            )}
                                        </Pressable>
                                    </View>

                                    <View style={[styles.formCard, { backgroundColor: theme.colors.surfaceHigh, borderColor: theme.colors.divider }]}>
                                        <Text style={[styles.formCardTitle, { color: theme.colors.text }]}>
                                            {t('agents.manualEvolveTitle')}
                                        </Text>
                                        <Text style={[styles.formCardHint, { color: theme.colors.textSecondary }]}>
                                            {t('agents.manualEvolveHint')}
                                        </Text>
                                        <TextInput
                                            style={[
                                                styles.multilineInput,
                                                {
                                                    color: theme.colors.text,
                                                    backgroundColor: theme.colors.surface,
                                                    borderColor: theme.colors.divider,
                                                },
                                                Platform.OS === 'web' && { outlineStyle: 'none' } as any,
                                            ]}
                                            value={evolveNote}
                                            onChangeText={setEvolveNote}
                                            multiline
                                            placeholder={t('agents.manualEvolvePlaceholder')}
                                            placeholderTextColor={theme.colors.input.placeholder}
                                            textAlignVertical="top"
                                        />
                                        <Pressable
                                            style={[styles.submitButton, { backgroundColor: theme.colors.button.primary.background }]}
                                            onPress={handleTriggerEvolve}
                                            disabled={evolveSubmitting}
                                        >
                                            {evolveSubmitting ? (
                                                <ActivityIndicator size="small" color={theme.colors.button.primary.tint} />
                                            ) : (
                                                <Text style={[styles.submitButtonText, { color: theme.colors.button.primary.tint }]}>
                                                    {t('agents.createEvolvedVersion')}
                                                </Text>
                                            )}
                                        </Pressable>
                                    </View>

                                    <View style={[styles.formCard, { backgroundColor: theme.colors.surfaceHigh, borderColor: theme.colors.divider }]}>
                                        <Text style={[styles.formCardTitle, { color: theme.colors.text }]}>
                                            {t('agents.forkTitle')}
                                        </Text>
                                        <View style={styles.formFieldStack}>
                                            <Text style={[styles.formLabel, { color: theme.colors.textSecondary }]}>
                                                {t('agents.forkNamespaceLabel')}
                                            </Text>
                                            <TextInput
                                                style={[
                                                    styles.textField,
                                                    {
                                                        color: theme.colors.text,
                                                        backgroundColor: theme.colors.surface,
                                                        borderColor: theme.colors.divider,
                                                    },
                                                    Platform.OS === 'web' && { outlineStyle: 'none' } as any,
                                                ]}
                                                value={forkNamespace}
                                                onChangeText={setForkNamespace}
                                                autoCapitalize="none"
                                                autoCorrect={false}
                                            />
                                        </View>
                                        <View style={styles.formFieldStack}>
                                            <Text style={[styles.formLabel, { color: theme.colors.textSecondary }]}>
                                                {t('agents.forkNameLabel')}
                                            </Text>
                                            <TextInput
                                                style={[
                                                    styles.textField,
                                                    {
                                                        color: theme.colors.text,
                                                        backgroundColor: theme.colors.surface,
                                                        borderColor: theme.colors.divider,
                                                    },
                                                    Platform.OS === 'web' && { outlineStyle: 'none' } as any,
                                                ]}
                                                value={forkName}
                                                onChangeText={setForkName}
                                                autoCapitalize="none"
                                                autoCorrect={false}
                                            />
                                        </View>
                                        <Pressable
                                            style={[styles.secondaryButton, { borderColor: theme.colors.divider, backgroundColor: theme.colors.surfaceHigh }]}
                                            onPress={handleForkGenome}
                                            disabled={forkSubmitting}
                                        >
                                            {forkSubmitting ? (
                                                <ActivityIndicator size="small" color={theme.colors.text} />
                                            ) : (
                                                <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>
                                                    {t('agents.forkCreate')}
                                                </Text>
                                            )}
                                        </Pressable>
                                    </View>

                                    <View style={[styles.formCard, { backgroundColor: theme.colors.surfaceHigh, borderColor: theme.colors.divider }]}>
                                        <Text style={[styles.formCardTitle, { color: theme.colors.text }]}>
                                            {t('agents.versionHistoryTitle')}
                                        </Text>
                                        {versionsLoading ? (
                                            <ActivityIndicator size="small" color={theme.colors.textSecondary} />
                                        ) : versionHistory.length === 0 ? (
                                            <Text style={[styles.formCardHint, { color: theme.colors.textSecondary }]}>
                                                {t('agents.noVersionHistory')}
                                            </Text>
                                        ) : (
                                            <View style={styles.versionList}>
                                                {versionHistory.slice(0, 6).map((version) => {
                                                    const current = version.version === templateGenome?.version;
                                                    const busy = rollbackVersion === version.version;
                                                    return (
                                                        <View
                                                            key={`${version.id}-${version.version}`}
                                                            style={[
                                                                styles.versionCard,
                                                                {
                                                                    backgroundColor: theme.colors.surface,
                                                                    borderColor: theme.colors.divider,
                                                                },
                                                            ]}
                                                        >
                                                            <View style={{ flex: 1 }}>
                                                                <Text style={[styles.versionCardTitle, { color: theme.colors.text }]}>
                                                                    v{version.version} {current ? `· ${t('agents.currentVersion')}` : ''}
                                                                </Text>
                                                                <Text style={[styles.versionCardMeta, { color: theme.colors.textSecondary }]}>
                                                                    {formatDate(version.createdAt)}
                                                                </Text>
                                                            </View>
                                                            {!current ? (
                                                                <Pressable
                                                                    style={[styles.rollbackButton, { borderColor: theme.colors.divider }]}
                                                                    onPress={() => handleRollbackVersion(version.version)}
                                                                    disabled={busy}
                                                                >
                                                                    {busy ? (
                                                                        <ActivityIndicator size="small" color={theme.colors.text} />
                                                                    ) : (
                                                                        <Text style={[styles.rollbackButtonText, { color: theme.colors.text }]}>
                                                                            {t('agents.rollbackAction')}
                                                                        </Text>
                                                                    )}
                                                                </Pressable>
                                                            ) : null}
                                                        </View>
                                                    );
                                                })}
                                            </View>
                                        )}
                                    </View>
                                </>
                            )}
                        </ItemGroup>
                    ) : null}

                    {professionalMode && agentDetail ? (
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
                    {professionalMode ? (
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
                    ) : null}

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
                    {professionalMode && spec?.protocol?.length ? (
                        <ItemGroup title={t('agents.protocolRules')}>
                            {spec.protocol.map((p, i) => (
                                <Item key={`p-${i}`} title={p} subtitle="" />
                            ))}
                        </ItemGroup>
                    ) : null}

                    {professionalMode && (spec?.operations?.commonPatterns?.length || spec?.handoffProtocol?.length || spec?.operations?.recentChanges?.length) ? (
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

                    {professionalMode && (spec?.memory?.learnings?.length || spec?.memory?.iterationGuide || spec?.memory?.knowledgeBase?.length) ? (
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

                    {professionalMode ? (
                        <ItemGroup title="Closure State">
                            <Item
                                title="Control-plane closure"
                                subtitle={`Diff chain ${diffs.length} · canonical ledger ${ledgerEntries.length} row${ledgerEntries.length === 1 ? '' : 's'}`}
                                subtitleLines={0}
                                detail={formatStatusLabel(closureState.controlPlaneClosure)}
                                detailStyle={{ color: getStatusTone(closureState.controlPlaneClosure).text, fontWeight: '700' }}
                                icon={<Ionicons name="git-branch-outline" size={18} color={getStatusTone(closureState.controlPlaneClosure).text} />}
                            />
                            <Item
                                title="Downstream closure"
                                subtitle={`Version identity ${versionIdentity.status} · canonical replay ${replayAlignment.status}`}
                                subtitleLines={0}
                                detail={formatStatusLabel(closureState.downstreamClosure)}
                                detailStyle={{ color: getStatusTone(closureState.downstreamClosure).text, fontWeight: '700' }}
                                icon={<Ionicons name="analytics-outline" size={18} color={getStatusTone(closureState.downstreamClosure).text} />}
                            />
                            <Item
                                title="Replace status"
                                subtitle={agentDetail
                                    ? `Agent ${agentDetail.status}${standaloneSession?.active != null ? ` · session ${standaloneSession.active ? 'active' : 'inactive'}` : ''}`
                                    : 'No live runtime is attached on this screen.'}
                                subtitleLines={0}
                                detail={formatStatusLabel(closureState.replaceStatus)}
                                detailStyle={{ color: getStatusTone(closureState.replaceStatus).text, fontWeight: '700' }}
                                icon={<Ionicons name="swap-horizontal-outline" size={18} color={getStatusTone(closureState.replaceStatus).text} />}
                            />
                            <Item
                                title="Roster exit"
                                subtitle="Requires replace/archive evidence from the team roster layer."
                                subtitleLines={0}
                                detail={formatStatusLabel(closureState.rosterExitStatus)}
                                detailStyle={{ color: getStatusTone(closureState.rosterExitStatus).text, fontWeight: '700' }}
                                icon={<Ionicons name="people-outline" size={18} color={getStatusTone(closureState.rosterExitStatus).text} />}
                            />
                            <Item
                                title="Behavior delta"
                                subtitle={evidenceLoading
                                    ? t('agents.evidenceLoading')
                                    : `${trials.length} trial${trials.length === 1 ? '' : 's'} · ${Object.values(verdictsByTrial).reduce((total, verdicts) => total + verdicts.length, 0)} verdict${Object.values(verdictsByTrial).reduce((total, verdicts) => total + verdicts.length, 0) === 1 ? '' : 's'}`
                                }
                                subtitleLines={0}
                                detail={formatStatusLabel(closureState.behaviorDeltaStatus)}
                                detailStyle={{ color: getStatusTone(closureState.behaviorDeltaStatus).text, fontWeight: '700' }}
                                icon={<Ionicons name="pulse-outline" size={18} color={getStatusTone(closureState.behaviorDeltaStatus).text} />}
                            />
                        </ItemGroup>
                    ) : null}

                    {professionalMode && hasEvolutionEvidence ? (
                        <ItemGroup title="Evolution Evidence">
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
                            {ledgerEntries.length > 0 ? (
                                <>
                                    <View style={styles.ledgerSection}>
                                        <Text style={[styles.ledgerSectionTitle, { color: theme.colors.textSecondary }]}>
                                            Canonical Ledger
                                        </Text>
                                        <Text style={[styles.ledgerMeta, { color: theme.colors.textSecondary }]}>
                                            Ordered atomic mutations replayed on top of the v1 seed.
                                        </Text>
                                    </View>
                                    {ledgerEntries.map((entry) => {
                                        const badgeTone = entry.diffType === 'narrative'
                                            ? { text: '#FF9500', bg: '#FF950018' }
                                            : entry.diffType === 'string'
                                                ? { text: '#34C759', bg: '#34C75918' }
                                                : { text: '#007AFF', bg: '#007AFF18' };
                                        return (
                                            <View
                                                key={entry.id}
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
                                                        v{entry.version} · #{entry.seqNo}
                                                    </Text>
                                                    <View style={[styles.ledgerBadge, { backgroundColor: badgeTone.bg }]}>
                                                        <Text style={[styles.ledgerBadgeText, { color: badgeTone.text }]}>
                                                            {getGenomeLedgerEntryKindLabel(entry)}
                                                        </Text>
                                                    </View>
                                                </View>
                                                <Text style={[styles.ledgerMeta, { color: theme.colors.textSecondary }]}>
                                                    {formatDate(entry.timestamp)}
                                                </Text>
                                                <Text style={[styles.ledgerChangeText, { color: theme.colors.textSecondary }]}>
                                                    {describeGenomeLedgerEntry(entry)}
                                                </Text>
                                            </View>
                                        );
                                    })}
                                </>
                            ) : null}
                            {replayedSpec ? (
                                <View style={styles.ledgerSection}>
                                    <Text style={[styles.ledgerSectionTitle, { color: theme.colors.textSecondary }]}>
                                        Replayed Spec
                                    </Text>
                                    <View style={[styles.badge, { backgroundColor: getStatusTone(replayAlignment.status).bg }]}>
                                        <Text style={[styles.badgeText, { color: getStatusTone(replayAlignment.status).text }]}>
                                            {formatStatusLabel(replayAlignment.status)}
                                        </Text>
                                    </View>
                                    <CodeView code={stringifyGenomeSpec(replayedSpec)} />
                                </View>
                            ) : null}
                            {diffs.length > 0 ? (
                                <View style={styles.ledgerSection}>
                                    <Text style={[styles.ledgerSectionTitle, { color: theme.colors.textSecondary }]}>
                                        Diff Chain Browser
                                    </Text>
                                    <Text style={[styles.ledgerMeta, { color: theme.colors.textSecondary }]}>
                                        High-level change batches submitted to genome-hub.
                                    </Text>
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

                    {professionalMode && formattedSpecJson ? (
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
                    {professionalMode && (spec?.allowedTools?.length || spec?.disallowedTools?.length) ? (
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
                    {professionalMode && hasAgentJsonKernelObservability ? (
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
                    {professionalMode && (spec?.messaging || spec?.behavior) ? (
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
                    {professionalMode && legionSpec?.members?.length ? (
                        <ItemGroup title="LegionImage Members">
                            {legionSpec.members.map((m, i) => (
                                <Item
                                    key={`m-${getLegionMemberReference(m) ?? getLegionMemberDisplayName(m)}-${i}`}
                                    title={getLegionMemberDisplayName(m)}
                                    subtitle={getLegionMemberReference(m) ?? undefined}
                                    detail={m.count && m.count > 1 ? `x${m.count}` : undefined}
                                    icon={<Ionicons name="person-outline" size={18} color={theme.colors.textSecondary} />}
                                />
                            ))}
                        </ItemGroup>
                    ) : null}

                    {professionalMode && legionLayerFacts.length > 0 ? (
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

                    {professionalMode && corpsTeamPrompt ? (
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

                    {hasEvolutionTarget && credentials ? (
                        <ItemGroup title={t('agents.evidenceTitle')}>
                            {evidenceLoading ? (
                                <Item
                                    title={t('agents.evidenceLoading')}
                                    icon={<ActivityIndicator size="small" color={theme.colors.textSecondary} />}
                                    showChevron={false}
                                />
                            ) : visibleTrials.length === 0 ? (
                                <Item
                                    title={t('agents.noEvidenceYet')}
                                    subtitle={t('agents.noEvidenceHint')}
                                    subtitleLines={0}
                                    showChevron={false}
                                />
                            ) : (
                                visibleTrials.map((trial) => {
                                    const verdicts = [...(verdictsByTrial[trial.id] ?? [])].sort(
                                        (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
                                    );
                                    return (
                                        <View
                                            key={trial.id}
                                            style={[
                                                styles.evidenceCard,
                                                {
                                                    backgroundColor: theme.colors.surfaceHigh,
                                                    borderColor: theme.colors.divider,
                                                },
                                            ]}
                                        >
                                            <View style={styles.evidenceHeader}>
                                                <Text style={[styles.evidenceTitle, { color: theme.colors.text }]}>
                                                    {t('agents.trialLabel', { version: trial.entityVersion })}
                                                </Text>
                                                <Text style={[styles.evidenceMeta, { color: theme.colors.textSecondary }]}>
                                                    {formatDate(trial.startedAt)}
                                                </Text>
                                            </View>
                                            {trial.sessionId ? (
                                                <Text style={[styles.evidenceMeta, { color: theme.colors.textSecondary }]}>
                                                    {t('agents.sessionLabel')}: {trial.sessionId}
                                                </Text>
                                            ) : null}
                                            {trial.contextNarrative ? (
                                                <Text style={[styles.evidenceBody, { color: theme.colors.textSecondary }]}>
                                                    {trial.contextNarrative}
                                                </Text>
                                            ) : null}
                                            <View style={styles.evidenceVerdictList}>
                                                {verdicts.length === 0 ? (
                                                    <Text style={[styles.evidenceMeta, { color: theme.colors.textSecondary }]}>
                                                        {t('agents.noVerdictsForTrial')}
                                                    </Text>
                                                ) : verdicts.map((verdict) => {
                                                    const dims = parseVerdictDimensions(verdict.dimensions);
                                                    return (
                                                        <View
                                                            key={verdict.id}
                                                            style={[
                                                                styles.verdictCard,
                                                                {
                                                                    backgroundColor: theme.colors.surface,
                                                                    borderColor: theme.colors.divider,
                                                                },
                                                            ]}
                                                        >
                                                            <View style={styles.evidenceHeader}>
                                                                <Text style={[styles.verdictTitle, { color: theme.colors.text }]}>
                                                                    {verdict.readerRole}
                                                                </Text>
                                                                <View style={styles.choiceRow}>
                                                                    {verdict.score != null ? (
                                                                        <View style={[styles.ledgerBadge, { backgroundColor: `${scoreColor(verdict.score)}18` }]}>
                                                                            <Text style={[styles.ledgerBadgeText, { color: scoreColor(verdict.score) }]}>
                                                                                {verdict.score}
                                                                            </Text>
                                                                        </View>
                                                                    ) : null}
                                                                    {verdict.action ? (
                                                                        <View style={[styles.ledgerBadge, { backgroundColor: theme.colors.surfaceHigh }]}>
                                                                            <Text style={[styles.ledgerBadgeText, { color: theme.colors.textSecondary }]}>
                                                                                {getManualActionLabel(verdict.action)}
                                                                            </Text>
                                                                        </View>
                                                                    ) : null}
                                                                </View>
                                                            </View>
                                                            <Text style={[styles.evidenceBody, { color: theme.colors.text }]}>
                                                                {verdict.content}
                                                            </Text>
                                                            {dims ? (
                                                                <Text style={[styles.evidenceMeta, { color: theme.colors.textSecondary }]}>
                                                                    {Object.entries(dims).map(([key, value]) => `${key}:${Math.round(value)}`).join(' · ')}
                                                                </Text>
                                                            ) : null}
                                                        </View>
                                                    );
                                                })}
                                            </View>
                                        </View>
                                    );
                                })
                            )}
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
    formCard: {
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        padding: 14,
        gap: 10,
    },
    formCardTitle: {
        fontSize: 15,
        fontWeight: '700',
    },
    formCardHint: {
        fontSize: 12,
        lineHeight: 18,
    },
    formLabel: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    formFieldStack: {
        gap: 6,
    },
    choiceRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    choiceChip: {
        minHeight: 34,
        minWidth: 34,
        paddingHorizontal: 12,
        borderRadius: 999,
        borderWidth: StyleSheet.hairlineWidth,
        alignItems: 'center',
        justifyContent: 'center',
    },
    choiceChipText: {
        fontSize: 12,
        fontWeight: '600',
    },
    textField: {
        minHeight: 42,
        borderRadius: 10,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
    },
    multilineInput: {
        minHeight: 108,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 14,
        lineHeight: 20,
    },
    submitButton: {
        minHeight: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    submitButtonText: {
        fontSize: 13,
        fontWeight: '700',
    },
    secondaryButton: {
        minHeight: 40,
        borderRadius: 10,
        borderWidth: StyleSheet.hairlineWidth,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    secondaryButtonText: {
        fontSize: 13,
        fontWeight: '600',
    },
    versionList: {
        gap: 8,
    },
    versionCard: {
        borderRadius: 10,
        borderWidth: StyleSheet.hairlineWidth,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    versionCardTitle: {
        fontSize: 13,
        fontWeight: '700',
    },
    versionCardMeta: {
        fontSize: 12,
        marginTop: 2,
    },
    rollbackButton: {
        minHeight: 34,
        borderRadius: 999,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rollbackButtonText: {
        fontSize: 12,
        fontWeight: '600',
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
    evidenceCard: {
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        padding: 14,
        gap: 8,
    },
    evidenceHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    evidenceTitle: {
        fontSize: 14,
        fontWeight: '700',
    },
    evidenceMeta: {
        fontSize: 12,
        lineHeight: 18,
    },
    evidenceBody: {
        fontSize: 13,
        lineHeight: 19,
    },
    evidenceVerdictList: {
        gap: 8,
        marginTop: 4,
    },
    verdictCard: {
        borderRadius: 10,
        borderWidth: StyleSheet.hairlineWidth,
        padding: 12,
        gap: 6,
    },
    verdictTitle: {
        fontSize: 13,
        fontWeight: '600',
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
