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
import { t } from '@/text';
import { sync } from '@/sync/sync';
import { useArtifacts, useAllMachines, useSetting } from '@/sync/storage';
import { isMachineOnline } from '@/utils/machineUtils';
import { getRecentPathForMachine, getKnownPathsForMachine, updateRecentMachinePaths } from '@/utils/machinePaths';
import { parseSpec } from '@/utils/genomeHub';
import type { GenomeRecord } from '@/utils/genomeHub';
import { randomUUID } from '@/utils/uuid';

const ROLES = ['implementer', 'architect', 'qa-engineer', 'researcher', 'builder'];

function buildTeamMemberSessionTag(teamId: string, memberId: string): string {
    return `team:${teamId}:member:${memberId}`;
}

interface Props {
    genome: GenomeRecord;
    onClose: () => void;
}

type Step = 'team' | 'machine';

/**
 * Two-step modal for joining a genome agent to an existing team.
 * Step 1: Select team + role
 * Step 2: Select machine + working directory → spawn
 */
export const JoinTeamModal = React.memo(function JoinTeamModal({ genome, onClose }: Props) {
    const { theme } = useUnistyles();
    const allArtifacts = useArtifacts();
    const allMachines = useAllMachines();
    const recentPaths = useSetting('recentMachinePaths');

    const teams = React.useMemo(
        () => allArtifacts.filter((a) => a.type === 'team'),
        [allArtifacts],
    );
    const machines = allMachines;

    const spec = React.useMemo(() => parseSpec(genome.spec), [genome.spec]);
    const runtimeType = (spec?.runtimeType === 'codex' ? 'codex' : 'claude') as 'claude' | 'codex';

    const [step, setStep] = React.useState<Step>('team');
    const [selectedTeamId, setSelectedTeamId] = React.useState<string | null>(null);
    const [selectedRole, setSelectedRole] = React.useState(ROLES[0]);
    const [selectedMachineId, setSelectedMachineId] = React.useState<string | null>(
        () => machines.find(isMachineOnline)?.id ?? null,
    );
    const [cwd, setCwd] = React.useState('');
    const [showPathDropdown, setShowPathDropdown] = React.useState(false);
    const [spawning, setSpawning] = React.useState(false);

    // Update cwd when machine changes
    React.useEffect(() => {
        setCwd(getRecentPathForMachine(selectedMachineId, recentPaths));
    }, [selectedMachineId]);

    const knownPaths = React.useMemo(
        () => getKnownPathsForMachine(selectedMachineId, recentPaths),
        [selectedMachineId],
    );

    const selectedMachine = machines.find((m) => m.id === selectedMachineId) ?? null;
    const canSpawn = !!selectedMachineId && !!cwd.trim() && selectedMachine && isMachineOnline(selectedMachine);

    const handleNext = React.useCallback(() => {
        if (!selectedTeamId) return;
        setStep('machine');
    }, [selectedTeamId]);

    const handleJoin = React.useCallback(async () => {
        if (!selectedTeamId || !selectedMachineId || !cwd.trim()) return;

        setSpawning(true);
        try {
            const memberId = randomUUID();
            const sessionTag = buildTeamMemberSessionTag(selectedTeamId, memberId);
            const sessionName = `${selectedRole} · ${genome.name}`;

            const sessionId = await sync.spawnSessionOnMachine(selectedMachineId, {
                directory: cwd.trim(),
                agent: runtimeType,
                sessionTag,
                teamId: selectedTeamId,
                role: selectedRole,
                specId: genome.id,
                sessionName,
                env: {
                    AHA_TEAM_MEMBER_ID: memberId,
                },
            });

            if (!sessionId) {
                throw new Error('Spawn returned no session ID');
            }

            await sync.addTeamMember(selectedTeamId, sessionId, selectedRole, sessionName, {
                memberId,
                sessionTag,
                specId: genome.id,
                runtimeType,
            });

            const updatedPaths = updateRecentMachinePaths(recentPaths, selectedMachineId, cwd.trim());
            sync.applySettings({ recentMachinePaths: updatedPaths });
            onClose();
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Unknown error';
            const { Modal: AppModal } = require('@/modal');
            AppModal.alert(t('common.error'), msg);
        } finally {
            setSpawning(false);
        }
    }, [cwd, genome, onClose, recentPaths, runtimeType, selectedMachineId, selectedRole, selectedTeamId]);

    return (
        <Modal
            visible
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable style={[styles.sheet, { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider }]} onPress={() => {}}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: theme.colors.text }]}>
                            {t('agents.joinTeamTitle')}
                        </Text>
                        <View style={[styles.genomeBadge, { backgroundColor: theme.colors.surfaceHigh }]}>
                            <Text style={[styles.genomeBadgeText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                                {genome.name}
                            </Text>
                        </View>
                    </View>

                    <ScrollView style={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        {step === 'team' ? (
                            <>
                                {/* Team selector */}
                                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
                                    {t('agents.selectTeam')}
                                </Text>
                                {teams.length === 0 ? (
                                    <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
                                        No teams found. Create a team first.
                                    </Text>
                                ) : (
                                    <View style={styles.teamList}>
                                        {teams.map((team) => {
                                            const selected = team.id === selectedTeamId;
                                            return (
                                                <Pressable
                                                    key={team.id}
                                                    style={[
                                                        styles.teamRow,
                                                        { borderColor: theme.colors.divider, backgroundColor: theme.colors.surface },
                                                        selected && { borderColor: theme.colors.button.primary.background, backgroundColor: theme.colors.groupped.background },
                                                    ]}
                                                    onPress={() => setSelectedTeamId(team.id)}
                                                >
                                                    <View style={[styles.radioOuter, { borderColor: selected ? theme.colors.button.primary.background : theme.colors.divider }]}>
                                                        {selected ? (
                                                            <View style={[styles.radioInner, { backgroundColor: theme.colors.button.primary.background }]} />
                                                        ) : null}
                                                    </View>
                                                    <Text style={[styles.teamName, { color: theme.colors.text }]} numberOfLines={1}>
                                                        {team.title || t('teams.untitledTeam')}
                                                    </Text>
                                                </Pressable>
                                            );
                                        })}
                                    </View>
                                )}

                                {/* Role selector */}
                                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
                                    {t('agents.selectRole')}
                                </Text>
                                <View style={styles.roleList}>
                                    {ROLES.map((role) => {
                                        const active = role === selectedRole;
                                        return (
                                            <Pressable
                                                key={role}
                                                style={[
                                                    styles.roleChip,
                                                    { borderColor: theme.colors.divider, backgroundColor: theme.colors.surface },
                                                    active && { borderColor: theme.colors.button.primary.background, backgroundColor: theme.colors.button.primary.background },
                                                ]}
                                                onPress={() => setSelectedRole(role)}
                                            >
                                                <Text style={[styles.roleChipText, { color: active ? theme.colors.button.primary.tint : theme.colors.text }]}>
                                                    {role}
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            </>
                        ) : (
                            <>
                                {/* Machine selector */}
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

                                {/* Directory */}
                                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
                                    {t('agents.workingDirectory')}
                                </Text>
                                <TextInput
                                    style={[styles.input, { color: theme.colors.text, backgroundColor: theme.colors.surfaceHigh, borderColor: theme.colors.divider }]}
                                    value={cwd}
                                    onChangeText={(v) => { setCwd(v); setShowPathDropdown(false); }}
                                    placeholder={t('agents.directoryPlaceholder')}
                                    placeholderTextColor={theme.colors.input.placeholder}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                                {knownPaths.length > 0 ? (
                                    <>
                                        <Pressable
                                            style={[styles.dropdownToggle, { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider }]}
                                            onPress={() => setShowPathDropdown((v) => !v)}
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
                                                {knownPaths.map((p) => (
                                                    <Pressable
                                                        key={p}
                                                        style={[styles.dropdownItem, { borderBottomColor: theme.colors.divider }]}
                                                        onPress={() => { setCwd(p); setShowPathDropdown(false); }}
                                                    >
                                                        <Text style={[styles.dropdownItemText, { color: theme.colors.text }]} numberOfLines={1}>
                                                            {p}
                                                        </Text>
                                                    </Pressable>
                                                ))}
                                            </View>
                                        ) : null}
                                    </>
                                ) : null}
                            </>
                        )}
                    </ScrollView>

                    {/* Actions */}
                    <View style={[styles.footer, { borderTopColor: theme.colors.divider }]}>
                        <Pressable
                            style={[styles.btn, styles.btnCancel, { borderColor: theme.colors.divider }]}
                            onPress={step === 'team' ? onClose : () => setStep('team')}
                        >
                            <Text style={[styles.btnText, { color: theme.colors.text }]}>
                                {step === 'team' ? t('common.cancel') : t('common.back')}
                            </Text>
                        </Pressable>
                        {step === 'team' ? (
                            <Pressable
                                style={[styles.btn, styles.btnPrimary, { backgroundColor: theme.colors.button.primary.background }, !selectedTeamId && styles.btnDisabled]}
                                onPress={selectedTeamId ? handleNext : undefined}
                            >
                                <Text style={[styles.btnText, { color: theme.colors.button.primary.tint }]}>
                                    {t('common.continue')}
                                </Text>
                                <Ionicons name="chevron-forward" size={14} color={theme.colors.button.primary.tint} style={{ marginLeft: 4 }} />
                            </Pressable>
                        ) : (
                            <Pressable
                                style={[styles.btn, styles.btnPrimary, { backgroundColor: theme.colors.button.primary.background }, !canSpawn && styles.btnDisabled]}
                                onPress={canSpawn && !spawning ? handleJoin : undefined}
                            >
                                {spawning ? (
                                    <ActivityIndicator size="small" color={theme.colors.button.primary.tint} />
                                ) : (
                                    <>
                                        <Ionicons name="people" size={14} color={theme.colors.button.primary.tint} style={{ marginRight: 6 }} />
                                        <Text style={[styles.btnText, { color: theme.colors.button.primary.tint }]}>
                                            {t('agents.joinTeam')}
                                        </Text>
                                    </>
                                )}
                            </Pressable>
                        )}
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
});

const styles = StyleSheet.create((theme) => ({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    sheet: {
        width: '100%',
        maxWidth: 480,
        borderRadius: 20,
        borderWidth: 1,
        maxHeight: '85%',
        overflow: 'hidden',
    },
    header: {
        padding: 20,
        paddingBottom: 12,
        gap: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
    },
    genomeBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
    },
    genomeBadgeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    body: {
        paddingHorizontal: 20,
        paddingBottom: 8,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginTop: 16,
        marginBottom: 8,
    },
    hint: {
        fontSize: 13,
        fontStyle: 'italic',
        marginBottom: 4,
    },
    teamList: {
        gap: 8,
    },
    teamRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    teamName: {
        fontSize: 15,
        fontWeight: '500',
        flex: 1,
    },
    radioOuter: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    roleList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    roleChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
    },
    roleChipText: {
        fontSize: 13,
        fontWeight: '600',
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
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        minWidth: 140,
        flex: 1,
    },
    machineChipOffline: {
        opacity: 0.5,
    },
    machineName: {
        fontSize: 14,
        fontWeight: '500',
        flex: 1,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        flexShrink: 0,
    },
    statusOnline: {
        backgroundColor: '#34C759',
    },
    statusOffline: {
        backgroundColor: theme.colors.textDestructive,
    },
    input: {
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
    } as any,
    dropdownToggle: {
        marginTop: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    dropdownToggleText: {
        fontSize: 12,
        fontWeight: '600',
    },
    dropdown: {
        marginTop: 4,
        borderRadius: 10,
        borderWidth: 1,
        overflow: 'hidden',
    },
    dropdownItem: {
        paddingHorizontal: 14,
        paddingVertical: 11,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    dropdownItemText: {
        fontSize: 13,
    },
    footer: {
        flexDirection: 'row',
        gap: 12,
        padding: 20,
        paddingTop: 16,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    btn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 13,
        borderRadius: 12,
    },
    btnCancel: {
        borderWidth: 1,
    },
    btnPrimary: {},
    btnDisabled: {
        opacity: 0.4,
    },
    btnText: {
        fontSize: 15,
        fontWeight: '600',
    },
}));
