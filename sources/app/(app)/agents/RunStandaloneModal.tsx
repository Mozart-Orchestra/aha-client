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
import { useAllMachines, useSetting } from '@/sync/storage';
import { isMachineOnline } from '@/utils/machineUtils';
import { getRecentPathForMachine, getKnownPathsForMachine, updateRecentMachinePaths } from '@/utils/machinePaths';
import { createAgent } from '@/sync/apiAgents';
import { parseAgentImage } from '@/utils/genomeHub';
import type { GenomeRecord } from '@/utils/genomeHub';
import { randomUUID } from '@/utils/uuid';

interface Props {
    genome: GenomeRecord;
    onClose: () => void;
    onSuccess: () => void;
}

/**
 * Modal for spawning a genome as a standalone agent.
 * Flow:
 *  1. User selects a machine (chip row)
 *  2. User enters / selects a working directory
 *  3. On confirm: spawnSessionOnMachine() → createAgent(sessionId=...) → persist recent path
 */
export const RunStandaloneModal = React.memo(function RunStandaloneModal({ genome, onClose, onSuccess }: Props) {
    const { theme } = useUnistyles();
    const machines = useAllMachines();
    const recentPaths = useSetting('recentMachinePaths');

    const spec = React.useMemo(() => parseAgentImage(genome.spec), [genome.spec]);
    const runtimeType = (spec?.runtimeType === 'codex' ? 'codex' : 'claude') as 'claude' | 'codex';
    const roleId = spec?.baseRoleId ?? spec?.teamRole ?? 'standalone';

    const [selectedMachineId, setSelectedMachineId] = React.useState<string | null>(
        () => machines.find(isMachineOnline)?.id ?? null,
    );
    const [agentName, setAgentName] = React.useState(genome.name);
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
    const canRun = !!selectedMachineId && !!cwd.trim() && selectedMachine && isMachineOnline(selectedMachine);

    const handleRun = React.useCallback(async () => {
        const credentials = sync.getCredentials();
        if (!credentials || !selectedMachineId || !cwd.trim()) return;

        setSpawning(true);
        try {
            const resolvedName = agentName.trim() || genome.name;
            const generatedSessionTag = `standalone:${randomUUID()}`;

            const sessionId = await sync.spawnSessionOnMachine(selectedMachineId, {
                directory: cwd.trim(),
                agent: runtimeType,
                sessionTag: generatedSessionTag,
                role: roleId,
                specId: genome.id,
                sessionName: resolvedName,
            });

            if (!sessionId) {
                throw new Error('Spawn returned no session ID');
            }

            await createAgent(credentials, {
                displayName: resolvedName,
                genomeId: genome.id,
                genomeSpec: JSON.parse(genome.spec),
                runtimeType,
                sessionId,
                sessionTag: generatedSessionTag,
                metadata: {
                    source: 'marketplace-deploy',
                    deployMode: 'standalone',
                },
            });

            const updatedPaths = updateRecentMachinePaths(recentPaths, selectedMachineId, cwd.trim());
            sync.applySettings({ recentMachinePaths: updatedPaths });
            onSuccess();
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Unknown error';
            // Import Modal lazily to avoid circular import with the RN Modal here
            const { Modal: AppModal } = require('@/modal');
            AppModal.alert(t('common.error'), msg);
        } finally {
            setSpawning(false);
        }
    }, [agentName, cwd, genome, onSuccess, recentPaths, roleId, runtimeType, selectedMachineId]);

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
                            {t('agents.runStandaloneTitle')}
                        </Text>
                        <View style={[styles.genomeBadge, { backgroundColor: theme.colors.surfaceHigh }]}>
                            <Text style={[styles.genomeBadgeText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                                {genome.name}
                            </Text>
                        </View>
                    </View>

                    <ScrollView style={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        {/* Agent Name */}
                        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
                            {t('agents.agentNameLabel')}
                        </Text>
                        <TextInput
                            style={[styles.input, { color: theme.colors.text, backgroundColor: theme.colors.surfaceHigh, borderColor: theme.colors.divider }]}
                            value={agentName}
                            onChangeText={setAgentName}
                            placeholder={genome.name}
                            placeholderTextColor={theme.colors.input.placeholder}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />

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
                    </ScrollView>

                    {/* Actions */}
                    <View style={[styles.footer, { borderTopColor: theme.colors.divider }]}>
                        <Pressable
                            style={[styles.btn, styles.btnCancel, { borderColor: theme.colors.divider }]}
                            onPress={onClose}
                        >
                            <Text style={[styles.btnText, { color: theme.colors.text }]}>{t('common.cancel')}</Text>
                        </Pressable>
                        <Pressable
                            style={[styles.btn, styles.btnPrimary, { backgroundColor: theme.colors.button.primary.background }, !canRun && styles.btnDisabled]}
                            onPress={canRun && !spawning ? handleRun : undefined}
                        >
                            {spawning ? (
                                <ActivityIndicator size="small" color={theme.colors.button.primary.tint} />
                            ) : (
                                <>
                                    <Ionicons name="play" size={14} color={theme.colors.button.primary.tint} style={{ marginRight: 6 }} />
                                    <Text style={[styles.btnText, { color: theme.colors.button.primary.tint }]}>
                                        {t('agents.runStandalone')}
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
    input: {
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
    } as any,
    hint: {
        fontSize: 13,
        fontStyle: 'italic',
        marginBottom: 4,
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
