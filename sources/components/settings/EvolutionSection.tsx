/**
 * EvolutionSection
 *
 * Shows the v313 agent evolution panel inside the Team detail view.
 * Two sub-sections:
 *   1. Active Bypass Agents — agents running with bypassPermissions, spawned by other agents
 *   2. Genomes — persistent agent DNA specs registered for this team
 *
 * Data fetched directly from:
 *   GET /v1/teams/:teamId/bypass-agents
 *   GET /v1/genomes?teamId=:teamId
 */

import React from 'react';
import {
    View,
    ScrollView,
    ActivityIndicator,
    Pressable,
} from 'react-native';
import { Text } from '@/components/ui/StyledText';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { sync } from '@/sync/sync';
import {
    fetchBypassAgents,
    fetchGenomes,
    retireBypassAgent,
    type BypassAgent,
    type Genome,
} from '@/sync/apiEvolution';
import { Modal } from '@/modal';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTimeRemaining(expiresAt: number): string {
    if (expiresAt === 0) return 'Never expires';
    const now = Math.floor(Date.now() / 1000);
    const diff = expiresAt - now;
    if (diff <= 0) return 'Expired';
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
}

function formatSpawnedAt(spawnedAt: number): string {
    const date = new Date(spawnedAt * 1000);
    return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

const PROFILE_ICONS: Record<string, string> = {
    init: 'play-circle-outline',
    periodic: 'timer-outline',
    event: 'flash-outline',
    reactive: 'pulse-outline',
};

// ─── Sub-components ──────────────────────────────────────────────────────────

interface BypassAgentCardProps {
    agent: BypassAgent;
    onRetire: (agentId: string) => void;
}

const BypassAgentCard = React.memo(({ agent, onRetire }: BypassAgentCardProps) => {
    const { theme } = useUnistyles();
    const timeRemaining = formatTimeRemaining(agent.expiresAt);
    const isExpiringSoon = agent.expiresAt > 0 && (agent.expiresAt - Math.floor(Date.now() / 1000)) < 300;
    const profileIcon = (PROFILE_ICONS[agent.profile] || 'hardware-chip-outline') as any;

    return (
        <View style={[agentCardStyles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider }]}>
            <View style={agentCardStyles.row}>
                <View style={[agentCardStyles.iconWrap, { backgroundColor: theme.colors.groupped.background }]}>
                    <Ionicons name={profileIcon} size={20} color={theme.colors.textLink} />
                </View>
                <View style={agentCardStyles.info}>
                    <Text style={[agentCardStyles.roleId, { color: theme.colors.text }]}>
                        {agent.roleId}
                    </Text>
                    <Text style={[agentCardStyles.meta, { color: theme.colors.textSecondary }]}>
                        {agent.profile} · spawned {formatSpawnedAt(agent.spawnedAt)}
                    </Text>
                </View>
                <View style={[
                    agentCardStyles.ttlBadge,
                    { backgroundColor: isExpiringSoon ? '#FF3B3020' : `${theme.colors.textLink}15` }
                ]}>
                    <Text style={[agentCardStyles.ttlText, { color: isExpiringSoon ? '#FF3B30' : theme.colors.textLink }]}>
                        {timeRemaining}
                    </Text>
                </View>
            </View>

            <View style={agentCardStyles.permissions}>
                {agent.permissions.canSpawnAgents && (
                    <View style={[agentCardStyles.permBadge, { backgroundColor: `${theme.colors.textLink}12` }]}>
                        <Text style={[agentCardStyles.permText, { color: theme.colors.textLink }]}>can spawn</Text>
                    </View>
                )}
                {agent.permissions.canDeployToProduction && (
                    <View style={[agentCardStyles.permBadge, { backgroundColor: '#FF3B3012' }]}>
                        <Text style={[agentCardStyles.permText, { color: '#FF3B30' }]}>deploy</Text>
                    </View>
                )}
            </View>

            <Text style={[agentCardStyles.agentId, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                {agent.agentId}
            </Text>

            <Pressable
                style={[agentCardStyles.retireBtn, { borderColor: theme.colors.divider }]}
                onPress={() => onRetire(agent.agentId)}
            >
                <Ionicons name="stop-circle-outline" size={14} color={theme.colors.textDestructive} />
                <Text style={[agentCardStyles.retireBtnText, { color: theme.colors.textDestructive }]}>
                    Retire
                </Text>
            </Pressable>
        </View>
    );
});

interface GenomeCardProps {
    genome: Genome;
}

const GenomeCard = React.memo(({ genome }: GenomeCardProps) => {
    const { theme } = useUnistyles();
    let spec: { roleId?: string; modelId?: string; permissionMode?: string; tools?: string[] } = {};
    try {
        spec = JSON.parse(genome.spec);
    } catch {
        // ignore malformed spec
    }

    return (
        <View style={[genomeCardStyles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider }]}>
            <View style={genomeCardStyles.header}>
                <View style={[genomeCardStyles.dnaIcon, { backgroundColor: `${theme.colors.textLink}15` }]}>
                    <Ionicons name="git-branch-outline" size={18} color={theme.colors.textLink} />
                </View>
                <View style={genomeCardStyles.nameWrap}>
                    <Text style={[genomeCardStyles.name, { color: theme.colors.text }]} numberOfLines={1}>
                        {genome.name}
                    </Text>
                    {genome.description && (
                        <Text style={[genomeCardStyles.description, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                            {genome.description}
                        </Text>
                    )}
                </View>
                <View style={[genomeCardStyles.spawnBadge, { backgroundColor: theme.colors.groupped.background }]}>
                    <Text style={[genomeCardStyles.spawnCount, { color: theme.colors.textSecondary }]}>
                        ×{genome.spawnCount}
                    </Text>
                </View>
            </View>

            <View style={genomeCardStyles.tags}>
                {spec.roleId && (
                    <View style={[genomeCardStyles.tag, { backgroundColor: `${theme.colors.textLink}12` }]}>
                        <Text style={[genomeCardStyles.tagText, { color: theme.colors.textLink }]}>{spec.roleId}</Text>
                    </View>
                )}
                {spec.modelId && (
                    <View style={[genomeCardStyles.tag, { backgroundColor: theme.colors.groupped.background }]}>
                        <Text style={[genomeCardStyles.tagText, { color: theme.colors.textSecondary }]}>{spec.modelId}</Text>
                    </View>
                )}
                {spec.permissionMode && spec.permissionMode !== 'default' && (
                    <View style={[genomeCardStyles.tag, { backgroundColor: theme.colors.groupped.background }]}>
                        <Text style={[genomeCardStyles.tagText, { color: theme.colors.textSecondary }]}>{spec.permissionMode}</Text>
                    </View>
                )}
                {genome.isPublic && (
                    <View style={[genomeCardStyles.tag, { backgroundColor: '#2BD26F12' }]}>
                        <Text style={[genomeCardStyles.tagText, { color: '#2BD26F' }]}>public</Text>
                    </View>
                )}
            </View>
        </View>
    );
});

// ─── Main Component ───────────────────────────────────────────────────────────

interface EvolutionSectionProps {
    teamId: string;
}

export const EvolutionSection = React.memo(({ teamId }: EvolutionSectionProps) => {
    const { theme } = useUnistyles();
    const styles = stylesheet;

    const [agents, setAgents] = React.useState<BypassAgent[]>([]);
    const [genomes, setGenomes] = React.useState<Genome[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [retireLoadingId, setRetireLoadingId] = React.useState<string | null>(null);

    const load = React.useCallback(async () => {
        const credentials = sync.getCredentials();
        if (!credentials) return;

        setIsLoading(true);
        try {
            const [agentsRes, genomesRes] = await Promise.all([
                fetchBypassAgents(credentials, teamId),
                fetchGenomes(credentials, { teamId, limit: 20 }),
            ]);
            setAgents(agentsRes.agents);
            setGenomes(genomesRes.genomes);
        } catch {
            // Silent — show whatever we have
        } finally {
            setIsLoading(false);
        }
    }, [teamId]);

    React.useEffect(() => {
        load();
    }, [load]);

    const handleRetire = React.useCallback((agentId: string) => {
        Modal.alert(
            'Retire Agent',
            'Retire this bypass agent? Its lifecycle token will be invalidated immediately.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Retire',
                    style: 'destructive',
                    onPress: async () => {
                        const credentials = sync.getCredentials();
                        if (!credentials) return;
                        setRetireLoadingId(agentId);
                        try {
                            await retireBypassAgent(credentials, teamId, agentId);
                            setAgents(prev => prev.filter(a => a.agentId !== agentId));
                        } catch {
                            Modal.alert('Error', 'Failed to retire agent. Please try again.', [{ text: 'OK', style: 'cancel' }]);
                        } finally {
                            setRetireLoadingId(null);
                        }
                    },
                },
            ]
        );
    }, [teamId]);

    if (isLoading) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={styles.scrollContent}>

            {/* ── Active Bypass Agents ─────────────────────────────────────── */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <View style={styles.sectionTitleRow}>
                        <Ionicons name="hardware-chip-outline" size={18} color={theme.colors.textLink} style={styles.sectionIcon} />
                        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                            Active Bypass Agents
                        </Text>
                        <View style={[styles.countBadge, { backgroundColor: theme.colors.groupped.background }]}>
                            <Text style={[styles.countText, { color: theme.colors.textSecondary }]}>
                                {agents.length}
                            </Text>
                        </View>
                    </View>
                    <Pressable onPress={load} hitSlop={8}>
                        <Ionicons name="refresh-outline" size={18} color={theme.colors.textSecondary} />
                    </Pressable>
                </View>

                {agents.length === 0 ? (
                    <View style={[styles.emptyCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider }]}>
                        <Ionicons name="radio-button-off-outline" size={28} color={theme.colors.textSecondary} />
                        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                            No active bypass agents
                        </Text>
                        <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
                            Agents will appear here when spawned via the CLI or another agent.
                        </Text>
                    </View>
                ) : (
                    agents.map(agent => (
                        <BypassAgentCard
                            key={agent.agentId}
                            agent={agent}
                            onRetire={retireLoadingId ? () => {} : handleRetire}
                        />
                    ))
                )}
            </View>

            {/* ── Genomes ──────────────────────────────────────────────────── */}
            <View style={[styles.section, { marginTop: 8 }]}>
                <View style={styles.sectionHeader}>
                    <View style={styles.sectionTitleRow}>
                        <Ionicons name="git-branch-outline" size={18} color={theme.colors.textLink} style={styles.sectionIcon} />
                        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                            Genomes
                        </Text>
                        <View style={[styles.countBadge, { backgroundColor: theme.colors.groupped.background }]}>
                            <Text style={[styles.countText, { color: theme.colors.textSecondary }]}>
                                {genomes.length}
                            </Text>
                        </View>
                    </View>
                </View>

                {genomes.length === 0 ? (
                    <View style={[styles.emptyCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider }]}>
                        <Ionicons name="git-branch-outline" size={28} color={theme.colors.textSecondary} />
                        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                            No genomes registered
                        </Text>
                        <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
                            Genomes are agent DNA specs created via the CLI with{'\n'}
                            <Text style={{ fontFamily: 'monospace' }}>aha evolution spawn</Text>.
                        </Text>
                    </View>
                ) : (
                    genomes.map(genome => (
                        <GenomeCard key={genome.id} genome={genome} />
                    ))
                )}
            </View>

        </ScrollView>
    );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const stylesheet = StyleSheet.create((theme) => ({
    loading: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },
    section: {
        marginBottom: 8,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sectionIcon: {
        marginRight: 6,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '600',
    },
    countBadge: {
        marginLeft: 8,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    countText: {
        fontSize: 12,
        fontWeight: '600',
    },
    emptyCard: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 24,
        alignItems: 'center',
        gap: 8,
    },
    emptyText: {
        fontSize: 15,
        fontWeight: '500',
    },
    emptySubtext: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 18,
    },
}));

const agentCardStyles = StyleSheet.create((theme) => ({
    card: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 12,
        marginBottom: 10,
        gap: 8,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconWrap: {
        width: 36,
        height: 36,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    info: {
        flex: 1,
    },
    roleId: {
        fontSize: 14,
        fontWeight: '600',
    },
    meta: {
        fontSize: 12,
        marginTop: 2,
    },
    ttlBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        marginLeft: 8,
    },
    ttlText: {
        fontSize: 12,
        fontWeight: '600',
    },
    permissions: {
        flexDirection: 'row',
        gap: 6,
    },
    permBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    permText: {
        fontSize: 11,
        fontWeight: '500',
    },
    agentId: {
        fontSize: 11,
        fontFamily: 'monospace',
    },
    retireBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        borderWidth: 1,
        marginTop: 2,
    },
    retireBtnText: {
        fontSize: 12,
        fontWeight: '500',
    },
}));

const genomeCardStyles = StyleSheet.create((theme) => ({
    card: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 12,
        marginBottom: 10,
        gap: 8,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    dnaIcon: {
        width: 36,
        height: 36,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    nameWrap: {
        flex: 1,
    },
    name: {
        fontSize: 14,
        fontWeight: '600',
    },
    description: {
        fontSize: 12,
        marginTop: 2,
        lineHeight: 16,
    },
    spawnBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        marginLeft: 8,
    },
    spawnCount: {
        fontSize: 12,
        fontWeight: '600',
    },
    tags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    tag: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    tagText: {
        fontSize: 11,
        fontWeight: '500',
    },
}));
