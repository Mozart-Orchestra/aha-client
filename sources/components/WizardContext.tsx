/**
 * R4: Team Wizard Context
 * Centralized state management for the team creation wizard.
 * Immutable state updates via spread operator.
 * submit() closes over the latest state via ref to avoid stale closure issues.
 */

import React from 'react';
import {
    TeamWizardState,
    WizardContextValue,
    initialWizardState,
} from '@/app/(app)/teams/wizard/types';
import { useRouter } from 'expo-router';
import { sync } from '@/sync/sync';
import { storage } from '@/sync/storage';

const WizardContext = React.createContext<WizardContextValue | null>(null);

export function WizardProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [state, setStateInternal] = React.useState<TeamWizardState>(initialWizardState);

    // Keep a ref to always have the latest state inside submit's closure
    const stateRef = React.useRef<TeamWizardState>(state);
    stateRef.current = state;

    const setState = React.useCallback((updates: Partial<TeamWizardState>) => {
        setStateInternal((prev) => ({ ...prev, ...updates }));
    }, []);

    const nextStep = React.useCallback(() => {
        setStateInternal((prev) => ({
            ...prev,
            currentStep: Math.min(prev.currentStep + 1, 2),
        }));
    }, []);

    const prevStep = React.useCallback(() => {
        setStateInternal((prev) => ({
            ...prev,
            currentStep: Math.max(prev.currentStep - 1, 0),
        }));
    }, []);

    const goToStep = React.useCallback((step: number) => {
        setStateInternal((prev) => ({
            ...prev,
            currentStep: Math.max(0, Math.min(step, 2)),
        }));
    }, []);

    const reset = React.useCallback(() => {
        setStateInternal(initialWizardState);
    }, []);

    const submit = React.useCallback(async () => {
        const current = stateRef.current;

        setState({ isSubmitting: true, errors: {} });

        try {
            const errors: Record<string, string> = {};
            if (!current.teamName.trim()) {
                errors.teamName = 'Team name is required';
            }
            if (current.roles.length === 0) {
                errors.roles = 'At least one role is required';
            }

            if (Object.keys(errors).length > 0) {
                setState({ errors, isSubmitting: false });
                return;
            }

            const artifact = await sync.createArtifact({
                type: 'team',
                title: current.teamName,
                body: JSON.stringify({
                    name: current.teamName,
                    workingDirectory: current.workingDirectory,
                    goal: current.goal,
                    agentLanguage: current.agentLanguage,
                    members: [],
                    roles: current.roles,
                }),
            });

            for (const role of current.roles) {
                for (let i = 0; i < role.quantity; i++) {
                    const sessionId = `${artifact.id}-${role.roleId}-${i + 1}`;
                    await sync.addTeamMember(artifact.id, sessionId, role.roleId);
                }
            }

            if (current.startImmediately) {
                for (const role of current.roles) {
                    for (let i = 0; i < role.quantity; i++) {
                        const machineId =
                            role.machineId ||
                            Object.keys(storage.getState().machines || {})[0];
                        if (machineId) {
                            await sync.spawnSessionOnMachine(machineId, {
                                roleId: role.roleId,
                                teamId: artifact.id,
                                mode: role.mode,
                                model: role.model,
                                skills: role.skills,
                                mcpServers: role.mcpServers,
                            });
                        }
                    }
                }
            }

            router.replace(`/teams/${artifact.id}`);
        } catch (error) {
            setState({
                errors: {
                    submit: error instanceof Error ? error.message : 'Failed to create team. Please try again.',
                },
                isSubmitting: false,
            });
        }
    }, [setState, router]);

    const value: WizardContextValue = React.useMemo(
        () => ({
            state,
            setState,
            nextStep,
            prevStep,
            goToStep,
            reset,
            submit,
        }),
        [state, setState, nextStep, prevStep, goToStep, reset, submit],
    );

    return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
}

export function useWizard(): WizardContextValue {
    const context = React.useContext(WizardContext);
    if (!context) {
        throw new Error('useWizard must be used within a WizardProvider');
    }
    return context;
}

export { WizardContext };
