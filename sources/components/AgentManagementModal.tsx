/**
 * R6: Agent Management Modal
 *
 * Modal for adding/managing agents at runtime.
 * Implements "one-tap ready" pattern with smart defaults.
 */

import React from 'react';
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Text } from '@/components/StyledText';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/auth/AuthContext';
import {
    listAgents,
    spawnAgents,
    stopAgent,
    pauseAgent,
    resumeAgent,
    AgentInfo,
    AgentMode,
    AgentStatus,
} from '@/sync/apiRuntimeAgent';

// === Props ===

interface AgentManagementModalProps {
    teamId: string;
    visible: boolean;
    onClose: () => void;
    onAgentAdded?: (sessionId: string) => void;
    onAgentRemoved?: (sessionId: string) => void;
}

// === Role Options ===

const ROLE_OPTIONS = [
    { id: 'master', label: 'Master', description: 'Coordinates and plans work', icon: 'people' },
    { id: 'builder', label: 'Builder', description: 'Implements features', icon: 'construct' },
    { id: 'qa', label: 'QA', description: 'Tests and validates', icon: 'checkmark-done' },
    { id: 'reviewer', label: 'Reviewer', description: 'Reviews code quality', icon: 'eye' },
];

const MODE_OPTIONS: Array<{ id: AgentMode; label: string }> = [
    { id: 'claude', label: 'Claude Code' },
    { id: 'codex', label: 'Codex' },
];

// === Status Badge ===

function StatusBadge({ status }: { status: AgentStatus }) {
    const { theme } = useUnistyles();
    const styles = stylesheet;

    const color = status === 'running' ? '#3D8A5A'
        : status === 'paused' ? '#F5A623'
        : status === 'spawning' ? '#4A90D9'
        : status === 'error' ? '#D08068'
        : theme.colors.textSecondary;

    return (
        <View style={[styles.statusBadge, { backgroundColor: `${color}20` }]}>
            <View style={[styles.statusDot, { backgroundColor: color }]} />
            <Text style={[styles.statusText, { color }]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
        </View>
    );
}

// === Agent Card ===

interface AgentCardProps {
    agent: AgentInfo;
    onPause: () => void;
    onResume: () => void;
    onStop: () => void;
    isOperating: boolean;
}

function AgentCard({ agent, onPause, onResume, onStop, isOperating }: AgentCardProps) {
    const styles = stylesheet;
    const { theme } = useUnistyles();

    const isRunning = agent.status === 'running';
    const isPaused = agent.status === 'paused';
    const canPause = isRunning;
    const canResume = isPaused;

    return (
        <View style={styles.agentCard}>
            <View style={styles.agentHeader}>
                <View style={styles.agentInfo}>
                    <Text style={styles.agentName}>
                        {agent.displayName || agent.roleId}
                    </Text>
                    <Text style={styles.agentRole}>
                        {agent.roleId} • {agent.mode}
                    </Text>
                </View>
                <StatusBadge status={agent.status} />
            </View>

            {agent.error && (
                <View style={styles.errorBox}>
                    <Ionicons name="alert-circle" size={14} color={theme.colors.error} />
                    <Text style={styles.errorText}>{agent.error}</Text>
                </View>
            )}

            <View style={styles.agentMetrics}>
                <View style={styles.metric}>
                    <Text style={styles.metricValue}>{(agent.tokenUsed / 1000).toFixed(1)}k</Text>
                    <Text style={styles.metricLabel}>Tokens</Text>
                </View>
                <View style={styles.metric}>
                    <Text style={styles.metricValue}>{agent.cpuPercent.toFixed(0)}%</Text>
                    <Text style={styles.metricLabel}>CPU</Text>
                </View>
                <View style={styles.metric}>
                    <Text style={styles.metricValue}>{agent.memoryMb.toFixed(0)}MB</Text>
                    <Text style={styles.metricLabel}>Memory</Text>
                </View>
            </View>

            <View style={styles.agentActions}>
                {canPause && (
                    <Pressable
                        style={[styles.actionBtn, styles.pauseBtn]}
                        onPress={onPause}
                        disabled={isOperating}
                    >
                        <Ionicons name="pause" size={16} color={theme.colors.text} />
                        <Text style={styles.actionBtnText}>Pause</Text>
                    </Pressable>
                )}
                {canResume && (
                    <Pressable
                        style={[styles.actionBtn, styles.resumeBtn]}
                        onPress={onResume}
                        disabled={isOperating}
                    >
                        <Ionicons name="play" size={16} color="#FFF" />
                        <Text style={[styles.actionBtnText, { color: '#FFF' }]}>Resume</Text>
                    </Pressable>
                )}
                <Pressable
                    style={[styles.actionBtn, styles.stopBtn]}
                    onPress={onStop}
                    disabled={isOperating}
                >
                    <Ionicons name="stop" size={16} color={theme.colors.error} />
                    <Text style={[styles.actionBtnText, { color: theme.colors.error }]}>Stop</Text>
                </Pressable>
            </View>
        </View>
    );
}

// === Add Agent Form ===

interface AddAgentFormProps {
    onAdd: (roleId: string, mode: AgentMode, count: number) => Promise<void>;
    isAdding: boolean;
}

function AddAgentForm({ onAdd, isAdding }: AddAgentFormProps) {
    const styles = stylesheet;
    const [selectedRole, setSelectedRole] = React.useState('builder');
    const [selectedMode, setSelectedMode] = React.useState<AgentMode>('codex');
    const [quantity, setQuantity] = React.useState(2);

    const handleAdd = async () => {
        await onAdd(selectedRole, selectedMode, quantity);
    };

    return (
        <View style={styles.addForm}>
            <Text style={styles.addFormTitle}>Add Agent</Text>

            <View style={styles.recommendedCard}>
                <View style={styles.recommendedHeader}>
                    <Ionicons name="sparkles" size={14} color="#3D8A5A" />
                    <Text style={styles.recommendedHeaderText}>Recommended</Text>
                </View>
                <View style={styles.recommendedBadge}>
                    <Text style={styles.recommendedName}>Builder</Text>
                    <Text style={styles.recommendedWhy}>Best for writing code</Text>
                </View>
            </View>

            <Text style={styles.addFormLabel}>Role</Text>
            <View style={styles.roleOptions}>
                {ROLE_OPTIONS.map((role) => (
                    <Pressable
                        key={role.id}
                        style={[styles.roleOption, selectedRole === role.id && styles.roleOptionSelected]}
                        onPress={() => setSelectedRole(role.id)}
                    >
                        <Ionicons
                            name={role.icon as any}
                            size={16}
                            color={selectedRole === role.id ? '#3D8A5A' : '#666'}
                        />
                        <Text style={[styles.roleOptionText, selectedRole === role.id && styles.roleOptionTextSelected]}>
                            {role.label}
                        </Text>
                    </Pressable>
                ))}
            </View>

            <Text style={styles.addFormLabel}>Mode</Text>
            <View style={styles.modeCards}>
                {MODE_OPTIONS.map((mode) => (
                    <Pressable
                        key={mode.id}
                        style={[styles.modeCard, selectedMode === mode.id && styles.modeCardActive]}
                        onPress={() => setSelectedMode(mode.id)}
                    >
                        <Ionicons
                            name={mode.id === 'codex' ? 'code-slash' : 'chatbubble-ellipses'}
                            size={20}
                            color={selectedMode === mode.id ? '#3D8A5A' : '#8E8E93'}
                        />
                        <Text style={[styles.modeCardText, selectedMode === mode.id && styles.modeCardTextActive]}>
                            {mode.id === 'claude' ? 'Claude' : 'Codex'}
                        </Text>
                    </Pressable>
                ))}
            </View>

            <Text style={styles.addFormLabel}>Quantity</Text>
            <View style={styles.quantityRow}>
                <Pressable
                    style={styles.quantityButton}
                    onPress={() => setQuantity((prev) => Math.max(1, prev - 1))}
                >
                    <Text style={styles.quantityButtonText}>-</Text>
                </Pressable>
                <Text style={styles.quantityValue}>{quantity}</Text>
                <Pressable
                    style={styles.quantityButtonPrimary}
                    onPress={() => setQuantity((prev) => Math.min(9, prev + 1))}
                >
                    <Text style={styles.quantityButtonPrimaryText}>+</Text>
                </Pressable>
            </View>

            <Pressable
                style={[styles.addButton, isAdding && styles.addButtonDisabled]}
                onPress={handleAdd}
                disabled={isAdding}
            >
                {isAdding ? (
                    <ActivityIndicator size="small" color="#FFF" />
                ) : (
                    <>
                        <Ionicons name="add" size={20} color="#FFF" />
                        <Text style={styles.addButtonText}>Spawn Agent</Text>
                    </>
                )}
            </Pressable>
        </View>
    );
}

// === Main Modal ===

export function AgentManagementModal({
    teamId,
    visible,
    onClose,
    onAgentAdded,
    onAgentRemoved,
}: AgentManagementModalProps) {
    const styles = stylesheet;
    const { theme } = useUnistyles();
    const auth = useAuth();

    const [agents, setAgents] = React.useState<AgentInfo[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [operatingSessionId, setOperatingSessionId] = React.useState<string | null>(null);
    const [error, setError] = React.useState<string | null>(null);

    // Load agents on mount
    React.useEffect(() => {
        if (visible && auth?.credentials) {
            loadAgents();
        }
    }, [visible, auth?.credentials, teamId]);

    const loadAgents = async () => {
        if (!auth?.credentials) return;
        setLoading(true);
        setError(null);
        try {
            const result = await listAgents(auth.credentials, teamId);
            setAgents(result.agents);
        } catch (err: any) {
            setError(err.message || 'Failed to load agents');
        } finally {
            setLoading(false);
        }
    };

    const handleAddAgent = async (roleId: string, mode: AgentMode, count: number) => {
        if (!auth?.credentials) return;
        setError(null);
        try {
            const result = await spawnAgents(auth.credentials, teamId, {
                roleId,
                mode,
                count,
            });
            for (const session of result.sessions) {
                onAgentAdded?.(session.sessionId);
            }
            await loadAgents();
        } catch (err: any) {
            setError(err.message || 'Failed to add agent');
        }
    };

    const handlePause = async (sessionId: string) => {
        if (!auth?.credentials) return;
        setOperatingSessionId(sessionId);
        try {
            await pauseAgent(auth.credentials, teamId, sessionId);
            await loadAgents();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setOperatingSessionId(null);
        }
    };

    const handleResume = async (sessionId: string) => {
        if (!auth?.credentials) return;
        setOperatingSessionId(sessionId);
        try {
            await resumeAgent(auth.credentials, teamId, sessionId);
            await loadAgents();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setOperatingSessionId(null);
        }
    };

    const handleStop = async (sessionId: string) => {
        if (!auth?.credentials) return;
        setOperatingSessionId(sessionId);
        try {
            await stopAgent(auth.credentials, teamId, sessionId);
            onAgentRemoved?.(sessionId);
            await loadAgents();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setOperatingSessionId(null);
        }
    };

    if (!visible) return null;

    return (
        <View style={styles.overlay}>
            <Pressable style={styles.backdrop} onPress={onClose} />
            <View style={styles.modal}>
                <View style={styles.header}>
                    <Text style={styles.title}>Add Agent</Text>
                    <Pressable style={styles.closeButton} onPress={onClose}>
                        <Ionicons name="close" size={24} color={theme.colors.text} />
                    </Pressable>
                </View>

                {error && (
                    <View style={styles.errorBanner}>
                        <Ionicons name="alert-circle" size={18} color={theme.colors.error} />
                        <Text style={styles.errorBannerText}>{error}</Text>
                        <Pressable onPress={() => setError(null)}>
                            <Ionicons name="close" size={16} color={theme.colors.error} />
                        </Pressable>
                    </View>
                )}

                <ScrollView style={styles.content}>
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={theme.colors.button.primary.background} />
                        </View>
                    ) : (
                        <>
                            {agents.length > 0 ? (
                                <View style={styles.agentList}>
                                    {agents.map((agent) => (
                                        <AgentCard
                                            key={agent.sessionId}
                                            agent={agent}
                                            onPause={() => handlePause(agent.sessionId)}
                                            onResume={() => handleResume(agent.sessionId)}
                                            onStop={() => handleStop(agent.sessionId)}
                                            isOperating={operatingSessionId === agent.sessionId}
                                        />
                                    ))}
                                </View>
                            ) : (
                                <View style={styles.emptyState}>
                                    <Ionicons name="people-outline" size={48} color={theme.colors.textSecondary} />
                                    <Text style={styles.emptyText}>No agents running</Text>
                                    <Text style={styles.emptySubtext}>Add an agent to get started</Text>
                                </View>
                            )}

                            <AddAgentForm onAdd={handleAddAgent} isAdding={loading} />
                        </>
                    )}
                </ScrollView>
            </View>
        </View>
    );
}

// === Styles ===

const stylesheet = StyleSheet.create((theme) => ({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modal: {
        width: '90%',
        maxWidth: 480,
        maxHeight: '80%',
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.divider,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
    },
    closeButton: {
        padding: 4,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    loadingContainer: {
        padding: 32,
        alignItems: 'center',
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 12,
        marginHorizontal: 16,
        marginTop: 8,
        backgroundColor: `${theme.colors.error}15`,
        borderRadius: 8,
    },
    errorBannerText: {
        flex: 1,
        fontSize: 13,
        color: theme.colors.error,
    },
    agentList: {
        gap: 12,
        marginBottom: 20,
    },
    agentCard: {
        backgroundColor: theme.colors.groupped.background,
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: theme.colors.divider,
    },
    agentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    agentInfo: {
        flex: 1,
    },
    agentName: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.text,
    },
    agentRole: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        padding: 8,
        backgroundColor: `${theme.colors.error}10`,
        borderRadius: 6,
        marginBottom: 10,
    },
    errorText: {
        flex: 1,
        fontSize: 12,
        color: theme.colors.error,
    },
    agentMetrics: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 12,
    },
    metric: {
        alignItems: 'center',
    },
    metricValue: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    metricLabel: {
        fontSize: 10,
        color: theme.colors.textSecondary,
    },
    agentActions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
    },
    pauseBtn: {
        borderColor: theme.colors.divider,
        backgroundColor: theme.colors.surface,
    },
    resumeBtn: {
        borderColor: '#3D8A5A',
        backgroundColor: '#3D8A5A',
    },
    stopBtn: {
        borderColor: theme.colors.error,
        backgroundColor: 'transparent',
    },
    actionBtnText: {
        fontSize: 13,
        fontWeight: '500',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        marginTop: 12,
    },
    emptySubtext: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    addForm: {
        borderTopWidth: 1,
        borderTopColor: theme.colors.divider,
        paddingTop: 20,
    },
    addFormTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: 16,
    },
    addFormLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        marginBottom: 8,
        marginTop: 12,
        textTransform: 'uppercase',
    },
    recommendedCard: {
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#C7E5D1',
        backgroundColor: '#EAF5EE',
        padding: 12,
        marginBottom: 8,
    },
    recommendedHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    recommendedHeaderText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#3D8A5A',
    },
    recommendedBadge: {
        borderRadius: 10,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#D8E7DD',
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    recommendedName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1A1918',
    },
    recommendedWhy: {
        marginTop: 2,
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    roleOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    roleOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        backgroundColor: theme.colors.surface,
    },
    roleOptionSelected: {
        borderColor: '#3D8A5A',
        backgroundColor: '#3D8A5A10',
    },
    roleOptionText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
    },
    roleOptionTextSelected: {
        color: '#3D8A5A',
        fontWeight: '600',
    },
    modeCards: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    modeCard: {
        flex: 1,
        minHeight: 84,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        backgroundColor: theme.colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    modeCardActive: {
        borderColor: '#3D8A5A',
        backgroundColor: '#EAF5EE',
    },
    modeCardText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        fontWeight: '600',
    },
    modeCardTextActive: {
        color: '#3D8A5A',
    },
    quantityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        marginBottom: 16,
    },
    quantityButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: theme.colors.groupped.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quantityButtonPrimary: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#3D8A5A',
        alignItems: 'center',
        justifyContent: 'center',
    },
    quantityButtonText: {
        fontSize: 20,
        lineHeight: 20,
        color: theme.colors.textSecondary,
    },
    quantityButtonPrimaryText: {
        fontSize: 20,
        lineHeight: 20,
        color: '#FFF',
    },
    quantityValue: {
        minWidth: 24,
        textAlign: 'center',
        fontSize: 22,
        fontWeight: '700',
        color: theme.colors.text,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#3D8A5A',
    },
    addButtonDisabled: {
        opacity: 0.6,
    },
    addButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
    },
}));

export default AgentManagementModal;
