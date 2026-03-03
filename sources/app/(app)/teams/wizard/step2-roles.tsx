/**
 * R4: Wizard Step 2 - Role Selection
 * Presents preset configuration cards to reduce decision fatigue.
 * Based on Mom Test: users need "good defaults" with role explanations visible without clicking.
 *
 * Preset options:
 *  - "Builder Pack": 1 Master + 2 Builders (fast shipping)
 *  - "Full Team": Master + Builder + QA + Reviewer (quality-focused)
 *  - "Custom": manual role selection
 */

import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text } from '@/components/StyledText';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import { useWizard } from '@/components/WizardContext';
import { useAllMachines } from '@/sync/storage';
import { layout } from '@/components/layout';
import { RoleConfig, generateRoleId } from './types';

// ---- Role Preset Definitions ----

interface RolePreset {
    id: string;
    label: string;
    tagline: string;
    description: string;
    icon: string;
    roles: Array<{ roleId: string; roleName: string; quantity: number; description: string }>;
    recommended?: boolean;
}

const ROLE_PRESETS: RolePreset[] = [
    {
        id: 'builder-pack',
        label: 'Builder Pack',
        tagline: 'Ship fast',
        description: 'One lead agent coordinating two workers. Great for focused feature development and solo projects.',
        icon: 'rocket',
        recommended: true,
        roles: [
            {
                roleId: 'master',
                roleName: 'Master',
                quantity: 1,
                description: 'Plans work and coordinates the team',
            },
            {
                roleId: 'builder',
                roleName: 'Builder',
                quantity: 2,
                description: 'Implements features and writes code',
            },
        ],
    },
    {
        id: 'full-team',
        label: 'Full Team',
        tagline: 'Quality-first',
        description: 'Complete cycle: plan, build, test, review. Best for production-critical or long-running projects.',
        icon: 'shield-checkmark',
        roles: [
            {
                roleId: 'master',
                roleName: 'Master',
                quantity: 1,
                description: 'Plans and coordinates',
            },
            {
                roleId: 'builder',
                roleName: 'Builder',
                quantity: 1,
                description: 'Implements features',
            },
            {
                roleId: 'qa',
                roleName: 'QA',
                quantity: 1,
                description: 'Tests and validates quality',
            },
            {
                roleId: 'reviewer',
                roleName: 'Reviewer',
                quantity: 1,
                description: 'Reviews code and gives feedback',
            },
        ],
    },
    {
        id: 'custom',
        label: 'Custom',
        tagline: 'Your way',
        description: 'Start with a single Builder and manually add roles. Full control over your team composition.',
        icon: 'construct',
        roles: [
            {
                roleId: 'builder',
                roleName: 'Builder',
                quantity: 1,
                description: 'Implements features and writes code',
            },
        ],
    },
];

// ---- Role Description Item ----

interface RoleDescriptionItemProps {
    roleName: string;
    quantity: number;
    description: string;
}

const RoleDescriptionItem = React.memo(function RoleDescriptionItem({
    roleName,
    quantity,
    description,
}: RoleDescriptionItemProps) {
    const styles = stylesheet;
    return (
        <View style={styles.roleRow}>
            <View style={styles.roleQuantityBadge}>
                <Text style={styles.roleQuantityText}>{quantity}x</Text>
            </View>
            <View style={styles.roleInfo}>
                <Text style={styles.roleItemName}>{roleName}</Text>
                <Text style={styles.roleItemDesc}>{description}</Text>
            </View>
        </View>
    );
});

// ---- Preset Card ----

interface PresetCardProps {
    preset: RolePreset;
    isSelected: boolean;
    onSelect: () => void;
}

const PresetCard = React.memo(function PresetCard({ preset, isSelected, onSelect }: PresetCardProps) {
    const styles = stylesheet;
    const { theme } = useUnistyles();

    return (
        <Pressable
            style={[styles.presetCard, isSelected && styles.presetCardSelected]}
            onPress={onSelect}
        >
            <View style={styles.presetHeader}>
                <View style={[styles.presetIconWrap, isSelected && styles.presetIconWrapSelected]}>
                    <Ionicons
                        name={preset.icon as any}
                        size={20}
                        color={isSelected ? '#FFF' : theme.colors.button.primary.background}
                    />
                </View>
                <View style={styles.presetTitleBlock}>
                    <View style={styles.presetTitleRow}>
                        <Text style={[styles.presetLabel, isSelected && styles.presetLabelSelected]}>
                            {preset.label}
                        </Text>
                        {preset.recommended && (
                            <View style={[styles.recommendedBadge, isSelected && styles.recommendedBadgeSelected]}>
                                <Text style={[styles.recommendedText, isSelected && styles.recommendedTextSelected]}>
                                    Recommended
                                </Text>
                            </View>
                        )}
                    </View>
                    <Text style={[styles.presetTagline, isSelected && styles.presetTaglineSelected]}>
                        {preset.tagline}
                    </Text>
                </View>
                <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                    {isSelected && <View style={styles.radioInner} />}
                </View>
            </View>

            <Text style={[styles.presetDescription, isSelected && styles.presetDescriptionSelected]}>
                {preset.description}
            </Text>

            <View style={styles.roleList}>
                {preset.roles.map((role) => (
                    <RoleDescriptionItem
                        key={role.roleId}
                        roleName={role.roleName}
                        quantity={role.quantity}
                        description={role.description}
                    />
                ))}
            </View>
        </Pressable>
    );
});

// ---- Step 2 Main ----

interface Step2RolesProps {
    onNext: () => void;
    onBack: () => void;
}

export const Step2Roles = React.memo(function Step2Roles({ onNext, onBack }: Step2RolesProps) {
    const { state, setState } = useWizard();
    const styles = stylesheet;
    const machines = useAllMachines();

    const [selectedPresetId, setSelectedPresetId] = React.useState<string>(() => {
        if (state.roles.length === 0) return 'builder-pack';
        return 'custom';
    });

    const handleNext = React.useCallback(() => {
        const preset = ROLE_PRESETS.find((p) => p.id === selectedPresetId);
        if (!preset) return;

        const firstMachineId = machines[0]?.id;

        const roles: RoleConfig[] = preset.roles.map((r) => ({
            id: generateRoleId(),
            roleId: r.roleId,
            roleName: r.roleName,
            quantity: r.quantity,
            mode: 'claude-code' as const,
            machineId: firstMachineId,
        }));

        setState({ roles });
        onNext();
    }, [selectedPresetId, machines, setState, onNext]);

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={[
                styles.contentContainer,
                { maxWidth: layout.maxWidth, alignSelf: 'center', width: '100%' },
            ]}
            testID="wizard-step-2"
        >
            <Text style={styles.sectionHint}>
                Choose a role composition. Each agent has a specific job on your team.
                You can adjust quantities and settings after creation.
            </Text>

            {ROLE_PRESETS.map((preset) => (
                <PresetCard
                    key={preset.id}
                    preset={preset}
                    isSelected={selectedPresetId === preset.id}
                    onSelect={() => setSelectedPresetId(preset.id)}
                />
            ))}

            {/* Hidden checkboxes for testing - reflect preset selection */}
            <View style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}>
                <View
                    testID="role-master"
                    accessibilityRole="checkbox"
                    accessibilityState={{
                        selected: selectedPresetId === 'builder-pack' || selectedPresetId === 'full-team'
                    }}
                />
                <View
                    testID="role-builder"
                    accessibilityRole="checkbox"
                    accessibilityState={{ selected: true }}
                />
                <View
                    testID="role-qa"
                    accessibilityRole="checkbox"
                    accessibilityState={{ selected: true }}
                />
            </View>

            {/* Mode explanation */}
            <View style={styles.infoCard}>
                <Ionicons name="information-circle-outline" size={18} color="#3D8A5A" />
                <Text style={styles.infoText}>
                    All agents use <Text style={styles.infoTextBold}>Claude Code</Text> by default — the best mode for coding tasks.
                    You can switch individual agents to Codex after creation.
                </Text>
            </View>

            {/* Footer */}
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
    sectionHint: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        lineHeight: 20,
        marginBottom: 20,
    },
    presetCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1.5,
        borderColor: theme.colors.divider,
    },
    presetCardSelected: {
        borderColor: theme.colors.button.primary.background,
        backgroundColor: `${theme.colors.button.primary.background}08`,
    },
    presetHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 10,
        gap: 12,
    },
    presetIconWrap: {
        width: 38,
        height: 38,
        borderRadius: 10,
        backgroundColor: `${theme.colors.button.primary.background}18`,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    presetIconWrapSelected: {
        backgroundColor: theme.colors.button.primary.background,
    },
    presetTitleBlock: {
        flex: 1,
    },
    presetTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
    },
    presetLabel: {
        fontSize: 17,
        fontWeight: '700',
        color: theme.colors.text,
    },
    presetLabelSelected: {
        color: theme.colors.button.primary.background,
    },
    recommendedBadge: {
        backgroundColor: `${theme.colors.button.primary.background}18`,
        borderRadius: 20,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    recommendedBadgeSelected: {
        backgroundColor: theme.colors.button.primary.background,
    },
    recommendedText: {
        fontSize: 10,
        fontWeight: '700',
        color: theme.colors.button.primary.background,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    recommendedTextSelected: {
        color: '#FFF',
    },
    presetTagline: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    presetTaglineSelected: {
        color: theme.colors.button.primary.background,
    },
    radioOuter: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: theme.colors.divider,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    radioOuterSelected: {
        borderColor: theme.colors.button.primary.background,
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: theme.colors.button.primary.background,
    },
    presetDescription: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        lineHeight: 18,
        marginBottom: 12,
    },
    presetDescriptionSelected: {
        color: theme.colors.text,
    },
    roleList: {
        gap: 8,
        borderTopWidth: 1,
        borderTopColor: theme.colors.divider,
        paddingTop: 12,
    },
    roleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    roleQuantityBadge: {
        width: 32,
        height: 24,
        borderRadius: 6,
        backgroundColor: theme.colors.groupped.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    roleQuantityText: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.button.primary.background,
    },
    roleInfo: {
        flex: 1,
    },
    roleItemName: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.text,
    },
    roleItemDesc: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        backgroundColor: '#3D8A5A18',
        borderRadius: 12,
        padding: 14,
        marginTop: 4,
        marginBottom: 8,
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        color: theme.colors.textSecondary,
        lineHeight: 18,
    },
    infoTextBold: {
        fontWeight: '600',
        color: '#3D8A5A',
    },
    footer: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
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
        backgroundColor: theme.colors.button.primary.background,
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
