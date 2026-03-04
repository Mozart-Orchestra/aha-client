import React from 'react';
import { View, ScrollView, TextInput, Pressable, ActivityIndicator, Platform, Switch } from 'react-native';
import { Text } from '@/components/StyledText';
import { useRouter, Stack } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
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
import { getSupportedLanguages } from '@/i18n';
import { fetchCustomRoles, fetchDefaultRoles, fetchRolePool, CustomRole, PublicRole, RoleTemplate } from '@/sync/apiRoles';
import { composeTeamPlan, TeamCompositionPlan } from '@/sync/apiTeamComposition';
import { getServerUrl } from '@/sync/serverConfig';
import { useAuth } from '@/auth/AuthContext';
import { useDesktopBridge, DesktopRoomMemberInput } from '@/desktop/useDesktopBridge';
import { RoleSelector, RoleItem as SelectorRoleItem } from '@/components/roles/RoleSelector';
import { EvoMapDisplay, ReleaseGateCard } from '@/components/TeamCompositionDisplay';
import { SearchSuggestions } from '@/components/SearchSuggestions';

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
    composeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 12,
        gap: 12,
    },
    composeButton: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: theme.colors.button.primary.background,
        backgroundColor: theme.colors.button.primary.background,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    composeButtonDisabled: {
        opacity: 0.5,
    },
    composeButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FFF',
    },
    composeVersionSelector: {
        flexDirection: 'row',
        gap: 8,
    },
    composeVersionChip: {
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        backgroundColor: theme.colors.surface,
    },
    composeVersionChipActive: {
        borderColor: theme.colors.button.primary.background,
        backgroundColor: theme.colors.groupped.background,
    },
    composeVersionText: {
        fontSize: 11,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    composeVersionTextActive: {
        color: theme.colors.button.primary.background,
    },
    composeCard: {
        marginTop: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        padding: 10,
        backgroundColor: theme.colors.surface,
    },
    composeCardTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.text,
    },
    composeCardMeta: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    composeCardActions: {
        marginTop: 10,
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    composeCardApplyButton: {
        borderRadius: 999,
        borderWidth: 1,
        borderColor: theme.colors.button.primary.background,
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: theme.colors.groupped.background,
    },
    composeCardApplyText: {
        fontSize: 11,
        fontWeight: '600',
        color: theme.colors.button.primary.background,
    },
    composeListTitle: {
        marginTop: 12,
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.text,
    },
    roleActions: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 12,
    },
    roleActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: theme.colors.divider,
    },
    roleActionPrimary: {
        backgroundColor: theme.colors.button.primary.background,
        borderColor: theme.colors.button.primary.background,
    },
    roleActionSecondary: {
        backgroundColor: theme.colors.surface,
    },
    roleActionText: {
        fontSize: 12,
        fontWeight: '600',
    },
    roleActionTextPrimary: {
        color: '#FFF',
    },
    roleActionTextSecondary: {
        color: theme.colors.text,
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

type TeamRoleOption = KanbanTeamRole & {
    icon?: string;
    isCustom?: boolean;
    isPool?: boolean;
    isServerDefault?: boolean;
    ownerId?: string;
    assignedSkills?: string[];
    stats?: PublicRole['stats'];
};

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
    const [roleCounts, setRoleCounts] = React.useState<Record<string, number>>({});
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
    const [agentLanguage, setAgentLanguage] = React.useState<'en' | 'zh'>('en');
    const [roleSearchQuery, setRoleSearchQuery] = React.useState('');

    // V5-P0-004: Search suggestions state
    const [recentSearches, setRecentSearches] = React.useState<string[]>([]);
    const [showSearchSuggestions, setShowSearchSuggestions] = React.useState(false);

    // Custom roles state
    const [customRoles, setCustomRoles] = React.useState<CustomRole[]>([]);
    const [defaultRoles, setDefaultRoles] = React.useState<RoleTemplate[]>([]);
    const [poolRoles, setPoolRoles] = React.useState<PublicRole[]>([]);
    const [customRolesLoading, setCustomRolesLoading] = React.useState(false);
    const [composeVersionTrack, setComposeVersionTrack] = React.useState<'v1' | 'v2' | 'dual'>(() => {
        const serverUrl = getServerUrl();
        return serverUrl.includes('/api/v2') ? 'v2' : 'v1';
    });
    const [isComposingTeam, setIsComposingTeam] = React.useState(false);
    const [teamPlan, setTeamPlan] = React.useState<TeamCompositionPlan | null>(null);
    const { credentials } = useAuth();
    const composeDeploymentTarget = React.useMemo<'wow' | 'uv1' | 'uv2' | 'local' | 'generic'>(() => {
        const serverUrl = getServerUrl().toLowerCase();
        if (serverUrl.includes('top1vibe.com') || serverUrl.includes('31.97.214.218')) {
            return 'wow';
        }
        if (serverUrl.includes('101.47.158.111') || serverUrl.includes('uv2')) {
            return 'uv2';
        }
        if (serverUrl.includes('69.5.7.184') || serverUrl.includes('uv1')) {
            return 'uv1';
        }
        if (serverUrl.includes('localhost') || serverUrl.includes('127.0.0.1')) {
            return 'local';
        }
        return 'generic';
    }, []);

    const defaultRoleId = 'implementer';

    const loadCustomRoles = React.useCallback(async () => {
        if (!credentials) {
            setCustomRoles([]);
            setDefaultRoles([]);
            setPoolRoles([]);
            setCustomRolesLoading(false);
            return;
        }

        setCustomRolesLoading(true);
        try {
            const [rolesResult, defaultsResult, poolResult] = await Promise.allSettled([
                fetchCustomRoles(credentials),
                fetchDefaultRoles(credentials),
                fetchRolePool(credentials, { limit: 100 }),
            ]);

            if (rolesResult.status === 'fulfilled') {
                setCustomRoles(rolesResult.value);
            } else {
                setCustomRoles([]);
                console.error('Failed to fetch custom roles:', rolesResult.reason);
            }

            if (defaultsResult.status === 'fulfilled') {
                setDefaultRoles(defaultsResult.value);
            } else {
                setDefaultRoles([]);
                console.warn('Failed to fetch default roles:', defaultsResult.reason);
            }

            if (poolResult.status === 'fulfilled') {
                setPoolRoles(poolResult.value);
            } else {
                setPoolRoles([]);
                console.warn('Failed to fetch public role pool:', poolResult.reason);
            }
        } finally {
            setCustomRolesLoading(false);
        }
    }, [credentials]);

    useFocusEffect(
        React.useCallback(() => {
            loadCustomRoles();
        }, [loadCustomRoles])
    );

    // Merge built-in + server defaults + custom + public pool roles
    const mergedRoles = React.useMemo<TeamRoleOption[]>(() => {
        const builtIn: TeamRoleOption[] = getLocalizedTeamRoles().map((role) => ({
            ...(role as KanbanTeamRole),
            icon: (role as any).icon,
        }));

        const builtInIds = new Set(builtIn.map((role) => role.id));

        const defaultsFromServer: TeamRoleOption[] = defaultRoles
            .filter((role) => !builtInIds.has(role.id))
            .map((role) => ({
                id: role.id,
                title: role.title,
                summary: role.summary || 'Default role',
                responsibilities: [],
                abilityBoundaries: [],
                handoffProtocol: [],
                protocol: [],
                icon: role.icon,
                isServerDefault: true,
            }));

        const custom: TeamRoleOption[] = customRoles.map((role) => ({
            id: role.id,
            title: role.title,
            summary: role.summary || 'Custom role',
            responsibilities: role.responsibilities || [],
            abilityBoundaries: role.abilityBoundaries || [],
            handoffProtocol: role.handoffProtocol || [],
            protocol: role.protocol || [],
            icon: role.icon,
            isCustom: true,
            assignedSkills: role.assignedSkills,
            policy: role.policy as any,
        }));

        const customIds = new Set(custom.map((role) => role.id));
        const defaultIds = new Set(defaultsFromServer.map((role) => role.id));

        const pool: TeamRoleOption[] = poolRoles
            .filter((role) => !builtInIds.has(role.id) && !customIds.has(role.id) && !defaultIds.has(role.id))
            .map((role) => ({
                id: role.id,
                title: role.title,
                summary: role.summary || 'Public role',
                responsibilities: role.responsibilities || [],
                abilityBoundaries: role.abilityBoundaries || [],
                handoffProtocol: role.handoffProtocol || [],
                protocol: role.protocol || [],
                icon: role.icon,
                isPool: true,
                ownerId: role.ownerId,
                assignedSkills: role.assignedSkills,
                stats: role.stats,
                policy: role.policy as any,
            }));

        return [...builtIn, ...defaultsFromServer, ...custom, ...pool];
    }, [customRoles, defaultRoles, poolRoles]);

    // Build merged role library
    const ROLE_LIBRARY: Record<string, TeamRoleOption> = React.useMemo(() => {
        return mergedRoles.reduce((acc, role) => {
            acc[role.id] = role;
            return acc;
        }, {} as Record<string, TeamRoleOption>);
    }, [mergedRoles]);

    // Filter roles based on search query (supports title, summary, id, skills, and stats)
    const filteredRoles = React.useMemo(() => {
        if (!roleSearchQuery.trim()) {
            return mergedRoles;
        }
        const query = roleSearchQuery.toLowerCase();
        return mergedRoles.filter(role => {
            // Search by basic fields
            const matchesBasic =
                role.title.toLowerCase().includes(query) ||
                role.summary?.toLowerCase().includes(query) ||
                role.id.toLowerCase().includes(query);

            // Search by assigned skills (tags)
            const matchesSkills = role.assignedSkills?.some(skill =>
                skill.toLowerCase().includes(query)
            ) ?? false;

            // Search by stats (rating, review count)
            const matchesStats = role.stats ?
                (role.stats.averageRating.toString().includes(query) ||
                 role.stats.reviewCount.toString().includes(query)) : false;

            return matchesBasic || matchesSkills || matchesStats;
        });
    }, [mergedRoles, roleSearchQuery]);

    // V5-P0-004: Extract available skills for search suggestions
    const availableSkills = React.useMemo(() => {
        const skillSet = new Set<string>();
        mergedRoles.forEach(role => {
            role.assignedSkills?.forEach(skill => skillSet.add(skill));
        });
        return Array.from(skillSet).sort();
    }, [mergedRoles]);

    // V5-P0-004: Compute popular tags from role skills
    const popularTags = React.useMemo(() => {
        const tagCounts = new Map<string, number>();
        mergedRoles.forEach(role => {
            role.assignedSkills?.forEach(skill => {
                tagCounts.set(skill, (tagCounts.get(skill) || 0) + 1);
            });
        });
        return Array.from(tagCounts.entries())
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    }, [mergedRoles]);

    // V5-P0-004: Handle suggestion selection
    const handleSuggestionSelect = React.useCallback((suggestion: string) => {
        setRoleSearchQuery(suggestion);
        setRecentSearches(prev => {
            const updated = [suggestion, ...prev.filter(s => s !== suggestion)].slice(0, 5);
            return updated;
        });
        setShowSearchSuggestions(false);
    }, []);

    // V5-P0-004: Handle tag selection
    const handleTagSelect = React.useCallback((tag: string) => {
        setRoleSearchQuery(`#${tag}`);
        setShowSearchSuggestions(false);
    }, []);

    // Initial role counts (built-in only for defaults)
    const INITIAL_ROLE_COUNTS: Record<string, number> = React.useMemo(() => {
        const counts: Record<string, number> = {};
        mergedRoles.forEach(role => {
            if (role.id === 'master') {
                counts[role.id] = 1;
            } else if (role.id === 'orchestrator') {
                counts[role.id] = 0;
            } else if (role.id === 'architect') {
                counts[role.id] = 1;
            } else if (role.id === 'implementer') {
                counts[role.id] = 1;
            } else if (role.id === 'qa-engineer') {
                counts[role.id] = 1;
            } else if (role.id === 'observer') {
                counts[role.id] = 0;
            } else {
                counts[role.id] = 0;
            }
        });
        return counts;
    }, [mergedRoles]);

    // Initialize role counts when merged roles change (first load)
    React.useEffect(() => {
        if (Object.keys(roleCounts).length === 0 && Object.keys(INITIAL_ROLE_COUNTS).length > 0) {
            setRoleCounts(INITIAL_ROLE_COUNTS);
        }
    }, [INITIAL_ROLE_COUNTS, roleCounts]);

    // Track if machine change was user-initiated (not from machines array refresh)
    const userChangedMachineRef = React.useRef(false);

    const handleMachineChange = React.useCallback((machineId: string | null) => {
        userChangedMachineRef.current = true;
        setSelectedMachineId(machineId);
    }, []);

    React.useEffect(() => {
        if (machines.length === 0) {
            setSelectedMachineId(null);
            return;
        }
        if (selectedMachineId && machines.some(machine => machine.id === selectedMachineId)) {
            return;
        }
        // This is a fallback selection, not user-initiated
        const fallback = machines.find(machine => machine.active) ?? machines[0];
        setSelectedMachineId(fallback?.id ?? null);
        setIsPathDropdownOpen(false);
    }, [machines, selectedMachineId]);

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

    const applyComposedRoleCounts = React.useCallback((roleCountsByPlan: Record<string, number>) => {
        const nextRoleCounts: Record<string, number> = {};
        mergedRoles.forEach((role) => {
            nextRoleCounts[role.id] = 0;
        });
        Object.entries(roleCountsByPlan).forEach(([roleId, count]) => {
            nextRoleCounts[roleId] = Math.max(0, Math.floor(count));
        });
        setRoleCounts(nextRoleCounts);
    }, [mergedRoles]);

    const handleApplyTeamSlice = React.useCallback(async (teamName: string, roleCountsByPlan: Record<string, number>) => {
        applyComposedRoleCounts(roleCountsByPlan);
        await Modal.alert('已应用团队建议', `已将「${teamName}」角色配比应用到当前创建页。`);
    }, [applyComposedRoleCounts]);

    const handleComposeTeamPlan = React.useCallback(async () => {
        if (isComposingTeam) {
            return;
        }

        if (!credentials) {
            await Modal.alert(t('common.error'), '请先登录后再进行智能编组');
            return;
        }

        if (!target.trim()) {
            await Modal.alert(t('common.error'), '请先填写 Team Goal，再进行智能编组');
            return;
        }

        try {
            setIsComposingTeam(true);

            const plan = await composeTeamPlan(credentials, {
                goal: target.trim(),
                mode: 'multi',
                versionTrack: composeVersionTrack,
                deploymentTarget: composeDeploymentTarget,
                maxTeams: 3,
            });

            setTeamPlan(plan);

            const primaryTeam = plan.teams[0];
            if (!primaryTeam) {
                await Modal.alert(t('common.error'), '未生成可用的团队建议，请调整目标后重试');
                return;
            }

            applyComposedRoleCounts(primaryTeam.roleCounts);

            if (plan.teams.length > 1) {
                await Modal.alert(
                    '智能编组完成',
                    `已应用主团队「${primaryTeam.name}」到当前页面。\n另外还建议 ${plan.teams.length - 1} 个子团队，可按卡片提示继续创建。`
                );
            } else {
                await Modal.alert(
                    '智能编组完成',
                    `已应用团队建议「${primaryTeam.name}」。`
                );
            }
        } catch (error) {
            console.error('Failed to compose team plan:', error);
            await Modal.alert(
                t('common.error'),
                '智能编组失败，请检查服务器连接后重试'
            );
        } finally {
            setIsComposingTeam(false);
        }
    }, [isComposingTeam, credentials, target, composeVersionTrack, composeDeploymentTarget, applyComposedRoleCounts]);

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
                                    AHA_AGENT_ROLE: roleId,
                                    AHA_ROOM_ID: room.id,
                                    AHA_ROOM_NAME: title.trim(),
                                    AHA_AGENT_LANGUAGE: agentLanguage,
                                    AHA_AGENT_TYPE: getRoleAgentType(roleId)
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
                                            agent: getRoleAgentType(roleId),
                                            sessionTag: tag,
                                            teamId: artifactId,
                                            role: roleId,
                                            sessionName: agentTitle,
                                            sessionPath: resolvedCwd,
                                            env: {
                                                AHA_AGENT_LANGUAGE: agentLanguage
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
    }, [title, target, roleCounts, selectedSessions, isSaving, router, desktopBridge, sessionRoles, sessionLookup, cwd, agentBinary, selectedMachineId, agentType, recentMachinePaths, getRoleAgentType, agentLanguage]);

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
                        <View style={styles.composeRow}>
                            <View style={styles.composeVersionSelector}>
                                {(['v1', 'v2', 'dual'] as const).map((version) => {
                                    const active = composeVersionTrack === version;
                                    const label = version === 'dual' ? 'V1+V2' : version.toUpperCase();
                                    return (
                                        <Pressable
                                            key={version}
                                            onPress={() => setComposeVersionTrack(version)}
                                            style={[styles.composeVersionChip, active && styles.composeVersionChipActive]}
                                        >
                                            <Text style={[styles.composeVersionText, active && styles.composeVersionTextActive]}>
                                                {label}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                            <Pressable
                                onPress={handleComposeTeamPlan}
                                disabled={isComposingTeam || isSaving}
                                style={[styles.composeButton, (isComposingTeam || isSaving) && styles.composeButtonDisabled]}
                            >
                                {isComposingTeam ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <Ionicons name="sparkles-outline" size={14} color="#FFF" />
                                )}
                                <Text style={styles.composeButtonText}>
                                    智能拆分 Team
                                </Text>
                            </Pressable>
                        </View>
                        <Text style={styles.helperText}>
                            结合 V1/V2 目标自动推荐多团队角色配比（当前目标：{composeDeploymentTarget}）。
                        </Text>
                        {teamPlan && (
                            <>
                                <Text style={styles.composeListTitle}>建议子团队（可逐个应用）</Text>
                                {teamPlan.teams.map((team, index) => (
                                    <View key={`${team.key}-${index}`} style={styles.composeCard}>
                                        <Text style={styles.composeCardTitle}>
                                            {index + 1}. {team.name} ({team.versionTrack})
                                        </Text>
                                        <Text style={styles.composeCardMeta}>
                                            {team.objective}
                                        </Text>
                                        <Text style={styles.composeCardMeta}>
                                            分支建议：{team.branchSuggestion || `feat/${team.versionTrack}-${team.key}`}
                                        </Text>
                                        <Text style={styles.composeCardMeta}>
                                            {Object.entries(team.roleCounts).map(([role, count]) => `${role}×${count}`).join(' · ')}
                                        </Text>
                                        {/* Improved EvoMap Display */}
                                        <EvoMapDisplay evoMap={team.evoMap} detailed={true} compact={false} />
                                        <View style={styles.composeCardActions}>
                                            <Pressable
                                                style={styles.composeCardApplyButton}
                                                onPress={() => handleApplyTeamSlice(team.name, team.roleCounts)}
                                                disabled={isSaving || isComposingTeam}
                                            >
                                                <Text style={styles.composeCardApplyText}>应用该子团队</Text>
                                            </Pressable>
                                        </View>
                                    </View>
                                ))}
                                {teamPlan.recommendations?.length > 0 && (
                                    <View style={styles.composeCard}>
                                        <Text style={styles.composeCardTitle}>系统建议</Text>
                                        {teamPlan.recommendations.map((item, index) => (
                                            <Text key={`${item}-${index}`} style={styles.composeCardMeta}>
                                                • {item}
                                            </Text>
                                        ))}
                                    </View>
                                )}
                                {teamPlan.constraints?.length > 0 && (
                                    <View style={styles.composeCard}>
                                        <Text style={styles.composeCardTitle}>部署约束</Text>
                                        {teamPlan.constraints.map((item, index) => (
                                            <Text key={`${item}-${index}`} style={styles.composeCardMeta}>
                                                • {item}
                                            </Text>
                                        ))}
                                    </View>
                                )}
                                {teamPlan.releaseGates?.length > 0 && (
                                    <View style={styles.composeCard}>
                                        <Text style={styles.composeCardTitle}>版本门禁</Text>
                                        {teamPlan.releaseGates.map((gate, index) => (
                                            <ReleaseGateCard key={`${gate.branch}-${index}`} gate={gate} showEnvironments={true} />
                                        ))}
                                    </View>
                                )}
                            </>
                        )}
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
                        <Text style={styles.label}>Team Composition (Auto-Spawn)</Text>
                        <View style={styles.roleActions}>
                            <Pressable
                                onPress={() => router.push('/roles/new' as any)}
                                style={[styles.roleActionButton, styles.roleActionPrimary]}
                            >
                                <Ionicons name="add-circle-outline" size={14} color="#FFF" />
                                <Text style={[styles.roleActionText, styles.roleActionTextPrimary]}>
                                    创建角色
                                </Text>
                            </Pressable>
                            <Pressable
                                onPress={() => router.push('/roles' as any)}
                                style={[styles.roleActionButton, styles.roleActionSecondary]}
                            >
                                <Ionicons name="library-outline" size={14} color={theme.colors.text} />
                                <Text style={[styles.roleActionText, styles.roleActionTextSecondary]}>
                                    角色中心
                                </Text>
                            </Pressable>
                        </View>
                        <Text style={styles.helperText}>
                            找不到角色创建入口时，可直接点上方“创建角色”。
                        </Text>
                        {/* Role Search Input */}
                        <View style={{ marginBottom: 12 }}>
                            <TextInput
                                style={{
                                    backgroundColor: theme.colors.groupped.background,
                                    borderRadius: 8,
                                    paddingHorizontal: 12,
                                    paddingVertical: 10,
                                    fontSize: 14,
                                    color: theme.colors.text,
                                    borderWidth: 1,
                                    borderColor: theme.colors.divider,
                                }}
                                value={roleSearchQuery}
                                onChangeText={setRoleSearchQuery}
                                placeholder="搜索角色..."
                                placeholderTextColor={theme.colors.textSecondary}
                            />
                            {roleSearchQuery.trim() !== '' && (
                                <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 6 }}>
                                    找到 {filteredRoles.length} 个角色
                                </Text>
                            )}

                            {/* V5-P0-004: Smart Search Autocomplete */}
                            {showSearchSuggestions && roleSearchQuery.length >= 2 && (
                                <SearchSuggestions
                                    query={roleSearchQuery}
                                    availableSkills={availableSkills}
                                    recentSearches={recentSearches}
                                    popularTags={popularTags}
                                    credentials={credentials}
                                    onSelect={handleSuggestionSelect}
                                    onTagSelect={handleTagSelect}
                                    maxSuggestions={8}
                                />
                            )}
                        </View>
                        {customRolesLoading && (
                            <Text style={{ color: theme.colors.textSecondary, marginBottom: 8, fontStyle: 'italic' }}>
                                Loading custom roles...
                            </Text>
                        )}
                        <View style={{ backgroundColor: theme.colors.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: theme.colors.divider }}>
                            {filteredRoles.length === 0 ? (
                                <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                                    <Ionicons name="search" size={32} color={theme.colors.textSecondary} />
                                    <Text style={{ fontSize: 14, color: theme.colors.textSecondary, marginTop: 8 }}>
                                        没有找到匹配的角色
                                    </Text>
                                </View>
                            ) : (
                                filteredRoles.map((role, index) => {
                                const count = roleCounts[role.id] || 0;
                                const currentAgentType = getRoleAgentType(role.id);
                                const isCustom = role.isCustom;
                                const isPool = role.isPool;
                                const isServerDefault = role.isServerDefault;
                                const skills = role.assignedSkills;
                                return (
                                    <View key={role.id} style={{ marginBottom: index === filteredRoles.length - 1 ? 0 : 16 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <View style={{ flex: 1, marginRight: 16 }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                    <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: 4 }}>
                                                        {role.icon ? `${role.icon} ` : ''}{role.title}
                                                    </Text>
                                                    {isCustom && (
                                                        <View style={{ backgroundColor: theme.colors.button.primary.background, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginBottom: 4 }}>
                                                            <Text style={{ fontSize: 10, color: '#FFF', fontWeight: '600' }}>CUSTOM</Text>
                                                        </View>
                                                    )}
                                                    {isPool && (
                                                        <View style={{ backgroundColor: '#4A90E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginBottom: 4 }}>
                                                            <Text style={{ fontSize: 10, color: '#FFF', fontWeight: '600' }}>POOL</Text>
                                                        </View>
                                                    )}
                                                    {isServerDefault && (
                                                        <View style={{ backgroundColor: '#6C7A89', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginBottom: 4 }}>
                                                            <Text style={{ fontSize: 10, color: '#FFF', fontWeight: '600' }}>DEFAULT</Text>
                                                        </View>
                                                    )}
                                                </View>
                                                <Text style={{ fontSize: 13, color: theme.colors.textSecondary }} numberOfLines={2}>{role.summary}</Text>
                                                {/* Show skill badges for custom roles */}
                                                {isCustom && skills && skills.length > 0 && (
                                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                                                        {skills.slice(0, 3).map(skillId => (
                                                            <View key={skillId} style={{ backgroundColor: theme.colors.groupped.background, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                                                <Text style={{ fontSize: 10, color: theme.colors.textSecondary }}>{skillId}</Text>
                                                            </View>
                                                        ))}
                                                        {skills.length > 3 && (
                                                            <View style={{ backgroundColor: theme.colors.groupped.background, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                                                <Text style={{ fontSize: 10, color: theme.colors.textSecondary }}>+{skills.length - 3}</Text>
                                                            </View>
                                                        )}
                                                    </View>
                                                )}
                                                {/* Show role statistics for all roles with stats */}
                                                {role.stats && (
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                                                        <Text style={{ fontSize: 11, color: theme.colors.textSecondary }}>
                                                            <Text style={{ color: theme.colors.text, fontWeight: '500' }}>
                                                                {role.stats.averageRating.toFixed(1)}
                                                            </Text> ★
                                                        </Text>
                                                        <Text style={{ fontSize: 11, color: theme.colors.textSecondary }}>
                                                            ({role.stats.reviewCount} reviews)
                                                        </Text>
                                                    </View>
                                                )}
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
                            })
                        )}
                        </View>

                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Automation Settings</Text>
                        <View style={{ gap: 16 }}>
                            <View>
                                <Text style={[styles.label, { fontSize: 11, marginBottom: 4 }]}>Machine</Text>
                                {machines.length === 0 ? (
                                    <Text style={styles.helperText}>
                                        Connect a machine via device code or QR link. CLI is optional for advanced automation.
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
                                    placeholder="e.g. aha, codex, claudecode"
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
                                            <RoleSelector
                                                roles={Object.values(ROLE_LIBRARY).map((role) => ({
                                                    ...role,
                                                    isCustom: role.isCustom,
                                                    isPool: role.isPool,
                                                    isServerDefault: role.isServerDefault,
                                                }))}
                                                selectedRoleId={currentRole}
                                                onSelectRole={(roleId) => setRole(session.id, roleId)}
                                                searchPlaceholder="Search roles..."
                                                showSearch={true}
                                                testID={`session-${session.id}-role-selector`}
                                            />
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
