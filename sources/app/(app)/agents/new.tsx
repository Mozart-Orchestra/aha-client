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

import { SessionView } from '@/-session/SessionView';
import { Text } from '@/components/ui/StyledText';
import { SidebarView } from '@/components/layout/SidebarView';
import { layout } from '@/utils/layout';
import { DESKTOP_BREAKPOINT } from '@/navigation/navigationConfig';
import { t } from '@/text';
import { Modal } from '@/modal';
import { sync } from '@/sync/sync';
import { createGenome, publishGenome } from '@/sync/apiEvolution';
import { useAllMachines, useSessionMessages, useSetting } from '@/sync/storage';
import { isMachineOnline } from '@/utils/machineUtils';
import { getKnownPathsForMachine, getRecentPathForMachine, updateRecentMachinePaths } from '@/utils/machinePaths';
import { getPreferredMachineId } from '@/utils/getPreferredMachineId';
import {
    buildManualAgentImage,
    buildPrivateAgentBuilderImage,
    buildPrivateAgentBuilderKickoff,
    mergeManualDraftUpdate,
    parseManualDraftSyncComment,
    slugifyAgentName,
    PRIVATE_AGENT_BUILDER_VERSION,
    type ManualAgentCategory,
    type ManualAgentDraft,
    type ManualAgentRuntime,
    type ManualPermissionMode,
} from '@/utils/agentCreation';
import { useEscapeAction } from '@/hooks/useEscapeAction';
import { goBackOrReturn } from '@/utils/returnNavigation';
import { randomUUID } from '@/utils/uuid';
import { getConcatenatedPathErrorMessage } from '@/utils/workingDirectory';

type CreationMode = 'manual' | 'chat' | 'market';

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
    kanbanOwnTasks: true,
    kanbanBoardAuthority: false,
};

const PRIVATE_BUILDER_NAME = `Agent Creator V${PRIVATE_AGENT_BUILDER_VERSION}`;

function buildStandaloneSessionTag() {
    return `standalone:${randomUUID()}`;
}

function splitDraftList(value: string): string[] {
    return value
        .split(/\n|,/g)
        .map((entry) => entry.trim())
        .filter(Boolean);
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    const { theme } = useUnistyles();
    return <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>{children}</Text>;
}

function SectionHint({ children }: { children: React.ReactNode }) {
    const { theme } = useUnistyles();
    return <Text style={[styles.sectionHint, { color: theme.colors.textSecondary }]}>{children}</Text>;
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

function GuideCard({ title, body }: { title: string; body: string }) {
    const { theme } = useUnistyles();
    return (
        <View style={[styles.guideCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider }]}>
            <Text style={[styles.guideTitle, { color: theme.colors.text }]}>{title}</Text>
            <Text style={[styles.guideBody, { color: theme.colors.textSecondary }]}>{body}</Text>
        </View>
    );
}

function AgentPreviewCard({ draft }: { draft: ManualAgentDraft }) {
    const { theme } = useUnistyles();
    const responsibilities = splitDraftList(draft.responsibilities).slice(0, 3);
    const tags = splitDraftList(draft.tags).slice(0, 4);

    return (
        <View style={[styles.previewCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider }]}>
            <View style={styles.previewHeader}>
                <View style={styles.previewTitleWrap}>
                    <Text style={[styles.previewTitle, { color: theme.colors.text }]} numberOfLines={1}>
                        {draft.displayName.trim() || t('agents.previewCard')}
                    </Text>
                    <View style={[styles.previewStatusBadge, { backgroundColor: theme.colors.surfaceHigh }]}>
                        <Text style={[styles.previewStatusText, { color: theme.colors.textSecondary }]}>
                            {t('agents.previewDraft')}
                        </Text>
                    </View>
                </View>
            </View>

            <Text style={[styles.previewBody, { color: theme.colors.textSecondary }]} numberOfLines={4}>
                {draft.description.trim() || t('agents.previewEmptyHint')}
            </Text>

            <View style={styles.previewBadgeRow}>
                <View style={[styles.previewBadge, { backgroundColor: theme.colors.surfaceHigh }]}>
                    <Text style={[styles.previewBadgeText, { color: theme.colors.textSecondary }]}>
                        {draft.category}
                    </Text>
                </View>
                <View style={[styles.previewBadge, { backgroundColor: theme.colors.surfaceHigh }]}>
                    <Text style={[styles.previewBadgeText, { color: theme.colors.textSecondary }]}>
                        {draft.runtime}
                    </Text>
                </View>
                <View style={[styles.previewBadge, { backgroundColor: theme.colors.surfaceHigh }]}>
                    <Text style={[styles.previewBadgeText, { color: theme.colors.textSecondary }]}>
                        {draft.roleId || 'role'}
                    </Text>
                </View>
            </View>

            {draft.systemPrompt.trim() ? (
                <Text style={[styles.previewPrompt, { color: theme.colors.text }]} numberOfLines={4}>
                    {draft.systemPrompt.trim()}
                </Text>
            ) : null}

            {responsibilities.length > 0 ? (
                <View style={styles.previewList}>
                    {responsibilities.map((item) => (
                        <View key={item} style={styles.previewListRow}>
                            <View style={[styles.previewListDot, { backgroundColor: theme.colors.button.primary.background }]} />
                            <Text style={[styles.previewListText, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                                {item}
                            </Text>
                        </View>
                    ))}
                </View>
            ) : null}

            {tags.length > 0 ? (
                <View style={styles.previewBadgeRow}>
                    {tags.map((tag) => (
                        <View key={tag} style={[styles.previewBadge, { backgroundColor: '#0EA5E914' }]}>
                            <Text style={[styles.previewBadgeText, { color: '#0EA5E9' }]}>{tag}</Text>
                        </View>
                    ))}
                </View>
            ) : null}
        </View>
    );
}

function DraftEditor({
    draft,
    setDraft,
    publishNow,
    setPublishNow,
}: {
    draft: ManualAgentDraft;
    setDraft: React.Dispatch<React.SetStateAction<ManualAgentDraft>>;
    publishNow: boolean;
    setPublishNow: React.Dispatch<React.SetStateAction<boolean>>;
}) {
    const { theme } = useUnistyles();

    const updateDraft = React.useCallback((patch: Partial<ManualAgentDraft>) => {
        setDraft((current) => mergeManualDraftUpdate(current, patch));
    }, [setDraft]);

    return (
        <View style={styles.sidebarContent}>
            <View style={styles.sidebarIntro}>
                <SectionLabel>{t('agents.manualSidebarTitle')}</SectionLabel>
                <SectionHint>{t('agents.manualSidebarHint')}</SectionHint>
            </View>

            <AgentPreviewCard draft={draft} />

            <View style={styles.formGroup}>
                <SectionLabel>{t('agents.agentName')}</SectionLabel>
                <TextField
                    value={draft.displayName}
                    onChangeText={(value) => updateDraft({ displayName: value })}
                    placeholder={t('agents.agentNamePlaceholder')}
                />
            </View>

            <View style={styles.formGroup}>
                <SectionLabel>{t('agents.descriptionLabel')}</SectionLabel>
                <TextField
                    value={draft.description}
                    onChangeText={(value) => updateDraft({ description: value })}
                    placeholder={t('agents.descriptionPlaceholder')}
                    multiline
                />
            </View>

            <View style={styles.formGroup}>
                <SectionLabel>{t('agents.categoryLabel')}</SectionLabel>
                <View style={styles.chipRow}>
                    {CATEGORY_OPTIONS.map((option) => {
                        const active = draft.category === option.value;
                        return (
                            <Pressable
                                key={option.value}
                                onPress={() => updateDraft({ category: option.value })}
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
                        const active = draft.runtime === option.value;
                        return (
                            <Pressable
                                key={option.value}
                                onPress={() => updateDraft({ runtime: option.value })}
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
                <SectionLabel>{t('agents.roleIdLabel')}</SectionLabel>
                <TextField
                    value={draft.roleId}
                    onChangeText={(value) => updateDraft({ roleId: value })}
                    placeholder={t('agents.roleIdPlaceholder')}
                />
            </View>

            <View style={styles.formGroup}>
                <SectionLabel>{t('agents.systemPromptLabel')}</SectionLabel>
                <TextField
                    value={draft.systemPrompt}
                    onChangeText={(value) => updateDraft({ systemPrompt: value })}
                    placeholder={t('agents.systemPromptPlaceholder')}
                    multiline
                />
            </View>

            <View style={styles.formGroup}>
                <SectionLabel>{t('agents.responsibilitiesLabel')}</SectionLabel>
                <TextField
                    value={draft.responsibilities}
                    onChangeText={(value) => updateDraft({ responsibilities: value })}
                    placeholder={t('agents.listOnePerLineHint')}
                    multiline
                />
            </View>

            <View style={styles.formGroup}>
                <SectionLabel>{t('agents.capabilitiesLabel')}</SectionLabel>
                <TextField
                    value={draft.capabilities}
                    onChangeText={(value) => updateDraft({ capabilities: value })}
                    placeholder={t('agents.listOnePerLineHint')}
                    multiline
                />
            </View>

            <View style={styles.formGroup}>
                <SectionLabel>{t('agents.tagsLabel')}</SectionLabel>
                <TextField
                    value={draft.tags}
                    onChangeText={(value) => updateDraft({ tags: value })}
                    placeholder={t('agents.tagsPlaceholder')}
                />
            </View>

            <View style={styles.formRow}>
                <View style={[styles.formGroup, styles.formGroupHalf]}>
                    <SectionLabel>{t('agents.model')}</SectionLabel>
                    <TextField
                        value={draft.modelId}
                        onChangeText={(value) => updateDraft({ modelId: value })}
                        placeholder={t('agents.modelPlaceholderOptional')}
                    />
                </View>
                <View style={[styles.formGroup, styles.formGroupHalf]}>
                    <SectionLabel>{t('agents.permissionMode')}</SectionLabel>
                    <View style={styles.chipRow}>
                        {PERMISSION_OPTIONS.map((option) => {
                            const active = draft.permissionMode === option.value;
                            return (
                                <Pressable
                                    key={option.value}
                                    onPress={() => updateDraft({ permissionMode: option.value })}
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

            <View style={styles.formGroup}>
                <SectionLabel>{t('agents.kanbanProfileLabel')}</SectionLabel>

                <View style={[styles.toggleRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider }]}>
                    <View style={{ flex: 1, gap: 4 }}>
                        <Text style={[styles.toggleTitle, { color: theme.colors.text }]}>{t('agents.boardVisibilityTitle')}</Text>
                        <Text style={[styles.toggleHint, { color: theme.colors.textSecondary }]}>{t('agents.boardVisibilityHint')}</Text>
                    </View>
                    <View style={[styles.toggleIndicator, { backgroundColor: theme.colors.button.primary.background }]}>
                        <Ionicons name="eye-outline" size={16} color={theme.colors.button.primary.tint} />
                    </View>
                </View>

                <Pressable
                    onPress={() => setDraft((current) => ({
                        ...current,
                        kanbanOwnTasks: !current.kanbanOwnTasks,
                        kanbanBoardAuthority: current.kanbanOwnTasks ? false : current.kanbanBoardAuthority,
                    }))}
                    style={[styles.toggleRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider }]}
                >
                    <View style={{ flex: 1, gap: 4 }}>
                        <Text style={[styles.toggleTitle, { color: theme.colors.text }]}>{t('agents.ownTaskLifecycleTitle')}</Text>
                        <Text style={[styles.toggleHint, { color: theme.colors.textSecondary }]}>{t('agents.ownTaskLifecycleHint')}</Text>
                    </View>
                    <View style={[
                        styles.toggleIndicator,
                        { backgroundColor: draft.kanbanOwnTasks ? theme.colors.button.primary.background : theme.colors.surfaceHigh },
                    ]}>
                        <Ionicons name={draft.kanbanOwnTasks ? 'checkmark' : 'remove'} size={16} color={draft.kanbanOwnTasks ? theme.colors.button.primary.tint : theme.colors.textSecondary} />
                    </View>
                </Pressable>

                <Pressable
                    onPress={() => setDraft((current) => ({
                        ...current,
                        kanbanOwnTasks: true,
                        kanbanBoardAuthority: !current.kanbanBoardAuthority,
                    }))}
                    style={[styles.toggleRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider }]}
                >
                    <View style={{ flex: 1, gap: 4 }}>
                        <Text style={[styles.toggleTitle, { color: theme.colors.text }]}>{t('agents.boardAuthorityTitle')}</Text>
                        <Text style={[styles.toggleHint, { color: theme.colors.textSecondary }]}>{t('agents.boardAuthorityHint')}</Text>
                    </View>
                    <View style={[
                        styles.toggleIndicator,
                        { backgroundColor: draft.kanbanBoardAuthority ? theme.colors.button.primary.background : theme.colors.surfaceHigh },
                    ]}>
                        <Ionicons name={draft.kanbanBoardAuthority ? 'checkmark' : 'remove'} size={16} color={draft.kanbanBoardAuthority ? theme.colors.button.primary.tint : theme.colors.textSecondary} />
                    </View>
                </Pressable>
            </View>

            <Pressable
                onPress={() => setPublishNow((value) => !value)}
                style={[styles.toggleRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider }]}
            >
                <View style={{ flex: 1, gap: 4 }}>
                    <Text style={[styles.toggleTitle, { color: theme.colors.text }]}>{t('agents.publishNowTitle')}</Text>
                    <Text style={[styles.toggleHint, { color: theme.colors.textSecondary }]}>{t('agents.publishNowHint')}</Text>
                </View>
                <View style={[
                    styles.toggleIndicator,
                    { backgroundColor: publishNow ? theme.colors.button.primary.background : theme.colors.surfaceHigh },
                ]}>
                    <Ionicons name={publishNow ? 'checkmark' : 'remove'} size={16} color={publishNow ? theme.colors.button.primary.tint : theme.colors.textSecondary} />
                </View>
            </Pressable>
        </View>
    );
}

export default React.memo(function NewAgentScreen() {
    const { theme } = useUnistyles();
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isDesktopShell = Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;
    const machines = useAllMachines();
    const recentMachinePaths = useSetting('recentMachinePaths');

    const [mode, setMode] = React.useState<CreationMode>('chat');
    const [saving, setSaving] = React.useState(false);
    const [manualDraft, setManualDraft] = React.useState<ManualAgentDraft>(DEFAULT_MANUAL_DRAFT);
    const [manualPublishNow, setManualPublishNow] = React.useState(false);
    const [chatBrief, setChatBrief] = React.useState('');
    const [selectedMachineId, setSelectedMachineId] = React.useState<string | null>(
        () => getPreferredMachineId(machines, recentMachinePaths),
    );
    const [cwd, setCwd] = React.useState('');
    const [cwdEdited, setCwdEdited] = React.useState(false);
    const [showPathDropdown, setShowPathDropdown] = React.useState(false);
    const [builderSessionId, setBuilderSessionId] = React.useState<string | null>(null);
    const processedBuilderMessagesRef = React.useRef<Set<string>>(new Set());

    const { messages: builderMessages } = useSessionMessages(builderSessionId ?? '');

    useEscapeAction(true, () => goBackOrReturn(router, '/agents'));

    React.useEffect(() => {
        const preferredMachineId = getPreferredMachineId(machines, recentMachinePaths);
        if (machines.length === 0) {
            if (selectedMachineId !== null) {
                setSelectedMachineId(null);
                setCwdEdited(false);
                setShowPathDropdown(false);
            }
            return;
        }
        if (selectedMachineId && machines.some((machine) => machine.id === selectedMachineId)) {
            return;
        }
        if (selectedMachineId !== preferredMachineId) {
            setSelectedMachineId(preferredMachineId);
            setCwdEdited(false);
            setShowPathDropdown(false);
        }
    }, [machines, recentMachinePaths, selectedMachineId]);

    React.useEffect(() => {
        if (!selectedMachineId || cwdEdited) {
            return;
        }
        const suggestedPath = getRecentPathForMachine(selectedMachineId, recentMachinePaths);
        setCwd((previous) => previous === suggestedPath ? previous : suggestedPath);
        // Intentionally avoid depending on recentMachinePaths updates here so synced settings
        // do not overwrite a path the user is actively editing for the selected machine.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedMachineId, cwdEdited]);

    React.useEffect(() => {
        if (!builderSessionId) {
            return;
        }

        for (const message of builderMessages) {
            if (message.kind !== 'agent-text') {
                continue;
            }
            if (processedBuilderMessagesRef.current.has(message.id)) {
                continue;
            }

            processedBuilderMessagesRef.current.add(message.id);
            const update = parseManualDraftSyncComment(message.text);
            if (update) {
                setManualDraft((current) => mergeManualDraftUpdate(current, update));
            }
        }
    }, [builderMessages, builderSessionId]);

    const selectedMachine = machines.find((machine) => machine.id === selectedMachineId) ?? null;
    const knownPaths = React.useMemo(
        () => getKnownPathsForMachine(selectedMachineId, recentMachinePaths),
        [recentMachinePaths, selectedMachineId],
    );
    const canCreateDraft = React.useMemo(() => {
        return !!manualDraft.displayName.trim() && !!manualDraft.systemPrompt.trim();
    }, [manualDraft.displayName, manualDraft.systemPrompt]);
    const canStartChat = !!selectedMachine && isMachineOnline(selectedMachine) && !!cwd.trim();

    const primaryActionLabel = React.useMemo(() => {
        if (mode === 'manual') {
            return t('common.create');
        }
        if (mode === 'market') {
            return t('agents.openMarketplace');
        }
        if (!builderSessionId) {
            return t('agents.startChat');
        }
        return canCreateDraft ? t('common.create') : t('agents.openFullChat');
    }, [builderSessionId, canCreateDraft, mode]);

    const canSubmit = React.useMemo(() => {
        if (mode === 'manual') {
            return canCreateDraft;
        }
        if (mode === 'market') {
            return true;
        }
        if (!builderSessionId) {
            return canStartChat;
        }
        return canCreateDraft || !!builderSessionId;
    }, [builderSessionId, canCreateDraft, canStartChat, mode]);

    const handleCreateDraft = React.useCallback(async () => {
        const credentials = sync.getCredentials();
        if (!credentials) {
            await Modal.alert(t('common.error'), 'Not authenticated');
            return;
        }
        if (!canCreateDraft || saving) {
            return;
        }

        setSaving(true);
        let genomeId: string | null = null;
        try {
            const spec = buildManualAgentImage(manualDraft);
            const created = await createGenome(credentials, {
                name: slugifyAgentName(manualDraft.displayName),
                description: manualDraft.description.trim() || undefined,
                spec: JSON.stringify(spec),
                tags: spec.tags && spec.tags.length > 0 ? JSON.stringify(spec.tags) : undefined,
                category: manualDraft.category,
                isPublic: false,
                status: 'draft',
                origin: 'manual',
            });

            genomeId = created.genome.id;
            if (manualPublishNow) {
                const published = await publishGenome(credentials, genomeId);
                genomeId = published.genome.id;
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to create agent';
            await Modal.alert(t('common.error'), message);
            setSaving(false);
            return;
        }

        // Spawn is best-effort — genome is already saved, navigate regardless
        if (selectedMachineId && cwd.trim()) {
            try {
                const cwdValidationError = getConcatenatedPathErrorMessage(cwd.trim());
                if (!cwdValidationError) {
                    const spec = buildManualAgentImage(manualDraft);
                    const sessionId = await sync.spawnSessionOnMachine(selectedMachineId, {
                        directory: cwd.trim(),
                        agent: manualDraft.runtime,
                        sessionTag: buildStandaloneSessionTag(),
                        role: spec.baseRoleId ?? manualDraft.roleId ?? 'agent',
                        specId: genomeId!,
                        sessionName: manualDraft.displayName.trim(),
                    });
                    if (sessionId) {
                        const updatedPaths = updateRecentMachinePaths(recentMachinePaths, selectedMachineId, cwd.trim());
                        sync.applySettings({ recentMachinePaths: updatedPaths });
                    }
                }
            } catch {
                // Agent genome exists; user can spawn manually from agent detail page
            }
        }

        setSaving(false);
        router.push({ pathname: '/agents/[id]', params: { id: genomeId! } } as any);
    }, [canCreateDraft, cwd, manualDraft, manualPublishNow, recentMachinePaths, router, saving, selectedMachineId]);

    const handleStartBuilderChat = React.useCallback(async () => {
        const credentials = sync.getCredentials();
        if (!credentials) {
            await Modal.alert(t('common.error'), 'Not authenticated');
            return;
        }
        if (!canStartChat || saving || !selectedMachineId) {
            return;
        }

        setSaving(true);
        try {
            const cwdValidationError = getConcatenatedPathErrorMessage(cwd.trim());
            if (cwdValidationError) {
                await Modal.alert(t('common.error'), cwdValidationError);
                return;
            }

            const builderSpec = buildPrivateAgentBuilderImage({
                displayName: PRIVATE_BUILDER_NAME,
                runtime: manualDraft.runtime,
                brief: chatBrief,
            });
            const createdGenome = await createGenome(credentials, {
                name: `private-agent-creator-v${PRIVATE_AGENT_BUILDER_VERSION}-${randomUUID().slice(0, 8)}`,
                description: builderSpec.description,
                spec: JSON.stringify(builderSpec),
                tags: builderSpec.tags ? JSON.stringify(builderSpec.tags) : undefined,
                category: builderSpec.category,
                isPublic: false,
                status: 'draft',
                origin: 'manual',
            });

            const sessionId = await sync.spawnSessionOnMachine(selectedMachineId, {
                directory: cwd.trim(),
                agent: manualDraft.runtime,
                sessionTag: buildStandaloneSessionTag(),
                role: builderSpec.baseRoleId ?? 'agent-builder',
                specId: createdGenome.genome.id,
                sessionName: PRIVATE_BUILDER_NAME,
            });

            if (!sessionId) {
                throw new Error('Spawn returned no session ID');
            }

            const updatedPaths = updateRecentMachinePaths(recentMachinePaths, selectedMachineId, cwd.trim());
            sync.applySettings({ recentMachinePaths: updatedPaths });
            processedBuilderMessagesRef.current.clear();
            setBuilderSessionId(sessionId);
            sync.onSessionVisible(sessionId);

            const kickoff = buildPrivateAgentBuilderKickoff({
                brief: chatBrief,
                currentDraft: manualDraft,
            });
            await sync.sendMessage(sessionId, kickoff.text, kickoff.displayText);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to start builder chat';
            await Modal.alert(t('common.error'), message);
        } finally {
            setSaving(false);
        }
    }, [canStartChat, chatBrief, cwd, manualDraft, recentMachinePaths, saving, selectedMachineId]);

    const openFullChat = React.useCallback(() => {
        if (!builderSessionId) {
            return;
        }

        router.push({
            pathname: '/session/[id]',
            params: {
                id: builderSessionId,
                returnTo: '/agents/new',
            },
        } as any);
    }, [builderSessionId, router]);

    const handlePrimaryAction = React.useCallback(async () => {
        if (mode === 'manual') {
            await handleCreateDraft();
            return;
        }
        if (mode === 'market') {
            router.push({ pathname: '/agents', params: { launchHint: 'great-agent' } } as any);
            return;
        }
        if (!builderSessionId) {
            await handleStartBuilderChat();
            return;
        }
        if (canCreateDraft) {
            await handleCreateDraft();
            return;
        }
        openFullChat();
    }, [builderSessionId, canCreateDraft, handleCreateDraft, handleStartBuilderChat, mode, openFullChat, router]);

    const renderModePicker = () => (
        <View style={styles.modeSection}>
            <SectionLabel>{t('agents.creationFlow')}</SectionLabel>
            <View style={styles.modeGrid}>
                {[
                    {
                        key: 'manual' as const,
                        icon: 'create-outline' as const,
                        title: t('agents.modeManualTitle'),
                        subtitle: t('agents.modeManualSubtitle'),
                    },
                    {
                        key: 'chat' as const,
                        icon: 'chatbubbles-outline' as const,
                        title: t('agents.modeChatTitle'),
                        subtitle: t('agents.modeChatSubtitle'),
                    },
                    {
                        key: 'market' as const,
                        icon: 'sparkles-outline' as const,
                        title: t('agents.modeMarketTitle'),
                        subtitle: t('agents.modeMarketSubtitle'),
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

    const renderManualMain = () => (
        <View style={styles.sectionBlock}>
            <View style={[styles.callout, { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider }]}>
                <Text style={[styles.calloutTitle, { color: theme.colors.text }]}>{t('agents.manualSidebarTitle')}</Text>
                <Text style={[styles.calloutBody, { color: theme.colors.textSecondary }]}>{t('agents.manualSidebarHint')}</Text>
            </View>
            <GuideCard title={t('agents.guideIdentityTitle')} body={t('agents.guideIdentityBody')} />
            <GuideCard title={t('agents.guideBehaviorTitle')} body={t('agents.guideBehaviorBody')} />
            <GuideCard title={t('agents.guideOperationsTitle')} body={t('agents.guideOperationsBody')} />
            {renderMachinePicker()}
            {selectedMachineId ? renderWorkingDirectory() : null}
        </View>
    );

    const renderMachinePicker = () => (
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
                                onPress={() => {
                                    if (!online) {
                                        Modal.alert(t('common.error'), t('machine.offlineUnableToSpawn'));
                                        return;
                                    }
                                    setSelectedMachineId(machine.id);
                                    setCwdEdited(false);
                                    setShowPathDropdown(false);
                                }}
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
    );

    const renderWorkingDirectory = () => (
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
                    setCwdEdited(true);
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
                        <Text style={[styles.dropdownToggleText, { color: theme.colors.textSecondary }]}>{t('agents.recentPaths')}</Text>
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
                                        setCwdEdited(true);
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
    );

    const renderChatMain = () => {
        if (builderSessionId) {
            return (
                <View style={styles.sectionBlock}>
                    <View style={[styles.callout, { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider }]}>
                        <Text style={[styles.calloutTitle, { color: theme.colors.text }]}>{t('agents.chatRunningTitle')}</Text>
                        <Text style={[styles.calloutBody, { color: theme.colors.textSecondary }]}>{t('agents.chatRunningBody')}</Text>
                    </View>
                    <Pressable
                        onPress={openFullChat}
                        style={[styles.inlineButton, { borderColor: theme.colors.divider, backgroundColor: theme.colors.surface }]}
                    >
                        <Ionicons name="open-outline" size={14} color={theme.colors.textSecondary} />
                        <Text style={[styles.inlineButtonText, { color: theme.colors.text }]}>{t('agents.openFullChat')}</Text>
                    </Pressable>
                    <View style={[styles.chatCanvas, { borderColor: theme.colors.divider, backgroundColor: theme.colors.surface }]}>
                        <SessionView id={builderSessionId} returnTo="/agents/new" />
                    </View>
                </View>
            );
        }

        return (
            <View style={styles.sectionBlock}>
                <View style={[styles.callout, { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider }]}>
                    <Text style={[styles.calloutTitle, { color: theme.colors.text }]}>{t('agents.chatIntroTitle')}</Text>
                    <Text style={[styles.calloutBody, { color: theme.colors.textSecondary }]}>{t('agents.chatIntroBody')}</Text>
                </View>

                <View style={styles.formGroup}>
                    <SectionLabel>{t('agents.chatBriefLabel')}</SectionLabel>
                    <TextField
                        value={chatBrief}
                        onChangeText={setChatBrief}
                        placeholder={t('agents.chatBriefPlaceholder')}
                        multiline
                    />
                    <SectionHint>{t('agents.chatBriefHint')}</SectionHint>
                </View>

                {renderMachinePicker()}
                {renderWorkingDirectory()}

                <View style={[styles.callout, { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider }]}>
                    <Text style={[styles.calloutTitle, { color: theme.colors.text }]}>{t('agents.launchPrivateBuilderTitle')}</Text>
                    <Text style={[styles.calloutBody, { color: theme.colors.textSecondary }]}>{t('agents.launchPrivateBuilderBody')}</Text>
                </View>
            </View>
        );
    };

    const renderMarketMain = () => (
        <View style={styles.sectionBlock}>
            <View style={[styles.callout, { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider }]}>
                <Text style={[styles.calloutTitle, { color: theme.colors.text }]}>{t('agents.marketJumpTitle')}</Text>
                <Text style={[styles.calloutBody, { color: theme.colors.textSecondary }]}>{t('agents.marketJumpBody')}</Text>
            </View>
            <Pressable
                onPress={() => router.push({ pathname: '/agents', params: { launchHint: 'great-agent' } } as any)}
                style={[styles.marketButton, { backgroundColor: theme.colors.button.primary.background }]}
            >
                <Ionicons name="sparkles-outline" size={16} color={theme.colors.button.primary.tint} />
                <Text style={[styles.marketButtonText, { color: theme.colors.button.primary.tint }]}>{t('agents.openMarketplace')}</Text>
            </Pressable>
        </View>
    );

    const mainContent = (
        <View style={styles.formShell}>
            {renderModePicker()}
            {mode === 'manual' ? renderManualMain() : null}
            {mode === 'chat' ? renderChatMain() : null}
            {mode === 'market' ? renderMarketMain() : null}
            {!isDesktopShell ? (
                <DraftEditor
                    draft={manualDraft}
                    setDraft={setManualDraft}
                    publishNow={manualPublishNow}
                    setPublishNow={setManualPublishNow}
                />
            ) : null}
        </View>
    );

    const desktopMainPanel = (
        <View style={styles.desktopPanel}>
            <View style={styles.desktopHeader}>
                <View style={styles.desktopHeaderCopy}>
                    <Text style={styles.desktopEyebrow}>Agents</Text>
                    <Text style={styles.desktopTitle}>{t('agents.createAgent')}</Text>
                    <Text style={styles.desktopSubtitle}>{t('agents.createAgentSubtitle')}</Text>
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
                {mainContent}
            </ScrollView>
        </View>
    );

    const desktopSecondaryPanel = isDesktopShell && mode !== 'market' ? (
        <View style={[styles.secondaryPanel, { backgroundColor: theme.colors.groupped.background }]}>
            <ScrollView
                style={styles.secondaryScroll}
                contentContainerStyle={styles.secondaryContent}
                keyboardShouldPersistTaps="handled"
            >
                <DraftEditor
                    draft={manualDraft}
                    setDraft={setManualDraft}
                    publishNow={manualPublishNow}
                    setPublishNow={setManualPublishNow}
                />
            </ScrollView>
        </View>
    ) : undefined;

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
                <SidebarView mainPanel={desktopMainPanel} secondaryPanel={desktopSecondaryPanel} />
            ) : (
                <View style={[styles.container, { backgroundColor: theme.colors.groupped.background }]}>
                    <ScrollView
                        contentContainerStyle={[styles.mobileContent, { maxWidth: layout.maxWidth, alignSelf: 'center', width: '100%' }]}
                        keyboardShouldPersistTaps="handled"
                    >
                        {mainContent}
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
    sectionHint: {
        fontSize: 12,
        lineHeight: 18,
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
    guideCard: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        gap: 8,
    },
    guideTitle: {
        fontSize: 15,
        fontWeight: '700',
    },
    guideBody: {
        fontSize: 13,
        lineHeight: 19,
    },
    sidebarPanel: {
        flex: 1,
    },
    sidebarContent: {
        gap: 16,
        padding: 16,
    },
    sidebarIntro: {
        gap: 6,
    },
    previewCard: {
        borderRadius: 18,
        borderWidth: 1,
        padding: 16,
        gap: 12,
    },
    previewHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
    },
    previewTitleWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
        flex: 1,
    },
    previewTitle: {
        fontSize: 17,
        fontWeight: '700',
        flexShrink: 1,
    },
    previewStatusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
    },
    previewStatusText: {
        fontSize: 11,
        fontWeight: '700',
    },
    previewBody: {
        fontSize: 13,
        lineHeight: 19,
    },
    previewBadgeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    previewBadge: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
    },
    previewBadgeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    previewPrompt: {
        fontSize: 13,
        lineHeight: 19,
        fontWeight: '600',
    },
    previewList: {
        gap: 8,
    },
    previewListRow: {
        flexDirection: 'row',
        gap: 10,
        alignItems: 'flex-start',
    },
    previewListDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginTop: 6,
    },
    previewListText: {
        flex: 1,
        fontSize: 12,
        lineHeight: 17,
    },
    formGroup: {
        gap: 8,
    },
    formRow: {
        flexDirection: 'row',
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
    inlineButton: {
        minHeight: 40,
        paddingHorizontal: 14,
        borderRadius: 12,
        borderWidth: 1,
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    inlineButtonText: {
        fontSize: 13,
        fontWeight: '600',
    },
    chatCanvas: {
        minHeight: 620,
        borderRadius: 18,
        borderWidth: 1,
        overflow: 'hidden',
    },
    marketButton: {
        minHeight: 44,
        borderRadius: 12,
        paddingHorizontal: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        alignSelf: 'flex-start',
    },
    marketButtonText: {
        fontSize: 14,
        fontWeight: '700',
    },
    secondaryPanel: {
        flex: 1,
        borderLeftWidth: 1,
        borderLeftColor: theme.colors.divider,
    },
    secondaryScroll: {
        flex: 1,
    },
    secondaryContent: {
        paddingBottom: 32,
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
    disabledButton: {
        opacity: 0.45,
    },
}));
