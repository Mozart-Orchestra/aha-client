import React from 'react';
import { View, ScrollView, TextInput, Pressable, ActivityIndicator, Platform, Switch } from 'react-native';
import { Text } from '@/components/ui/StyledText';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { t } from '@/text';
import { layout } from '@/utils/layout';
import { Modal } from '@/modal';
import { sync } from '@/sync/sync';
import { useAllSessions, storage, useAllMachines, useSetting } from '@/sync/storage';
import { Ionicons } from '@expo/vector-icons';
import { DEFAULT_KANBAN_BOARD, KanbanTeamMember, KanbanBoard, DEFAULT_TEAM_AGREEMENTS, DEFAULT_TEAM_ROLES, KanbanTeamRole } from '@/sync/kanbanTypes';
import { getRecentPathForMachine, updateRecentMachinePaths, getKnownPathsForMachine } from '@/utils/machinePaths';
import { getLocalizedTeamRoles } from '@/team-config/i18n';
import { getSupportedLanguages } from '@/i18n';

// Use localized team roles instead of hardcoded ones
const LOCALIZED_TEAM_ROLES = getLocalizedTeamRoles();
const ROLE_LIBRARY: Record<string, KanbanTeamRole> = LOCALIZED_TEAM_ROLES.reduce((acc, role) => {
    acc[role.id] = role;
    return acc;
}, {} as Record<string, KanbanTeamRole>);
const INITIAL_ROLE_COUNTS: Record<string, number> = LOCALIZED_TEAM_ROLES.reduce((acc, role) => {
    if (role.id === 'master') {
        acc[role.id] = 1;  // Master 是团队的核心协调者
    } else if (role.id === 'orchestrator') {
        acc[role.id] = 0;  // Orchestrator 与 Master 类似，默认不启用
    } else if (role.id === 'architect') {
        acc[role.id] = 1;
    } else if (role.id === 'implementer') {
        acc[role.id] = 1;
    } else if (role.id === 'qa-engineer') {
        acc[role.id] = 1;
    } else if (role.id === 'observer') {
        acc[role.id] = 1;
    } else {
        acc[role.id] = 0;
    }
    return acc;
}, {} as Record<string, number>);
import { useDesktopBridge, DesktopRoomMemberInput } from '@/desktop/useDesktopBridge';

const stylesheet = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.colors.groupped.background,
    },
    scrollView: {
        flex: 1,
    },
    contentContainer: {
        padding: 16,
        paddingBottom: 100,
    },
    inputGroup: {
        marginBottom: 24,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    input: {
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: theme.colors.text,
        borderWidth: 1,
        borderColor: theme.colors.divider,
    } as any,
    inputFocused: {
        borderColor: theme.colors.button.primary.background,
    },
    headerButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    headerButtonText: {
        fontSize: 17,
        fontWeight: '600',
        color: theme.colors.header.tint,
    },
    headerButtonDisabled: {
        opacity: 0.5,
    },
    sessionItem: {
        flexDirection: 'column', // Changed to column to accommodate role selector
        backgroundColor: theme.colors.surface,
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.divider,
    },
    sessionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sessionItemFirst: {
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
    },
    sessionItemLast: {
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        borderBottomWidth: 0,
    },
    sessionInfo: {
        flex: 1,
        marginLeft: 12,
    },
    sessionPath: {
        fontSize: 14,
        color: theme.colors.text,
        fontWeight: '500',
    },
    sessionMeta: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: theme.colors.textSecondary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxSelected: {
        backgroundColor: theme.colors.button.primary.background,
        borderColor: theme.colors.button.primary.background,
    },
    roleSelector: {
        marginTop: 12,
        marginLeft: 36, // Indent to align with text
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    roleChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: theme.colors.groupped.background,
        borderWidth: 1,
        borderColor: theme.colors.divider,
    },
    roleChipSelected: {
        backgroundColor: theme.colors.button.primary.background,
        borderColor: theme.colors.button.primary.background,
    },
    roleChipText: {
        fontSize: 12,
        color: theme.colors.text,
    },
    roleChipTextSelected: {
        color: '#FFF',
        fontWeight: '600',
    },
    helperText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginTop: 8,
    },
    machineList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    machineItem: {
        flexGrow: 1,
        minWidth: 160,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        borderRadius: 12,
        padding: 12,
        backgroundColor: theme.colors.surface,
    },
    machineItemSelected: {
        borderColor: theme.colors.button.primary.background,
        backgroundColor: theme.colors.groupped.background,
    },
    machineName: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.text,
    },
    machineMeta: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    machineItemOffline: {
        opacity: 0.6,
    },
    machineMetaOffline: {
        color: theme.colors.textDestructive,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusOnline: {
        backgroundColor: '#34C759',
    },
    statusOffline: {
        backgroundColor: theme.colors.textDestructive,
    },
    agentChipGroup: {
        flexDirection: 'row',
        gap: 12,
    },
    agentChip: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        alignItems: 'center',
    },
    agentChipSelected: {
        borderColor: theme.colors.button.primary.background,
        backgroundColor: theme.colors.button.primary.background,
    },
    agentChipText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    agentChipTextSelected: {
        color: '#FFF',
    },
    inlineButton: {
        marginTop: 8,
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: theme.colors.divider,
    },
    inlineButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    pathDropdownToggle: {
        marginTop: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.surface,
    },
    pathDropdownToggleText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    pathDropdown: {
        marginTop: 8,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        borderRadius: 12,
        backgroundColor: theme.colors.surface,
        overflow: 'hidden',
    },
    pathOption: {
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.colors.divider,
    },
    pathOptionLast: {
        borderBottomWidth: 0,
    },
    pathOptionText: {
        fontSize: 13,
        color: theme.colors.text,
    },
    pathOptionSubText: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        marginTop: 2,
    }
}));

export default function NewTeamScreen() {
    const { theme } = useUnistyles();
    const styles = stylesheet;
    const router = useRouter();
    const searchParams = useLocalSearchParams<{ machineId?: string | string[] }>();
    const allSessions = useAllSessions();
    const machines = useAllMachines();
    const recentMachinePaths = useSetting('recentMachinePaths');
    const lastUsedAgent = useSetting('lastUsedAgent');
    const { bridge: desktopBridge } = useDesktopBridge();

    // Filter only active sessions
    const activeSessions = React.useMemo(() => {
        return allSessions.filter(s => s.active);
    }, [allSessions]);

    // Lookup map for sessions
    const sessionLookup = React.useMemo(() => {
        return new Map(allSessions.map(s => [s.id, s]));
    }, [allSessions]);

    const [title, setTitle] = React.useState('');
    const [target, setTarget] = React.useState('');
    const [creationMode, setCreationMode] = React.useState<'manual' | 'prompt'>('prompt');
    const [taskPrompt, setTaskPrompt] = React.useState('');
    const [roleCounts, setRoleCounts] = React.useState<Record<string, number>>(() => ({ ...INITIAL_ROLE_COUNTS }));
    // Track agent type per role (defaults to global agentType)
    const [roleAgentTypes, setRoleAgentTypes] = React.useState<Record<string, 'claude' | 'codex'>>({});

    const [selectedSessions, setSelectedSessions] = React.useState<Set<string>>(new Set());
    const [sessionRoles, setSessionRoles] = React.useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = React.useState(false);
    const [titleFocused, setTitleFocused] = React.useState(false);
    const [targetFocused, setTargetFocused] = React.useState(false);
    const [cwd, setCwd] = React.useState('');
    const [cwdEdited, setCwdEdited] = React.useState(false);
    const [agentBinary, setAgentBinary] = React.useState('');
    const preferredMachineId = React.useMemo(() => {
        const machineId = searchParams.machineId;
        if (Array.isArray(machineId)) {
            return machineId[0] ?? null;
        }
        return typeof machineId === 'string' && machineId.length > 0 ? machineId : null;
    }, [searchParams.machineId]);
    const [selectedMachineId, setSelectedMachineId] = React.useState<string | null>(() => {
        if (preferredMachineId) {
            return preferredMachineId;
        }
        const machineList = Object.values(storage.getState().machines || {});
        const active = machineList.find((machine) => machine.active);
        return active?.id ?? (machineList[0]?.id ?? null);
    });
    const [agentType, setAgentType] = React.useState<'claude' | 'codex'>(() => {
        if (lastUsedAgent === 'codex' || lastUsedAgent === 'claude') {
            return lastUsedAgent;
        }
        return 'claude';
    });
    const [isPathDropdownOpen, setIsPathDropdownOpen] = React.useState(false);
    const [agentLanguage, setAgentLanguage] = React.useState<'en' | 'zh'>('en');

    const defaultRoleId = 'implementer';

    // Track if machine change was user-initiated (not from machines array refresh)
    const userChangedMachineRef = React.useRef(false);

    const handleMachineChange = React.useCallback((machineId: string | null) => {
        userChangedMachineRef.current = true;
        setSelectedMachineId(machineId);
    }, []);

    React.useEffect(() => {
        if (machines.length === 0) {
            setSelectedMachineId(preferredMachineId ?? null);
            return;
        }
        if (preferredMachineId && machines.some((machine) => machine.id === preferredMachineId)) {
            if (selectedMachineId !== preferredMachineId) {
                setSelectedMachineId(preferredMachineId);
                setIsPathDropdownOpen(false);
            }
            return;
        }
        if (selectedMachineId && machines.some(machine => machine.id === selectedMachineId)) {
            return;
        }
        // This is a fallback selection, not user-initiated
        const fallback = machines.find(machine => machine.active) ?? machines[0];
        setSelectedMachineId(fallback?.id ?? null);
        setIsPathDropdownOpen(false);
    }, [machines, preferredMachineId, selectedMachineId]);

    // Only reset cwdEdited when user explicitly changes machine
    React.useEffect(() => {
        if (userChangedMachineRef.current) {
            setCwdEdited(false);
            userChangedMachineRef.current = false;
        }
    }, [selectedMachineId]);

    // Auto-suggest path when machine changes or on initial mount
    // NOTE: recentMachinePaths intentionally excluded from deps to prevent
    // overwriting user input when settings sync. Path is only auto-suggested
    // when machine changes or on initial mount (when cwdEdited is false).
    React.useEffect(() => {
        if (!selectedMachineId || cwdEdited) {
            return;
        }
        const suggestedPath = getRecentPathForMachine(selectedMachineId, recentMachinePaths);
        setCwd((prev) => (prev === suggestedPath ? prev : suggestedPath));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedMachineId, cwdEdited]);

    const selectedMachine = React.useMemo(() => {
        if (!selectedMachineId) {
            return null;
        }
        return machines.find((machine) => machine.id === selectedMachineId) ?? null;
    }, [machines, selectedMachineId]);
    const availablePaths = React.useMemo(() => {
        return getKnownPathsForMachine(selectedMachineId, recentMachinePaths, 10);
    }, [selectedMachineId, recentMachinePaths]);

    const handleAgentTypeChange = React.useCallback((type: 'claude' | 'codex') => {
        setAgentType(type);
        sync.applySettings({ lastUsedAgent: type });
    }, []);

    const handleCwdChange = React.useCallback((value: string) => {
        setCwd(value);
        setCwdEdited(true);
    }, []);

    const handleUseSuggestedPath = React.useCallback(() => {
        if (!selectedMachineId) {
            return;
        }
        const suggested = getRecentPathForMachine(selectedMachineId, recentMachinePaths);
        setCwd(suggested);
        setCwdEdited(false);
        setIsPathDropdownOpen(false);
    }, [selectedMachineId, recentMachinePaths]);

    const handleSelectPath = React.useCallback((path: string) => {
        setCwd(path);
        setCwdEdited(true);
        setIsPathDropdownOpen(false);
    }, []);

    const toggleSession = React.useCallback((sessionId: string) => {
        setSelectedSessions(prev => {
            const next = new Set(prev);
            if (next.has(sessionId)) {
                next.delete(sessionId);
                // Also remove role assignment
                setSessionRoles(prevRoles => {
                    const nextRoles = { ...prevRoles };
                    delete nextRoles[sessionId];
                    return nextRoles;
                });
            } else {
                next.add(sessionId);
                // Default role assignment
                setSessionRoles(prevRoles => ({
                    ...prevRoles,
                    [sessionId]: defaultRoleId
                }));
            }
            return next;
        });
    }, []);

    const setRole = React.useCallback((sessionId: string, roleId: string) => {
        setSessionRoles(prev => ({
            ...prev,
            [sessionId]: roleId
        }));
    }, []);

    const updateRoleCount = React.useCallback((roleId: string, delta: number) => {
        setRoleCounts(prev => {
            const current = prev[roleId] || 0;
            const next = Math.max(0, current + delta);
            return { ...prev, [roleId]: next };
        });
    }, []);

    const updateRoleAgentType = React.useCallback((roleId: string, type: 'claude' | 'codex') => {
        setRoleAgentTypes(prev => ({
            ...prev,
            [roleId]: type
        }));
    }, []);

    // Helper to get agent type for a specific role (falls back to global)
    const getRoleAgentType = React.useCallback((roleId: string): 'claude' | 'codex' => {
        return roleAgentTypes[roleId] ?? agentType;
    }, [roleAgentTypes, agentType]);

    const handleSave = React.useCallback(async () => {
        if (isSaving) return;

        if (!title.trim()) {
            await Modal.alert(
                t('common.error'),
                'Please enter a team name'
            );
            return;
        }

        try {
            setIsSaving(true);
            const resolvedCwd = cwd.trim();
            const resolvedAgentBinary = agentBinary.trim();
            const machineIdForSpawn = selectedMachineId;
            const isPromptMode = creationMode === 'prompt';
            const hasRequestedSpawns = isPromptMode ? (taskPrompt.trim().length > 0) : Object.values(roleCounts).some(c => c > 0);
            let roomIdForNavigation: string | null = null;

            let agentType: 'claude' | 'codex' = 'claude';
            if (resolvedAgentBinary && resolvedAgentBinary.toLowerCase().includes('codex')) {
                agentType = 'codex';
            }

            if (isPromptMode && !taskPrompt.trim()) {
                await Modal.alert(
                    t('common.error'),
                    'Please enter a task prompt for the team.'
                );
                return;
            }

            // 1. Prepare manually selected members
            const manualMembers: KanbanTeamMember[] = Array.from(selectedSessions).map((sessionId) => {
                const session = sessionLookup.get(sessionId);
                const summary = session?.metadata?.summary?.text;
                return {
                    sessionId,
                    roleId: sessionRoles[sessionId] || defaultRoleId,
                    displayName: session?.metadata?.name || session?.metadata?.path || sessionId,
                    focusAreas: summary ? [summary] : undefined,
                };
            });

            // 2. Validate requirements for auto-spawned agents
            const spawnedMembers: (KanbanTeamMember & { tag?: string })[] = [];

            if (hasRequestedSpawns && !desktopBridge) {
                if (!resolvedCwd) {
                    await Modal.alert(
                        t('common.error'),
                        'Please provide a working directory for the auto-spawned agents.'
                    );
                    return;
                }
                if (!machineIdForSpawn) {
                    await Modal.alert(
                        t('common.error'),
                        'Please select a machine to run the auto-spawned agents.'
                    );
                    return;
                }
                // Check if selected machine is online
                const targetMachineCheck = storage.getState().machines[machineIdForSpawn];
                if (!targetMachineCheck?.active) {
                    await Modal.alert(
                        t('common.error'),
                        'The selected machine is offline. Please select an online machine or wait for the machine to come online.'
                    );
                    return;
                }
            }

            // === Desktop Bridge Flow ===
            if (desktopBridge) {
                const desktopMembers: DesktopRoomMemberInput[] = manualMembers.map((m) => ({
                    id: m.sessionId,
                    name: m.displayName || m.sessionId,
                    type: 'session',
                    role: m.roleId === 'orchestrator' ? 'master' : 'executor',
                    transport: 'remote',
                    metadata: {
                        roleId: m.roleId
                    }
                }));

                const room = await desktopBridge.createRoom({
                    name: title.trim(),
                    description: target.trim(),
                    members: desktopMembers,
                    metadata: {
                        roleTemplates: ROLE_LIBRARY,
                        assignedRoles: sessionRoles,
                        target: target.trim()
                    }
                });

                roomIdForNavigation = room.id;

                // Spawn agents
                for (const [roleId, count] of Object.entries(roleCounts)) {
                    for (let i = 0; i < count; i++) {
                        try {
                            const agentTitle = `${roleId.charAt(0).toUpperCase() + roleId.slice(1)} ${i + 1}`;
                            const sessionId = await desktopBridge.startAgentSession({
                                roomId: room.id,
                                title: agentTitle,
                                env: {
                                    HAPPY_AGENT_ROLE: roleId,
                                    HAPPY_ROOM_ID: room.id,
                                    HAPPY_ROOM_NAME: title.trim(),
                                    HAPPY_AGENT_LANGUAGE: agentLanguage,
                                    HAPPY_AGENT_TYPE: getRoleAgentType(roleId)
                                },
                                cwd: resolvedCwd || undefined,
                                cliPath: resolvedAgentBinary || undefined
                            });
                            if (sessionId) {
                                spawnedMembers.push({
                                    sessionId,
                                    roleId,
                                    displayName: agentTitle
                                });
                            }
                        } catch (e) {
                            console.error(`Failed to spawn agent ${roleId}:`, e);
                        }
                    }
                }
            }

            // === Standard Flow (No Bridge / Mobile) ===
            // STEP 1: Create artifact FIRST to get teamId
            let artifactId: string;

            if (!desktopBridge) {
                // Prepare board structure
                const board: KanbanBoard = JSON.parse(JSON.stringify(DEFAULT_KANBAN_BOARD));
                if (!board.team) {
                    board.team = {
                        members: [],
                        roles: DEFAULT_TEAM_ROLES,
                        agreements: DEFAULT_TEAM_AGREEMENTS
                    };
                }

                // Add manual members to board
                board.team.members = [...manualMembers];

                if (target.trim()) {
                    board.tasks.push({
                        id: 'team-goal',
                        title: `🎯 Team Goal: ${target.trim()}`,
                        description: 'This is the primary objective for this team.',
                        status: 'todo',
                        createdAt: Date.now(),
                        updatedAt: Date.now()
                    });
                }

                const initialBody = JSON.stringify(board, null, 2);
                const allMemberSessionIds = manualMembers.map(m => m.sessionId).filter(id => id && id.length > 0);

                // Create artifact to get teamId
                artifactId = await sync.createArtifact(
                    title.trim(),
                    initialBody,
                    allMemberSessionIds,
                    false,
                    'team'
                );

                // STEP 2: Create and spawn sessions WITH teamId/role from the start
                if (hasRequestedSpawns) {
                    const targetMachine = machineIdForSpawn ? storage.getState().machines[machineIdForSpawn] : null;

                    if (isPromptMode) {
                        // Prompt mode: spawn a single org-manager seed agent with the task prompt
                        const roleId = 'org-manager';
                        const agentTitle = 'Org-manager 1';
                        const tag = `team-${Date.now()}-${roleId}-0`;

                        if (targetMachine?.active && resolvedCwd) {
                            try {
                                const spawnedSessionId = await sync.spawnSessionOnMachine(targetMachine.id, {
                                    directory: resolvedCwd,
                                    agent: getRoleAgentType(roleId),
                                    sessionTag: tag,
                                    teamId: artifactId,
                                    role: roleId,
                                    sessionName: agentTitle,
                                    sessionPath: resolvedCwd,
                                    env: {
                                        HAPPY_AGENT_LANGUAGE: agentLanguage,
                                        AHA_TASK_PROMPT: taskPrompt.trim()
                                    }
                                });
                                if (spawnedSessionId) {
                                    spawnedMembers.push({
                                        sessionId: spawnedSessionId,
                                        roleId,
                                        displayName: agentTitle,
                                        tag
                                    });
                                } else {
                                    console.warn(`Spawned org-manager but no sessionId was returned`);
                                }
                            } catch (spawnError) {
                                console.error('Failed to auto-spawn org-manager:', spawnError);
                            }
                        } else if (!targetMachine?.active) {
                            console.warn('Selected machine is offline; skipping auto-spawn.');
                        }
                    } else {
                        // Manual mode: spawn agents by role counts
                        for (const [roleId, count] of Object.entries(roleCounts)) {
                            for (let i = 0; i < count; i++) {
                                try {
                                    const agentTitle = `${roleId.charAt(0).toUpperCase() + roleId.slice(1)} ${i + 1}`;
                                    const tag = `team-${Date.now()}-${roleId}-${i}`;

                                    // Spawn WITH teamId, role, name, and path
                                    if (targetMachine?.active && resolvedCwd) {
                                        try {
                                            const spawnedSessionId = await sync.spawnSessionOnMachine(targetMachine.id, {
                                                directory: resolvedCwd,
                                                agent: getRoleAgentType(roleId),
                                                sessionTag: tag,
                                                teamId: artifactId,
                                                role: roleId,
                                                sessionName: agentTitle,
                                                sessionPath: resolvedCwd,
                                                env: {
                                                    HAPPY_AGENT_LANGUAGE: agentLanguage
                                                }
                                            });
                                            if (spawnedSessionId) {
                                                spawnedMembers.push({
                                                    sessionId: spawnedSessionId,
                                                    roleId,
                                                    displayName: agentTitle,
                                                    tag
                                                });
                                            } else {
                                                console.warn(`Spawned agent ${roleId} but no sessionId was returned`);
                                            }
                                        } catch (spawnError) {
                                            console.error('Failed to auto-spawn:', spawnError);
                                        }
                                    } else if (!targetMachine?.active) {
                                        console.warn('Selected machine is offline; skipping auto-spawn.');
                                    }
                                } catch (e) {
                                    console.error(`Failed to spawn agent ${roleId}:`, e);
                                }
                            }
                        }
                    }
                }

                // STEP 3: Update artifact with complete member list
                board.team.members = [...manualMembers, ...spawnedMembers];
                const updatedBody = JSON.stringify(board, null, 2);
                const allMemberIds = [
                    ...manualMembers.map(m => m.sessionId).filter(id => id && id.length > 0),
                    ...spawnedMembers.map(m => m.sessionId).filter(id => id && id.length > 0)
                ];

                await sync.updateArtifact(artifactId, title.trim(), updatedBody, allMemberIds, false, 'team');

                // Update metadata for manual members only (running sessions)
                if (manualMembers.length > 0) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    for (const member of manualMembers) {
                        try {
                            const currentSession = storage.getState().sessions[member.sessionId];
                            if (currentSession && currentSession.metadata) {
                                await sync.updateSessionMetadata(member.sessionId, {
                                    ...currentSession.metadata,
                                    role: member.roleId,
                                    teamId: artifactId
                                });
                            }
                        } catch (error) {
                            console.warn(`Failed to update metadata for manual session ${member.sessionId}:`, error);
                        }
                    }
                }
            } else {
                // Desktop bridge flow: create artifact with all members
                const board: KanbanBoard = JSON.parse(JSON.stringify(DEFAULT_KANBAN_BOARD));
                if (!board.team) {
                    board.team = {
                        members: [],
                        roles: DEFAULT_TEAM_ROLES,
                        agreements: DEFAULT_TEAM_AGREEMENTS
                    };
                }
                board.team.members = [...manualMembers, ...spawnedMembers];
                if (roomIdForNavigation) {
                    board.roomId = roomIdForNavigation;
                }

                if (target.trim()) {
                    board.tasks.push({
                        id: 'team-goal',
                        title: `🎯 Team Goal: ${target.trim()}`,
                        description: 'This is the primary objective for this team.',
                        status: 'todo',
                        createdAt: Date.now(),
                        updatedAt: Date.now()
                    });
                }

                const initialBody = JSON.stringify(board, null, 2);
                const allMemberIds = [
                    ...manualMembers.map(m => m.sessionId).filter(id => id && id.length > 0),
                    ...spawnedMembers.map(m => m.sessionId).filter(id => id && id.length > 0)
                ];

                artifactId = await sync.createArtifact(
                    title.trim(),
                    initialBody,
                    allMemberIds,
                    false,
                    'team'
                );

                for (const member of manualMembers) {
                    const session = sessionLookup.get(member.sessionId);
                    if (session && session.metadata) {
                        try {
                            await sync.updateSessionMetadata(member.sessionId, {
                                ...session.metadata,
                                role: member.roleId,
                                teamId: artifactId
                            });
                        } catch (error) {
                            console.warn(`Failed to update metadata for session ${member.sessionId}:`, error);
                        }
                    }
                }
            }

            if (hasRequestedSpawns) {
                await Modal.alert(
                    'Team Created',
                    `Team "${title}" created with ${spawnedMembers.length} new agents.`
                );
            }

            if (resolvedCwd && selectedMachineId) {
                const updatedPaths = updateRecentMachinePaths(recentMachinePaths, selectedMachineId, resolvedCwd);
                sync.applySettings({ recentMachinePaths: updatedPaths });
            }

            if (roomIdForNavigation) {
                router.replace(`/teams/${artifactId}?roomId=${roomIdForNavigation}` as any);
            } else {
                router.replace(`/teams/${artifactId}` as any);
            }
        } catch (err) {
            console.error('Failed to create team:', err);
            await Modal.alert(
                t('common.error'),
                'Failed to create team'
            );
        } finally {
            setIsSaving(false);
        }
    }, [title, target, roleCounts, selectedSessions, isSaving, router, desktopBridge, sessionRoles, sessionLookup, cwd, agentBinary, selectedMachineId, agentType, recentMachinePaths, getRoleAgentType, agentLanguage, creationMode, taskPrompt]);

    const HeaderRight = React.useCallback(() => (
        <Pressable
            style={[styles.headerButton, isSaving && styles.headerButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
        >
            {isSaving ? (
                <ActivityIndicator size="small" color={theme.colors.header.tint} />
            ) : (
                <Text style={styles.headerButtonText}>
                    Create
                </Text>
            )}
        </Pressable>
    ), [handleSave, isSaving, styles]);

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: true,
                    headerTitle: 'New Team',
                    headerRight: HeaderRight,
                }}
            />
            <View style={styles.container}>
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={[
                        styles.contentContainer,
                        { maxWidth: layout.maxWidth, alignSelf: 'center', width: '100%' }
                    ]}
                >
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Team Name</Text>
                        <TextInput
                            style={[
                                styles.input,
                                titleFocused && styles.inputFocused,
                                Platform.OS === 'web' && {
                                    outlineStyle: 'none',
                                    outline: 'none',
                                    outlineWidth: 0,
                                    outlineColor: 'transparent'
                                } as any
                            ]}
                            value={title}
                            onChangeText={setTitle}
                            placeholder="e.g. Backend Team"
                            placeholderTextColor={theme.colors.input.placeholder}
                            onFocus={() => setTitleFocused(true)}
                            onBlur={() => setTitleFocused(false)}
                            editable={!isSaving}
                            returnKeyType="next"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Team Goal</Text>
                        <TextInput
                            style={[
                                styles.input,
                                targetFocused && styles.inputFocused,
                                Platform.OS === 'web' && {
                                    outlineStyle: 'none',
                                    outline: 'none',
                                    outlineWidth: 0,
                                    outlineColor: 'transparent'
                                } as any
                            ]}
                            value={target}
                            onChangeText={setTarget}
                            placeholder="e.g. Build a new landing page"
                            placeholderTextColor={theme.colors.input.placeholder}
                            onFocus={() => setTargetFocused(true)}
                            onBlur={() => setTargetFocused(false)}
                            editable={!isSaving}
                            returnKeyType="next"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>{t('settingsVoice.preferredLanguage')}</Text>
                        <View style={{ backgroundColor: theme.colors.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: theme.colors.divider }}>
                            {getSupportedLanguages().map((lang) => (
                                <Pressable
                                    key={lang.code}
                                    onPress={() => setAgentLanguage(lang.code as 'en' | 'zh')}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        paddingVertical: 12,
                                        paddingHorizontal: 8,
                                        backgroundColor: agentLanguage === lang.code ? theme.colors.input.background : 'transparent',
                                        borderRadius: 8,
                                    }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                        <Text style={{ fontSize: 16, color: theme.colors.text, fontWeight: agentLanguage === lang.code ? '600' : '400' }}>
                                            {lang.nativeName}
                                        </Text>
                                        <Text style={{ fontSize: 14, color: theme.colors.textSecondary, marginLeft: 8 }}>
                                            ({lang.name})
                                        </Text>
                                    </View>
                                    {agentLanguage === lang.code && (
                                        <Ionicons name="checkmark-circle" size={24} color={theme.colors.button.primary.background} />
                                    )}
                                </Pressable>
                            ))}
                        </View>
                        <Text style={styles.helperText}>
                            {t('settingsVoice.preferredLanguageSubtitle')}
                        </Text>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Creation Mode</Text>
                        <View style={{ flexDirection: 'row', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.divider }}>
                            <Pressable
                                onPress={() => setCreationMode('prompt')}
                                style={{
                                    flex: 1,
                                    paddingVertical: 12,
                                    alignItems: 'center',
                                    backgroundColor: creationMode === 'prompt' ? theme.colors.button.primary.background : theme.colors.surface,
                                }}
                            >
                                <Text style={{
                                    fontSize: 14,
                                    fontWeight: '600',
                                    color: creationMode === 'prompt' ? '#FFF' : theme.colors.text,
                                }}>Prompt</Text>
                            </Pressable>
                            <Pressable
                                onPress={() => setCreationMode('manual')}
                                style={{
                                    flex: 1,
                                    paddingVertical: 12,
                                    alignItems: 'center',
                                    backgroundColor: creationMode === 'manual' ? theme.colors.button.primary.background : theme.colors.surface,
                                    borderLeftWidth: 1,
                                    borderLeftColor: theme.colors.divider,
                                }}
                            >
                                <Text style={{
                                    fontSize: 14,
                                    fontWeight: '600',
                                    color: creationMode === 'manual' ? '#FFF' : theme.colors.text,
                                }}>Manual</Text>
                            </Pressable>
                        </View>
                    </View>

                    {creationMode === 'prompt' && (
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Task Prompt</Text>
                            <TextInput
                                style={[
                                    styles.input,
                                    {
                                        minHeight: 120,
                                        textAlignVertical: 'top',
                                        paddingTop: 14,
                                    },
                                    Platform.OS === 'web' && {
                                        outlineStyle: 'none',
                                        outline: 'none',
                                        outlineWidth: 0,
                                        outlineColor: 'transparent'
                                    } as any
                                ]}
                                value={taskPrompt}
                                onChangeText={setTaskPrompt}
                                placeholder="描述你的任务，AI 将自动组建团队..."
                                placeholderTextColor={theme.colors.input.placeholder}
                                multiline
                                editable={!isSaving}
                            />
                            <Text style={styles.helperText}>
                                An org-manager agent will be spawned to analyze your task and assemble the right team automatically.
                            </Text>
                        </View>
                    )}

                    {creationMode === 'manual' && (
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Team Composition (Auto-Spawn)</Text>
                        <View style={{ backgroundColor: theme.colors.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: theme.colors.divider }}>
                            {LOCALIZED_TEAM_ROLES.map((role, index) => {
                                const count = roleCounts[role.id] || 0;
                                const currentAgentType = getRoleAgentType(role.id);
                                return (
                                    <View key={role.id} style={{ marginBottom: index === LOCALIZED_TEAM_ROLES.length - 1 ? 0 : 16 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <View style={{ flex: 1, marginRight: 16 }}>
                                                <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: 4 }}>{role.title}</Text>
                                                <Text style={{ fontSize: 13, color: theme.colors.textSecondary }} numberOfLines={2}>{role.summary}</Text>
                                            </View>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.colors.groupped.background, borderRadius: 8, padding: 4 }}>
                                                <Pressable
                                                    onPress={() => updateRoleCount(role.id, -1)}
                                                    style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 6, backgroundColor: theme.colors.surface }}
                                                >
                                                    <Ionicons name="remove" size={20} color={theme.colors.text} />
                                                </Pressable>
                                                <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.text, minWidth: 24, textAlign: 'center' }}>
                                                    {count}
                                                </Text>
                                                <Pressable
                                                    onPress={() => updateRoleCount(role.id, 1)}
                                                    style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 6, backgroundColor: theme.colors.surface }}
                                                >
                                                    <Ionicons name="add" size={20} color={theme.colors.text} />
                                                </Pressable>
                                            </View>
                                        </View>
                                        {/* Agent Type selector - shown when count > 0 */}
                                        {count > 0 && (
                                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, marginLeft: 4 }}>
                                                <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginRight: 8 }}>
                                                    {t('sessionInfo.aiProvider')}:
                                                </Text>
                                                <View style={{ flexDirection: 'row', borderRadius: 6, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.divider }}>
                                                    <Pressable
                                                        onPress={() => updateRoleAgentType(role.id, 'claude')}
                                                        style={{
                                                            paddingHorizontal: 12,
                                                            paddingVertical: 6,
                                                            backgroundColor: currentAgentType === 'claude' ? theme.colors.button.primary.background : theme.colors.surface,
                                                        }}
                                                    >
                                                        <Text style={{
                                                            fontSize: 12,
                                                            fontWeight: '600',
                                                            color: currentAgentType === 'claude' ? '#FFF' : theme.colors.text,
                                                        }}>Claude</Text>
                                                    </Pressable>
                                                    <Pressable
                                                        onPress={() => updateRoleAgentType(role.id, 'codex')}
                                                        style={{
                                                            paddingHorizontal: 12,
                                                            paddingVertical: 6,
                                                            backgroundColor: currentAgentType === 'codex' ? theme.colors.button.primary.background : theme.colors.surface,
                                                            borderLeftWidth: 1,
                                                            borderLeftColor: theme.colors.divider,
                                                        }}
                                                    >
                                                        <Text style={{
                                                            fontSize: 12,
                                                            fontWeight: '600',
                                                            color: currentAgentType === 'codex' ? '#FFF' : theme.colors.text,
                                                        }}>Codex</Text>
                                                    </Pressable>
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                );
                            })}
                        </View>

                    </View>
                    )}

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Automation Settings</Text>
                        <View style={{ gap: 16 }}>
                            <View>
                                <Text style={[styles.label, { fontSize: 11, marginBottom: 4 }]}>Machine</Text>
                                {machines.length === 0 ? (
                                    <Text style={styles.helperText}>
                                        Start the Happy CLI on your computer to spawn teammates automatically.
                                    </Text>
                                ) : (
                                    <View style={styles.machineList}>
                                        {machines.map(machine => {
                                            const isSelected = machine.id === selectedMachineId;
                                            return (
                                                <Pressable
                                                    key={machine.id}
                                                    onPress={() => handleMachineChange(machine.id)}
                                                    style={[
                                                        styles.machineItem,
                                                        isSelected && styles.machineItemSelected,
                                                        !machine.active && styles.machineItemOffline
                                                    ]}
                                                >
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                        <View style={[
                                                            styles.statusDot,
                                                            machine.active ? styles.statusOnline : styles.statusOffline
                                                        ]} />
                                                        <Text style={styles.machineName}>
                                                            {machine.metadata?.displayName || machine.metadata?.host || 'Machine'}
                                                        </Text>
                                                    </View>
                                                    <Text style={[styles.machineMeta, !machine.active && styles.machineMetaOffline]}>
                                                        {machine.active ? 'Online' : 'Offline'} • {machine.metadata?.platform || 'unknown'}
                                                    </Text>
                                                </Pressable>
                                            );
                                        })}
                                    </View>
                                )}
                            </View>

                            <View>
                                <Text style={[styles.label, { fontSize: 11, marginBottom: 4 }]}>Agent Type</Text>
                                <View style={styles.agentChipGroup}>
                                    {(['claude', 'codex'] as const).map(type => {
                                        const isSelected = agentType === type;
                                        return (
                                            <Pressable
                                                key={type}
                                                style={[
                                                    styles.agentChip,
                                                    isSelected && styles.agentChipSelected
                                                ]}
                                                onPress={() => handleAgentTypeChange(type)}
                                            >
                                                <Text style={[
                                                    styles.agentChipText,
                                                    isSelected && styles.agentChipTextSelected
                                                ]}>
                                                    {type === 'claude' ? 'Claude' : 'Codex'}
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            </View>

                            <View>
                                <Text style={[styles.label, { fontSize: 11, marginBottom: 4 }]}>Working Directory</Text>
                                <TextInput
                                    style={[
                                        styles.input,
                                        Platform.OS === 'web' && { outlineStyle: 'none' } as any
                                    ]}
                                    value={cwd}
                                    onChangeText={handleCwdChange}
                                    placeholder="e.g. /Users/username/project"
                                    placeholderTextColor={theme.colors.input.placeholder}
                                    editable={!isSaving}
                                />
                                {selectedMachine && (
                                    <Pressable style={styles.inlineButton} onPress={handleUseSuggestedPath}>
                                        <Text style={styles.inlineButtonText}>Use last path</Text>
                                    </Pressable>
                                )}
                                {availablePaths.length > 0 && (
                                    <>
                                        <Pressable
                                            style={styles.pathDropdownToggle}
                                            onPress={() => setIsPathDropdownOpen(prev => !prev)}
                                        >
                                            <Text style={styles.pathDropdownToggleText}>
                                                {isPathDropdownOpen ? 'Hide recent paths' : 'Choose from recent paths'}
                                            </Text>
                                            <Ionicons
                                                name={isPathDropdownOpen ? 'chevron-up' : 'chevron-down'}
                                                size={16}
                                                color={theme.colors.textSecondary}
                                            />
                                        </Pressable>
                                        {isPathDropdownOpen && (
                                            <View style={styles.pathDropdown}>
                                                {availablePaths.map((path, index) => (
                                                    <Pressable
                                                        key={`${path}-${index}`}
                                                        style={[
                                                            styles.pathOption,
                                                            index === availablePaths.length - 1 && styles.pathOptionLast
                                                        ]}
                                                        onPress={() => handleSelectPath(path)}
                                                    >
                                                        <Text style={styles.pathOptionText}>{path}</Text>
                                                        {selectedMachine?.metadata?.homeDir === path && (
                                                            <Text style={styles.pathOptionSubText}>Home Directory</Text>
                                                        )}
                                                    </Pressable>
                                                ))}
                                            </View>
                                        )}
                                    </>
                                )}
                                <Text style={styles.helperText}>
                                    Required for auto-spawned agents so they boot inside the right repository.
                                </Text>
                            </View>

                            <View>
                                <Text style={[styles.label, { fontSize: 11, marginBottom: 4 }]}>Agent Binary (Optional)</Text>
                                <TextInput
                                    style={[
                                        styles.input,
                                        Platform.OS === 'web' && { outlineStyle: 'none' } as any
                                    ]}
                                    value={agentBinary}
                                    onChangeText={setAgentBinary}
                                    placeholder="e.g. happy, codex, claudecode"
                                    placeholderTextColor={theme.colors.input.placeholder}
                                    editable={!isSaving}
                                />
                                <Text style={styles.helperText}>
                                    Used when spawning teammates through the desktop bridge.
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Add Existing Agents (Optional)</Text>
                        {activeSessions.length === 0 ? (
                            <Text style={{ color: theme.colors.textSecondary, fontStyle: 'italic' }}>
                                No active agents found.
                            </Text>
                        ) : (
                            activeSessions.map((session, index) => {
                                const isFirst = index === 0;
                                const isLast = index === activeSessions.length - 1;
                                const isSelected = selectedSessions.has(session.id);
                                const currentRole = sessionRoles[session.id] || defaultRoleId;

                                return (
                                    <View
                                        key={session.id}
                                        style={[
                                            styles.sessionItem,
                                            isFirst && styles.sessionItemFirst,
                                            isLast && styles.sessionItemLast
                                        ]}
                                    >
                                        <Pressable
                                            style={styles.sessionHeader}
                                            onPress={() => toggleSession(session.id)}
                                        >
                                            <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                                                {isSelected && (
                                                    <Ionicons name="checkmark" size={16} color="#FFF" />
                                                )}
                                            </View>
                                            <View style={styles.sessionInfo}>
                                                <Text style={styles.sessionPath} numberOfLines={1}>
                                                    {session.metadata?.path || 'Unknown Path'}
                                                </Text>
                                                <Text style={styles.sessionMeta}>
                                                    Last active: {new Date(session.updatedAt).toLocaleTimeString()}
                                                </Text>
                                            </View>
                                        </Pressable>

                                        {isSelected && (
                                            <View style={styles.roleSelector}>
                                                {(ROLE_LIBRARY ? Object.entries(ROLE_LIBRARY) : []).map(([roleId, roleDef]) => {
                                                    const isRoleSelected = currentRole === roleId;
                                                    return (
                                                        <Pressable
                                                            key={roleId}
                                                            style={[
                                                                styles.roleChip,
                                                                isRoleSelected && styles.roleChipSelected
                                                            ]}
                                                            onPress={() => setRole(session.id, roleId)}
                                                        >
                                                            <Text style={[
                                                                styles.roleChipText,
                                                                isRoleSelected && styles.roleChipTextSelected
                                                            ]}>
                                                                {roleDef.title}
                                                            </Text>
                                                        </Pressable>
                                                    );
                                                })}
                                            </View>
                                        )}
                                    </View>
                                );
                            })
                        )}
                    </View>
                </ScrollView>
            </View>
        </>
    );
}
