/**
 * R4: Wizard Step 3 - Deploy Preview & Confirm
 * Shows a plain-language summary of what will be created before the user commits.
 * Based on Mom Test: 6/10 users need a preview before they feel confident deploying.
 * Uses useAhaAction for error handling.
 */

import React from 'react';
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Text } from '@/components/StyledText';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import { useWizard } from '@/components/WizardContext';
import { layout } from '@/components/layout';
import { useAhaAction } from '@/hooks/useAhaAction';

// ---- Summary Row ----

interface SummaryRowProps {
    icon: string;
    label: string;
    value: string;
}

const SummaryRow = React.memo(function SummaryRow({ icon, label, value }: SummaryRowProps) {
    const styles = stylesheet;
    const { theme } = useUnistyles();
    return (
        <View style={styles.summaryRow}>
            <Ionicons name={icon as any} size={16} color={theme.colors.textSecondary} />
            <View style={styles.summaryRowContent}>
                <Text style={styles.summaryRowLabel}>{label}</Text>
                <Text style={styles.summaryRowValue}>{value}</Text>
            </View>
        </View>
    );
});

// ---- Role Preview Item ----

interface RolePreviewItemProps {
    roleName: string;
    quantity: number;
    mode: string;
}

const RolePreviewItem = React.memo(function RolePreviewItem({
    roleName,
    quantity,
    mode,
}: RolePreviewItemProps) {
    const styles = stylesheet;
    const modeLabel = mode === 'claude-code' ? 'Claude Code' : 'Codex';

    return (
        <View style={styles.rolePreviewItem}>
            <View style={styles.rolePreviewLeft}>
                <View style={styles.roleQuantityBadge}>
                    <Text style={styles.roleQuantityText}>{quantity}x</Text>
                </View>
                <Text style={styles.rolePreviewName}>{roleName}</Text>
            </View>
            <View style={styles.modeBadge}>
                <Text style={styles.modeBadgeText}>{modeLabel}</Text>
            </View>
        </View>
    );
});

// ---- Step 3 Main ----

interface Step3ConfirmProps {
    onBack: () => void;
}

export const Step3Confirm = React.memo(function Step3Confirm({ onBack }: Step3ConfirmProps) {
    const { state, submit } = useWizard();
    const { theme } = useUnistyles();
    const styles = stylesheet;

    const totalAgents = React.useMemo(
        () => state.roles.reduce((sum, r) => sum + r.quantity, 0),
        [state.roles],
    );

    const uniqueMachines = React.useMemo(
        () => new Set(state.roles.map((r) => r.machineId).filter(Boolean)).size,
        [state.roles],
    );

    const deployAction = React.useCallback(async () => {
        await submit();
    }, [submit]);

    const [isDeploying, handleDeploy] = useAhaAction(deployAction);

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={[
                styles.contentContainer,
                { maxWidth: layout.maxWidth, alignSelf: 'center', width: '100%' },
            ]}
            testID="wizard-step-3"
        >
            {/* Deploy summary header */}
            <View style={styles.deployBanner}>
                <Ionicons name="rocket" size={28} color="#FFF" />
                <View>
                    <Text style={styles.deployBannerTitle}>Ready to deploy</Text>
                    <Text style={styles.deployBannerSubtitle}>
                        Review your configuration before launching
                    </Text>
                </View>
            </View>

            {/* Team details */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Team Details</Text>
                <SummaryRow
                    icon="people"
                    label="Team Name"
                    value={state.teamName || 'Untitled Team'}
                />
                {state.goal ? (
                    <SummaryRow icon="flag" label="Goal" value={state.goal} />
                ) : null}
                {state.workingDirectory ? (
                    <SummaryRow icon="folder" label="Working Directory" value={state.workingDirectory} />
                ) : null}
                <SummaryRow icon="language" label="Agent Language" value={state.agentLanguage === 'zh' ? 'Chinese' : 'English'} />
            </View>

            {/* Agents */}
            <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardTitle}>Agents</Text>
                    <View style={styles.agentCountBadge}>
                        <Text style={styles.agentCountText}>{totalAgents} total</Text>
                    </View>
                </View>
                {state.roles.map((role) => (
                    <RolePreviewItem
                        key={role.id}
                        roleName={role.roleName}
                        quantity={role.quantity}
                        mode={role.mode}
                    />
                ))}
            </View>

            {/* What will happen note */}
            <View style={styles.whatHappensCard}>
                <Text style={styles.whatHappensTitle}>What happens when you deploy</Text>
                <View style={styles.whatHappensList}>
                    <View style={styles.whatHappensItem}>
                        <Ionicons name="checkmark-circle" size={16} color="#3D8A5A" />
                        <Text style={styles.whatHappensText}>
                            Team created with {totalAgents} agent slot{totalAgents !== 1 ? 's' : ''} across {uniqueMachines || 1} machine{uniqueMachines !== 1 ? 's' : ''}
                        </Text>
                    </View>
                    <View style={styles.whatHappensItem}>
                        <Ionicons name="checkmark-circle" size={16} color="#3D8A5A" />
                        <Text style={styles.whatHappensText}>
                            Agents will start and be ready to receive tasks
                        </Text>
                    </View>
                    <View style={styles.whatHappensItem}>
                        <Ionicons name="checkmark-circle" size={16} color="#3D8A5A" />
                        <Text style={styles.whatHappensText}>
                            Team Chat opens automatically so you can assign work
                        </Text>
                    </View>
                </View>
            </View>

            {/* Error display */}
            {state.errors.submit ? (
                <View style={styles.errorCard}>
                    <Ionicons name="alert-circle" size={18} color={theme.colors.error} />
                    <Text style={styles.errorText}>{state.errors.submit}</Text>
                </View>
            ) : null}

            {/* Footer */}
            <View style={styles.footer}>
                <Pressable
                    style={[styles.backButton, isDeploying && styles.buttonDisabled]}
                    onPress={onBack}
                    disabled={isDeploying}
                >
                    <Ionicons name="chevron-back" size={18} color={theme.colors.text} />
                    <Text style={styles.backButtonText}>Back</Text>
                </Pressable>

                <Pressable
                    style={[styles.deployButton, isDeploying && styles.buttonDisabled]}
                    onPress={handleDeploy}
                    disabled={isDeploying}
                >
                    {isDeploying ? (
                        <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                        <>
                            <Ionicons name="rocket" size={18} color="#FFF" />
                            <Text style={styles.deployButtonText}>Deploy Team</Text>
                        </>
                    )}
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
    deployBanner: {
        backgroundColor: '#3D8A5A',
        borderRadius: 16,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 16,
    },
    deployBannerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFF',
    },
    deployBannerSubtitle: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
    },
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: theme.colors.divider,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 12,
    },
    agentCountBadge: {
        backgroundColor: `${theme.colors.button.primary.background}18`,
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 3,
    },
    agentCountText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.button.primary.background,
    },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: theme.colors.divider,
    },
    summaryRowContent: {
        flex: 1,
    },
    summaryRowLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    summaryRowValue: {
        fontSize: 14,
        color: theme.colors.text,
        marginTop: 2,
    },
    rolePreviewItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: theme.colors.divider,
    },
    rolePreviewLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    roleQuantityBadge: {
        width: 34,
        height: 26,
        borderRadius: 7,
        backgroundColor: `${theme.colors.button.primary.background}18`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    roleQuantityText: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.button.primary.background,
    },
    rolePreviewName: {
        fontSize: 15,
        fontWeight: '500',
        color: theme.colors.text,
    },
    modeBadge: {
        backgroundColor: theme.colors.groupped.background,
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    modeBadgeText: {
        fontSize: 11,
        fontWeight: '500',
        color: theme.colors.textSecondary,
    },
    whatHappensCard: {
        backgroundColor: '#3D8A5A0D',
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#3D8A5A30',
    },
    whatHappensTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#3D8A5A',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    whatHappensList: {
        gap: 10,
    },
    whatHappensItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    whatHappensText: {
        flex: 1,
        fontSize: 13,
        color: theme.colors.text,
        lineHeight: 18,
    },
    errorCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: `${theme.colors.error}18`,
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
    },
    errorText: {
        flex: 1,
        fontSize: 13,
        color: theme.colors.error,
        lineHeight: 18,
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
    deployButton: {
        flex: 2,
        flexDirection: 'row',
        paddingVertical: 16,
        borderRadius: 12,
        backgroundColor: '#3D8A5A',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    deployButtonText: {
        fontSize: 17,
        fontWeight: '700',
        color: '#FFF',
    },
}));
