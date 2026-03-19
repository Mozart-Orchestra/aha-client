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
import { sync } from '@/sync/sync';
import type { KanbanTeamMember } from '@/sync/kanbanTypes';
import { useAllMachines, useSetting } from '@/sync/storage';
import { t } from '@/text';
import {
    buildCorpsSeedBoard,
    expandCorpsMemberPlans,
    getDefaultCorpsTeamName,
    parseCorpsGenomeRef,
} from '@/utils/corpsDeployment';
import { fetchGenomeByName, parseCorpsSpec, parseSpec, type GenomeRecord } from '@/utils/genomeHub';
import { isMachineOnline } from '@/utils/machineUtils';
import { getKnownPathsForMachine, getRecentPathForMachine, updateRecentMachinePaths } from '@/utils/machinePaths';
import { randomUUID } from '@/utils/uuid';

interface Props {
    genome: GenomeRecord;
    onClose: () => void;
    onSuccess: (teamId: string) => void;
}

function buildTeamMemberSessionTag(teamId: string, memberId: string): string {
    return `team:${teamId}:member:${memberId}`;
}

export const DeployCorpsModal = React.memo(function DeployCorpsModal({ genome, onClose, onSuccess }: Props) {
    const { theme } = useUnistyles();
    const machines = useAllMachines();
    const recentPaths = useSetting('recentMachinePaths');

    const corps = React.useMemo(() => parseCorpsSpec(genome.spec), [genome.spec]);
    const memberPlans = React.useMemo(() => (corps ? expandCorpsMemberPlans(corps) : []), [corps]);

    const [selectedMachineId, setSelectedMachineId] = React.useState<string | null>(
        () => machines.find(isMachineOnline)?.id ?? null,
    );
    const [teamName, setTeamName] = React.useState(
        () => (corps ? getDefaultCorpsTeamName(genome.name, corps) : genome.name),
    );
    const [cwd, setCwd] = React.useState('');
    const [showPathDropdown, setShowPathDropdown] = React.useState(false);
    const [deploying, setDeploying] = React.useState(false);

    React.useEffect(() => {
        setCwd(getRecentPathForMachine(selectedMachineId, recentPaths));
    }, [recentPaths, selectedMachineId]);

    const knownPaths = React.useMemo(
        () => getKnownPathsForMachine(selectedMachineId, recentPaths),
        [recentPaths, selectedMachineId],
    );

    const selectedMachine = machines.find((machine) => machine.id === selectedMachineId) ?? null;
    const canDeploy = !!corps && memberPlans.length > 0 && !!selectedMachineId && !!cwd.trim() && !!selectedMachine && isMachineOnline(selectedMachine);

    const handleDeploy = React.useCallback(async () => {
        if (!corps || memberPlans.length === 0 || !selectedMachineId || !cwd.trim()) {
            return;
        }

        setDeploying(true);

        try {
            const resolvedName = teamName.trim() || getDefaultCorpsTeamName(genome.name, corps);
            const description = genome.description ?? corps.description ?? '';
            const teamId = randomUUID();

            const uniqueRefs = [...new Set(memberPlans.map((plan) => plan.genomeRef))];
            const genomesByRef = new Map<string, GenomeRecord | null>();

            await Promise.all(uniqueRefs.map(async (ref) => {
                const parsed = parseCorpsGenomeRef(ref);
                if (!parsed) {
                    genomesByRef.set(ref, null);
                    return;
                }

                try {
                    const memberGenome = await fetchGenomeByName(parsed.namespace, parsed.name);
                    genomesByRef.set(ref, memberGenome);
                } catch {
                    genomesByRef.set(ref, null);
                }
            }));

            const spawnedMembers: KanbanTeamMember[] = [];
            const failures: string[] = [];

            for (const plan of memberPlans) {
                const matchedGenome = genomesByRef.get(plan.genomeRef) ?? null;
                const matchedSpec = matchedGenome ? parseSpec(matchedGenome.spec) : null;
                const runtimeType = matchedSpec?.runtimeType === 'codex' ? 'codex' : 'claude';
                const memberId = randomUUID();
                const sessionTag = buildTeamMemberSessionTag(teamId, memberId);

                try {
                    const sessionId = await sync.spawnSessionOnMachine(selectedMachineId, {
                        directory: cwd.trim(),
                        agent: runtimeType,
                        sessionTag,
                        teamId,
                        role: plan.roleId,
                        sessionName: plan.displayName,
                        sessionPath: cwd.trim(),
                        ...(matchedGenome ? { specId: matchedGenome.id } : {}),
                        env: {
                            AHA_TEAM_MEMBER_ID: memberId,
                        },
                    });

                    if (!sessionId) {
                        failures.push(`${plan.displayName}: spawn returned no session ID`);
                        continue;
                    }

                    spawnedMembers.push({
                        memberId,
                        sessionId,
                        sessionTag,
                        roleId: plan.roleId,
                        displayName: plan.displayName,
                        ...(matchedGenome ? { specId: matchedGenome.id } : {}),
                        runtimeType,
                        lifecycle: {
                            spawnRequestedAt: Date.now(),
                        },
                    });
                } catch (error) {
                    failures.push(`${plan.displayName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }

            if (spawnedMembers.length === 0) {
                throw new Error(failures[0] ?? 'Failed to deploy corps template.');
            }

            const board = buildCorpsSeedBoard({
                name: resolvedName,
                corps: {
                    ...corps,
                    description,
                },
                members: spawnedMembers,
            });

            await sync.registerTeam({
                id: teamId,
                name: resolvedName,
                ...(description ? { description } : {}),
                board,
            });
            await sync.fetchArtifactWithBody(teamId);

            const updatedPaths = updateRecentMachinePaths(recentPaths, selectedMachineId, cwd.trim());
            sync.applySettings({ recentMachinePaths: updatedPaths });

            if (failures.length > 0) {
                const { Modal: AppModal } = require('@/modal');
                await AppModal.alert(
                    t('agents.deployCorps'),
                    `${resolvedName} was created with ${spawnedMembers.length}/${memberPlans.length} agents.\n\n${failures.join('\n')}`,
                );
            }

            onSuccess(teamId);
        } catch (error) {
            const { Modal: AppModal } = require('@/modal');
            await AppModal.alert(
                t('common.error'),
                error instanceof Error ? error.message : 'Failed to deploy corps template.',
            );
        } finally {
            setDeploying(false);
        }
    }, [corps, cwd, genome.description, genome.name, memberPlans, onSuccess, recentPaths, selectedMachineId, teamName]);

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
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: theme.colors.text }]}>
                            {t('agents.deployCorps')}
                        </Text>
                        <View style={[styles.genomeBadge, { backgroundColor: theme.colors.surfaceHigh }]}>
                            <Text style={[styles.genomeBadgeText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                                {genome.name}
                            </Text>
                        </View>
                    </View>

                    <ScrollView style={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        {!corps ? (
                            <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
                                Invalid corps template.
                            </Text>
                        ) : (
                            <>
                                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
                                    {t('newTeam.teamNameLabel')}
                                </Text>
                                <TextInput
                                    style={[styles.input, { color: theme.colors.text, backgroundColor: theme.colors.surfaceHigh, borderColor: theme.colors.divider }]}
                                    value={teamName}
                                    onChangeText={setTeamName}
                                    placeholder={genome.name}
                                    placeholderTextColor={theme.colors.input.placeholder}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />

                                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
                                    {t('agents.selectMachine')}
                                </Text>
                                {machines.length === 0 ? (
                                    <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
                                        {t('agents.noMachinesHint')}
                                    </Text>
                                ) : (
                                    <View style={styles.machineList}>
                                        {machines.map((machine) => {
                                            const online = isMachineOnline(machine);
                                            const selected = machine.id === selectedMachineId;

                                            return (
                                                <Pressable
                                                    key={machine.id}
                                                    style={[
                                                        styles.machineChip,
                                                        { borderColor: theme.colors.divider, backgroundColor: theme.colors.surface },
                                                        selected && { borderColor: theme.colors.button.primary.background, backgroundColor: theme.colors.groupped.background },
                                                        !online && styles.machineChipOffline,
                                                    ]}
                                                    onPress={() => online ? setSelectedMachineId(machine.id) : undefined}
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

                                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
                                    {t('agents.workingDirectory')}
                                </Text>
                                <TextInput
                                    style={[styles.input, { color: theme.colors.text, backgroundColor: theme.colors.surfaceHigh, borderColor: theme.colors.divider }]}
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
                                            onPress={() => setShowPathDropdown((value) => !value)}
                                        >
                                            <Text style={[styles.dropdownToggleText, { color: theme.colors.textSecondary }]}>
                                                Recent paths
                                            </Text>
                                            <Ionicons
                                                name={showPathDropdown ? 'chevron-up' : 'chevron-down'}
                                                size={14}
                                                color={theme.colors.textSecondary}
                                            />
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
                                                        <Text style={[styles.dropdownItemText, { color: theme.colors.text }]} numberOfLines={1}>
                                                            {path}
                                                        </Text>
                                                    </Pressable>
                                                ))}
                                            </View>
                                        ) : null}
                                    </>
                                ) : null}

                                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
                                    {t('agents.members')}
                                </Text>
                                <View style={styles.memberList}>
                                    {memberPlans.map((plan) => (
                                        <View
                                            key={`${plan.genomeRef}-${plan.roleId}-${plan.ordinal}`}
                                            style={[styles.memberChip, { backgroundColor: theme.colors.surfaceHigh, borderColor: theme.colors.divider }]}
                                        >
                                            <Text style={[styles.memberChipText, { color: theme.colors.text }]}>
                                                {plan.displayName}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            </>
                        )}
                    </ScrollView>

                    <View style={[styles.footer, { borderTopColor: theme.colors.divider }]}>
                        <Pressable
                            style={[styles.btn, styles.btnCancel, { borderColor: theme.colors.divider }]}
                            onPress={onClose}
                        >
                            <Text style={[styles.btnText, { color: theme.colors.text }]}>
                                {t('common.cancel')}
                            </Text>
                        </Pressable>
                        <Pressable
                            style={[styles.btn, styles.btnPrimary, { backgroundColor: theme.colors.button.primary.background }, !canDeploy && styles.btnDisabled]}
                            onPress={canDeploy && !deploying ? handleDeploy : undefined}
                        >
                            {deploying ? (
                                <ActivityIndicator size="small" color={theme.colors.button.primary.tint} />
                            ) : (
                                <>
                                    <Ionicons name="rocket-outline" size={14} color={theme.colors.button.primary.tint} style={{ marginRight: 6 }} />
                                    <Text style={[styles.btnText, { color: theme.colors.button.primary.tint }]}>
                                        {t('agents.deployCorps')}
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
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    sheet: {
        width: '100%',
        maxWidth: 560,
        maxHeight: '88%',
        borderRadius: 18,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 14,
        gap: 10,
    },
    title: {
        fontSize: 19,
        fontWeight: '700',
    },
    genomeBadge: {
        alignSelf: 'flex-start',
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 5,
        maxWidth: '100%',
    },
    genomeBadgeText: {
        fontSize: 12,
        fontWeight: '500',
    },
    body: {
        paddingHorizontal: 20,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
        marginTop: 16,
    },
    hint: {
        fontSize: 13,
        lineHeight: 18,
        marginVertical: 8,
    },
    input: {
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
    },
    machineList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    machineChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    machineChipOffline: {
        opacity: 0.45,
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
    machineName: {
        fontSize: 14,
        fontWeight: '500',
        maxWidth: 220,
    },
    dropdownToggle: {
        marginTop: 10,
        borderRadius: 10,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: 12,
        paddingVertical: 10,
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
        borderWidth: StyleSheet.hairlineWidth,
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
    memberList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    memberChip: {
        borderRadius: 999,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    memberChipText: {
        fontSize: 12,
        fontWeight: '500',
    },
    footer: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: StyleSheet.hairlineWidth,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
    },
    btn: {
        minHeight: 42,
        borderRadius: 12,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        minWidth: 120,
    },
    btnCancel: {
        borderWidth: StyleSheet.hairlineWidth,
    },
    btnPrimary: {},
    btnDisabled: {
        opacity: 0.45,
    },
    btnText: {
        fontSize: 14,
        fontWeight: '600',
    },
});
