import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text } from '@/components/StyledText';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import { useWizard } from '@/components/WizardContext';
import { useAllMachines } from '@/sync/storage';
import { layout } from '@/components/layout';
import { RoleConfig, generateRoleId } from './types';

interface Step2RolesProps {
    onNext: () => void;
    onBack: () => void;
}

interface RoleBlueprint {
    id: string;
    title: string;
    icon: keyof typeof Ionicons.glyphMap;
    tint: string;
    softBg: string;
    defaultMode: RoleConfig['mode'];
}

const ROLE_BLUEPRINTS: Record<string, RoleBlueprint> = {
    builder: {
        id: 'builder',
        title: 'Builder',
        icon: 'construct',
        tint: '#3D8A5A',
        softBg: '#EAF5EE',
        defaultMode: 'codex',
    },
    qa: {
        id: 'qa',
        title: 'QA Reviewer',
        icon: 'shield-checkmark',
        tint: '#D08068',
        softBg: '#FBEFEB',
        defaultMode: 'claude-code',
    },
    reviewer: {
        id: 'reviewer',
        title: 'Reviewer',
        icon: 'search',
        tint: '#3D8A5A',
        softBg: '#EAF5EE',
        defaultMode: 'claude-code',
    },
    master: {
        id: 'master',
        title: 'Master',
        icon: 'sparkles',
        tint: '#2F7A9B',
        softBg: '#E8F2F7',
        defaultMode: 'claude-code',
    },
};

const MARKET_ROLE_SEQUENCE = ['reviewer', 'master', 'builder', 'qa'] as const;

function machineLabel(machine: any): string {
    return machine?.metadata?.displayName || machine?.metadata?.host || machine?.id?.slice(0, 8) || 'Machine-1';
}

function blueprintFor(roleId: string, roleName?: string): RoleBlueprint {
    if (ROLE_BLUEPRINTS[roleId]) {
        return ROLE_BLUEPRINTS[roleId];
    }

    return {
        id: roleId,
        title: roleName || roleId,
        icon: 'construct',
        tint: '#3D8A5A',
        softBg: '#EAF5EE',
        defaultMode: 'claude-code',
    };
}

function createDefaultRoles(machineId?: string): RoleConfig[] {
    return [
        {
            id: generateRoleId(),
            roleId: 'builder',
            roleName: 'Builder',
            quantity: 2,
            mode: 'codex',
            machineId,
        },
        {
            id: generateRoleId(),
            roleId: 'qa',
            roleName: 'QA Reviewer',
            quantity: 1,
            mode: 'claude-code',
            machineId,
        },
    ];
}

export const Step2Roles = React.memo(function Step2Roles({ onNext, onBack }: Step2RolesProps) {
    const { state, setState } = useWizard();
    const { theme } = useUnistyles();
    const styles = stylesheet;
    const machines = useAllMachines();

    const firstMachineId = machines[0]?.id;

    const [roles, setRoles] = React.useState<RoleConfig[]>(() => {
        if (state.roles.length > 0) {
            return state.roles;
        }
        return createDefaultRoles(firstMachineId);
    });
    const [expandedRoleId, setExpandedRoleId] = React.useState<string | null>(() => {
        return state.roles[0]?.id ?? null;
    });
    const [advancedRoleId, setAdvancedRoleId] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (!firstMachineId) {
            return;
        }
        setRoles((prev) => prev.map((role) => (role.machineId ? role : { ...role, machineId: firstMachineId })));
    }, [firstMachineId]);

    const updateRole = React.useCallback((roleId: string, updater: (role: RoleConfig) => RoleConfig) => {
        setRoles((prev) => prev.map((role) => (role.id === roleId ? updater(role) : role)));
    }, []);

    const handleAddRoleFromMarket = React.useCallback(() => {
        const currentRoleIds = new Set(roles.map((role) => role.roleId));
        const nextRoleId =
            MARKET_ROLE_SEQUENCE.find((roleId) => !currentRoleIds.has(roleId)) ??
            MARKET_ROLE_SEQUENCE[roles.length % MARKET_ROLE_SEQUENCE.length];
        const blueprint = blueprintFor(nextRoleId);

        const newRole: RoleConfig = {
            id: generateRoleId(),
            roleId: nextRoleId,
            roleName: blueprint.title,
            quantity: 1,
            mode: blueprint.defaultMode,
            machineId: firstMachineId,
        };

        setRoles((prev) => [...prev, newRole]);
        setExpandedRoleId(newRole.id);
    }, [roles, firstMachineId]);

    const handleNext = React.useCallback(() => {
        setState({ roles });
        onNext();
    }, [setState, roles, onNext]);

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={[
                styles.contentContainer,
                { maxWidth: layout.maxWidth, alignSelf: 'center', width: '100%' },
            ]}
            testID="wizard-step-2"
        >
            <Text style={styles.sectionTitle}>Configure Roles</Text>
            <Text style={styles.sectionHint}>
                Set up agent roles, quantities and modes for your legion.
            </Text>

            <View style={styles.roleList}>
                {roles.map((role) => {
                    const blueprint = blueprintFor(role.roleId, role.roleName);
                    const isExpanded = expandedRoleId === role.id;
                    const isAdvancedOpen = advancedRoleId === role.id;
                    const roleMachine = machines.find((item) => item.id === role.machineId);
                    const machineName = roleMachine ? machineLabel(roleMachine) : 'Machine-1';
                    const modeLabel = role.mode === 'codex' ? 'codex' : 'claudecode';

                    return (
                        <View key={role.id} style={styles.roleCard}>
                            <View style={styles.roleTop}>
                                <View style={[styles.roleIconWrap, { backgroundColor: blueprint.softBg }]}>
                                    <Ionicons name={blueprint.icon} size={18} color={blueprint.tint} />
                                </View>
                                <Pressable
                                    style={styles.roleInfo}
                                    onPress={() => setExpandedRoleId((prev) => (prev === role.id ? null : role.id))}
                                >
                                    <Text style={styles.roleName}>{role.roleName || blueprint.title}</Text>
                                    <Text style={styles.roleMeta}>
                                        {modeLabel} · x{role.quantity} · {machineName}
                                    </Text>
                                </Pressable>
                                <View style={styles.countWrap}>
                                    <Pressable
                                        style={styles.countButton}
                                        onPress={() =>
                                            updateRole(role.id, (item) => ({
                                                ...item,
                                                quantity: Math.max(1, item.quantity - 1),
                                            }))
                                        }
                                    >
                                        <Text style={styles.countButtonText}>-</Text>
                                    </Pressable>
                                    <Text style={styles.countValue}>{role.quantity}</Text>
                                    <Pressable
                                        style={styles.countButtonPrimary}
                                        onPress={() =>
                                            updateRole(role.id, (item) => ({
                                                ...item,
                                                quantity: item.quantity + 1,
                                            }))
                                        }
                                    >
                                        <Text style={styles.countButtonPrimaryText}>+</Text>
                                    </Pressable>
                                </View>
                            </View>

                            {isExpanded && (
                                <View style={styles.expandedBody}>
                                    <View style={styles.row}>
                                        <View style={styles.rowItem}>
                                            <Text style={styles.rowLabel}>Agent Type</Text>
                                            <View style={styles.typeSwitch}>
                                                <Pressable
                                                    style={[
                                                        styles.typeOption,
                                                        role.mode === 'codex' && styles.typeOptionActive,
                                                    ]}
                                                    onPress={() => updateRole(role.id, (item) => ({ ...item, mode: 'codex' }))}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.typeOptionText,
                                                            role.mode === 'codex' && styles.typeOptionTextActive,
                                                        ]}
                                                    >
                                                        codex
                                                    </Text>
                                                </Pressable>
                                                <Pressable
                                                    style={[
                                                        styles.typeOption,
                                                        role.mode === 'claude-code' && styles.typeOptionActive,
                                                    ]}
                                                    onPress={() => updateRole(role.id, (item) => ({ ...item, mode: 'claude-code' }))}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.typeOptionText,
                                                            role.mode === 'claude-code' && styles.typeOptionTextActive,
                                                        ]}
                                                    >
                                                        claudecode
                                                    </Text>
                                                </Pressable>
                                            </View>
                                        </View>

                                        <View style={styles.rowItem}>
                                            <Text style={styles.rowLabel}>Machine</Text>
                                            <View style={styles.machineOptions}>
                                                {machines.length > 0 ? (
                                                    machines.map((machine) => {
                                                        const selected = role.machineId === machine.id;
                                                        return (
                                                            <Pressable
                                                                key={machine.id}
                                                                style={[
                                                                    styles.machineChip,
                                                                    selected && styles.machineChipActive,
                                                                ]}
                                                                onPress={() =>
                                                                    updateRole(role.id, (item) => ({
                                                                        ...item,
                                                                        machineId: machine.id,
                                                                    }))
                                                                }
                                                            >
                                                                <Text
                                                                    style={[
                                                                        styles.machineChipText,
                                                                        selected && styles.machineChipTextActive,
                                                                    ]}
                                                                    numberOfLines={1}
                                                                >
                                                                    {machineLabel(machine)}
                                                                </Text>
                                                            </Pressable>
                                                        );
                                                    })
                                                ) : (
                                                    <View style={styles.machineChip}>
                                                        <Text style={styles.machineChipText}>No machine</Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                    </View>

                                    <Pressable
                                        style={styles.advancedToggle}
                                        onPress={() =>
                                            setAdvancedRoleId((prev) => (prev === role.id ? null : role.id))
                                        }
                                    >
                                        <Ionicons
                                            name={isAdvancedOpen ? 'chevron-down' : 'chevron-forward'}
                                            size={14}
                                            color={theme.colors.textSecondary}
                                        />
                                        <Text style={styles.advancedLabel}>Advanced Settings</Text>
                                    </Pressable>

                                    {isAdvancedOpen && (
                                        <View style={styles.advancedCard}>
                                            <Text style={styles.advancedHint}>
                                                Model, skills, MCP, plugins and role-level root path can be configured after creation.
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>
                    );
                })}
            </View>

            <Pressable style={styles.addRoleButton} onPress={handleAddRoleFromMarket}>
                <Ionicons name="add" size={16} color={theme.colors.textSecondary} />
                <Text style={styles.addRoleText}>Add Role from Market</Text>
            </Pressable>

            {/* Compatibility test hooks */}
            <View style={styles.testHookContainer}>
                <View
                    testID="role-master"
                    accessibilityRole="checkbox"
                    accessibilityState={{ selected: roles.some((role) => role.roleId === 'master') }}
                />
                <View
                    testID="role-builder"
                    accessibilityRole="checkbox"
                    accessibilityState={{ selected: roles.some((role) => role.roleId === 'builder') }}
                />
                <View
                    testID="role-qa"
                    accessibilityRole="checkbox"
                    accessibilityState={{ selected: roles.some((role) => role.roleId === 'qa') }}
                />
            </View>

            <View style={styles.footer}>
                <Pressable style={styles.backButton} onPress={onBack}>
                    <Ionicons name="chevron-back" size={18} color="#333" />
                    <Text style={styles.backButtonText}>Back</Text>
                </Pressable>
                <Pressable style={styles.nextButton} onPress={handleNext}>
                    <Text style={styles.nextButtonText}>Next</Text>
                    <Ionicons name="chevron-forward" size={18} color="#FFF" />
                </Pressable>
            </View>
        </ScrollView>
    );
});

const stylesheet = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.colors.groupped.background,
    },
    contentContainer: {
        padding: 16,
        paddingBottom: 100,
    },
    sectionTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1A1918',
    },
    sectionHint: {
        marginTop: 6,
        marginBottom: 16,
        fontSize: 14,
        color: theme.colors.textSecondary,
        lineHeight: 20,
    },
    roleList: {
        gap: 12,
    },
    roleCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        padding: 14,
    },
    roleTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    roleIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    roleInfo: {
        flex: 1,
        minWidth: 0,
    },
    roleName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1918',
    },
    roleMeta: {
        marginTop: 2,
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    countWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    countButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: theme.colors.groupped.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    countButtonPrimary: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#3D8A5A',
        alignItems: 'center',
        justifyContent: 'center',
    },
    countButtonText: {
        fontSize: 18,
        lineHeight: 18,
        color: '#53524E',
    },
    countButtonPrimaryText: {
        fontSize: 18,
        lineHeight: 18,
        color: '#FFF',
    },
    countValue: {
        minWidth: 20,
        textAlign: 'center',
        fontSize: 15,
        fontWeight: '600',
        color: '#1A1918',
    },
    expandedBody: {
        marginTop: 14,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: theme.colors.divider,
        gap: 12,
    },
    row: {
        gap: 10,
    },
    rowItem: {
        gap: 6,
    },
    rowLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    typeSwitch: {
        flexDirection: 'row',
        borderRadius: 8,
        padding: 3,
        backgroundColor: theme.colors.groupped.background,
        gap: 4,
    },
    typeOption: {
        flex: 1,
        borderRadius: 6,
        paddingVertical: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    typeOptionActive: {
        backgroundColor: '#3D8A5A',
    },
    typeOptionText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        fontWeight: '500',
    },
    typeOptionTextActive: {
        color: '#FFF',
        fontWeight: '600',
    },
    machineOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    machineChip: {
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        backgroundColor: theme.colors.surface,
        paddingHorizontal: 10,
        paddingVertical: 8,
        maxWidth: '100%',
    },
    machineChipActive: {
        borderColor: '#3D8A5A',
        backgroundColor: '#EAF5EE',
    },
    machineChipText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    machineChipTextActive: {
        color: '#3D8A5A',
        fontWeight: '600',
    },
    advancedToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    advancedLabel: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        fontWeight: '500',
    },
    advancedCard: {
        borderRadius: 10,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        backgroundColor: theme.colors.groupped.background,
        padding: 10,
    },
    advancedHint: {
        fontSize: 12,
        lineHeight: 17,
        color: theme.colors.textSecondary,
    },
    addRoleButton: {
        marginTop: 14,
        marginBottom: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        backgroundColor: theme.colors.surfaceHighest,
        paddingVertical: 12,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    addRoleText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    testHookContainer: {
        position: 'absolute',
        opacity: 0,
        pointerEvents: 'none',
    },
    footer: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    backButton: {
        flex: 1,
        flexDirection: 'row',
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        backgroundColor: theme.colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    backButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
    nextButton: {
        flex: 2,
        flexDirection: 'row',
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#3D8A5A',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    nextButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
    },
}));
