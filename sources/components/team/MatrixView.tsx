import React from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, View } from 'react-native';
import { Text } from '@/components/ui/StyledText';
import { StyleSheet } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import Color from 'color';
import { useSessionMessages } from '@/sync/storage';
import type { Session } from '@/sync/storageTypes';
import { MessageView } from '@/components/session/MessageView';
import type { KanbanTask, KanbanTeamMember, KanbanTeamRole } from '@/sync/kanbanTypes';
import type { ActiveTaskSummary } from '@/utils/teamActiveTask';
import { getAgentPresenceVisual } from '@/utils/presenceUtils';
import { resolveMatrixStreamState, resolveStickySession } from './matrixPersistence';
import {
    GRID_PRESETS,
    getRecommendedGrid,
    sortMatrixRoster,
    type GridConfig as TeamMatrixGridConfig,
} from '@/utils/teamMatrix';

export interface MatrixRosterEntry {
    member: KanbanTeamMember;
    session: Session | undefined;
    role: KanbanTeamRole | undefined;
    index: number;
    tasks: KanbanTask[];
    activeTask: ActiveTaskSummary | null;
}

export type GridConfig = TeamMatrixGridConfig;

const MIN_ZOOM = 0.8;
const MAX_ZOOM = 1.25;
const ZOOM_STEP = 0.1;

const MATRIX_THEME = {
    bg: '#060301',
    bgSoft: '#0d0702',
    panel: '#140b04',
    panelSoft: '#191109',
    panelStrong: '#1f1408',
    panelMuted: '#20150d',
    border: '#332112',
    borderSoft: '#2b1b0f',
    borderStrong: '#3a2716',
    borderAccent: '#3f2a15',
    text: '#f0e2cb',
    muted: '#8f7a61',
    mutedSoft: '#6e5d4a',
    accent: '#b26a00',
    accentStrong: '#d48a08',
    success: '#2bd26f',
    info: '#5856D6',
    highlight: '#AF52DE',
    danger: '#ff3b30',
    critical: '#FF2D55',
} as const;

function withAlpha(color: string, opacity: number): string {
    try {
        return Color(color).alpha(opacity).rgb().string();
    } catch {
        return color;
    }
}

const ROLE_BADGE_COLORS: Record<string, string> = {
    master: MATRIX_THEME.accent,
    orchestrator: MATRIX_THEME.accent,
    builder: MATRIX_THEME.accentStrong,
    implementer: MATRIX_THEME.accentStrong,
    framer: MATRIX_THEME.success,
    architect: MATRIX_THEME.success,
    'solution-architect': MATRIX_THEME.success,
    'qa-engineer': MATRIX_THEME.info,
    qa: MATRIX_THEME.info,
    reviewer: MATRIX_THEME.muted,
    scout: MATRIX_THEME.highlight,
    researcher: MATRIX_THEME.highlight,
    supervisor: MATRIX_THEME.critical,
    'org-manager': MATRIX_THEME.critical,
    'help-agent': MATRIX_THEME.critical,
};

const TASK_STATUS_COLORS: Record<string, string> = {
    todo: MATRIX_THEME.muted,
    'in-progress': MATRIX_THEME.accentStrong,
    review: MATRIX_THEME.highlight,
    done: MATRIX_THEME.success,
    blocked: MATRIX_THEME.danger,
};

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function getStatusLabel(session: Session | undefined): { text: string; color: string } {
    if (!session) return { text: 'Unknown', color: MATRIX_THEME.muted };
    if (!session.active) return { text: 'Offline', color: MATRIX_THEME.mutedSoft };
    if (session.agentState?.requests && Object.keys(session.agentState.requests).length > 0) {
        return { text: 'Waiting', color: MATRIX_THEME.accentStrong };
    }
    if (session.thinking) return { text: 'Working', color: MATRIX_THEME.success };
    return { text: 'Idle', color: MATRIX_THEME.accent };
}

function normalizeTaskStatus(status: string): string {
    const normalized = status ? status.toLowerCase() : 'todo';
    if (normalized === 'in_progress' || normalized === 'inprogress') return 'in-progress';
    return normalized;
}

function getTileHeight(config: GridConfig, zoomLevel: number): number {
    const baseHeight = config.rows <= 2 ? 420 : config.rows === 3 ? 328 : 264;
    return Math.round(baseHeight * zoomLevel);
}

function formatRuntimeLabel(runtimeType?: string): string {
    if (!runtimeType) return 'Runtime unknown';
    if (runtimeType === 'claude') return 'Claude';
    if (runtimeType === 'codex') return 'Codex';
    return runtimeType.replace(/[-_]/g, ' ');
}

interface GridSizeSelectorProps {
    current: GridConfig;
    recommended: GridConfig;
    onSelect: (config: GridConfig) => void;
}

const GridSizeSelector = React.memo(function GridSizeSelector({
    current,
    recommended,
    onSelect,
}: GridSizeSelectorProps) {
    const [open, setOpen] = React.useState(false);

    return (
        <View style={selectorStyles.container}>
            <Pressable
                style={selectorStyles.trigger}
                onPress={() => setOpen((previous) => !previous)}
            >
                <Ionicons name="grid-outline" size={14} color={MATRIX_THEME.muted} />
                <Text style={selectorStyles.triggerText}>
                    {current.cols}x{current.rows}
                </Text>
                <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={12} color={MATRIX_THEME.muted} />
            </Pressable>
            {open && (
                <View style={selectorStyles.dropdown}>
                    {GRID_PRESETS.map((preset) => {
                        const isActive = preset.cols === current.cols && preset.rows === current.rows;
                        const isRecommended = preset.cols === recommended.cols && preset.rows === recommended.rows;
                        return (
                            <Pressable
                                key={`${preset.cols}x${preset.rows}`}
                                style={[selectorStyles.option, isActive && selectorStyles.optionActive]}
                                onPress={() => {
                                    onSelect(preset);
                                    setOpen(false);
                                }}
                            >
                                <Text style={[selectorStyles.optionText, isActive && selectorStyles.optionTextActive]}>
                                    {preset.cols}x{preset.rows}
                                </Text>
                                {isRecommended && (
                                    <View style={selectorStyles.recommendedBadge}>
                                        <Text style={selectorStyles.recommendedText}>rec</Text>
                                    </View>
                                )}
                            </Pressable>
                        );
                    })}
                </View>
            )}
        </View>
    );
});

interface TaskSidebarItemProps {
    task: KanbanTask;
    isBeingDragged: boolean;
    onDragStart: (taskId: string) => void;
    onDragEnd: () => void;
}

const TaskSidebarItem = React.memo(function TaskSidebarItem({
    task,
    isBeingDragged,
    onDragStart,
    onDragEnd,
}: TaskSidebarItemProps) {
    const status = normalizeTaskStatus(task.status);
    const statusColor = TASK_STATUS_COLORS[status] ?? MATRIX_THEME.muted;

    const webDragProps = Platform.OS === 'web' ? {
        draggable: true,
        onDragStart: (event: any) => {
            event.dataTransfer?.setData('text/plain', task.id);
            onDragStart(task.id);
        },
        onDragEnd: () => onDragEnd(),
    } : {};

    return (
        <Pressable
            style={[taskStyles.item, isBeingDragged && taskStyles.itemDragging]}
            onLongPress={() => onDragStart(task.id)}
            {...webDragProps as any}
        >
            <View style={[taskStyles.statusDot, { backgroundColor: statusColor }]} />
            <View style={taskStyles.itemContent}>
                <Text style={taskStyles.itemTitle} numberOfLines={2}>{task.title}</Text>
                <Text style={taskStyles.itemStatus}>{status}</Text>
            </View>
            <Ionicons name="reorder-three" size={14} color={MATRIX_THEME.mutedSoft} />
        </Pressable>
    );
});

const MatrixSessionStream = React.memo(function MatrixSessionStream({
    session,
    zoomLevel,
}: {
    session: Session;
    zoomLevel: number;
}) {
    const { messages, isLoaded } = useSessionMessages(session.id);
    const scrollRef = React.useRef<ScrollView>(null);
    const lastGoodMessagesRef = React.useRef(messages);
    const hasEverLoadedRef = React.useRef(false);

    const toolCallCount = React.useMemo(() => {
        return messages.reduce((count, message) => count + (message.kind === 'tool-call' ? 1 : 0), 0);
    }, [messages]);

    if (isLoaded && messages.length > 0) {
        hasEverLoadedRef.current = true;
        lastGoodMessagesRef.current = messages;
    }

    const streamState = React.useMemo(() => {
        return resolveMatrixStreamState({
            isLoaded,
            messages,
            lastGoodMessages: lastGoodMessagesRef.current,
            hasEverLoaded: hasEverLoadedRef.current,
        });
    }, [isLoaded, messages]);

    const scrollToBottom = React.useCallback(() => {
        requestAnimationFrame(() => {
            scrollRef.current?.scrollToEnd({ animated: false });
        });
    }, []);

    React.useEffect(() => {
        scrollToBottom();
    }, [messages.length, scrollToBottom]);

    return (
        <View style={streamStyles.container}>
            <View style={streamStyles.summaryRow}>
                <View style={streamStyles.summaryChip}>
                    <Ionicons name="chatbubble-ellipses-outline" size={11} color={MATRIX_THEME.muted} />
                    <Text style={streamStyles.summaryText}>{streamState.displayMessages.length} msgs</Text>
                </View>
                {toolCallCount > 0 && (
                    <View style={streamStyles.summaryChip}>
                        <Ionicons name="hammer-outline" size={11} color={MATRIX_THEME.accentStrong} />
                        <Text style={[streamStyles.summaryText, { color: MATRIX_THEME.accentStrong }]}>{toolCallCount} tools</Text>
                    </View>
                )}
            </View>
            {streamState.showInitialLoading ? (
                <View style={streamStyles.loadingState}>
                    <ActivityIndicator size="small" color={MATRIX_THEME.muted} />
                </View>
            ) : streamState.showEmptyState ? (
                <View style={streamStyles.emptyState}>
                    <Ionicons name="chatbubble-ellipses-outline" size={18} color={MATRIX_THEME.mutedSoft} />
                    <Text style={streamStyles.emptyText}>No session output yet</Text>
                </View>
            ) : (
                <ScrollView
                    ref={scrollRef}
                    style={streamStyles.scroll}
                    contentContainerStyle={streamStyles.scrollContent}
                    nestedScrollEnabled
                    onContentSizeChange={scrollToBottom}
                    showsVerticalScrollIndicator={Platform.OS === 'web'}
                >
                    <View style={Platform.OS === 'web' ? ({ zoom: zoomLevel } as any) : undefined}>
                        {streamState.displayMessages.map((message) => (
                            <MessageView
                                key={message.id}
                                message={message}
                                metadata={session.metadata}
                                sessionId={session.id}
                            />
                        ))}
                    </View>
                </ScrollView>
            )}
        </View>
    );
});

interface AgentTileProps {
    entry: MatrixRosterEntry;
    viewportHeight: number;
    zoomLevel: number;
    draggingTaskId: string | null;
    onOpenSession?: (sessionId: string) => void;
    onDropTask?: (taskId: string, sessionId: string) => void;
}

const AgentTile = React.memo(function AgentTile({
    entry,
    viewportHeight,
    zoomLevel,
    draggingTaskId,
    onOpenSession,
    onDropTask,
}: AgentTileProps) {
    const { member, session, role, tasks, activeTask } = entry;
    const roleId = member.roleId || session?.metadata?.role || '';
    const badgeColor = ROLE_BADGE_COLORS[roleId] ?? MATRIX_THEME.muted;
    const presence = session
        ? getAgentPresenceVisual(session)
        : { dotColor: MATRIX_THEME.mutedSoft, inactive: true, dead: false };
    const status = getStatusLabel(session);
    const [isHovering, setIsHovering] = React.useState(false);
    const lastKnownSessionRef = React.useRef<Session | undefined>(session);

    if (session) {
        lastKnownSessionRef.current = session;
    }

    const displaySession = resolveStickySession(session, lastKnownSessionRef.current);

    const webDropProps = Platform.OS === 'web' ? {
        onDragOver: (event: any) => {
            event.preventDefault();
            setIsHovering(true);
        },
        onDragLeave: () => setIsHovering(false),
        onDrop: (event: any) => {
            event.preventDefault();
            setIsHovering(false);
            const taskId = event.dataTransfer?.getData('text/plain');
            if (taskId && onDropTask) {
                onDropTask(taskId, member.sessionId);
            }
        },
    } : {};

    const showDropOverlay = !!draggingTaskId || isHovering;

    return (
        <View
            style={[
                cardStyles.container,
                { height: viewportHeight },
                showDropOverlay && cardStyles.containerDropTarget,
            ]}
            {...webDropProps as any}
        >
            {activeTask && (
                <View style={cardStyles.floatingTask}>
                    <Ionicons name="flash" size={10} color={MATRIX_THEME.accentStrong} />
                    <Text style={cardStyles.floatingTaskText} numberOfLines={1}>{activeTask.title}</Text>
                </View>
            )}

            <Pressable
                style={cardStyles.headerButton}
                onPress={() => session && onOpenSession?.(member.sessionId)}
                disabled={!session}
            >
                <View style={cardStyles.headerMain}>
                    <View style={cardStyles.headerIdentityRow}>
                        <View style={[cardStyles.statusDot, { backgroundColor: presence.dotColor }]} />
                        <Text style={cardStyles.name} numberOfLines={1}>
                            {member.displayName || session?.metadata?.name || 'Agent'}
                        </Text>
                    </View>
                    <View style={cardStyles.metaRow}>
                        <View style={[cardStyles.roleBadge, { backgroundColor: `${badgeColor}1A` }]}>
                            <Text style={[cardStyles.roleText, { color: badgeColor }]}>
                                {role?.title || roleId || 'Unknown'}
                            </Text>
                        </View>
                        <View style={[cardStyles.statusPill, { backgroundColor: `${status.color}1A` }]}>
                            <View style={[cardStyles.statusIndicator, { backgroundColor: status.color }]} />
                            <Text style={[cardStyles.statusText, { color: status.color }]}>{status.text}</Text>
                        </View>
                    </View>
                </View>
                <View style={cardStyles.headerActions}>
                    <Text style={cardStyles.runtimeText}>{formatRuntimeLabel(member.runtimeType)}</Text>
                    <View style={cardStyles.agentStatsRow}>
                        <View style={cardStyles.agentStatChip}>
                            <Ionicons name="albums-outline" size={11} color={MATRIX_THEME.muted} />
                            <Text style={cardStyles.agentStatText}>{tasks.length}</Text>
                        </View>
                        <Ionicons name="open-outline" size={14} color={MATRIX_THEME.muted} />
                    </View>
                </View>
            </Pressable>

            <View style={cardStyles.streamFrame}>
                {displaySession ? (
                    <MatrixSessionStream session={displaySession} zoomLevel={zoomLevel} />
                ) : (
                    <View style={cardStyles.missingSessionState}>
                        <Ionicons name="warning-outline" size={18} color={MATRIX_THEME.muted} />
                        <Text style={cardStyles.missingSessionText}>Session unavailable</Text>
                    </View>
                )}
            </View>

            {showDropOverlay && draggingTaskId ? (
                <Pressable
                    style={cardStyles.dropOverlay}
                    onPress={() => onDropTask?.(draggingTaskId, member.sessionId)}
                >
                    <Ionicons name="add-circle" size={22} color={MATRIX_THEME.accentStrong} />
                    <Text style={cardStyles.dropText}>Assign task to this agent</Text>
                </Pressable>
            ) : null}
        </View>
    );
});

interface MatrixViewProps {
    roster: MatrixRosterEntry[];
    tasks?: KanbanTask[];
    initialGrid?: GridConfig;
    onAgentPress?: (sessionId: string) => void;
    onAssignTask?: (taskId: string, agentSessionId: string) => void;
    onGridChange?: (config: GridConfig) => void;
}

export const MatrixView = React.memo(function MatrixView({
    roster,
    tasks = [],
    initialGrid,
    onAgentPress,
    onAssignTask,
    onGridChange,
}: MatrixViewProps) {
    const sortedRoster = React.useMemo(() => sortMatrixRoster(roster), [roster]);
    const recommended = React.useMemo(() => getRecommendedGrid(sortedRoster.length), [sortedRoster.length]);
    const [gridConfig, setGridConfig] = React.useState<GridConfig>(() => initialGrid ?? recommended);
    const [draggingTaskId, setDraggingTaskId] = React.useState<string | null>(null);
    const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
    const [zoomLevel, setZoomLevel] = React.useState(1);
    const userSelectedGridRef = React.useRef(false);
    const lastExternalGridSignatureRef = React.useRef<string | null>(
        initialGrid ? `${initialGrid.cols}x${initialGrid.rows}` : null,
    );

    React.useEffect(() => {
        if (userSelectedGridRef.current || !initialGrid) {
            return;
        }

        const nextSignature = `${initialGrid.cols}x${initialGrid.rows}`;
        if (lastExternalGridSignatureRef.current === nextSignature) {
            return;
        }

        lastExternalGridSignatureRef.current = nextSignature;
        setGridConfig((current) => {
            if (current.cols === initialGrid.cols && current.rows === initialGrid.rows) {
                return current;
            }
            return initialGrid;
        });
    }, [initialGrid]);

    const sidebarTasks = React.useMemo(() => {
        return tasks.filter((task) => normalizeTaskStatus(task.status) !== 'done');
    }, [tasks]);

    const viewportHeight = React.useMemo(() => getTileHeight(gridConfig, zoomLevel), [gridConfig, zoomLevel]);
    const renderCount = Math.max(sortedRoster.length, gridConfig.cols * gridConfig.rows);

    const handleDragStart = React.useCallback((taskId: string) => {
        setDraggingTaskId(taskId);
    }, []);

    const handleDragEnd = React.useCallback(() => {
        setDraggingTaskId(null);
    }, []);

    const handleDrop = React.useCallback((taskId: string, sessionId: string) => {
        setDraggingTaskId(null);
        onAssignTask?.(taskId, sessionId);
    }, [onAssignTask]);

    const adjustZoom = React.useCallback((delta: number) => {
        setZoomLevel((previous) => clamp(Number((previous + delta).toFixed(2)), MIN_ZOOM, MAX_ZOOM));
    }, []);

    const handleGridSelect = React.useCallback((nextGrid: GridConfig) => {
        userSelectedGridRef.current = true;
        setGridConfig((current) => {
            if (current.cols === nextGrid.cols && current.rows === nextGrid.rows) {
                return current;
            }
            return nextGrid;
        });
        onGridChange?.(nextGrid);
    }, [onGridChange]);

    return (
        <View style={matrixStyles.root}>
            <View style={matrixStyles.headerBar}>
                <View style={matrixStyles.headerLeft}>
                    <Pressable
                        style={matrixStyles.sidebarToggle}
                        onPress={() => setSidebarCollapsed((previous) => !previous)}
                    >
                        <Ionicons
                            name={sidebarCollapsed ? 'chevron-forward' : 'chevron-back'}
                            size={14}
                            color={MATRIX_THEME.muted}
                        />
                    </Pressable>
                    <Ionicons name="apps" size={16} color={MATRIX_THEME.accent} />
                    <Text style={matrixStyles.headerTitle}>Matrix</Text>
                    <Text style={matrixStyles.agentCount}>{sortedRoster.length} agents</Text>
                </View>
                <View style={matrixStyles.headerControls}>
                    <View style={matrixStyles.zoomGroup}>
                        <Pressable
                            style={[matrixStyles.zoomButton, zoomLevel <= MIN_ZOOM && matrixStyles.zoomButtonDisabled]}
                            onPress={() => adjustZoom(-ZOOM_STEP)}
                            disabled={zoomLevel <= MIN_ZOOM}
                        >
                            <Ionicons name="remove" size={12} color={MATRIX_THEME.text} />
                        </Pressable>
                        <Text style={matrixStyles.zoomText}>{Math.round(zoomLevel * 100)}%</Text>
                        <Pressable
                            style={[matrixStyles.zoomButton, zoomLevel >= MAX_ZOOM && matrixStyles.zoomButtonDisabled]}
                            onPress={() => adjustZoom(ZOOM_STEP)}
                            disabled={zoomLevel >= MAX_ZOOM}
                        >
                            <Ionicons name="add" size={12} color={MATRIX_THEME.text} />
                        </Pressable>
                    </View>
                    <GridSizeSelector current={gridConfig} recommended={recommended} onSelect={handleGridSelect} />
                </View>
            </View>

            <View style={matrixStyles.body}>
                {!sidebarCollapsed && (
                    <View style={taskStyles.sidebar}>
                        <View style={taskStyles.sidebarHeader}>
                            <Ionicons name="list" size={14} color={MATRIX_THEME.accent} />
                            <Text style={taskStyles.sidebarTitle}>Tasks</Text>
                            <Text style={taskStyles.sidebarCount}>{sidebarTasks.length}</Text>
                        </View>
                        <ScrollView style={taskStyles.sidebarScroll} contentContainerStyle={taskStyles.sidebarScrollContent}>
                            {sidebarTasks.map((task) => (
                                <TaskSidebarItem
                                    key={task.id}
                                    task={task}
                                    isBeingDragged={draggingTaskId === task.id}
                                    onDragStart={handleDragStart}
                                    onDragEnd={handleDragEnd}
                                />
                            ))}
                            {sidebarTasks.length === 0 && (
                                <View style={taskStyles.emptyState}>
                                    <Text style={taskStyles.emptyText}>No active tasks</Text>
                                </View>
                            )}
                        </ScrollView>
                    </View>
                )}

                <ScrollView
                    style={matrixStyles.scrollContainer}
                    contentContainerStyle={matrixStyles.scrollContent}
                    horizontal={false}
                >
                    <View style={matrixStyles.grid}>
                        {Array.from({ length: renderCount }).map((_, index) => {
                            const entry = sortedRoster[index];
                            return (
                                <View
                                    key={entry?.member.sessionId ?? `empty-${index}`}
                                    style={[
                                        matrixStyles.cell,
                                        { width: `${100 / gridConfig.cols}%` as unknown as number },
                                    ]}
                                >
                                    {entry ? (
                                        <AgentTile
                                            entry={entry}
                                            viewportHeight={viewportHeight}
                                            zoomLevel={zoomLevel}
                                            draggingTaskId={draggingTaskId}
                                            onOpenSession={onAgentPress}
                                            onDropTask={handleDrop}
                                        />
                                    ) : (
                                        <View style={[cardStyles.emptyContainer, { height: viewportHeight }]}>
                                            <Ionicons name="add-circle-outline" size={24} color={MATRIX_THEME.mutedSoft} />
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                </ScrollView>
            </View>
        </View>
    );
});

const matrixStyles = StyleSheet.create(() => ({
    root: {
        flex: 1,
        backgroundColor: MATRIX_THEME.bg,
    },
    headerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: MATRIX_THEME.border,
        backgroundColor: withAlpha(MATRIX_THEME.bgSoft, 0.95),
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sidebarToggle: {
        width: 24,
        height: 24,
        borderRadius: 6,
        backgroundColor: withAlpha(MATRIX_THEME.accent, 0.1),
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: MATRIX_THEME.text,
    },
    agentCount: {
        fontSize: 12,
        color: MATRIX_THEME.muted,
        marginLeft: 4,
    },
    headerControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    zoomGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 8,
        backgroundColor: withAlpha(MATRIX_THEME.panelStrong, 0.7),
        borderWidth: 1,
        borderColor: MATRIX_THEME.borderStrong,
    },
    zoomButton: {
        width: 20,
        height: 20,
        borderRadius: 6,
        backgroundColor: withAlpha(MATRIX_THEME.accent, 0.12),
        alignItems: 'center',
        justifyContent: 'center',
    },
    zoomButtonDisabled: {
        opacity: 0.35,
    },
    zoomText: {
        fontSize: 12,
        fontWeight: '600',
        color: MATRIX_THEME.text,
        minWidth: 42,
        textAlign: 'center',
    },
    body: {
        flex: 1,
        flexDirection: 'row',
        minHeight: 0,
    },
    scrollContainer: {
        flex: 1,
    },
    scrollContent: {
        padding: 8,
        paddingBottom: 28,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    cell: {
        padding: 4,
        ...(Platform.OS === 'web' ? { boxSizing: 'border-box' as any } : {}),
    },
}));

const cardStyles = StyleSheet.create(() => ({
    container: {
        backgroundColor: withAlpha(MATRIX_THEME.panel, 0.88),
        borderRadius: 16,
        borderWidth: 1,
        borderColor: MATRIX_THEME.borderAccent,
        overflow: 'hidden',
        ...(Platform.OS === 'web' ? { transition: 'all 0.18s ease' as any } : {}),
    },
    containerDropTarget: {
        borderColor: MATRIX_THEME.accentStrong,
        shadowColor: MATRIX_THEME.accentStrong,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.16,
        shadowRadius: 14,
        elevation: 3,
    },
    headerButton: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
        paddingHorizontal: 12,
        paddingTop: 12,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: MATRIX_THEME.borderSoft,
        backgroundColor: withAlpha(MATRIX_THEME.panelSoft, 0.92),
    },
    headerMain: {
        flex: 1,
        minWidth: 0,
    },
    headerIdentityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    metaRow: {
        marginTop: 8,
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
    },
    headerActions: {
        alignItems: 'flex-end',
        gap: 8,
    },
    agentStatsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    agentStatChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: MATRIX_THEME.borderStrong,
        backgroundColor: withAlpha(MATRIX_THEME.accent, 0.08),
    },
    agentStatText: {
        fontSize: 10,
        fontWeight: '600',
        color: MATRIX_THEME.muted,
    },
    emptyContainer: {
        backgroundColor: withAlpha(MATRIX_THEME.panel, 0.5),
        borderRadius: 16,
        borderWidth: 1,
        borderColor: MATRIX_THEME.borderSoft,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
    },
    floatingTask: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: withAlpha(MATRIX_THEME.accentStrong, 0.16),
        borderWidth: 1,
        borderColor: withAlpha(MATRIX_THEME.accentStrong, 0.25),
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        marginHorizontal: 12,
        marginTop: 10,
        marginBottom: -2,
    },
    floatingTaskText: {
        fontSize: 11,
        fontWeight: '500',
        color: MATRIX_THEME.text,
        flex: 1,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    name: {
        flex: 1,
        minWidth: 0,
        fontSize: 13,
        fontWeight: '700',
        color: MATRIX_THEME.text,
    },
    roleBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    roleText: {
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
    },
    statusIndicator: {
        width: 5,
        height: 5,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '600',
    },
    runtimeText: {
        fontSize: 10,
        color: MATRIX_THEME.muted,
        textTransform: 'capitalize',
    },
    streamFrame: {
        flex: 1,
        minHeight: 0,
        backgroundColor: withAlpha(MATRIX_THEME.bg, 0.85),
    },
    missingSessionState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    missingSessionText: {
        fontSize: 11,
        color: MATRIX_THEME.muted,
    },
    dropOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 4,
        backgroundColor: withAlpha(MATRIX_THEME.bg, 0.64),
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 16,
    },
    dropText: {
        fontSize: 12,
        fontWeight: '600',
        color: MATRIX_THEME.text,
        textAlign: 'center',
    },
}));

const streamStyles = StyleSheet.create(() => ({
    container: {
        flex: 1,
        minHeight: 0,
    },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: MATRIX_THEME.panelMuted,
        backgroundColor: withAlpha(MATRIX_THEME.bgSoft, 0.85),
    },
    summaryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 999,
        backgroundColor: withAlpha(MATRIX_THEME.accent, 0.08),
        borderWidth: 1,
        borderColor: MATRIX_THEME.borderSoft,
    },
    summaryText: {
        fontSize: 10,
        fontWeight: '600',
        color: MATRIX_THEME.muted,
    },
    loadingState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 16,
    },
    emptyText: {
        fontSize: 11,
        color: MATRIX_THEME.mutedSoft,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingVertical: 8,
        paddingBottom: 16,
    },
}));

const taskStyles = StyleSheet.create(() => ({
    sidebar: {
        width: 220,
        borderRightWidth: 1,
        borderRightColor: MATRIX_THEME.border,
        backgroundColor: withAlpha(MATRIX_THEME.bgSoft, 0.92),
    },
    sidebarHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: MATRIX_THEME.borderSoft,
    },
    sidebarTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: MATRIX_THEME.text,
        flex: 1,
    },
    sidebarCount: {
        fontSize: 11,
        color: MATRIX_THEME.muted,
        backgroundColor: withAlpha(MATRIX_THEME.accent, 0.1),
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        overflow: 'hidden',
    },
    sidebarScroll: {
        flex: 1,
    },
    sidebarScrollContent: {
        padding: 6,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 8,
        marginBottom: 4,
        backgroundColor: withAlpha(MATRIX_THEME.text, 0.01),
        borderWidth: 1,
        borderColor: 'transparent',
        ...(Platform.OS === 'web'
            ? {
                cursor: 'grab' as any,
                transition: 'all 0.15s ease' as any,
            }
            : {}),
    },
    itemDragging: {
        opacity: 0.5,
        backgroundColor: withAlpha(MATRIX_THEME.accentStrong, 0.08),
        borderColor: MATRIX_THEME.borderAccent,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        flexShrink: 0,
    },
    itemContent: {
        flex: 1,
        gap: 2,
    },
    itemTitle: {
        fontSize: 11,
        fontWeight: '500',
        color: MATRIX_THEME.text,
        lineHeight: 15,
    },
    itemStatus: {
        fontSize: 9,
        color: MATRIX_THEME.mutedSoft,
        textTransform: 'uppercase',
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    emptyState: {
        paddingVertical: 24,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 11,
        color: MATRIX_THEME.mutedSoft,
    },
}));

const selectorStyles = StyleSheet.create(() => ({
    container: {
        position: 'relative',
        zIndex: 10,
    },
    trigger: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: withAlpha(MATRIX_THEME.panelStrong, 0.7),
        borderWidth: 1,
        borderColor: MATRIX_THEME.borderStrong,
    },
    triggerText: {
        fontSize: 12,
        fontWeight: '600',
        color: MATRIX_THEME.text,
    },
    dropdown: {
        position: 'absolute',
        top: 36,
        right: 0,
        backgroundColor: MATRIX_THEME.panel,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: MATRIX_THEME.borderAccent,
        shadowColor: MATRIX_THEME.bg,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 24,
        elevation: 6,
        minWidth: 104,
        overflow: 'hidden',
        padding: 4,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    optionActive: {
        backgroundColor: withAlpha(MATRIX_THEME.accent, 0.15),
    },
    optionText: {
        fontSize: 13,
        color: MATRIX_THEME.text,
    },
    optionTextActive: {
        fontWeight: '600',
        color: MATRIX_THEME.accentStrong,
    },
    recommendedBadge: {
        backgroundColor: withAlpha(MATRIX_THEME.accent, 0.15),
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    recommendedText: {
        fontSize: 9,
        fontWeight: '600',
        color: MATRIX_THEME.accent,
        textTransform: 'uppercase',
    },
}));
