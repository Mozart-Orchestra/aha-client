import * as React from 'react';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    TextInput,
    View,
} from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/StyledText';
import { Avatar } from '@/components/avatar/Avatar';
import { JoinTeamModal } from '@/app/(app)/agents/JoinTeamModal';
import { parseSpec, searchGenomes, type GenomeRecord } from '@/utils/genomeHub';

interface Props {
    visible: boolean;
    teamId: string;
    teamName: string;
    onClose: () => void;
}

const styles = StyleSheet.create((theme) => ({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    card: {
        width: '100%',
        maxWidth: 720,
        maxHeight: '88%',
        borderRadius: 24,
        borderWidth: 1,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 14,
    },
    titleWrap: {
        flex: 1,
        minWidth: 0,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
    },
    subtitle: {
        fontSize: 13,
        marginTop: 4,
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    controls: {
        paddingHorizontal: 20,
        paddingBottom: 16,
        gap: 12,
    },
    searchInput: {
        height: 46,
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 14,
        fontSize: 15,
    },
    hintRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    hintText: {
        fontSize: 12,
    },
    body: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    results: {
        gap: 12,
    },
    loadingState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
        gap: 12,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 56,
        gap: 10,
    },
    emptyTitle: {
        fontSize: 15,
        fontWeight: '700',
    },
    emptyBody: {
        fontSize: 13,
        lineHeight: 19,
        textAlign: 'center',
        maxWidth: 360,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        borderWidth: 1,
        borderRadius: 18,
        padding: 14,
    },
    copy: {
        flex: 1,
        minWidth: 0,
        gap: 4,
    },
    name: {
        fontSize: 15,
        fontWeight: '700',
    },
    meta: {
        fontSize: 12,
    },
    description: {
        fontSize: 13,
        lineHeight: 18,
    },
    badgeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 2,
    },
    badge: {
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 999,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 9,
    },
    addButtonText: {
        fontSize: 12,
        fontWeight: '700',
    },
}));

export const TeamAgentLibraryModal = React.memo(function TeamAgentLibraryModal({
    visible,
    teamId,
    teamName,
    onClose,
}: Props) {
    const { theme } = useUnistyles();
    const [query, setQuery] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [genomes, setGenomes] = React.useState<GenomeRecord[]>([]);
    const [selectedGenome, setSelectedGenome] = React.useState<GenomeRecord | null>(null);

    React.useEffect(() => {
        if (!visible || selectedGenome) return;

        let cancelled = false;
        const timeoutId = setTimeout(async () => {
            setLoading(true);
            try {
                const result = await searchGenomes({
                    q: query.trim() || undefined,
                    limit: 40,
                });
                if (!cancelled) {
                    setGenomes(result.genomes.filter((genome) => genome.category !== 'corps'));
                }
            } catch {
                if (!cancelled) {
                    setGenomes([]);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }, 180);

        return () => {
            cancelled = true;
            clearTimeout(timeoutId);
        };
    }, [query, selectedGenome, visible]);

    const handleClose = React.useCallback(() => {
        setSelectedGenome(null);
        onClose();
    }, [onClose]);

    const handleBackToLibrary = React.useCallback(() => {
        setSelectedGenome(null);
    }, []);

    return (
        <>
            <Modal
                visible={visible && !selectedGenome}
                transparent
                animationType="fade"
                onRequestClose={handleClose}
            >
                <Pressable style={styles.overlay} onPress={handleClose}>
                    <Pressable
                        style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider }]}
                        onPress={() => {}}
                    >
                        <View style={styles.header}>
                            <View style={styles.titleWrap}>
                                <Text style={[styles.title, { color: theme.colors.text }]}>Add agents</Text>
                                <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                                    Pull published agents from the marketplace into {teamName}.
                                </Text>
                            </View>
                            <Pressable
                                onPress={handleClose}
                                style={[styles.closeButton, { backgroundColor: theme.colors.groupped.background }]}
                            >
                                <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
                            </Pressable>
                        </View>

                        <View style={styles.controls}>
                            <TextInput
                                style={[
                                    styles.searchInput,
                                    {
                                        color: theme.colors.text,
                                        backgroundColor: theme.colors.surfaceHigh,
                                        borderColor: theme.colors.divider,
                                    },
                                ]}
                                value={query}
                                onChangeText={setQuery}
                                placeholder="Search by name, role, runtime, or model"
                                placeholderTextColor={theme.colors.input.placeholder}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                            <View style={styles.hintRow}>
                                <Ionicons name="storefront-outline" size={14} color={theme.colors.textSecondary} />
                                <Text style={[styles.hintText, { color: theme.colors.textSecondary }]}>
                                    Covers official, synced, and marketplace-published agents.
                                </Text>
                            </View>
                        </View>

                        <ScrollView style={styles.body} contentContainerStyle={styles.results} showsVerticalScrollIndicator={false}>
                            {loading ? (
                                <View style={styles.loadingState}>
                                    <ActivityIndicator size="small" color={theme.colors.textSecondary} />
                                    <Text style={{ color: theme.colors.textSecondary }}>Loading agents…</Text>
                                </View>
                            ) : genomes.length === 0 ? (
                                <View style={styles.emptyState}>
                                    <Ionicons name="search-outline" size={26} color={theme.colors.textSecondary} />
                                    <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No matching agents</Text>
                                    <Text style={[styles.emptyBody, { color: theme.colors.textSecondary }]}>
                                        Try a different name, role, model, or runtime keyword.
                                    </Text>
                                </View>
                            ) : genomes.map((genome) => {
                                const spec = parseSpec(genome.spec);
                                const modelLabel = spec?.preferredModel || spec?.modelId;
                                const meta = [
                                    genome.namespace || '@public',
                                    genome.category || 'agent',
                                    genome.status,
                                ].join(' · ');

                                return (
                                    <View
                                        key={genome.id}
                                        style={[
                                            styles.row,
                                            {
                                                borderColor: theme.colors.divider,
                                                backgroundColor: theme.colors.groupped.background,
                                            },
                                        ]}
                                    >
                                        <Avatar
                                            id={genome.id}
                                            size={52}
                                            flavor={spec?.runtimeType ?? undefined}
                                        />
                                        <View style={styles.copy}>
                                            <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={1}>
                                                {spec?.displayName || genome.name}
                                            </Text>
                                            <Text style={[styles.meta, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                                                {meta}
                                            </Text>
                                            <Text style={[styles.description, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                                                {spec?.description || genome.description || 'No description provided.'}
                                            </Text>
                                            <View style={styles.badgeRow}>
                                                {spec?.teamRole ? (
                                                    <View style={[styles.badge, { backgroundColor: theme.colors.surfaceHigh }]}>
                                                        <Text style={[styles.badgeText, { color: theme.colors.textSecondary }]}>
                                                            {spec.teamRole}
                                                        </Text>
                                                    </View>
                                                ) : null}
                                                {spec?.runtimeType ? (
                                                    <View style={[styles.badge, { backgroundColor: theme.colors.surfaceHigh }]}>
                                                        <Text style={[styles.badgeText, { color: theme.colors.textSecondary }]}>
                                                            {spec.runtimeType.toUpperCase()}
                                                        </Text>
                                                    </View>
                                                ) : null}
                                                {modelLabel ? (
                                                    <View style={[styles.badge, { backgroundColor: theme.colors.surfaceHigh }]}>
                                                        <Text style={[styles.badgeText, { color: theme.colors.textSecondary }]}>
                                                            {modelLabel}
                                                        </Text>
                                                    </View>
                                                ) : null}
                                            </View>
                                        </View>
                                        <Pressable
                                            onPress={() => setSelectedGenome(genome)}
                                            style={[styles.addButton, { backgroundColor: theme.colors.button.primary.background }]}
                                        >
                                            <Ionicons name="add" size={14} color={theme.colors.button.primary.tint} />
                                            <Text style={[styles.addButtonText, { color: theme.colors.button.primary.tint }]}>
                                                Add
                                            </Text>
                                        </Pressable>
                                    </View>
                                );
                            })}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {selectedGenome ? (
                <JoinTeamModal
                    genome={selectedGenome}
                    teamId={teamId}
                    teamName={teamName}
                    onClose={handleBackToLibrary}
                    onJoined={handleClose}
                />
            ) : null}
        </>
    );
});
