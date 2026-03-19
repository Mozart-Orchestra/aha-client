import * as React from 'react';
import {
    ActivityIndicator,
    Platform,
    Pressable,
    ScrollView,
    TextInput,
    View,
    useWindowDimensions,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Text } from '@/components/ui/StyledText';
import { SidebarView } from '@/components/layout/SidebarView';
import { layout } from '@/utils/layout';
import { DESKTOP_BREAKPOINT } from '@/navigation/navigationConfig';
import { t } from '@/text';
import { Modal } from '@/modal';
import { sync } from '@/sync/sync';
import { createAgent } from '@/sync/apiAgents';
import { createGenome, fetchGenomes, publishGenome, type Genome } from '@/sync/apiEvolution';
import { useArtifacts, useAllMachines, useSetting } from '@/sync/storage';
import { isMachineOnline } from '@/utils/machineUtils';
import { getKnownPathsForMachine, getRecentPathForMachine, updateRecentMachinePaths } from '@/utils/machinePaths';
import { buildAgentBuilderGenomeSpec, buildManualGenomeSpec, getTeamDerivedGenomes, slugifyAgentName, type ManualAgentCategory, type ManualAgentDraft, type ManualAgentRuntime, type ManualPermissionMode } from '@/utils/agentCreation';
import { parseSpec } from '@/utils/genomeHub';
import { trackAgentDeployed } from '@/track';
import { useEscapeAction } from '@/hooks/useEscapeAction';
import { goBackOrReturn } from '@/utils/returnNavigation';
import { randomUUID } from '@/utils/uuid';

type CreationMode = 'team' | 'manual' | 'chat';

const CATEGORY_OPTIONS: Array<{ value: ManualAgentCategory; label: string }> = [
    { value: 'coordination', label: t('agents.coordination') },
    { value: 'support', label: t('agents.support') },
    { value: 'execution', label: t('agents.execution') },
];

const RUNTIME_OPTIONS: Array<{ value: ManualAgentRuntime; label: string }> = [
    { value: 'claude', label: 'Claude Code' },
    { value: 'codex', label: 'Codex' },
];

const PERMISSION_OPTIONS: Array<{ value: ManualPermissionMode; label: string }> = [
    { value: 'default', label: 'Default' },
    { value: 'acceptEdits', label: 'Accept edits' },
    { value: 'bypassPermissions', label: 'Bypass' },
];

const DEFAULT_MANUAL_DRAFT: ManualAgentDraft = {
    displayName: '',
    description: '',
    category: 'execution',
    runtime: 'claude',
    roleId: 'builder',
    systemPrompt: '',
    responsibilities: '',
    capabilities: '',
    tags: '',
    modelId: '',
    permissionMode: 'acceptEdits',
};

function buildStandaloneSessionTag() {
    return `standalone:${randomUUID()}`;
}

function getTeamTitle(teamLookup: Map<string, string>, teamId: string | null | undefined): string {
    if (!teamId) {
        return 'Unknown team';
    }
    return teamLookup.get(teamId) || `Team ${teamId.slice(0, 8)}`;
}

function TeamGenomeCard({
    genome,
    teamTitle,
    isPublishing,
    onPublish,
}: {
    genome: Genome;
    teamTitle: string;
    isPublishing: boolean;
    onPublish: () => void;
}) {
    const { theme } = useUnistyles();
    const spec = React.useMemo(() => parseSpec(genome.spec), [genome.spec]);

    return (
        <View style={[styles.teamGenomeCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider }]}> 
            <View style={styles.teamGenomeHeader}>
                <View style={{ flex: 1, gap: 6 }}>
                    <Text style={[styles.teamGenomeName, { color: theme.colors.text }]} numberOfLines={1}>
                        {spec?.displayName || genome.name}
                    </Text>
                    <Text style={[styles.teamGenomeMeta, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                        {teamTitle}
                    </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: genome.isPublic ? '#22c55e14' : theme.colors.surfaceHigh }]}>
                    <Text style={[styles.statusBadgeText, { color: genome.isPublic ? '#22c55e' : theme.colors.textSecondary }]}>
                        {genome.isPublic ? 'Live' : 'Draft'}
                    </Text>
                </View>
            </View>

            {genome.description ? (
                <Text style={[styles.teamGenomeDescription, { color: theme.colors.textSecondary }]} numberOfLines={3}>
                    {genome.description}
                </Text>
            ) : null}

            <View style={styles.badgeRow}>
                {genome.category ? (
                    <View style={[styles.badge, { backgroundColor: theme.colors.surfaceHigh }]}> 
                        <Text style={[styles.badgeText, { color: theme.colors.textSecondary }]}>{genome.category}</Text>
                    </View>
                ) : null}
                {spec?.runtimeType ? (
                    <View style={[styles.badge, { backgroundColor: theme.colors.surfaceHigh }]}> 
                        <Text style={[styles.badgeText, { color: theme.colors.textSecondary }]}>{spec.runtimeType}</Text>
                    </View>
                ) : null}
                {spec?.baseRoleId ? (
                    <View style={[styles.badge, { backgroundColor: theme.colors.surfaceHigh }]}> 
                        <Text style={[styles.badgeText, { color: theme.colors.textSecondary }]}>{spec.baseRoleId}</Text>
                    </View>
                ) : null}
            </View>

            <View style={styles.teamGenomeFooter}>
                <Text style={[styles.teamGenomeMeta, { color: theme.colors.textSecondary }]}>
                    {genome.spawnCount} spawns
                </Text>
                <View style={{ flex: 1 }} />
                <Pressable
                    onPress={onPublish}
                    disabled={genome.isPublic || isPublishing}
                    style={[
                        styles.secondaryButton,
                        { borderColor: theme.colors.divider, backgroundColor: theme.colors.surface },
                        (genome.isPublic || isPublishing) && styles.disabledButton,
                    ]}
                >
                    {isPublishing ? (
                        <ActivityIndicator size="small" color={theme.colors.textSecondary} />
                    ) : (
                        <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}> 
                            {genome.isPublic ? 'Published' : 'Publish'}
                        </Text>
                    )}
                </Pressable>
            </View>
        </View>
    );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    const { theme } = useUnistyles();
    return <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>{children}</Text>;
}

function TextField({
    value,
    onChangeText,
    placeholder,
    multiline,
    autoFocus,
}: {
    value: string;
    onChangeText: (value: string) => void;
    placeholder?: string;
    multiline?: boolean;
    autoFocus?: boolean;
}) {
    const { theme } = useUnistyles();
    return (
        <TextInput
            style={[
                styles.textField,
                multiline ? styles.textArea : null,
                {
                    color: theme.colors.text,
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.divider,
                },
                Platform.OS === 'web' && { outlineStyle: 'none' } as any,
            ]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.input.placeholder}
            multiline={multiline}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus={autoFocus}
            textAlignVertical={multiline ? 'top' : 'center'}
        />
    );
}

export default React.memo(function NewAgentScreen() {
    const { theme } = useUnistyles();
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isDesktopShell = Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;
    const machines = useAllMachines();
    const recentMachinePaths = useSetting('recentMachinePaths');
    const artifacts = useArtifacts();

    const [mode, setMode] = React.useState<CreationMode>('team');
    const [saving, setSaving] = React.useState(false);
    const [manualDraft, setManualDraft] = React.useState<ManualAgentDraft>(DEFAULT_MANUAL_DRAFT);
    const [manualPublishNow, setManualPublishNow] = React.useState(true);
    const [builderName, setBuilderName] = React.useState('Agent Builder');
    const [builderBrief, setBuilderBrief] = React.useState('');
    const [builderRuntime, setBuilderRuntime] = React.useState<ManualAgentRuntime>('claude');
    const [selectedMachineId, setSelectedMachineId] = React.useState<string | null>(
        () => machines.find(isMachineOnline)?.id ?? null,
    );
    const [cwd, setCwd] = React.useState('');
    const [showPathDropdown, setShowPathDropdown] = React.useState(false);
    const [ownedGenomes, setOwnedGenomes] = React.useState<Genome[]>([]);
    const [loadingOwnedGenomes, setLoadingOwnedGenomes] = React.useState(true);
    const [publishingGenomeIds, setPublishingGenomeIds] = React.useState<string[]>([]);

    useEscapeAction(true, () => goBackOrReturn(router, '/agents'));

    React.useEffect(() => {
        setCwd(getRecentPathForMachine(selectedMachineId, recentMachinePaths));
    }, [recentMachinePaths, selectedMachineId]);

    const knownPaths = React.useMemo(
        () => getKnownPathsForMachine(selectedMachineId, recentMachinePaths),
        [recentMachinePaths, selectedMachineId],
    );

    const selectedMachine = machines.find((machine) => machine.id === selectedMachineId) ?? null;
    const canStartBuilder = !!selectedMachine && isMachineOnline(selectedMachine) && !!cwd.trim() && !!builderName.trim();

    const teamLookup = React.useMemo(() => {
        return new Map(
            artifacts
                .filter((artifact) => artifact.type === 'team')
                .map((artifact) => [artifact.id, artifact.title || t('teams.untitledTeam')] as const),
        );
    }, [artifacts]);

    const loadOwnedGenomes = React.useCallback(async () => {
        const credentials = sync.getCredentials();
        if (!credentials) {
            setOwnedGenomes([]);
            setLoadingOwnedGenomes(false);
            return;
        }

        setLoadingOwnedGenomes(true);
        try {
            const result = await fetchGenomes(credentials, { ownedOnly: true, limit: 200 });
            setOwnedGenomes(result.genomes);
        } catch {
            setOwnedGenomes([]);
        } finally {
            setLoadingOwnedGenomes(false);
        }
    }, []);

    React.useEffect(() => {
        void loadOwnedGenomes();
    }, [loadOwnedGenomes]);

    const teamGenomes = React.useMemo(() => {
        return getTeamDerivedGenomes(ownedGenomes).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    }, [ownedGenomes]);

    const publishableTeamGenomes = React.useMemo(
        () => teamGenomes.filter((genome) => !genome.isPublic),
        [teamGenomes],
    );

    const canCreateManual = React.useMemo(() => {
        return !!manualDraft.displayName.trim() && !!manualDraft.systemPrompt.trim();
    }, [manualDraft.displayName, manualDraft.systemPrompt]);

    const primaryActionLabel = mode === 'team'
        ? (publishableTeamGenomes.length > 1 ? 'Publish all' : 'Publish')
        : mode === 'manual'
            ? t('common.create')
            : 'Start';

    const canSubmit = mode === 'team'
        ? publishableTeamGenomes.length > 0
        : mode === 'manual'
            ? canCreateManual
            : canStartBuilder;

    const handlePublishSingleGenome = React.useCallback(async (genome: Genome) => {
        const credentials = sync.getCredentials();
        if (!credentials) {
            await Modal.alert(t('common.error'), 'Not authenticated');
            return;
        }

        setPublishingGenomeIds((current) => [...current, genome.id]);
        try {
            const response = await publishGenome(credentials, genome.id);
            setOwnedGenomes((current) => current.map((item) => item.id === genome.id ? response.genome : item));
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to publish genome';
            await Modal.alert(t('common.error'), message);
        } finally {
            setPublishingGenomeIds((current) => current.filter((id) => id !== genome.id));
        }
    }, []);

    const handlePublishAllTeamGenomes = React.useCallback(async () => {
        const credentials = sync.getCredentials();
        if (!credentials) {
            await Modal.alert(t('common.error'), 'Not authenticated');
            return;
        }
        if (publishableTeamGenomes.length === 0 || saving) {
            return;
        }

        setSaving(true);
        setPublishingGenomeIds(publishableTeamGenomes.map((genome) => genome.id));
        try {
            const published = await Promise.all(
                publishableTeamGenomes.map(async (genome) => {
                    const response = await publishGenome(credentials, genome.id);
                    return response.genome;
                }),
            );
            const publishedById = new Map(published.map((genome) => [genome.id, genome]));
            setOwnedGenomes((current) => current.map((genome) => publishedById.get(genome.id) || genome));
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to publish genomes';
            await Modal.alert(t('common.error'), message);
        } finally {
            setPublishingGenomeIds([]);
            setSaving(false);
        }
    }, [publishableTeamGenomes, saving]);

    const handleCreateManualAgent = React.useCallback(async () => {
        const credentials = sync.getCredentials();
        if (!credentials) {
            await Modal.alert(t('common.error'), 'Not authenticated');
            return;
        }
        if (!canCreateManual || saving) {
            return;
        }

        setSaving(true);
        try {
            const spec = buildManualGenomeSpec(manualDraft);
            const name = slugifyAgentName(manualDraft.displayName);
            const created = await createGenome(credentials, {
                name,
                description: manualDraft.description.trim() || undefined,
                spec: JSON.stringify(spec),
                tags: spec.tags && spec.tags.length > 0 ? JSON.stringify(spec.tags) : undefined,
                category: manualDraft.category,
                isPublic: false,
                status: 'draft',
                origin: 'manual',
            });

            let resolvedGenome = created.genome;
            if (manualPublishNow) {
                const published = await publishGenome(credentials, created.genome.id);
                resolvedGenome = published.genome;
            }

            setOwnedGenomes((current) => [resolvedGenome, ...current.filter((genome) => genome.id !== resolvedGenome.id)]);
            router.push({ pathname: '/agents/[id]', params: { id: resolvedGenome.id } } as any);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to create agent';
            await Modal.alert(t('common.error'), message);
        } finally {
            setSaving(false);
        }
    }, [canCreateManual, manualDraft, manualPublishNow, router, saving]);

    const handleStartBuilderChat = React.useCallback(async () => {
        const credentials = sync.getCredentials();
        if (!credentials) {
            await Modal.alert(t('common.error'), 'Not authenticated');
            return;
        }
        if (!canStartBuilder || saving || !selectedMachineId) {
            return;
        }

        setSaving(true);
        try {
            const sessionTag = buildStandaloneSessionTag();
            const builderSpec = buildAgentBuilderGenomeSpec({
                displayName: builderName.trim(),
                runtime: builderRuntime,
                brief: builderBrief,
            });
            const genomeName = `${slugifyAgentName(builderName)}-${randomUUID().slice(0, 8)}`;
            const createdGenome = await createGenome(credentials, {
                name: genomeName,
                description: builderSpec.description,
                spec: JSON.stringify(builderSpec),
                tags: builderSpec.tags && builderSpec.tags.length > 0 ? JSON.stringify(builderSpec.tags) : undefined,
                category: builderSpec.category,
                isPublic: false,
                status: 'draft',
                origin: 'manual',
            });

            const sessionId = await sync.spawnSessionOnMachine(selectedMachineId, {
                directory: cwd.trim(),
                agent: builderRuntime,
                sessionTag,
                role: builderSpec.baseRoleId ?? 'standalone',
                specId: createdGenome.genome.id,
                sessionName: builderName.trim(),
            });

            if (!sessionId) {
                throw new Error('Spawn returned no session ID');
            }

            const agent = await createAgent(credentials, {
                displayName: builderName.trim(),
                genomeId: createdGenome.genome.id,
                genomeSpec: builderSpec as Record<string, unknown>,
                runtimeType: builderRuntime,
                sessionId,
                sessionTag,
                metadata: {
                    source: 'agent_builder_chat',
                    deployMode: 'standalone',
                },
            });

            const updatedPaths = updateRecentMachinePaths(recentMachinePaths, selectedMachineId, cwd.trim());
            sync.applySettings({ recentMachinePaths: updatedPaths });
            setOwnedGenomes((current) => [createdGenome.genome, ...current.filter((genome) => genome.id !== createdGenome.genome.id)]);
            trackAgentDeployed(agent.id, {
                source: 'agent_builder_chat',
                runtime_type: builderRuntime,
                session_id: sessionId,
                agent_type: agent.type,
            });
            router.push({ pathname: '/session/[id]', params: { id: sessionId } } as any);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to start agent builder';
            await Modal.alert(t('common.error'), message);
        } finally {
            setSaving(false);
        }
    }, [builderBrief, builderName, builderRuntime, canStartBuilder, cwd, recentMachinePaths, router, saving, selectedMachineId]);

    const handlePrimaryAction = React.useCallback(async () => {
        if (mode === 'team') {
            await handlePublishAllTeamGenomes();
            return;
        }
        if (mode === 'manual') {
            await handleCreateManualAgent();
            return;
        }
        await handleStartBuilderChat();
    }, [handleCreateManualAgent, handlePublishAllTeamGenomes, handleStartBuilderChat, mode]);

    const renderModePicker = () => (
        <View style={styles.modeSection}>
            <SectionLabel>How do you want to create it?</SectionLabel>
            <View style={styles.modeGrid}>
                {[
                    {
                        key: 'team' as const,
                        icon: 'git-network-outline' as const,
                        title: 'Team -> Market',
                        subtitle: 'Publish agents already born inside teams.',
                    },
                    {
                        key: 'manual' as const,
                        icon: 'create-outline' as const,
                        title: 'Pure Manual',
                        subtitle: 'Fill the genome spec yourself field by field.',
                    },
                    {
                        key: 'chat' as const,
                        icon: 'chatbubbles-outline' as const,
                        title: 'Chat Builder',
                        subtitle: 'Launch a dedicated builder agent and design with chat.',
                    },
                ].map((item) => {
                    const active = mode === item.key;
                    return (
                        <Pressable
                            key={item.key}
                            onPress={() => setMode(item.key)}
                            style={[
                                styles.modeCard,
                                {
                                    borderColor: active ? theme.colors.button.primary.background : theme.colors.divider,
                                    backgroundColor: active ? theme.colors.groupped.background : theme.colors.surface,
                                },
                            ]}
                        >
                            <View style={[styles.modeIcon, { backgroundColor: active ? theme.colors.button.primary.background : theme.colors.surfaceHigh }]}> 
                                <Ionicons name={item.icon} size={18} color={active ? theme.colors.button.primary.tint : theme.colors.textSecondary} />
                            </View>
                            <Text style={[styles.modeTitle, { color: theme.colors.text }]}>{item.title}</Text>
                            <Text style={[styles.modeSubtitle, { color: theme.colors.textSecondary }]}>{item.subtitle}</Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );

    const renderTeamMode = () => (
        <View style={styles.sectionBlock}>
            <SectionLabel>Team-created agents</SectionLabel>
            <View style={[styles.callout, { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider }]}> 
                <Text style={[styles.calloutTitle, { color: theme.colors.text }]}>Ship team outputs into the marketplace</Text>
                <Text style={[styles.calloutBody, { color: theme.colors.textSecondary }]}>Any genome saved inside a team can be published here. Use Publish all to report every unpublished team agent at once.</Text>
            </View>
            {loadingOwnedGenomes ? (
                <View style={styles.centerState}>
                    <ActivityIndicator color={theme.colors.textSecondary} />
                </View>
            ) : teamGenomes.length === 0 ? (
                <View style={[styles.emptyState, { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider }]}> 
                    <Ionicons name="git-network-outline" size={28} color={theme.colors.textSecondary} />
                    <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No team genomes yet</Text>
                    <Text style={[styles.emptyHint, { color: theme.colors.textSecondary }]}>Once org-manager or a team agent saves a genome, it will show up here for publication.</Text>
                </View>
            ) : (
                <View style={styles.teamGenomeList}>
                    {teamGenomes.map((genome) => (
                        <TeamGenomeCard
                            key={genome.id}
                            genome={genome}
                            teamTitle={getTeamTitle(teamLookup, genome.teamId)}
                            isPublishing={publishingGenomeIds.includes(genome.id)}
                            onPublish={() => void handlePublishSingleGenome(genome)}
                        />
                    ))}
                </View>
            )}
        </View>
    );

    const renderManualMode = () => (
        <View style={styles.sectionBlock}>
            <SectionLabel>Manual genome</SectionLabel>
            <View style={[styles.callout, { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider }]}> 
                <Text style={[styles.calloutTitle, { color: theme.colors.text }]}>Author the reusable agent spec directly</Text>
                <Text style={[styles.calloutBody, { color: theme.colors.textSecondary }]}>This creates a reusable agent genome first. You can publish it immediately or keep it as a private draft.</Text>
            </View>

            <View style={styles.formGroup}>
                <SectionLabel>{t('agents.agentName')}</SectionLabel>
                <TextField
                    value={manualDraft.displayName}
                    onChangeText={(value) => setManualDraft((current) => ({ ...current, displayName: value }))}
                    placeholder={t('agents.agentNamePlaceholder')}
                    autoFocus
                />
            </View>

            <View style={styles.formGroup}>
                <SectionLabel>Description</SectionLabel>
                <TextField
                    value={manualDraft.description}
                    onChangeText={(value) => setManualDraft((current) => ({ ...current, description: value }))}
                    placeholder="What should this agent be great at?"
                    multiline
                />
            </View>

            <View style={styles.formGroup}>
                <SectionLabel>Category</SectionLabel>
                <View style={styles.chipRow}>
                    {CATEGORY_OPTIONS.map((option) => {
                        const active = manualDraft.category === option.value;
                        return (
                            <Pressable
                                key={option.value}
                                onPress={() => setManualDraft((current) => ({ ...current, category: option.value }))}
                                style={[
                                    styles.choiceChip,
                                    {
                                        borderColor: active ? theme.colors.button.primary.background : theme.colors.divider,
                                        backgroundColor: active ? theme.colors.button.primary.background : theme.colors.surface,
                                    },
                                ]}
                            >
                                <Text style={[styles.choiceChipText, { color: active ? theme.colors.button.primary.tint : theme.colors.text }]}>
                                    {option.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
            </View>

            <View style={styles.formGroup}>
                <SectionLabel>{t('agents.agentRuntime')}</SectionLabel>
                <View style={styles.chipRow}>
                    {RUNTIME_OPTIONS.map((option) => {
                        const active = manualDraft.runtime === option.value;
                        return (
                            <Pressable
                                key={option.value}
                                onPress={() => setManualDraft((current) => ({ ...current, runtime: option.value }))}
                                style={[
                                    styles.choiceChip,
                                    {
                                        borderColor: active ? theme.colors.button.primary.background : theme.colors.divider,
                                        backgroundColor: active ? theme.colors.button.primary.background : theme.colors.surface,
                                    },
                                ]}
                            >
                                <Text style={[styles.choiceChipText, { color: active ? theme.colors.button.primary.tint : theme.colors.text }]}>
                                    {option.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
            </View>

            <View style={styles.formGroup}>
                <SectionLabel>Role ID</SectionLabel>
                <TextField
                    value={manualDraft.roleId}
                    onChangeText={(value) => setManualDraft((current) => ({ ...current, roleId: value }))}
                    placeholder="builder"
                />
            </View>

            <View style={styles.formGroup}>
                <SectionLabel>System prompt</SectionLabel>
                <TextField
                    value={manualDraft.systemPrompt}
                    onChangeText={(value) => setManualDraft((current) => ({ ...current, systemPrompt: value }))}
                    placeholder="Describe how the agent should think, act, and decide."
                    multiline
                />
            </View>

            <View style={styles.formGroup}>
                <SectionLabel>Responsibilities</SectionLabel>
                <TextField
                    value={manualDraft.responsibilities}
                    onChangeText={(value) => setManualDraft((current) => ({ ...current, responsibilities: value }))}
                    placeholder="One item per line"
                    multiline
                />
            </View>

            <View style={styles.formGroup}>
                <SectionLabel>Capabilities</SectionLabel>
                <TextField
                    value={manualDraft.capabilities}
                    onChangeText={(value) => setManualDraft((current) => ({ ...current, capabilities: value }))}
                    placeholder="One item per line"
                    multiline
                />
            </View>

            <View style={styles.formGroup}>
                <SectionLabel>Tags</SectionLabel>
                <TextField
                    value={manualDraft.tags}
                    onChangeText={(value) => setManualDraft((current) => ({ ...current, tags: value }))}
                    placeholder="typescript, support, sales"
                />
            </View>

            <View style={styles.formRow}>
                <View style={[styles.formGroup, styles.formGroupHalf]}>
                    <SectionLabel>{t('agents.model')}</SectionLabel>
                    <TextField
                        value={manualDraft.modelId}
                        onChangeText={(value) => setManualDraft((current) => ({ ...current, modelId: value }))}
                        placeholder="Optional"
                    />
                </View>
                <View style={[styles.formGroup, styles.formGroupHalf]}>
                    <SectionLabel>{t('agents.permissionMode')}</SectionLabel>
                    <View style={styles.chipRow}>
                        {PERMISSION_OPTIONS.map((option) => {
                            const active = manualDraft.permissionMode === option.value;
                            return (
                                <Pressable
                                    key={option.value}
                                    onPress={() => setManualDraft((current) => ({ ...current, permissionMode: option.value }))}
                                    style={[
                                        styles.choiceChip,
                                        styles.compactChip,
                                        {
                                            borderColor: active ? theme.colors.button.primary.background : theme.colors.divider,
                                            backgroundColor: active ? theme.colors.button.primary.background : theme.colors.surface,
                                        },
                                    ]}
                                >
                                    <Text style={[styles.choiceChipText, { color: active ? theme.colors.button.primary.tint : theme.colors.text }]}>
                                        {option.label}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>
                </View>
            </View>

            <Pressable
                onPress={() => setManualPublishNow((value) => !value)}
                style={[styles.toggleRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider }]}
            >
                <View style={{ flex: 1, gap: 4 }}>
                    <Text style={[styles.toggleTitle, { color: theme.colors.text }]}>Publish to marketplace now</Text>
                    <Text style={[styles.toggleHint, { color: theme.colors.textSecondary }]}>Turn this on if the draft should appear in the public agent marketplace right away.</Text>
                </View>
                <View style={[
                    styles.toggleIndicator,
                    { backgroundColor: manualPublishNow ? theme.colors.button.primary.background : theme.colors.surfaceHigh },
                ]}>
                    <Ionicons name={manualPublishNow ? 'checkmark' : 'remove'} size={16} color={manualPublishNow ? theme.colors.button.primary.tint : theme.colors.textSecondary} />
                </View>
            </Pressable>
        </View>
    );

    const renderChatMode = () => (
        <View style={styles.sectionBlock}>
            <SectionLabel>Chat builder</SectionLabel>
            <View style={[styles.callout, { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider }]}> 
                <Text style={[styles.calloutTitle, { color: theme.colors.text }]}>Launch a dedicated creation agent</Text>
                <Text style={[styles.calloutBody, { color: theme.colors.textSecondary }]}>This starts a standalone builder session. You can talk with it, iterate on the genome, and have it create public or private agents for you.</Text>
            </View>

            <View style={styles.formGroup}>
                <SectionLabel>{t('agents.agentName')}</SectionLabel>
                <TextField
                    value={builderName}
                    onChangeText={setBuilderName}
                    placeholder="Agent Builder"
                    autoFocus
                />
            </View>

            <View style={styles.formGroup}>
                <SectionLabel>Creation brief</SectionLabel>
                <TextField
                    value={builderBrief}
                    onChangeText={setBuilderBrief}
                    placeholder="Example: Help me design customer support agents for a SaaS team."
                    multiline
                />
            </View>

            <View style={styles.formGroup}>
                <SectionLabel>{t('agents.agentRuntime')}</SectionLabel>
                <View style={styles.chipRow}>
                    {RUNTIME_OPTIONS.map((option) => {
                        const active = builderRuntime === option.value;
                        return (
                            <Pressable
                                key={option.value}
                                onPress={() => setBuilderRuntime(option.value)}
                                style={[
                                    styles.choiceChip,
                                    {
                                        borderColor: active ? theme.colors.button.primary.background : theme.colors.divider,
                                        backgroundColor: active ? theme.colors.button.primary.background : theme.colors.surface,
                                    },
                                ]}
                            >
                                <Text style={[styles.choiceChipText, { color: active ? theme.colors.button.primary.tint : theme.colors.text }]}>
                                    {option.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
            </View>

            <View style={styles.formGroup}>
                <SectionLabel>{t('agents.selectMachine')}</SectionLabel>
                {machines.length === 0 ? (
                    <Text style={[styles.inlineHint, { color: theme.colors.textSecondary }]}>{t('agents.noMachinesHint')}</Text>
                ) : (
                    <View style={styles.machineList}>
                        {machines.map((machine) => {
                            const online = isMachineOnline(machine);
                            const selected = machine.id === selectedMachineId;
                            return (
                                <Pressable
                                    key={machine.id}
                                    onPress={() => online ? setSelectedMachineId(machine.id) : undefined}
                                    style={[
                                        styles.machineChip,
                                        { borderColor: theme.colors.divider, backgroundColor: theme.colors.surface },
                                        selected && {
                                            borderColor: theme.colors.button.primary.background,
                                            backgroundColor: theme.colors.groupped.background,
                                        },
                                        !online && styles.machineChipDisabled,
                                    ]}
                                >
                                    <View style={[styles.statusDot, online ? styles.statusOnline : styles.statusOffline]} />
                                    <Text style={[styles.machineName, { color: theme.colors.text }]} numberOfLines={1}>
                                        {machine.metadata?.displayName ?? machine.metadata?.host ?? machine.id.slice(0, 8)}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>
                )}
            </View>

            <View style={styles.formGroup}>
                <SectionLabel>{t('agents.workingDirectory')}</SectionLabel>
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
                    value={cwd}
                    onChangeText={(value) => {
                        setCwd(value);
                        setShowPathDropdown(false);
                    }}
                    placeholder={t('agents.directoryPlaceholder')}
                    placeholderTextColor={theme.colors.input.placeholder}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
                {knownPaths.length > 0 ? (
                    <>
                        <Pressable
                            style={[styles.dropdownToggle, { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider }]}
                            onPress={() => setShowPathDropdown((current) => !current)}
                        >
                            <Text style={[styles.dropdownToggleText, { color: theme.colors.textSecondary }]}>Recent paths</Text>
                            <Ionicons name={showPathDropdown ? 'chevron-up' : 'chevron-down'} size={14} color={theme.colors.textSecondary} />
                        </Pressable>
                        {showPathDropdown ? (
                            <View style={[styles.dropdown, { borderColor: theme.colors.divider, backgroundColor: theme.colors.surface }]}> 
                                {knownPaths.map((path) => (
                                    <Pressable
                                        key={path}
                                        style={[styles.dropdownItem, { borderBottomColor: theme.colors.divider }]}
                                        onPress={() => {
                                            setCwd(path);
                                            setShowPathDropdown(false);
                                        }}
                                    >
                                        <Text style={[styles.dropdownItemText, { color: theme.colors.text }]} numberOfLines={1}>{path}</Text>
                                    </Pressable>
                                ))}
                            </View>
                        ) : null}
                    </>
                ) : null}
            </View>
        </View>
    );

    const formContent = (
        <View style={styles.formShell}>
            {renderModePicker()}
            {mode === 'team' ? renderTeamMode() : null}
            {mode === 'manual' ? renderManualMode() : null}
            {mode === 'chat' ? renderChatMode() : null}
        </View>
    );

    const desktopMainPanel = (
        <View style={styles.desktopPanel}>
            <View style={styles.desktopHeader}>
                <View style={styles.desktopHeaderCopy}>
                    <Text style={styles.desktopEyebrow}>Agents</Text>
                    <Text style={styles.desktopTitle}>{t('agents.createAgent')}</Text>
                    <Text style={styles.desktopSubtitle}>Create reusable agents in three ways: publish team outputs, author by hand, or launch a chat builder.</Text>
                </View>
                <Pressable
                    onPress={() => void handlePrimaryAction()}
                    disabled={!canSubmit || saving}
                    style={[
                        styles.desktopPrimaryButton,
                        { backgroundColor: theme.colors.button.primary.background },
                        (!canSubmit || saving) && styles.disabledButton,
                    ]}
                >
                    {saving ? (
                        <ActivityIndicator size="small" color={theme.colors.button.primary.tint} />
                    ) : (
                        <Text style={[styles.desktopPrimaryButtonText, { color: theme.colors.button.primary.tint }]}>{primaryActionLabel}</Text>
                    )}
                </Pressable>
            </View>
            <ScrollView
                style={styles.desktopScrollView}
                contentContainerStyle={[styles.desktopContent, { maxWidth: Math.min(layout.maxWidth, 960), alignSelf: 'center', width: '100%' }]}
                keyboardShouldPersistTaps="handled"
            >
                {formContent}
            </ScrollView>
        </View>
    );

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: !isDesktopShell,
                    headerTitle: t('agents.createAgent'),
                    headerRight: () => (
                        <Pressable onPress={() => void handlePrimaryAction()} disabled={!canSubmit || saving} style={styles.headerButton}>
                            {saving ? (
                                <ActivityIndicator size="small" color={theme.colors.button.primary.background} />
                            ) : (
                                <Text style={[
                                    styles.headerButtonText,
                                    { color: canSubmit ? theme.colors.button.primary.background : theme.colors.textSecondary },
                                ]}>
                                    {primaryActionLabel}
                                </Text>
                            )}
                        </Pressable>
                    ),
                }}
            />
            {isDesktopShell ? (
                <SidebarView mainPanel={desktopMainPanel} />
            ) : (
                <View style={[styles.container, { backgroundColor: theme.colors.groupped.background }]}> 
                    <ScrollView
                        contentContainerStyle={[styles.mobileContent, { maxWidth: layout.maxWidth, alignSelf: 'center', width: '100%' }]}
                        keyboardShouldPersistTaps="handled"
                    >
                        {formContent}
                    </ScrollView>
                </View>
            )}
        </>
    );
});

const styles = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
    },
    mobileContent: {
        paddingBottom: 40,
    },
    headerButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    headerButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    formShell: {
        gap: 18,
        paddingTop: 20,
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    modeSection: {
        gap: 12,
    },
    modeGrid: {
        gap: 12,
    },
    modeCard: {
        borderRadius: 18,
        borderWidth: 1,
        padding: 16,
        gap: 10,
    },
    modeIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modeTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    modeSubtitle: {
        fontSize: 13,
        lineHeight: 18,
    },
    sectionBlock: {
        gap: 12,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.3,
        textTransform: 'uppercase',
    },
    callout: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        gap: 6,
    },
    calloutTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    calloutBody: {
        fontSize: 13,
        lineHeight: 19,
    },
    centerState: {
        minHeight: 120,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyState: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 20,
        alignItems: 'center',
        gap: 8,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    emptyHint: {
        fontSize: 13,
        lineHeight: 19,
        textAlign: 'center',
    },
    teamGenomeList: {
        gap: 12,
    },
    teamGenomeCard: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 14,
        gap: 12,
    },
    teamGenomeHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    teamGenomeName: {
        fontSize: 15,
        fontWeight: '700',
    },
    teamGenomeMeta: {
        fontSize: 12,
    },
    teamGenomeDescription: {
        fontSize: 13,
        lineHeight: 18,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
    },
    statusBadgeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    badgeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    teamGenomeFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    secondaryButton: {
        minHeight: 36,
        paddingHorizontal: 14,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryButtonText: {
        fontSize: 13,
        fontWeight: '600',
    },
    disabledButton: {
        opacity: 0.45,
    },
    formGroup: {
        gap: 8,
    },
    formRow: {
        gap: 12,
    },
    formGroupHalf: {
        flex: 1,
    },
    textField: {
        minHeight: 48,
        borderRadius: 14,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
    },
    textArea: {
        minHeight: 112,
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    choiceChip: {
        minHeight: 40,
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    compactChip: {
        paddingHorizontal: 12,
    },
    choiceChipText: {
        fontSize: 13,
        fontWeight: '600',
    },
    toggleRow: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    toggleTitle: {
        fontSize: 15,
        fontWeight: '700',
    },
    toggleHint: {
        fontSize: 12,
        lineHeight: 17,
    },
    toggleIndicator: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
    },
    inlineHint: {
        fontSize: 13,
    },
    machineList: {
        gap: 10,
    },
    machineChip: {
        minHeight: 44,
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    machineChipDisabled: {
        opacity: 0.55,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusOnline: {
        backgroundColor: '#34C759',
    },
    statusOffline: {
        backgroundColor: '#ef4444',
    },
    machineName: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
    },
    dropdownToggle: {
        marginTop: 10,
        minHeight: 36,
        borderRadius: 10,
        borderWidth: 1,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    dropdownToggleText: {
        fontSize: 13,
    },
    dropdown: {
        marginTop: 8,
        borderRadius: 12,
        borderWidth: 1,
        overflow: 'hidden',
    },
    dropdownItem: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    dropdownItemText: {
        fontSize: 13,
    },
    desktopPanel: {
        flex: 1,
        backgroundColor: theme.colors.groupped.background,
    },
    desktopHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 24,
        paddingHorizontal: 24,
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.divider,
    },
    desktopHeaderCopy: {
        flex: 1,
        gap: 6,
    },
    desktopEyebrow: {
        fontSize: 12,
        fontWeight: '700',
        color: '#8A7F74',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    desktopTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: theme.colors.text,
    },
    desktopSubtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        maxWidth: 620,
        lineHeight: 21,
    },
    desktopPrimaryButton: {
        minWidth: 116,
        minHeight: 44,
        borderRadius: 12,
        paddingHorizontal: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    desktopPrimaryButtonText: {
        fontSize: 15,
        fontWeight: '700',
    },
    desktopScrollView: {
        flex: 1,
    },
    desktopContent: {
        paddingTop: 24,
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
}));
