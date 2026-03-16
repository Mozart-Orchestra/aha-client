import * as React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useSessionUsage } from '@/sync/storage';

interface PreviewSessionCardProps {
    accentColor: string;
    backgroundColor: string;
    borderColor: string;
    title: string;
    subtitle: string;
    meta: string;
    sessionId?: string;
    children?: React.ReactNode;
}

function formatCompactNumber(value: number): string {
    if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
        return value >= 10000 ? `${Math.round(value / 1000)}K` : `${(value / 1000).toFixed(1)}K`;
    }
    return String(value);
}

export function PreviewSessionCard({
    accentColor,
    backgroundColor,
    borderColor,
    title,
    subtitle,
    meta,
    sessionId,
    children,
}: PreviewSessionCardProps) {
    const latestUsage = useSessionUsage(sessionId ?? '');
    const totalTokens = latestUsage
        ? latestUsage.inputTokens + latestUsage.outputTokens
        : 0;

    return (
        <View style={[styles.card, { backgroundColor, borderColor }]}>
            <View style={styles.cardTop}>
                <View style={[styles.statusDot, { backgroundColor: accentColor }]} />
                <View style={styles.info}>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.subtitle}>{subtitle}</Text>
                </View>
            </View>
            <View style={styles.metaRow}>
                <Text style={styles.meta}>{meta}</Text>
                {totalTokens > 0 ? (
                    <View style={styles.metaChip}>
                        <Ionicons name="flash-outline" size={11} color="#8A7F74" />
                        <Text style={styles.metaChipText}>{formatCompactNumber(totalTokens)} tok</Text>
                    </View>
                ) : null}
            </View>
            {children}
        </View>
    );
}

const styles = StyleSheet.create(() => ({
    card: {
        borderRadius: 14,
        borderWidth: 1.5,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginTop: 12,
    },
    cardTop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginTop: 4,
    },
    info: {
        flex: 1,
        minWidth: 0,
    },
    title: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1A1209',
    },
    subtitle: {
        marginTop: 4,
        fontSize: 12,
        lineHeight: 18,
        color: '#8A7F74',
    },
    metaRow: {
        marginTop: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    meta: {
        flex: 1,
        minWidth: 0,
        fontSize: 11,
        color: '#A09487',
    },
    metaChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: '#FFFFFFB3',
        borderWidth: 1,
        borderColor: '#F0E5D9',
    },
    metaChipText: {
        fontSize: 11,
        fontWeight: '500',
        color: '#8A7F74',
    },
}));
