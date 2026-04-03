import * as React from 'react';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    TextInput,
    View,
} from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/ui/StyledText';
import { Modal as AppModal } from '@/modal';
import { sync } from '@/sync/sync';
import { useAllMachines, useSetting } from '@/sync/storage';
import type { ManualCorpsDraft, ManualCorpsPreset, ManualCorpsSeatConfig } from '@/sync/settings';
import type { Machine } from '@/sync/storageTypes';
import { getLocalizedTeamRoles } from '@/team-config/i18n';
import { t } from '@/text';
import { fetchGenomeByName, parseAgentVerdict, type GenomeRecord } from '@/utils/genomeHub';
import { isMachineOnline } from '@/utils/machineUtils';
import { getKnownPathsForMachine, getRecentPathForMachine, updateRecentMachinePaths } from '@/utils/machinePaths';
import { getRoleVisual } from '@/utils/roleVisualUtils';
import { buildPendingSpawnLifecycle } from '@/utils/spawnState';
import { randomUUID } from '@/utils/uuid';

interface Props {
    onClose: () => void;
    onSuccess: (teamId: string) => void;
}

type RoleTemplate = {
    id: string;
    title: string;
    summary?: string;
};

type RoleGenomeState = {
    loading: boolean;
    genome: GenomeRecord | null;
};

const LOCALIZED_TEAM_ROLES: RoleTemplate[] = getLocalizedTeamRoles().map((role) => ({
    id: role.id,
    title: role.title,
    summary: role.summary,
}));

function buildEmptyDraft(): ManualCorpsDraft {
    return {
        title: '',
        target: '',
        seats: [],
    };
}

function buildSeatFromRole(
    role: RoleTemplate,
    genome: GenomeRecord | null,
    defaults: { machineId: string | null; workspacePath: string },
): ManualCorpsSeatConfig {
    return {
        id: randomUUID(),
        genomeId: genome?.id ?? null,
        genomeName: genome?.name ?? role.title,
        genomeNamespace: genome?.namespace ?? '@official',
        genomeVersion: genome?.version ?? null,
        genomeDisplayName: genome?.name ?? role.title,
        roleId: role.id,
        displayName: role.title,
        runtimeType: genome?.runtimeType === 'codex' ? 'codex' : 'claude',
        machineId: defaults.machineId,
        workspacePath: defaults.workspacePath,
        quantity: 1,
        customPrompt: '',
    };
}

function getMachineName(machine: Machine): string {
    return machine.metadata?.displayName ?? machine.metadata?.host ?? machine.id.slice(0, 8);
}

function RoleAvatar({
    roleId,
    displayName,
    size = 34,
}: {
    roleId: string;
    displayName: string;
    size?: number;
}) {
    const visual = getRoleVisual(roleId, displayName);

    return (
        <View
            style={[
                styles.avatarCircle,
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: visual.avatarBackground,
                },
            ]}
        >
            {visual.avatarIcon ? (
                <Ionicons name={visual.avatarIcon} size={Math.max(14, Math.round(size * 0.46))} color="#FFFFFF" />
            ) : (
                <Text style={{ color: '#FFFFFF', fontSize: Math.max(11, Math.round(size * 0.34)), fontWeight: '700' }}>
                    {(visual.avatarLabel ?? displayName.slice(0, 2)).slice(0, 2).toUpperCase()}
                </Text>
            )}
        </View>
    );
}

function RolePickerPanel({
    roles,
    query,
    onQueryChange,
    roleGenomes,
    onPickRole,
    theme,
}: {
    roles: RoleTemplate[];
    query: string;
    onQueryChange: (value: string) => void;
    roleGenomes: Record<string, RoleGenomeState | undefined>;
    onPickRole: (role: RoleTemplate) => void;
    theme: any;
}) {
    const filteredRoles = React.useMemo(() => {
        const keyword = query.trim().toLowerCase();
        if (!keyword) {
            return roles;
        }

        return roles.filter((role) => {
            const haystack = [role.title, role.id, role.summary]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return haystack.includes(keyword);
        });
    }, [query, roles]);

    return (
        <View style={[styles.rolePickerPanel, { backgroundColor: theme.colors.surfaceHigh, borderColor: theme.colors.divider }]}>
            <View style={[styles.searchRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider }]}>
                <Ionicons name="search-outline" size={15} color={theme.colors.textSecondary} />
                <TextInput
                    style={[styles.searchInput, { color: theme.colors.text }]}
                    value={query}
                    onChangeText={onQueryChange}
                    placeholder="搜索角色、职责或关键字"
                    placeholderTextColor={theme.colors.input.placeholder}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
            </View>

            <ScrollView style={styles.rolePickerScroll} keyboardShouldPersistTaps="handled">
                <View style={styles.rolePickerGrid}>
                    {filteredRoles.map((role) => {
                        const roleState = roleGenomes[role.id];
                        const feedback = parseAgentVerdict(roleState?.genome?.feedbackData ?? null);
                        const score = feedback?.avgScore ?? null;
                        const evaluationCount = feedback?.evaluationCount ?? null;
                        const scoreColor = score == null
                            ? theme.colors.textSecondary
                            : score >= 85
                                ? '#22c55e'
                                : score >= 70
                                    ? '#f59e0b'
                                    : '#ef4444';

                        return (
                            <Pressable
                                key={role.id}
                                style={[styles.roleCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider }]}
                                onPress={() => onPickRole(role)}
                            >
                                <View style={styles.roleCardHeader}>
                                    <RoleAvatar roleId={role.id} displayName={role.title} size={36} />
                                    <View style={styles.roleCardHeaderText}>
                                        <Text style={[styles.roleCardTitle, { color: theme.colors.text }]}>
                                            {role.title}
                                        </Text>
                                        <Text style={[styles.roleCardSubtle, { color: theme.colors.textSecondary }]}>
                                            {role.id}
                                        </Text>
                                    </View>
                                </View>

                                <Text style={[styles.roleCardSummary, { color: theme.colors.textSecondary }]} numberOfLines={3}>
                                    {role.summary || 'No summary available.'}
                                </Text>

                                <View style={styles.roleCardFooter}>
                                    <View style={[styles.metricPill, { backgroundColor: `${scoreColor}16` }]}>
                                        {roleState?.loading ? (
                                            <ActivityIndicator size="small" color={scoreColor} />
                                        ) : (
                                            <>
                                                <Ionicons name="star-outline" size={12} color={scoreColor} />
                                                <Text style={[styles.metricPillText, { color: scoreColor }]}>
                                                    {score == null ? '暂无评分' : `${Math.round(score)}`}
                                                </Text>
                                            </>
                                        )}
                                    </View>
                                    <View style={[styles.metricPill, { backgroundColor: theme.colors.groupped.background }]}>
                                        <Ionicons name="people-outline" size={12} color={theme.colors.textSecondary} />
                                        <Text style={[styles.metricPillText, { color: theme.colors.textSecondary }]}>
                                            {evaluationCount == null ? '无样本' : `${evaluationCount} 评测`}
                                        </Text>
                                    </View>
                                </View>
                            </Pressable>
                        );
                    })}
                </View>
            </ScrollView>
        </View>
    );
}

function SeatCard({
    seat,
    role,
    roleGenome,
    machines,
    defaultMachineId,
    defaultWorkspacePath,
    onChange,
    onRemove,
    theme,
}: {
    seat: ManualCorpsSeatConfig;
    role: RoleTemplate | undefined;
    roleGenome: RoleGenomeState | undefined;
    machines: Machine[];
    defaultMachineId: string | null;
    defaultWorkspacePath: string;
    onChange: (patch: Partial<ManualCorpsSeatConfig>) => void;
    onRemove: () => void;
    theme: any;
}) {
    const [showAdvanced, setShowAdvanced] = React.useState(false);
    const effectiveMachineId = seat.machineId ?? defaultMachineId;
    const effectiveWorkspacePath = seat.workspacePath.trim() || defaultWorkspacePath.trim();
    const feedback = parseAgentVerdict(roleGenome?.genome?.feedbackData ?? null);
    const score = feedback?.avgScore ?? null;
    const scoreColor = score == null
        ? theme.colors.textSecondary
        : score >= 85
            ? '#22c55e'
            : score >= 70
                ? '#f59e0b'
                : '#ef4444';

    return (
        <View style={[styles.seatCard, { backgroundColor: theme.colors.surfaceHigh, borderColor: theme.colors.divider }]}>
            <View style={styles.seatCardHeader}>
                <View style={styles.seatIdentity}>
                    <RoleAvatar roleId={seat.roleId} displayName={seat.displayName || role?.title || seat.roleId} size={42} />
                    <View style={styles.seatIdentityText}>
                        <Text style={[styles.seatTitle, { color: theme.colors.text }]}>
                            {seat.displayName || role?.title || seat.roleId}
                        </Text>
                        <Text style={[styles.seatSummary, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                            {role?.summary || seat.genomeDisplayName || seat.genomeName || seat.roleId}
                        </Text>
                    </View>
                </View>
                <Pressable onPress={onRemove} hitSlop={8}>
                    <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
                </Pressable>
            </View>

            <View style={styles.metricRow}>
                <View style={[styles.metricPill, { backgroundColor: `${scoreColor}16` }]}>
                    <Ionicons name="star-outline" size={12} color={scoreColor} />
                    <Text style={[styles.metricPillText, { color: scoreColor }]}>
                        {score == null ? '暂无评分' : `表现 ${Math.round(score)}`}
                    </Text>
                </View>
                <View style={[styles.metricPill, { backgroundColor: theme.colors.groupped.background }]}>
                    <Ionicons name="pulse-outline" size={12} color={theme.colors.textSecondary} />
                    <Text style={[styles.metricPillText, { color: theme.colors.textSecondary }]}>
                        {roleGenome?.genome?.runtimeType === 'codex' ? '默认 Codex' : '默认 Claude'}
                    </Text>
                </View>
                <View style={[styles.metricPill, { backgroundColor: theme.colors.groupped.background }]}>
                    <Ionicons name="copy-outline" size={12} color={theme.colors.textSecondary} />
                    <Text style={[styles.metricPillText, { color: theme.colors.textSecondary }]}>
                        {seat.quantity} 位成员
                    </Text>
                </View>
            </View>

            <View style={styles.inlineSection}>
                <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>模型</Text>
                <View style={styles.runtimeRow}>
                    {(['claude', 'codex'] as const).map((runtimeType) => {
                        const selected = seat.runtimeType === runtimeType;
                        return (
                            <Pressable
                                key={runtimeType}
                                style={[
                                    styles.runtimeChip,
                                    {
                                        borderColor: selected ? theme.colors.button.primary.background : theme.colors.divider,
                                        backgroundColor: selected ? theme.colors.button.primary.background : theme.colors.surface,
                                    },
                                ]}
                                onPress={() => onChange({ runtimeType })}
                            >
                                <Text style={[styles.runtimeChipText, { color: selected ? theme.colors.button.primary.tint : theme.colors.text }]}>
                                    {runtimeType === 'claude' ? 'Claude' : 'Codex'}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
            </View>

            <View style={styles.inlineSection}>
                <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>数量</Text>
                <View style={[styles.quantityRow, { borderColor: theme.colors.divider }]}>
                    <Pressable
                        onPress={() => onChange({ quantity: Math.max(1, seat.quantity - 1) })}
                        style={[styles.quantityBtn, { borderRightColor: theme.colors.divider }]}
                    >
                        <Ionicons name="remove" size={14} color={theme.colors.text} />
                    </Pressable>
                    <Text style={[styles.quantityValue, { color: theme.colors.text }]}>
                        {seat.quantity}
                    </Text>
                    <Pressable
                        onPress={() => onChange({ quantity: Math.min(12, seat.quantity + 1) })}
                        style={[styles.quantityBtn, { borderLeftColor: theme.colors.divider }]}
                    >
                        <Ionicons name="add" size={14} color={theme.colors.text} />
                    </Pressable>
                </View>
            </View>

            <View style={styles.inlineSection}>
                <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>机器</Text>
                <View style={styles.machineWrap}>
                    {machines.map((machine) => {
                        const selected = machine.id === effectiveMachineId;
                        const online = isMachineOnline(machine);
                        return (
                            <Pressable
                                key={machine.id}
                                style={[
                                    styles.machineChip,
                                    {
                                        borderColor: selected ? theme.colors.button.primary.background : theme.colors.divider,
                                        backgroundColor: selected ? theme.colors.groupped.background : theme.colors.surface,
                                    },
                                    !online && styles.machineChipOffline,
                                ]}
                                onPress={() => {
                                    if (!online) {
                                        return;
                                    }
                                    onChange({ machineId: machine.id });
                                }}
                            >
                                <View style={[styles.statusDot, online ? styles.statusOnline : styles.statusOffline]} />
                                <Text style={[styles.machineChipText, { color: theme.colors.text }]} numberOfLines={1}>
                                    {getMachineName(machine)}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
            </View>

            <View style={styles.inlineSection}>
                <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>工作目录</Text>
                <TextInput
                    style={[styles.input, { color: theme.colors.text, backgroundColor: theme.colors.surface, borderColor: theme.colors.divider }]}
                    value={seat.workspacePath}
                    onChangeText={(value) => onChange({ workspacePath: value })}
                    placeholder={defaultWorkspacePath || '继承默认目录'}
                    placeholderTextColor={theme.colors.input.placeholder}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
                {effectiveWorkspacePath ? (
                    <Text style={[styles.inlineHint, { color: theme.colors.textSecondary }]}>
                        当前生效目录：{effectiveWorkspacePath}
                    </Text>
                ) : null}
            </View>

            <Pressable
                style={[styles.advancedToggle, { borderColor: theme.colors.divider, backgroundColor: theme.colors.surface }]}
                onPress={() => setShowAdvanced((previous) => !previous)}
            >
                <Text style={[styles.advancedToggleText, { color: theme.colors.text }]}>
                    高级选项
                </Text>
                <Ionicons
                    name={showAdvanced ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    color={theme.colors.textSecondary}
                />
            </Pressable>

            {showAdvanced ? (
                <View style={[styles.advancedPanel, { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider }]}>
                    <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>显示名称</Text>
                    <TextInput
                        style={[styles.input, { color: theme.colors.text, backgroundColor: theme.colors.surfaceHigh, borderColor: theme.colors.divider }]}
                        value={seat.displayName}
                        onChangeText={(value) => onChange({ displayName: value })}
                        placeholder={role?.title || seat.roleId}
                        placeholderTextColor={theme.colors.input.placeholder}
                    />

                    <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>自定义提示词</Text>
                    <TextInput
                        style={[
                            styles.input,
                            styles.multilineInput,
                            { color: theme.colors.text, backgroundColor: theme.colors.surfaceHigh, borderColor: theme.colors.divider },
                        ]}
                        value={seat.customPrompt}
                        onChangeText={(value) => onChange({ customPrompt: value })}
                        placeholder="给这个成员附加额外约束、上下文或行为要求"
                        placeholderTextColor={theme.colors.input.placeholder}
                        multiline
                    />
                </View>
            ) : null}
        </View>
    );
}

export const ManualCorpsBuilderModal = React.memo(function ManualCorpsBuilderModal({ onClose, onSuccess }: Props) {
    const { theme } = useUnistyles();
    const machines = useAllMachines();
    const recentPaths = useSetting('recentMachinePaths');
    const cachedDraft = useSetting('manualCorpsDraft');
    const savedPresets = useSetting('manualCorpsPresets');

    const [draft, setDraft] = React.useState<ManualCorpsDraft>(() => cachedDraft ?? buildEmptyDraft());
    const [defaultMachineId, setDefaultMachineId] = React.useState<string | null>(
        () => machines.find(isMachineOnline)?.id ?? machines[0]?.id ?? null,
    );
    const [defaultWorkspacePath, setDefaultWorkspacePath] = React.useState('');
    const [defaultWorkspaceEdited, setDefaultWorkspaceEdited] = React.useState(false);
    const [showDefaultPathDropdown, setShowDefaultPathDropdown] = React.useState(false);
    const [showRolePicker, setShowRolePicker] = React.useState(false);
    const [roleQuery, setRoleQuery] = React.useState('');
    const [savingPreset, setSavingPreset] = React.useState(false);
    const [runningCorps, setRunningCorps] = React.useState(false);
    const [roleGenomes, setRoleGenomes] = React.useState<Record<string, RoleGenomeState | undefined>>({});

    React.useEffect(() => {
        if (machines.length === 0) {
            if (defaultMachineId !== null) {
                setDefaultMachineId(null);
            }
            return;
        }

        if (defaultMachineId && machines.some((machine) => machine.id === defaultMachineId)) {
            return;
        }

        setDefaultMachineId(machines.find(isMachineOnline)?.id ?? machines[0]?.id ?? null);
    }, [defaultMachineId, machines]);

    React.useEffect(() => {
        if (!defaultMachineId || defaultWorkspaceEdited) {
            return;
        }
        setDefaultWorkspacePath(getRecentPathForMachine(defaultMachineId, recentPaths));
    }, [defaultMachineId, defaultWorkspaceEdited, recentPaths]);

    React.useEffect(() => {
        sync.applySettings({ manualCorpsDraft: draft });
    }, [draft]);

    React.useEffect(() => {
        let cancelled = false;

        (async () => {
            const unresolvedRoles = LOCALIZED_TEAM_ROLES.filter((role) => roleGenomes[role.id] === undefined);
            if (unresolvedRoles.length === 0) {
                return;
            }

            unresolvedRoles.forEach((role) => {
                setRoleGenomes((current) => ({ ...current, [role.id]: { loading: true, genome: null } }));
            });

            const resolvedEntries = await Promise.all(unresolvedRoles.map(async (role) => {
                const genome = await fetchGenomeByName('@official', role.id);
                return [role.id, genome] as const;
            }));

            if (cancelled) {
                return;
            }

            setRoleGenomes((current) => {
                const next = { ...current };
                for (const [roleId, genome] of resolvedEntries) {
                    next[roleId] = {
                        loading: false,
                        genome,
                    };
                }
                return next;
            });
        })();

        return () => {
            cancelled = true;
        };
    }, [roleGenomes]);

    const knownDefaultPaths = React.useMemo(
        () => getKnownPathsForMachine(defaultMachineId, recentPaths),
        [defaultMachineId, recentPaths],
    );

    const selectedMembers = React.useMemo(() => {
        return draft.seats.flatMap((seat) => {
            const label = seat.displayName || LOCALIZED_TEAM_ROLES.find((role) => role.id === seat.roleId)?.title || seat.roleId;
            return Array.from({ length: seat.quantity }, (_, index) => ({
                id: `${seat.id}-${index + 1}`,
                roleId: seat.roleId,
                label: seat.quantity > 1 ? `${label} ${index + 1}` : label,
            }));
        });
    }, [draft.seats]);

    const canSavePreset = draft.seats.length > 0;
    const canRunCorps = React.useMemo(() => {
        if (draft.seats.length === 0) {
            return false;
        }

        return draft.seats.every((seat) => {
            const machineId = seat.machineId ?? defaultMachineId;
            const workspacePath = seat.workspacePath.trim() || defaultWorkspacePath.trim();
            const machine = machineId ? machines.find((item) => item.id === machineId) ?? null : null;

            return Boolean(
                seat.genomeId
                && machineId
                && workspacePath
                && machine
                && isMachineOnline(machine)
            );
        });
    }, [defaultMachineId, defaultWorkspacePath, draft.seats, machines]);

    const updateSeat = React.useCallback((seatId: string, patch: Partial<ManualCorpsSeatConfig>) => {
        setDraft((current) => ({
            ...current,
            seats: current.seats.map((seat) => seat.id === seatId ? { ...seat, ...patch } : seat),
        }));
    }, []);

    const removeSeat = React.useCallback((seatId: string) => {
        setDraft((current) => ({
            ...current,
            seats: current.seats.filter((seat) => seat.id !== seatId),
        }));
    }, []);

    const resolveRoleGenome = React.useCallback(async (roleId: string) => {
        const cached = roleGenomes[roleId];
        if (cached && !cached.loading) {
            return cached.genome;
        }

        setRoleGenomes((current) => ({ ...current, [roleId]: { loading: true, genome: null } }));
        const genome = await fetchGenomeByName('@official', roleId);
        setRoleGenomes((current) => ({ ...current, [roleId]: { loading: false, genome } }));
        return genome;
    }, [roleGenomes]);

    const handleAddRole = React.useCallback(async (role: RoleTemplate) => {
        const genome = await resolveRoleGenome(role.id);
        if (!genome) {
            await AppModal.alert(
                t('common.error'),
                `暂时无法加载 ${role.title} 的角色配置，请稍后重试。`,
            );
            return;
        }
        const nextSeat = buildSeatFromRole(role, genome, {
            machineId: defaultMachineId,
            workspacePath: defaultWorkspacePath,
        });

        setDraft((current) => ({
            ...current,
            seats: [...current.seats, nextSeat],
        }));
        setShowRolePicker(false);
        setRoleQuery('');
    }, [defaultMachineId, defaultWorkspacePath, resolveRoleGenome]);

    const handleLoadPreset = React.useCallback((preset: ManualCorpsPreset) => {
        setDraft(preset.draft);
        const firstSeat = preset.draft.seats[0];
        setDefaultMachineId(firstSeat?.machineId ?? null);
        setDefaultWorkspacePath(firstSeat?.workspacePath ?? '');
        setDefaultWorkspaceEdited(Boolean(firstSeat?.workspacePath));
        setShowRolePicker(false);
    }, []);

    const handleDeletePreset = React.useCallback((presetId: string) => {
        const nextPresets = savedPresets.filter((preset) => preset.id !== presetId);
        sync.applySettings({ manualCorpsPresets: nextPresets });
    }, [savedPresets]);

    const handleSavePreset = React.useCallback(() => {
        if (!canSavePreset || savingPreset) {
            return;
        }

        setSavingPreset(true);
        try {
            const label = draft.title.trim()
                || draft.seats[0]?.displayName?.trim()
                || draft.seats[0]?.roleId
                || '军团配置';
            const preset: ManualCorpsPreset = {
                id: randomUUID(),
                label,
                updatedAt: Date.now(),
                draft,
            };
            const nextPresets = [preset, ...savedPresets].slice(0, 12);
            sync.applySettings({ manualCorpsPresets: nextPresets, manualCorpsDraft: draft });
        } finally {
            setSavingPreset(false);
        }
    }, [canSavePreset, draft, savedPresets, savingPreset]);

    const handleRunCorps = React.useCallback(async () => {
        if (!canRunCorps || runningCorps) {
            return;
        }

        setRunningCorps(true);

        try {
            const teamName = draft.title.trim() || 'My Corps';
            const result = await sync.createCorps({
                name: teamName,
                ...(draft.target.trim() ? { description: draft.target.trim(), target: draft.target.trim() } : {}),
                machineId: defaultMachineId ?? undefined,
                workspacePath: defaultWorkspacePath.trim() || undefined,
                seats: draft.seats.map((seat) => ({
                    id: seat.id,
                    genomeId: seat.genomeId!,
                    genomeName: seat.genomeName,
                    genomeNamespace: seat.genomeNamespace,
                    genomeVersion: seat.genomeVersion,
                    genomeDisplayName: seat.genomeDisplayName,
                    roleId: seat.roleId,
                    displayName: seat.displayName || seat.roleId,
                    runtimeType: seat.runtimeType,
                    machineId: seat.machineId ?? defaultMachineId,
                    workspacePath: seat.workspacePath.trim() || defaultWorkspacePath.trim(),
                    quantity: seat.quantity,
                    customPrompt: seat.customPrompt.trim() || undefined,
                })),
            });

            const failures: string[] = [];
            let successCount = 0;
            let nextRecentPaths = recentPaths;

            for (const plannedMember of result.plannedMembers) {
                try {
                    const spawnResult = await sync.spawnSessionOnMachine(plannedMember.machineId, {
                        directory: plannedMember.workspacePath,
                        agent: plannedMember.runtimeType,
                        sessionTag: plannedMember.sessionTag,
                        teamId: result.team.id,
                        role: plannedMember.roleId,
                        specId: plannedMember.genomeId,
                        sessionName: plannedMember.displayName,
                        sessionPath: plannedMember.workspacePath,
                        env: {
                            AHA_TEAM_MEMBER_ID: plannedMember.memberId,
                            ...(plannedMember.customPrompt ? { AHA_AGENT_PROMPT: plannedMember.customPrompt } : {}),
                        },
                    });

                    if (spawnResult.status === 'failed') {
                        throw new Error(spawnResult.error);
                    }

                    await sync.addTeamMember(
                        result.team.id,
                        spawnResult.status === 'active' ? spawnResult.sessionId : '',
                        plannedMember.roleId,
                        plannedMember.displayName,
                        {
                            memberId: plannedMember.memberId,
                            sessionTag: plannedMember.sessionTag,
                            candidateId: plannedMember.candidateId,
                            specId: plannedMember.genomeId,
                            sourceImageId: plannedMember.genomeId,
                            runtimeType: plannedMember.runtimeType,
                            machineId: plannedMember.machineId,
                            workspacePath: plannedMember.workspacePath,
                            ...(spawnResult.status === 'pending'
                                ? { lifecycle: buildPendingSpawnLifecycle() }
                                : {}),
                            ...(plannedMember.customPrompt ? { customPrompt: plannedMember.customPrompt } : {}),
                        },
                    );

                    nextRecentPaths = updateRecentMachinePaths(
                        nextRecentPaths,
                        plannedMember.machineId,
                        plannedMember.workspacePath,
                    );
                    successCount += 1;
                } catch (error) {
                    failures.push(`${plannedMember.displayName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }

            sync.applySettings({ recentMachinePaths: nextRecentPaths });
            await sync.fetchArtifactWithBody(result.team.id);

            if (successCount === 0) {
                throw new Error(failures[0] ?? 'Failed to run corps.');
            }

            if (failures.length > 0) {
                await AppModal.alert(
                    t('agents.buildCorpsStart'),
                    `${teamName} 已运行 ${successCount}/${result.plannedMembers.length} 位成员。\n\n${failures.join('\n')}`,
                );
            }

            onSuccess(result.team.id);
        } catch (error) {
            await AppModal.alert(
                t('common.error'),
                error instanceof Error ? error.message : 'Failed to run corps.',
            );
        } finally {
            setRunningCorps(false);
        }
    }, [
        canRunCorps,
        defaultMachineId,
        defaultWorkspacePath,
        draft,
        onSuccess,
        recentPaths,
        runningCorps,
    ]);

    return (
        <Modal
            visible
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable
                    style={[styles.sheet, { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider }]}
                    onPress={() => {}}
                >
                    <View style={[styles.header, { borderBottomColor: theme.colors.divider }]}>
                        <View style={styles.headerCopy}>
                            <Text style={[styles.title, { color: theme.colors.text }]}>
                                {t('agents.buildCorpsTitle')}
                            </Text>
                            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                                先选角色，再按成员配置机器、模型和高级参数。保存配置后也可以随时再运行。
                            </Text>
                        </View>
                        <Pressable onPress={onClose} hitSlop={8}>
                            <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
                        </Pressable>
                    </View>

                    <ScrollView style={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        {savedPresets.length > 0 ? (
                            <View style={styles.section}>
                                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                                    已保存军团
                                </Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    <View style={styles.presetRow}>
                                        {savedPresets.map((preset) => (
                                            <Pressable
                                                key={preset.id}
                                                style={[styles.presetCard, { backgroundColor: theme.colors.surfaceHigh, borderColor: theme.colors.divider }]}
                                                onPress={() => handleLoadPreset(preset)}
                                            >
                                                <View style={styles.presetCardHeader}>
                                                    <Text style={[styles.presetTitle, { color: theme.colors.text }]} numberOfLines={1}>
                                                        {preset.label}
                                                    </Text>
                                                    <Pressable
                                                        onPress={() => handleDeletePreset(preset.id)}
                                                        hitSlop={8}
                                                    >
                                                        <Ionicons name="close-outline" size={16} color={theme.colors.textSecondary} />
                                                    </Pressable>
                                                </View>
                                                <Text style={[styles.presetMeta, { color: theme.colors.textSecondary }]}>
                                                    {preset.draft.seats.length} 个角色配置
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                </ScrollView>
                            </View>
                        ) : null}

                        <View style={styles.section}>
                            <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
                                {t('newTeam.teamNameLabel')}
                            </Text>
                            <TextInput
                                style={[styles.input, { color: theme.colors.text, backgroundColor: theme.colors.surfaceHigh, borderColor: theme.colors.divider }]}
                                value={draft.title}
                                onChangeText={(value) => setDraft((current) => ({ ...current, title: value }))}
                                placeholder="例如：增长实验军团"
                                placeholderTextColor={theme.colors.input.placeholder}
                                autoCapitalize="words"
                                autoCorrect={false}
                            />
                        </View>

                        <View style={styles.section}>
                            <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
                                {t('newTeam.teamGoalLabel')}
                            </Text>
                            <TextInput
                                style={[styles.input, styles.multilineInput, { color: theme.colors.text, backgroundColor: theme.colors.surfaceHigh, borderColor: theme.colors.divider }]}
                                value={draft.target}
                                onChangeText={(value) => setDraft((current) => ({ ...current, target: value }))}
                                placeholder="例如：在本周内完成一个落地页、投放文案和数据回收链路"
                                placeholderTextColor={theme.colors.input.placeholder}
                                multiline
                            />
                        </View>

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                                默认运行设置
                            </Text>

                            <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
                                默认机器
                            </Text>
                            <View style={styles.machineWrap}>
                                {machines.map((machine) => {
                                    const selected = machine.id === defaultMachineId;
                                    const online = isMachineOnline(machine);

                                    return (
                                        <Pressable
                                            key={machine.id}
                                            style={[
                                                styles.machineChip,
                                                {
                                                    borderColor: selected ? theme.colors.button.primary.background : theme.colors.divider,
                                                    backgroundColor: selected ? theme.colors.groupped.background : theme.colors.surface,
                                                },
                                                !online && styles.machineChipOffline,
                                            ]}
                                            onPress={() => {
                                                if (!online) {
                                                    return;
                                                }
                                                setDefaultMachineId(machine.id);
                                                setDefaultWorkspaceEdited(false);
                                                setShowDefaultPathDropdown(false);
                                            }}
                                        >
                                            <View style={[styles.statusDot, online ? styles.statusOnline : styles.statusOffline]} />
                                            <Text style={[styles.machineChipText, { color: theme.colors.text }]} numberOfLines={1}>
                                                {getMachineName(machine)}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </View>

                            <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
                                默认目录
                            </Text>
                            <TextInput
                                style={[styles.input, { color: theme.colors.text, backgroundColor: theme.colors.surfaceHigh, borderColor: theme.colors.divider }]}
                                value={defaultWorkspacePath}
                                onChangeText={(value) => {
                                    setDefaultWorkspacePath(value);
                                    setDefaultWorkspaceEdited(true);
                                    setShowDefaultPathDropdown(false);
                                }}
                                placeholder="/Users/you/project"
                                placeholderTextColor={theme.colors.input.placeholder}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                            {knownDefaultPaths.length > 0 ? (
                                <>
                                    <Pressable
                                        style={[styles.advancedToggle, { borderColor: theme.colors.divider, backgroundColor: theme.colors.surface }]}
                                        onPress={() => setShowDefaultPathDropdown((previous) => !previous)}
                                    >
                                        <Text style={[styles.advancedToggleText, { color: theme.colors.text }]}>
                                            最近目录
                                        </Text>
                                        <Ionicons
                                            name={showDefaultPathDropdown ? 'chevron-up' : 'chevron-down'}
                                            size={14}
                                            color={theme.colors.textSecondary}
                                        />
                                    </Pressable>
                                    {showDefaultPathDropdown ? (
                                        <View style={[styles.dropdown, { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider }]}>
                                            {knownDefaultPaths.map((path, index) => (
                                                <Pressable
                                                    key={`${path}-${index}`}
                                                    style={[
                                                        styles.dropdownItem,
                                                        { borderBottomColor: theme.colors.divider },
                                                        index === knownDefaultPaths.length - 1 && styles.dropdownItemLast,
                                                    ]}
                                                    onPress={() => {
                                                        setDefaultWorkspacePath(path);
                                                        setDefaultWorkspaceEdited(true);
                                                        setShowDefaultPathDropdown(false);
                                                    }}
                                                >
                                                    <Text style={[styles.dropdownItemText, { color: theme.colors.text }]} numberOfLines={1}>
                                                        {path}
                                                    </Text>
                                                </Pressable>
                                            ))}
                                        </View>
                                    ) : null}
                                </>
                            ) : null}
                        </View>

                        <View style={styles.section}>
                            <View style={styles.sectionHeaderRow}>
                                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                                    已选成员
                                </Text>
                                <Pressable
                                    style={[styles.primaryInlineButton, { backgroundColor: theme.colors.button.primary.background }]}
                                    onPress={() => setShowRolePicker((previous) => !previous)}
                                >
                                    <Ionicons name="add" size={14} color={theme.colors.button.primary.tint} />
                                    <Text style={[styles.primaryInlineButtonText, { color: theme.colors.button.primary.tint }]}>
                                        {t('agents.buildCorpsAddRole')}
                                    </Text>
                                </Pressable>
                            </View>

                            {selectedMembers.length > 0 ? (
                                <View style={styles.memberPreviewWrap}>
                                    {selectedMembers.map((member) => (
                                        <View
                                            key={member.id}
                                            style={[styles.memberPreviewItem, { backgroundColor: theme.colors.surfaceHigh, borderColor: theme.colors.divider }]}
                                        >
                                            <RoleAvatar roleId={member.roleId} displayName={member.label} size={28} />
                                            <Text style={[styles.memberPreviewLabel, { color: theme.colors.text }]} numberOfLines={1}>
                                                {member.label}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            ) : (
                                <View style={[styles.emptyState, { borderColor: theme.colors.divider }]}>
                                    <Ionicons name="people-outline" size={28} color={theme.colors.textSecondary} />
                                    <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
                                        {t('agents.buildCorpsEmptyHint')}
                                    </Text>
                                </View>
                            )}

                            {showRolePicker ? (
                                <RolePickerPanel
                                    roles={LOCALIZED_TEAM_ROLES}
                                    query={roleQuery}
                                    onQueryChange={setRoleQuery}
                                    roleGenomes={roleGenomes}
                                    onPickRole={handleAddRole}
                                    theme={theme}
                                />
                            ) : null}
                        </View>

                        {draft.seats.length > 0 ? (
                            <View style={styles.section}>
                                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                                    成员卡片
                                </Text>
                                <View style={styles.seatList}>
                                    {draft.seats.map((seat) => (
                                        <SeatCard
                                            key={seat.id}
                                            seat={seat}
                                            role={LOCALIZED_TEAM_ROLES.find((role) => role.id === seat.roleId)}
                                            roleGenome={roleGenomes[seat.roleId]}
                                            machines={machines}
                                            defaultMachineId={defaultMachineId}
                                            defaultWorkspacePath={defaultWorkspacePath}
                                            onChange={(patch) => updateSeat(seat.id, patch)}
                                            onRemove={() => removeSeat(seat.id)}
                                            theme={theme}
                                        />
                                    ))}
                                </View>
                            </View>
                        ) : null}
                    </ScrollView>

                    <View style={[styles.footer, { borderTopColor: theme.colors.divider }]}>
                        <Pressable
                            style={[styles.footerButton, styles.footerButtonSecondary, { borderColor: theme.colors.divider }]}
                            onPress={onClose}
                        >
                            <Text style={[styles.footerButtonText, { color: theme.colors.text }]}>
                                {t('common.cancel')}
                            </Text>
                        </Pressable>

                        <Pressable
                            style={[
                                styles.footerButton,
                                styles.footerButtonSecondary,
                                { borderColor: theme.colors.divider },
                                (!canSavePreset || savingPreset) && styles.footerButtonDisabled,
                            ]}
                            onPress={canSavePreset && !savingPreset ? handleSavePreset : undefined}
                        >
                            {savingPreset ? (
                                <ActivityIndicator size="small" color={theme.colors.text} />
                            ) : (
                                <>
                                    <Ionicons name="bookmark-outline" size={14} color={theme.colors.text} />
                                    <Text style={[styles.footerButtonText, { color: theme.colors.text }]}>
                                        {t('common.save')}
                                    </Text>
                                </>
                            )}
                        </Pressable>

                        <Pressable
                            style={[
                                styles.footerButton,
                                styles.footerButtonPrimary,
                                { backgroundColor: theme.colors.button.primary.background },
                                (!canRunCorps || runningCorps) && styles.footerButtonDisabled,
                            ]}
                            onPress={canRunCorps && !runningCorps ? handleRunCorps : undefined}
                        >
                            {runningCorps ? (
                                <ActivityIndicator size="small" color={theme.colors.button.primary.tint} />
                            ) : (
                                <>
                                    <Ionicons name="rocket-outline" size={14} color={theme.colors.button.primary.tint} />
                                    <Text style={[styles.footerButtonText, { color: theme.colors.button.primary.tint }]}>
                                        {t('agents.buildCorpsStart')}
                                    </Text>
                                </>
                            )}
                        </Pressable>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
});

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.46)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    sheet: {
        width: '100%',
        maxWidth: 880,
        maxHeight: '92%',
        borderRadius: 22,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 16,
        paddingHorizontal: 22,
        paddingTop: 20,
        paddingBottom: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerCopy: {
        flex: 1,
        gap: 6,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
    },
    subtitle: {
        fontSize: 13,
        lineHeight: 20,
    },
    body: {
        paddingHorizontal: 22,
    },
    section: {
        marginTop: 18,
        gap: 10,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    fieldLabel: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    input: {
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: 14,
        paddingVertical: 11,
        fontSize: 15,
    },
    multilineInput: {
        minHeight: 96,
        textAlignVertical: 'top',
        paddingTop: 12,
    },
    presetRow: {
        flexDirection: 'row',
        gap: 10,
        paddingRight: 12,
    },
    presetCard: {
        minWidth: 180,
        maxWidth: 240,
        borderRadius: 14,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 6,
    },
    presetCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    presetTitle: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
    },
    presetMeta: {
        fontSize: 12,
    },
    machineWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    machineChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        maxWidth: '100%',
    },
    machineChipOffline: {
        opacity: 0.45,
    },
    machineChipText: {
        fontSize: 13,
        fontWeight: '500',
        maxWidth: 180,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusOnline: {
        backgroundColor: '#22c55e',
    },
    statusOffline: {
        backgroundColor: '#ef4444',
    },
    advancedToggle: {
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: 14,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    advancedToggleText: {
        fontSize: 13,
        fontWeight: '600',
    },
    dropdown: {
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
    },
    dropdownItem: {
        paddingHorizontal: 14,
        paddingVertical: 11,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    dropdownItemLast: {
        borderBottomWidth: 0,
    },
    dropdownItemText: {
        fontSize: 13,
    },
    primaryInlineButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    primaryInlineButtonText: {
        fontSize: 13,
        fontWeight: '700',
    },
    emptyState: {
        borderRadius: 16,
        borderWidth: StyleSheet.hairlineWidth,
        borderStyle: 'dashed',
        paddingVertical: 28,
        alignItems: 'center',
        gap: 8,
    },
    emptyStateText: {
        fontSize: 13,
    },
    memberPreviewWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    memberPreviewItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: StyleSheet.hairlineWidth,
        maxWidth: '100%',
    },
    memberPreviewLabel: {
        fontSize: 13,
        fontWeight: '600',
        maxWidth: 160,
    },
    rolePickerPanel: {
        marginTop: 4,
        borderRadius: 18,
        borderWidth: StyleSheet.hairlineWidth,
        padding: 14,
        gap: 12,
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
    },
    rolePickerScroll: {
        maxHeight: 320,
    },
    rolePickerGrid: {
        gap: 10,
    },
    roleCard: {
        borderRadius: 16,
        borderWidth: StyleSheet.hairlineWidth,
        padding: 14,
        gap: 10,
    },
    roleCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    roleCardHeaderText: {
        flex: 1,
        gap: 2,
    },
    roleCardTitle: {
        fontSize: 15,
        fontWeight: '700',
    },
    roleCardSubtle: {
        fontSize: 12,
    },
    roleCardSummary: {
        fontSize: 13,
        lineHeight: 18,
    },
    roleCardFooter: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    metricPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    metricPillText: {
        fontSize: 12,
        fontWeight: '700',
    },
    seatList: {
        gap: 12,
        paddingBottom: 16,
    },
    seatCard: {
        borderRadius: 18,
        borderWidth: StyleSheet.hairlineWidth,
        padding: 16,
        gap: 12,
    },
    seatCardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
    },
    seatIdentity: {
        flex: 1,
        flexDirection: 'row',
        gap: 12,
    },
    seatIdentityText: {
        flex: 1,
        gap: 4,
    },
    seatTitle: {
        fontSize: 15,
        fontWeight: '700',
    },
    seatSummary: {
        fontSize: 13,
        lineHeight: 18,
    },
    metricRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    inlineSection: {
        gap: 8,
    },
    runtimeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    runtimeChip: {
        borderRadius: 10,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    runtimeChipText: {
        fontSize: 13,
        fontWeight: '700',
    },
    quantityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: 10,
        overflow: 'hidden',
        alignSelf: 'flex-start',
    },
    quantityBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderLeftWidth: StyleSheet.hairlineWidth,
        borderRightWidth: StyleSheet.hairlineWidth,
    },
    quantityValue: {
        minWidth: 28,
        textAlign: 'center',
        fontSize: 14,
        fontWeight: '700',
        paddingHorizontal: 8,
    },
    inlineHint: {
        fontSize: 12,
    },
    advancedPanel: {
        borderRadius: 14,
        borderWidth: StyleSheet.hairlineWidth,
        padding: 12,
        gap: 8,
    },
    avatarCircle: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    footer: {
        borderTopWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: 22,
        paddingVertical: 16,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
    },
    footerButton: {
        minHeight: 42,
        minWidth: 118,
        paddingHorizontal: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 6,
    },
    footerButtonSecondary: {
        borderWidth: StyleSheet.hairlineWidth,
    },
    footerButtonPrimary: {},
    footerButtonDisabled: {
        opacity: 0.45,
    },
    footerButtonText: {
        fontSize: 14,
        fontWeight: '700',
    },
});
