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
import { t } from '@/text';
import type { ManualCorpsDraft, ManualCorpsSeatConfig } from '@/sync/settings';
import { searchGenomes, type GenomeRecord } from '@/utils/genomeHub';
import { isMachineOnline } from '@/utils/machineUtils';
import { getKnownPathsForMachine, getRecentPathForMachine, updateRecentMachinePaths } from '@/utils/machinePaths';
import { randomUUID } from '@/utils/uuid';

interface Props {
    onClose: () => void;
    onSuccess: (teamId: string) => void;
}

function buildEmptySeat(): ManualCorpsSeatConfig {
    return {
        id: randomUUID(),
        genomeId: null,
        genomeName: null,
        genomeNamespace: null,
        genomeVersion: null,
        genomeDisplayName: null,
        roleId: 'builder',
        displayName: '',
        runtimeType: 'claude',
        machineId: null,
        workspacePath: '',
        quantity: 1,
        customPrompt: '',
    };
}

function buildDefaultDraft(): ManualCorpsDraft {
    return {
        title: '',
        target: '',
        seats: [],
    };
}

// ─── Genome Search ────────────────────────────────────────────────────────────

function GenomePicker({
    value,
    onChange,
    theme,
}: {
    value: { genomeId: string | null; genomeName: string | null; genomeDisplayName: string | null } | null;
    onChange: (genome: GenomeRecord | null) => void;
    theme: any;
}) {
    const [query, setQuery] = React.useState('');
    const [results, setResults] = React.useState<GenomeRecord[]>([]);
    const [searching, setSearching] = React.useState(false);
    const [open, setOpen] = React.useState(false);
    const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const displayLabel = value?.genomeDisplayName ?? value?.genomeName ?? null;

    const handleSearch = React.useCallback((q: string) => {
        setQuery(q);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!q.trim()) {
            setResults([]);
            return;
        }
        debounceRef.current = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await searchGenomes({ q: q.trim(), limit: 20 });
                setResults(res.genomes.filter(g => !g.spec.includes('"legion"') && !g.spec.includes('"corps"')));
            } catch {
                setResults([]);
            } finally {
                setSearching(false);
            }
        }, 300);
    }, []);

    const handleSelect = React.useCallback((genome: GenomeRecord) => {
        onChange(genome);
        setOpen(false);
        setQuery('');
        setResults([]);
    }, [onChange]);

    const handleClear = React.useCallback(() => {
        onChange(null);
    }, [onChange]);

    return (
        <View>
            <Pressable
                style={[styles.pickerBtn, { backgroundColor: theme.colors.surfaceHigh, borderColor: theme.colors.divider }]}
                onPress={() => setOpen(true)}
            >
                <Ionicons name="cube-outline" size={14} color={theme.colors.textSecondary} />
                <Text style={[styles.pickerBtnText, { color: displayLabel ? theme.colors.text : theme.colors.textSecondary }]} numberOfLines={1}>
                    {displayLabel ?? t('agents.agentGenomePlaceholder')}
                </Text>
                {displayLabel ? (
                    <Pressable onPress={handleClear} hitSlop={8}>
                        <Ionicons name="close-circle" size={14} color={theme.colors.textSecondary} />
                    </Pressable>
                ) : null}
            </Pressable>

            {open ? (
                <View style={[styles.pickerDropdown, { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider }]}>
                    <View style={[styles.pickerSearchRow, { borderBottomColor: theme.colors.divider }]}>
                        <Ionicons name="search-outline" size={14} color={theme.colors.textSecondary} />
                        <TextInput
                            style={[styles.pickerSearchInput, { color: theme.colors.text }]}
                            value={query}
                            onChangeText={handleSearch}
                            placeholder={t('agents.searchPlaceholder')}
                            placeholderTextColor={theme.colors.input.placeholder}
                            autoFocus
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        {searching ? <ActivityIndicator size="small" color={theme.colors.textSecondary} /> : null}
                    </View>
                    <ScrollView style={{ maxHeight: 180 }} keyboardShouldPersistTaps="handled">
                        {results.map(g => (
                            <Pressable
                                key={g.id}
                                style={[styles.pickerResultRow, { borderBottomColor: theme.colors.divider }]}
                                onPress={() => handleSelect(g)}
                            >
                                <Text style={[styles.pickerResultName, { color: theme.colors.text }]} numberOfLines={1}>
                                    {g.name}
                                </Text>
                                {g.description ? (
                                    <Text style={[styles.pickerResultDesc, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                                        {g.description}
                                    </Text>
                                ) : null}
                            </Pressable>
                        ))}
                        {!searching && query.trim() && results.length === 0 ? (
                            <Text style={[styles.pickerResultDesc, { color: theme.colors.textSecondary, padding: 12 }]}>
                                {t('agents.noResults')}
                            </Text>
                        ) : null}
                    </ScrollView>
                    <Pressable
                        style={[styles.pickerCloseBtn, { borderTopColor: theme.colors.divider }]}
                        onPress={() => setOpen(false)}
                    >
                        <Text style={[styles.pickerCloseBtnText, { color: theme.colors.textSecondary }]}>
                            {t('common.cancel')}
                        </Text>
                    </Pressable>
                </View>
            ) : null}
        </View>
    );
}

// ─── Seat Row ─────────────────────────────────────────────────────────────────

function SeatRow({
    seat,
    onChange,
    onRemove,
    theme,
}: {
    seat: ManualCorpsSeatConfig;
    onChange: (patch: Partial<ManualCorpsSeatConfig>) => void;
    onRemove: () => void;
    theme: any;
}) {
    return (
        <View style={[styles.seatCard, { backgroundColor: theme.colors.surfaceHigh, borderColor: theme.colors.divider }]}>
            <View style={styles.seatHeader}>
                <Text style={[styles.seatLabel, { color: theme.colors.textSecondary }]}>
                    {t('agents.agentGenome')}
                </Text>
                <Pressable onPress={onRemove} hitSlop={8}>
                    <Ionicons name="trash-outline" size={16} color={theme.colors.textSecondary} />
                </Pressable>
            </View>

            <GenomePicker
                value={{ genomeId: seat.genomeId, genomeName: seat.genomeName, genomeDisplayName: seat.genomeDisplayName }}
                onChange={(genome) => {
                    if (genome) {
                        onChange({
                            genomeId: genome.id,
                            genomeName: genome.name,
                            genomeNamespace: genome.namespace ?? null,
                            genomeVersion: genome.version,
                            genomeDisplayName: genome.name,
                            displayName: genome.name,
                        });
                    } else {
                        onChange({
                            genomeId: null,
                            genomeName: null,
                            genomeNamespace: null,
                            genomeVersion: null,
                            genomeDisplayName: null,
                        });
                    }
                }}
                theme={theme}
            />

            <View style={styles.seatRow}>
                <View style={styles.seatFieldHalf}>
                    <Text style={[styles.seatLabel, { color: theme.colors.textSecondary }]}>
                        {t('agents.agentName')}
                    </Text>
                    <TextInput
                        style={[styles.seatInput, { color: theme.colors.text, backgroundColor: theme.colors.surface, borderColor: theme.colors.divider }]}
                        value={seat.displayName}
                        onChangeText={(v) => onChange({ displayName: v })}
                        placeholder={t('agents.agentNamePlaceholder')}
                        placeholderTextColor={theme.colors.input.placeholder}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                </View>
                <View style={styles.seatFieldHalf}>
                    <Text style={[styles.seatLabel, { color: theme.colors.textSecondary }]}>
                        {t('agents.roleIdLabel')}
                    </Text>
                    <TextInput
                        style={[styles.seatInput, { color: theme.colors.text, backgroundColor: theme.colors.surface, borderColor: theme.colors.divider }]}
                        value={seat.roleId}
                        onChangeText={(v) => onChange({ roleId: v })}
                        placeholder={t('agents.roleIdPlaceholder')}
                        placeholderTextColor={theme.colors.input.placeholder}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                </View>
            </View>

            <View style={styles.seatRow}>
                {/* Runtime toggle */}
                <View style={{ flex: 1 }}>
                    <Text style={[styles.seatLabel, { color: theme.colors.textSecondary }]}>
                        {t('agents.agentRuntime')}
                    </Text>
                    <View style={styles.runtimeRow}>
                        {(['claude', 'codex'] as const).map(rt => (
                            <Pressable
                                key={rt}
                                style={[
                                    styles.runtimeChip,
                                    {
                                        borderColor: seat.runtimeType === rt ? theme.colors.button.primary.background : theme.colors.divider,
                                        backgroundColor: seat.runtimeType === rt ? theme.colors.button.primary.background : theme.colors.surface,
                                    },
                                ]}
                                onPress={() => onChange({ runtimeType: rt })}
                            >
                                <Text style={[styles.runtimeChipText, { color: seat.runtimeType === rt ? theme.colors.button.primary.tint : theme.colors.text }]}>
                                    {rt === 'claude' ? 'Claude' : 'Codex'}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                </View>

                {/* Quantity */}
                <View>
                    <Text style={[styles.seatLabel, { color: theme.colors.textSecondary }]}>
                        {t('agents.memberCount', { count: seat.quantity })}
                    </Text>
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
                            onPress={() => onChange({ quantity: Math.min(10, seat.quantity + 1) })}
                            style={[styles.quantityBtn, { borderLeftColor: theme.colors.divider }]}
                        >
                            <Ionicons name="add" size={14} color={theme.colors.text} />
                        </Pressable>
                    </View>
                </View>
            </View>
        </View>
    );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export const ManualCorpsBuilderModal = React.memo(function ManualCorpsBuilderModal({ onClose, onSuccess }: Props) {
    const { theme } = useUnistyles();
    const machines = useAllMachines();
    const recentPaths = useSetting('recentMachinePaths');
    const cachedDraft = useSetting('manualCorpsDraft');

    const [draft, setDraft] = React.useState<ManualCorpsDraft>(() => cachedDraft ?? buildDefaultDraft());
    const [selectedMachineId, setSelectedMachineId] = React.useState<string | null>(
        () => machines.find(isMachineOnline)?.id ?? null,
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

    const selectedMachine = machines.find(m => m.id === selectedMachineId) ?? null;

    // Auto-save draft to settings
    React.useEffect(() => {
        sync.applySettings({ manualCorpsDraft: draft });
    }, [draft]);

    const updateSeat = React.useCallback((seatId: string, patch: Partial<ManualCorpsSeatConfig>) => {
        setDraft(current => ({
            ...current,
            seats: current.seats.map(s => s.id === seatId ? { ...s, ...patch } : s),
        }));
    }, []);

    const removeSeat = React.useCallback((seatId: string) => {
        setDraft(current => ({
            ...current,
            seats: current.seats.filter(s => s.id !== seatId),
        }));
    }, []);

    const addSeat = React.useCallback(() => {
        setDraft(current => ({
            ...current,
            seats: [...current.seats, buildEmptySeat()],
        }));
    }, []);

    const totalMemberCount = draft.seats.reduce((sum, s) => sum + s.quantity, 0);
    const hasSelectedGenomeForEverySeat = draft.seats.every((seat) => !!seat.genomeId);

    const canStart = !!selectedMachineId
        && !!cwd.trim()
        && draft.seats.length > 0
        && hasSelectedGenomeForEverySeat
        && !!selectedMachine
        && isMachineOnline(selectedMachine);

    const handleStart = React.useCallback(async () => {
        if (!canStart || !selectedMachineId || !cwd.trim() || deploying) return;

        setDeploying(true);
        try {
            const missingGenomeSeat = draft.seats.find((seat) => !seat.genomeId);
            if (missingGenomeSeat) {
                throw new Error(`Please select a marketplace genome for ${missingGenomeSeat.displayName || missingGenomeSeat.roleId}.`);
            }

            const teamName = draft.title.trim() || 'My Corps';
            const result = await sync.createCorps({
                name: teamName,
                ...(draft.target.trim() ? { description: draft.target.trim(), target: draft.target.trim() } : {}),
                machineId: selectedMachineId,
                workspacePath: cwd.trim(),
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
                    machineId: seat.machineId ?? selectedMachineId,
                    workspacePath: seat.workspacePath.trim() || cwd.trim(),
                    quantity: seat.quantity,
                    customPrompt: seat.customPrompt.trim() || undefined,
                })),
            });
            await sync.fetchArtifactWithBody(result.team.id);

            const updatedPaths = updateRecentMachinePaths(recentPaths, selectedMachineId, cwd.trim());
            sync.applySettings({ recentMachinePaths: updatedPaths });

            onSuccess(result.team.id);
        } catch (error) {
            await AppModal.alert(
                t('common.error'),
                error instanceof Error ? error.message : 'Failed to start corps.',
            );
        } finally {
            setDeploying(false);
        }
    }, [canStart, cwd, deploying, draft, onSuccess, recentPaths, selectedMachineId]);

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
                        <Text style={[styles.title, { color: theme.colors.text }]}>
                            {t('agents.buildCorpsTitle')}
                        </Text>
                        <Pressable onPress={onClose} hitSlop={8}>
                            <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
                        </Pressable>
                    </View>

                    <ScrollView style={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        {/* Corps name */}
                        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
                            {t('newTeam.teamNameLabel')}
                        </Text>
                        <TextInput
                            style={[styles.input, { color: theme.colors.text, backgroundColor: theme.colors.surfaceHigh, borderColor: theme.colors.divider }]}
                            value={draft.title}
                            onChangeText={(v) => setDraft(d => ({ ...d, title: v }))}
                            placeholder="My Corps"
                            placeholderTextColor={theme.colors.input.placeholder}
                            autoCapitalize="words"
                            autoCorrect={false}
                        />

                        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
                            {t('newTeam.teamGoalLabel')}
                        </Text>
                        <TextInput
                            style={[styles.input, { color: theme.colors.text, backgroundColor: theme.colors.surfaceHigh, borderColor: theme.colors.divider }]}
                            value={draft.target}
                            onChangeText={(v) => setDraft(d => ({ ...d, target: v }))}
                            placeholder="e.g. Build a new landing page"
                            placeholderTextColor={theme.colors.input.placeholder}
                            autoCapitalize="sentences"
                            autoCorrect={false}
                        />

                        {/* Machine */}
                        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
                            {t('agents.selectMachine')}
                        </Text>
                        {machines.length === 0 ? (
                            <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
                                {t('agents.noMachinesHint')}
                            </Text>
                        ) : (
                            <View style={styles.machineList}>
                                {machines.map(machine => {
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

                        {/* Working Directory */}
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
                                    onPress={() => setShowPathDropdown(v => !v)}
                                >
                                    <Text style={[styles.dropdownToggleText, { color: theme.colors.textSecondary }]}>
                                        {t('agents.recentPaths')}
                                    </Text>
                                    <Ionicons name={showPathDropdown ? 'chevron-up' : 'chevron-down'} size={14} color={theme.colors.textSecondary} />
                                </Pressable>
                                {showPathDropdown ? (
                                    <View style={[styles.dropdown, { borderColor: theme.colors.divider, backgroundColor: theme.colors.surface }]}>
                                        {knownPaths.map(path => (
                                            <Pressable
                                                key={path}
                                                style={[styles.dropdownItem, { borderBottomColor: theme.colors.divider }]}
                                                onPress={() => { setCwd(path); setShowPathDropdown(false); }}
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

                        {/* Seats */}
                        <View style={[styles.seatsHeader, { marginTop: 20 }]}>
                            <Text style={[styles.label, { color: theme.colors.textSecondary, marginTop: 0, marginBottom: 0 }]}>
                                {t('agents.members')} ({totalMemberCount})
                            </Text>
                            <Pressable
                                style={[styles.addSeatBtn, { backgroundColor: theme.colors.button.primary.background }]}
                                onPress={addSeat}
                            >
                                <Ionicons name="add" size={14} color={theme.colors.button.primary.tint} />
                                <Text style={[styles.addSeatBtnText, { color: theme.colors.button.primary.tint }]}>
                                    {t('agents.buildCorpsAddRole')}
                                </Text>
                            </Pressable>
                        </View>

                        {draft.seats.length === 0 ? (
                            <View style={[styles.emptySeats, { borderColor: theme.colors.divider }]}>
                                <Ionicons name="people-outline" size={28} color={theme.colors.textSecondary} />
                                <Text style={[styles.emptySeatsText, { color: theme.colors.textSecondary }]}>
                                    {t('agents.buildCorpsEmptyHint')}
                                </Text>
                            </View>
                        ) : (
                            <View style={{ gap: 10, marginBottom: 16 }}>
                                {draft.seats.map(seat => (
                                    <SeatRow
                                        key={seat.id}
                                        seat={seat}
                                        onChange={(patch) => updateSeat(seat.id, patch)}
                                        onRemove={() => removeSeat(seat.id)}
                                        theme={theme}
                                    />
                                ))}
                            </View>
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
                            style={[
                                styles.btn,
                                styles.btnPrimary,
                                { backgroundColor: theme.colors.button.primary.background },
                                (!canStart || deploying) && styles.btnDisabled,
                            ]}
                            onPress={canStart && !deploying ? handleStart : undefined}
                        >
                            {deploying ? (
                                <ActivityIndicator size="small" color={theme.colors.button.primary.tint} />
                            ) : (
                                <>
                                    <Ionicons name="rocket-outline" size={14} color={theme.colors.button.primary.tint} style={{ marginRight: 6 }} />
                                    <Text style={[styles.btnText, { color: theme.colors.button.primary.tint }]}>
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
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    sheet: {
        width: '100%',
        maxWidth: 580,
        maxHeight: '90%',
        borderRadius: 18,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    title: {
        fontSize: 19,
        fontWeight: '700',
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
        marginVertical: 6,
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
    machineChipOffline: { opacity: 0.45 },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusOnline: { backgroundColor: '#22c55e' },
    statusOffline: { backgroundColor: '#ef4444' },
    machineName: { fontSize: 14, fontWeight: '500', maxWidth: 220 },
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
    dropdownToggleText: { fontSize: 13 },
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
    dropdownItemText: { fontSize: 13 },
    seatsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    addSeatBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 7,
    },
    addSeatBtnText: { fontSize: 13, fontWeight: '600' },
    emptySeats: {
        alignItems: 'center',
        paddingVertical: 28,
        borderRadius: 14,
        borderWidth: StyleSheet.hairlineWidth,
        borderStyle: 'dashed',
        marginTop: 10,
        marginBottom: 16,
        gap: 8,
    },
    emptySeatsText: { fontSize: 13 },
    seatCard: {
        borderRadius: 14,
        borderWidth: StyleSheet.hairlineWidth,
        padding: 14,
        gap: 10,
    },
    seatHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    seatLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
    seatRow: { flexDirection: 'row', gap: 10 },
    seatFieldHalf: { flex: 1, gap: 6 },
    seatInput: {
        borderRadius: 10,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: 10,
        paddingVertical: 8,
        fontSize: 14,
    },
    runtimeRow: { flexDirection: 'row', gap: 8 },
    runtimeChip: {
        borderRadius: 8,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    runtimeChipText: { fontSize: 13, fontWeight: '500' },
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
        borderWidth: 0,
    },
    quantityValue: { fontSize: 14, fontWeight: '600', paddingHorizontal: 4, minWidth: 20, textAlign: 'center' },
    pickerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderRadius: 10,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    pickerBtnText: { flex: 1, fontSize: 14 },
    pickerDropdown: {
        marginTop: 6,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
        zIndex: 999,
    },
    pickerSearchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    pickerSearchInput: { flex: 1, fontSize: 14 },
    pickerResultRow: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        gap: 2,
    },
    pickerResultName: { fontSize: 14, fontWeight: '500' },
    pickerResultDesc: { fontSize: 12 },
    pickerCloseBtn: {
        paddingVertical: 10,
        alignItems: 'center',
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    pickerCloseBtnText: { fontSize: 13 },
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
    btnCancel: { borderWidth: StyleSheet.hairlineWidth },
    btnPrimary: {},
    btnDisabled: { opacity: 0.45 },
    btnText: { fontSize: 14, fontWeight: '600' },
});
