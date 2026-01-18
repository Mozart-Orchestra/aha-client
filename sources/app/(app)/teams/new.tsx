import React from 'react';
import { View, ScrollView, TextInput, Pressable, ActivityIndicator, Platform, Switch } from 'react-native';
import { Text } from '@/components/StyledText';
import { useRouter, Stack } from 'expo-router';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { t } from '@/text';
import { layout } from '@/components/layout';
import { Modal } from '@/modal';
import { sync } from '@/sync/sync';
import { useAllSessions, storage, useAllMachines, useSetting } from '@/sync/storage';
import { Ionicons } from '@expo/vector-icons';
import { DEFAULT_KANBAN_BOARD, KanbanTeamMember, KanbanBoard, DEFAULT_TEAM_AGREEMENTS, DEFAULT_TEAM_ROLES, KanbanTeamRole } from '@/sync/kanbanTypes';
import { getRecentPathForMachine, updateRecentMachinePaths, getKnownPathsForMachine } from '@/utils/machinePaths';
import { getLocalizedTeamRoles } from '@/team-config/i18n';

// Use localized team roles instead of hardcoded ones
const LOCALIZED_TEAM_ROLES = getLocalizedTeamRoles();
const ROLE_LIBRARY: Record<string, KanbanTeamRole> = LOCALIZED_TEAM_ROLES.reduce((acc, role) => {
    acc[role.id] = role;
    return acc;
}, {} as Record<string, KanbanTeamRole>);
const INITIAL_ROLE_COUNTS: Record<string, number> = DEFAULT_TEAM_ROLES.reduce((acc, role) => {
    if (role.id === 'master') {
        acc[role.id] = 1;
    } else if (role.id === 'builder') {
        acc[role.id] = 1;
    } else if (role.id === 'framer') {
        acc[role.id] = 0;
    } else if (role.id === 'scout') {
        acc[role.id] = 1;
    } else if (role.id === 'scribe') {
        acc[role.id] = 1;
    } else if (role.id === 'qa') {
        acc[role.id] = 0;
    } else if (role.id === 'reviewer') {
        acc[role.id] = 0;
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
    const [roleCounts, setRoleCounts] = React.useState<Record<string, number>>(() => ({ ...INITIAL_ROLE_COUNTS }));

    const [selectedSessions, setSelectedSessions] = React.useState<Set<string>>(new Set());
    const [sessionRoles, setSessionRoles] = React.useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = React.useState(false);
    const [titleFocused, setTitleFocused] = React.useState(false);
    const [targetFocused, setTargetFocused] = React.useState(false);
    const [cwd, setCwd] = React.useState('');
    const [cwdEdited, setCwdEdited] = React.useState(false);
    const [agentBinary, setAgentBinary] = React.useState('');
    const [selectedMachineId, setSelectedMachineId] = React.useState<string | null>(() => {
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

    const defaultRoleId = 'builder';

    React.useEffect(() => {
        if (machines.length === 0) {
            setSelectedMachineId(null);
            return;
        }
        if (selectedMachineId && machines.some(machine => machine.id === selectedMachineId)) {
            return;
        }
        const fallback = machines.find(machine => machine.active) ?? machines[0];
        setSelectedMachineId(fallback?.id ?? null);
        setIsPathDropdownOpen(false);
    }, [machines, selectedMachineId]);

    React.useEffect(() => {
        setCwdEdited(false);
    }, [selectedMachineId]);

    React.useEffect(() => {
        if (!selectedMachineId || cwdEdited) {
            return;
        }
        const suggestedPath = getRecentPathForMachine(selectedMachineId, recentMachinePaths);
        setCwd((prev) => (prev === suggestedPath ? prev : suggestedPath));
    }, [selectedMachineId, recentMachinePaths, cwdEdited]);

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
            const hasRequestedSpawns = Object.values(roleCounts).some(c => c > 0);
            let roomIdForNavigation: string | null = null;

            let agentType: 'claude' | 'codex' = 'claude';
            if (resolvedAgentBinary && resolvedAgentBinary.toLowerCase().includes('codex')) {
                agentType = 'codex';
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
            }

            // === Desktop Bridge Flow ===
            if (desktopBridge) {
                const desktopMembers: DesktopRoomMemberInput[] = manualMembers.map((m) => ({
                    id: m.sessionId,
                    name: m.displayName || m.sessionId,
                    type: 'session',
                    role: m.roleId === 'master' ? 'master' : 'executor',
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
                                    HAPPY_ROOM_NAME: title.trim()
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
                                            agent: agentType,
                                            sessionTag: tag,
                                            teamId: artifactId,
                                            role: roleId,
                                            sessionName: agentTitle,
                                            sessionPath: resolvedCwd
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

                // STEP 3: Update artifact with complete member list
                board.team.members = [...manualMembers, ...spawnedMembers];
                const updatedBody = JSON.stringify(board, null, 2);
                const allMemberIds = [
                    ...manualMembers.map(m => m.sessionId).filter(id => id && id.length > 0),
                    ...spawnedMembers.map(m => m.sessionId).filter(id => id && id.length > 0)
                ];

                await sync.updateArtifact(artifactId, null, updatedBody, allMemberIds, false, 'team');

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
    }, [title, target, roleCounts, selectedSessions, isSaving, router, desktopBridge, sessionRoles, sessionLookup, cwd, agentBinary, selectedMachineId, agentType, recentMachinePaths]);

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
                        <Text style={styles.label}>Team Composition (Auto-Spawn)</Text>
                        <View style={{ backgroundColor: theme.colors.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: theme.colors.divider }}>
                            {LOCALIZED_TEAM_ROLES.map(role => (
                                <View key={role.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, lastChild: { marginBottom: 0 } } as any}>
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
                                            {roleCounts[role.id] || 0}
                                        </Text>
                                        <Pressable
                                            onPress={() => updateRoleCount(role.id, 1)}
                                            style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 6, backgroundColor: theme.colors.surface }}
                                        >
                                            <Ionicons name="add" size={20} color={theme.colors.text} />
                                        </Pressable>
                                    </View>
                                </View>
                            ))}
                        </View>

                    </View>

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
                                                    onPress={() => setSelectedMachineId(machine.id)}
                                                    style={[
                                                        styles.machineItem,
                                                        isSelected && styles.machineItemSelected
                                                    ]}
                                                >
                                                    <Text style={styles.machineName}>
                                                        {machine.metadata?.displayName || machine.metadata?.host || 'Machine'}
                                                    </Text>
                                                    <Text style={styles.machineMeta}>
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
