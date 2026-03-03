/**
 * R4: Team Creation Wizard - Entry Screen
 * Presents two paths: Quick Start (1-tap) and Custom Setup (3-step wizard)
 * Based on Mom Test finding: 9/10 users want a "Quick Start" default path
 */

import { Dimensions, Platform, Pressable, ActivityIndicator } from 'react-native';
import React from 'react';
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Text } from '@/components/StyledText';
import { Ionicons } from '@expo/vector-icons';
import { WizardProvider, useWizard } from '@/components/WizardContext';
import { WizardStepper } from '@/components/WizardStepper';
import { layout } from '@/components/layout';
import { useAhaAction } from '@/hooks/useAhaAction';
import { useAllMachines } from '@/sync/storage';
import { sync } from '@/sync/sync';
import { generateRoleId } from './wizard/types';
import { Step1Name } from './wizard/step1-name';
import { Step2Roles } from './wizard/step2-roles';
import { Step3Confirm } from './wizard/step3-confirm';

const QUICK_START_MASTER_ROLE_ID = 'master';
const QUICK_START_BUILDER_ROLE_ID = 'builder';
const QUICK_START_QA_ROLE_ID = 'qa';

const WIZARD_STEPS = [
    { id: 'name', title: 'Name' },
    { id: 'roles', title: 'Roles' },
    { id: 'confirm', title: 'Deploy' },
] as const;

// ---- Web Modal Wrapper ----

function WebModalWrapper({ children }: { children: React.ReactNode }) {
    const { width } = Dimensions.get('window');
    const isLargeScreen = width >= 768;
    const styles = stylesheet;

    if (!isLargeScreen) return <>{children}</>;

    return (
        <View style={styles.modalOverlay} testID="main-layout">
            <View style={styles.modalContent} accessibilityRole="dialog" aria-modal="true">
                <View style={styles.wizardContainer}>
                    {children}
                </View>
            </View>
        </View>
    );
}

const QUICK_START_MASTER_ROLE_ID = 'master';
const QUICK_START_BUILDER_ROLE_ID = 'builder';
const QUICK_START_QA_ROLE_ID = 'qa';

const WIZARD_STEPS = [
    { id: 'name', title: 'Name' },
    { id: 'roles', title: 'Roles' },
    { id: 'confirm', title: 'Deploy' },
] as const;

// ---- Web Modal Wrapper ----

function WebModalWrapper({ children }: { children: React.ReactNode }) {
    const { width } = Dimensions.get('window');
    const isLargeScreen = width >= 768;

    if (!isLargeScreen) return <>{children}</>;

    return (
        <View style={styles.modalOverlay} testID="main-layout">
            <View style={styles.modalContent} role="dialog" aria-modal="true">
                {children}
            </View>
        </View>
    );
}

// ---- Quick Start Entry Screen ----

interface EntryScreenProps {
    onQuickStart: () => void;
    onCustomSetup: () => void;
    isQuickStartLoading: boolean;
}

const EntryScreen = React.memo(function EntryScreen({
    onQuickStart,
    onCustomSetup,
    isQuickStartLoading,
}: EntryScreenProps) {
    const styles = stylesheet;
    const { theme } = useUnistyles();

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={[
                styles.contentContainer,
                { maxWidth: layout.maxWidth, alignSelf: 'center', width: '100%' },
            ]}
        >
            <View style={styles.heroSection}>
                <View style={styles.heroIcon}>
                    <Ionicons name="people" size={32} color={theme.colors.button.primary.background} />
                </View>
                <Text style={styles.heroTitle}>Create a Team</Text>
                <Text style={styles.heroSubtitle}>
                    AI agents that work on your code together. Pick a path to get started.
                </Text>
            </View>

            {/* Quick Start Card */}
            <Pressable
                style={[styles.pathCard, styles.quickStartCard]}
                onPress={onQuickStart}
                disabled={isQuickStartLoading}
            >
                <View style={styles.pathCardHeader}>
                    <View style={styles.pathIconContainer}>
                        {isQuickStartLoading ? (
                            <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                            <Ionicons name="flash" size={22} color="#FFF" />
                        )}
                    </View>
                    <View style={styles.recommendedBadge}>
                        <Text style={styles.recommendedText}>Recommended</Text>
                    </View>
                </View>
                <Text style={styles.pathTitle}>Quick Start</Text>
                <Text style={styles.pathDescription}>
                    Create a team instantly with smart defaults. 1 Master + 1 Builder + 1 QA agent on your current machine.
                    You can customize later.
                </Text>
                <View style={styles.pathDetails}>
                    <View style={styles.pathDetail}>
                        <Ionicons name="checkmark-circle" size={16} color="#FFF" />
                        <Text style={styles.pathDetailText}>Ready in seconds</Text>
                    </View>
                    <View style={styles.pathDetail}>
                        <Ionicons name="checkmark-circle" size={16} color="#FFF" />
                        <Text style={styles.pathDetailText}>No decisions needed</Text>
                    </View>
                    <View style={styles.pathDetail}>
                        <Ionicons name="checkmark-circle" size={16} color="#FFF" />
                        <Text style={styles.pathDetailText}>Edit anytime</Text>
                    </View>
                </View>
            </Pressable>

            {/* Custom Setup Card */}
            <Pressable style={styles.pathCard} onPress={onCustomSetup}>
                <View style={styles.pathCardHeader}>
                    <View style={[styles.pathIconContainer, styles.customIconContainer]}>
                        <Ionicons name="settings" size={22} color={theme.colors.button.primary.background} />
                    </View>
                </View>
                <Text style={styles.pathTitleCustom}>Custom Setup</Text>
                <Text style={styles.pathDescriptionCustom}>
                    Configure team name, role composition, and deployment in 3 guided steps. Best for specific needs.
                </Text>
                <View style={styles.stepsPreview}>
                    {['Name & Goal', 'Choose Roles', 'Deploy Preview'].map((step, idx) => (
                        <View key={step} style={styles.stepPreviewItem}>
                            <View style={styles.stepPreviewDot}>
                                <Text style={styles.stepPreviewDotText}>{idx + 1}</Text>
                            </View>
                            <Text style={styles.stepPreviewLabel}>{step}</Text>
                        </View>
                    ))}
                </View>
            </Pressable>
        </ScrollView>
    );
});

// ---- Wizard Content (3-step flow) ----

const WizardContent = React.memo(function WizardContent() {
    const router = useRouter();
    const { state, nextStep, prevStep } = useWizard();
    const styles = stylesheet;

    const handleCancel = React.useCallback(() => {
        router.back();
    }, [router]);

    const renderStep = () => {
        switch (state.currentStep) {
            case 0:
                return <Step1Name onNext={nextStep} onCancel={handleCancel} />;
            case 1:
                return <Step2Roles onNext={nextStep} onBack={prevStep} />;
            case 2:
                return <Step3Confirm onBack={prevStep} />;
            default:
                return null;
        }
    };

    return (
        <View style={styles.container}>
            <WizardStepper steps={[...WIZARD_STEPS]} currentStep={state.currentStep} />
            {renderStep()}
        </View>
    );
});

// ---- Root Screen ----

type ViewMode = 'entry' | 'wizard';

function NewTeamRoot() {
    const router = useRouter();
    const [viewMode, setViewMode] = React.useState<ViewMode>('entry');
    const machines = useAllMachines();

    const quickStartAction = React.useCallback(async () => {
        const firstMachineId = machines[0]?.id;

        const artifact = await sync.createArtifact({
            type: 'team',
            title: 'My Team',
            body: JSON.stringify({
                name: 'My Team',
                workingDirectory: '',
                goal: '',
                agentLanguage: 'en',
                members: [],
                roles: [
                    {
                        id: generateRoleId(),
                        roleId: QUICK_START_MASTER_ROLE_ID,
                        roleName: 'Master',
                        quantity: 1,
                        mode: 'claude-code',
                        machineId: firstMachineId,
                    },
                    {
                        id: generateRoleId(),
                        roleId: QUICK_START_BUILDER_ROLE_ID,
                        roleName: 'Builder',
                        quantity: 1,
                        mode: 'claude-code',
                        machineId: firstMachineId,
                    },
                    {
                        id: generateRoleId(),
                        roleId: QUICK_START_QA_ROLE_ID,
                        roleName: 'QA',
                        quantity: 1,
                        mode: 'claude-code',
                        machineId: firstMachineId,
                    },
                ],
            }),
        });

        router.replace(`/teams/${artifact.id}`);
    }, [machines, router]);

    const [isQuickStartLoading, handleQuickStart] = useAhaAction(quickStartAction);

    const handleCustomSetup = React.useCallback(() => {
        setViewMode('wizard');
    }, []);

    if (viewMode === 'wizard') {
        return (
            <WebModalWrapper>
                <WizardProvider>
                    <Stack.Screen
                        options={{
                            headerTitle: 'New Team',
                            headerBackTitle: 'Teams',
                        }}
                    />
                    <WizardContent />
                </WizardProvider>
            </WebModalWrapper>
        );
    }

    return (
        <WebModalWrapper>
            <Stack.Screen
                options={{
                    headerTitle: 'New Team',
                    headerBackTitle: 'Teams',
                }}
            />
            <EntryScreen
                onQuickStart={handleQuickStart}
                onCustomSetup={handleCustomSetup}
                isQuickStartLoading={isQuickStartLoading}
            />
        </WebModalWrapper>
    );
}

export default React.memo(function NewTeamScreen() {
    return <NewTeamRoot />;
});

const stylesheet = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.colors.groupped.background,
    },
    contentContainer: {
        padding: 16,
        paddingBottom: 60,
    },
    heroSection: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    heroIcon: {
        width: 72,
        height: 72,
        borderRadius: 20,
        backgroundColor: `${theme.colors.button.primary.background}18`,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    heroTitle: {
        fontSize: 26,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: 8,
    },
    heroSubtitle: {
        fontSize: 15,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 16,
    },
    pathCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: theme.colors.divider,
    },
    quickStartCard: {
        backgroundColor: theme.colors.button.primary.background,
        borderColor: 'transparent',
    },
    pathCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    pathIconContainer: {
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    customIconContainer: {
        backgroundColor: `${theme.colors.button.primary.background}18`,
    },
    recommendedBadge: {
        backgroundColor: 'rgba(255,255,255,0.25)',
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    recommendedText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FFF',
    },
    pathTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFF',
        marginBottom: 8,
    },
    pathDescription: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.85)',
        lineHeight: 20,
        marginBottom: 16,
    },
    pathTitleCustom: {
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: 8,
    },
    pathDescriptionCustom: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        lineHeight: 20,
        marginBottom: 16,
    },
    pathDetails: {
        gap: 8,
    },
    pathDetail: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    pathDetailText: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.9)',
        fontWeight: '500',
    },
    stepsPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    stepPreviewItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    stepPreviewDot: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: `${theme.colors.button.primary.background}18`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepPreviewDotText: {
        fontSize: 11,
        fontWeight: '700',
        color: theme.colors.button.primary.background,
    },
    stepPreviewLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        fontWeight: '500',
    },
    // Web modal styles
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    modalContent: {
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        width: 600,
        maxWidth: '90%',
        maxHeight: '80%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 5,
    },
    wizardContainer: {
        flex: 1,
    },
}));
