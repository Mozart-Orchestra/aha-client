/**
 * R4: Team Creation Wizard - Entry Screen
 * Presents two paths: Quick Start (1-tap) and Custom Setup (3-step wizard)
 * Based on Mom Test finding: 9/10 users want a "Quick Start" default path
 */

import { Dimensions, Pressable, ActivityIndicator, View, ScrollView } from 'react-native';
import React from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Text } from '@/components/StyledText';
import { t } from '@/text';
import { Ionicons } from '@expo/vector-icons';
import { WizardProvider, useWizard } from '@/components/WizardContext';
import { layout } from '@/components/layout';
import { useAhaAction } from '@/hooks/useAhaAction';
import { useAllMachines, useArtifacts } from '@/sync/storage';
import { sync } from '@/sync/sync';
import { RoleConfig, TeamWizardState, generateRoleId } from '@/features/teams/wizard/types';
import { Step1Name } from '@/features/teams/wizard/step1-name';
import { Step2Roles } from '@/features/teams/wizard/step2-roles';
import { Step3Confirm } from '@/features/teams/wizard/step3-confirm';
import { DecryptedArtifact } from '@/sync/artifactTypes';

const QUICK_START_MASTER_ROLE_ID = 'master';
const QUICK_START_BUILDER_ROLE_ID = 'builder';
const QUICK_START_QA_ROLE_ID = 'qa';

const WIZARD_STEPS = [
    { id: 'name', title: 'Name' },
    { id: 'roles', title: 'Roles' },
    { id: 'confirm', title: 'Deploy' },
] as const;

function readParam(value?: string | string[]): string | undefined {
    return Array.isArray(value) ? value[0] : value;
}

function resolveStepIndex(step?: string): number {
    switch (step) {
        case 'roles':
            return 1;
        case 'confirm':
            return 2;
        default:
            return 0;
    }
}

function normalizeRoleList(teamNode: any): RoleConfig[] {
    const roles = Array.isArray(teamNode?.roles) ? teamNode.roles : [];

    return roles.map((role: any, index: number) => ({
        id: `relaunch-${role?.id || role?.roleId || index}` ,
        roleId: String(role?.roleId || role?.id || `role-${index + 1}`),
        roleName: String(role?.title || role?.roleName || role?.roleId || role?.id || `Role ${index + 1}`),
        quantity: Number.isFinite(Number(role?.quantity)) && Number(role?.quantity) > 0 ? Number(role.quantity) : 1,
        mode: role?.mode === 'codex' ? 'codex' : 'claude-code',
        machineId: typeof role?.machineId === 'string' && role.machineId ? role.machineId : undefined,
        model: typeof role?.model === 'string' ? role.model : undefined,
        skills: Array.isArray(role?.skills) ? role.skills.filter((entry: unknown): entry is string => typeof entry === 'string' && entry.length > 0) : undefined,
        mcpServers: Array.isArray(role?.mcpServers) ? role.mcpServers.filter((entry: unknown): entry is string => typeof entry === 'string' && entry.length > 0) : undefined,
        plugins: Array.isArray(role?.plugins) ? role.plugins.filter((entry: unknown): entry is string => typeof entry === 'string' && entry.length > 0) : undefined,
        rootPath: typeof role?.rootPath === 'string' ? role.rootPath : undefined,
    }));
}

function buildInitialStateFromSourceTeam(artifact: DecryptedArtifact, step?: string): Partial<TeamWizardState> | undefined {
    if (!artifact.body || typeof artifact.body !== 'string') {
        return undefined;
    }

    try {
        const parsed = JSON.parse(artifact.body);
        const teamNode = parsed?.team || parsed || {};
        const teamName = (artifact.title || teamNode?.name || 'Team').trim() || 'Team';
        const workingDirectory = typeof teamNode?.workingDirectory === 'string'
            ? teamNode.workingDirectory
            : typeof teamNode?.rootPath === 'string'
                ? teamNode.rootPath
                : '';
        const goal = typeof teamNode?.goal === 'string'
            ? teamNode.goal
            : typeof teamNode?.description === 'string'
                ? teamNode.description
                : '';

        return {
            currentStep: step ? resolveStepIndex(step) : 2,
            teamName,
            workingDirectory,
            goal,
            agentLanguage: teamNode?.agentLanguage === 'zh' ? 'zh' : 'en',
            roles: normalizeRoleList(teamNode),
            startImmediately: true,
        };
    } catch {
        return {
            currentStep: step ? resolveStepIndex(step) : 0,
            teamName: (artifact.title || 'Team').trim() || 'Team',
        };
    }
}

// ---- Web Modal Wrapper ----

function WebModalWrapper({ children }: { children: React.ReactNode }) {
    const { width } = Dimensions.get('window');
    const isLargeScreen = width >= 768;
    const styles = stylesheet;

    if (!isLargeScreen) return <>{children}</>;

    return (
        <View style={styles.modalOverlay} testID="main-layout">
            <View style={styles.modalContent}>
                <View style={styles.wizardContainer}>
                    {children}
                </View>
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

const WizardContent = React.memo(function WizardContent({ title }: { title: string }) {
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
            <View style={styles.wizardNav}>
                <Pressable
                    onPress={() => {
                        if (state.currentStep === 0) {
                            handleCancel();
                        } else {
                            prevStep();
                        }
                    }}
                    style={styles.wizardNavBack}
                    accessibilityRole="button"
                >
                    <Ionicons name="chevron-back" size={18} color="#1A1918" />
                    <Text style={styles.wizardNavTitle}>{title}</Text>
                </Pressable>
                <Text style={styles.wizardStepText}>Step {state.currentStep + 1} of {WIZARD_STEPS.length}</Text>
            </View>

            <View style={styles.progressBar}>
                {WIZARD_STEPS.map((step, index) => (
                    <View
                        key={step.id}
                        style={[
                            styles.progressSegment,
                            index <= state.currentStep && styles.progressSegmentActive,
                        ]}
                    />
                ))}
            </View>

            {renderStep()}
        </View>
    );
});

// ---- Root Screen ----

type ViewMode = 'entry' | 'wizard';

type NewTeamWizardParams = {
    view?: string | string[];
    step?: string | string[];
    sourceTeamId?: string | string[];
};

function NewTeamRoot() {
    const router = useRouter();
    const styles = stylesheet;
    const params = useLocalSearchParams<NewTeamWizardParams>();
    const artifacts = useArtifacts();
    const machines = useAllMachines();
    const viewParam = readParam(params.view);
    const stepParam = readParam(params.step);
    const sourceTeamId = readParam(params.sourceTeamId);
    const sourceTeam = React.useMemo(
        () => artifacts.find((artifact) => artifact.id === sourceTeamId && artifact.type === 'team'),
        [artifacts, sourceTeamId],
    );
    const initialViewMode = viewParam === 'wizard' || !!sourceTeamId ? 'wizard' : 'entry';
    const [viewMode, setViewMode] = React.useState<ViewMode>(initialViewMode);
    const isSourceTeamLoading = !!sourceTeamId && !!sourceTeam && sourceTeam.body === undefined;
    const screenTitle = sourceTeamId ? t('teams.relaunch') || 'Relaunch' : 'New Team';
    const wizardNavTitle = sourceTeamId ? t('teams.relaunch') || 'Relaunch' : 'New Legion';

    React.useEffect(() => {
        setViewMode(initialViewMode);
    }, [initialViewMode]);

    React.useEffect(() => {
        if (sourceTeamId && sourceTeam?.body === undefined) {
            void sync.fetchArtifactWithBody(sourceTeamId).catch(() => undefined);
        }
    }, [sourceTeam?.body, sourceTeamId]);

    const wizardInitialState = React.useMemo(() => {
        if (sourceTeam) {
            const seededState = buildInitialStateFromSourceTeam(sourceTeam, stepParam);
            if (seededState) {
                return seededState;
            }
        }

        if (stepParam === 'roles') {
            return {
                currentStep: 1,
                teamName: 'New Team',
            };
        }

        if (stepParam === 'confirm') {
            return {
                currentStep: 2,
                teamName: sourceTeam?.title || 'New Team',
            };
        }

        return undefined;
    }, [sourceTeam, stepParam]);

    const quickStartAction = React.useCallback(async () => {
        const firstMachineId = machines[0]?.id;

        const artifactId = await sync.createArtifact(
            'My Team',
            JSON.stringify({
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
            [],
            false,
            'team'
        );

        router.replace(`/teams/${artifactId}`);
    }, [machines, router]);

    const [isQuickStartLoading, handleQuickStart] = useAhaAction(quickStartAction);

    const handleCustomSetup = React.useCallback(() => {
        setViewMode('wizard');
    }, []);

    if (viewMode === 'wizard') {
        if (isSourceTeamLoading) {
            return (
                <WebModalWrapper>
                    <Stack.Screen
                        options={{
                            headerTitle: screenTitle,
                            headerBackTitle: 'Teams',
                        }}
                    />
                    <View style={[styles.container, styles.loadingState]}>
                        <ActivityIndicator size="small" color="#8A8882" />
                        <Text style={styles.loadingStateText}>{t('common.loading') || 'Loading'}</Text>
                    </View>
                </WebModalWrapper>
            );
        }

        return (
            <WebModalWrapper>
                <WizardProvider
                    key={`${sourceTeamId ?? viewParam ?? 'entry'}:${stepParam ?? 'name'}`}
                    initialState={wizardInitialState}
                >
                    <Stack.Screen
                        options={{
                            headerTitle: screenTitle,
                            headerBackTitle: 'Teams',
                        }}
                    />
                    <WizardContent title={wizardNavTitle} />
                </WizardProvider>
            </WebModalWrapper>
        );
    }

    return (
        <WebModalWrapper>
            <Stack.Screen
                options={{
                    headerTitle: screenTitle,
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
    loadingState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        paddingHorizontal: 24,
    },
    loadingStateText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
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
    wizardNav: {
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 10,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.divider,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
    },
    wizardNavBack: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    wizardNavTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: '#1A1918',
    },
    wizardStepText: {
        fontSize: 13,
        fontWeight: '500',
        color: theme.colors.textSecondary,
    },
    progressBar: {
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.divider,
        paddingHorizontal: 16,
        paddingBottom: 14,
        flexDirection: 'row',
        gap: 8,
    },
    progressSegment: {
        flex: 1,
        height: 4,
        borderRadius: 2,
        backgroundColor: theme.colors.groupped.background,
    },
    progressSegmentActive: {
        backgroundColor: '#3D8A5A',
    },
}));
