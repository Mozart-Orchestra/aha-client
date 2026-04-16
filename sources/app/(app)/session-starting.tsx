/**
 * /session-starting placeholder route.
 *
 * Shown after the user taps "Start Session" while we're waiting for the
 * remote daemon to publish the real session id. Replaces the previous
 * "Session startup timed out" Modal with a progressive loading screen
 * that auto-navigates to /session/<id> when the matching session arrives.
 *
 * See plan: serene-whistling-seal.md (Phase 1).
 */
import * as React from 'react';
import { ActivityIndicator, Platform, Pressable, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';
import { Typography } from '@/constants/Typography';
import { storage, useAllMachines } from '@/sync/storage';
import { RoundButton } from '@/components/ui/RoundButton';
import { t } from '@/text';
import type { Session } from '@/sync/storageTypes';

const PROGRESS_THRESHOLDS = {
    connectingMs: 10_000,
    bootingMs: 30_000,
    takingLongerMs: 90_000,
    failureMs: 180_000,
} as const;

const MATCH_SUBMIT_TOLERANCE_MS = 2_000;

function getSingleParam(value: string | string[] | undefined): string | undefined {
    if (Array.isArray(value)) return value[0];
    return value;
}

function isMatchingSession(session: Session, params: { machineId: string; path: string; submittedAt: number }): boolean {
    if (!session.metadata) return false;
    if (session.metadata.machineId !== params.machineId) return false;
    if (session.metadata.path !== params.path) return false;
    if (session.createdAt < params.submittedAt - MATCH_SUBMIT_TOLERANCE_MS) return false;
    return true;
}

function pickBestMatch(
    sessions: Record<string, Session>,
    params: { machineId: string; path: string; submittedAt: number }
): Session | null {
    let best: Session | null = null;
    for (const id in sessions) {
        const s = sessions[id];
        if (!isMatchingSession(s, params)) continue;
        if (!best || s.createdAt > best.createdAt) {
            best = s;
        }
    }
    return best;
}

function useElapsedMs(startedAt: number): number {
    const [now, setNow] = React.useState(() => Date.now());
    React.useEffect(() => {
        const i = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(i);
    }, []);
    return Math.max(0, now - startedAt);
}

function progressiveStatusText(elapsedMs: number): string {
    if (elapsedMs < PROGRESS_THRESHOLDS.connectingMs) return t('sessionStarting.preparing');
    if (elapsedMs < PROGRESS_THRESHOLDS.bootingMs) return t('sessionStarting.connecting');
    if (elapsedMs < PROGRESS_THRESHOLDS.takingLongerMs) return t('sessionStarting.bootingAgent');
    return t('sessionStarting.takingLonger');
}

export default React.memo(function SessionStartingScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{
        machineId?: string;
        path?: string;
        t?: string;
        pendingId?: string;
    }>();

    const machineId = getSingleParam(params.machineId) || '';
    const path = getSingleParam(params.path) || '';
    const submittedAtRaw = getSingleParam(params.t);
    const pendingId = getSingleParam(params.pendingId) || '';
    const submittedAt = React.useMemo(() => {
        const parsed = submittedAtRaw ? parseInt(submittedAtRaw, 10) : NaN;
        return Number.isFinite(parsed) ? parsed : Date.now();
    }, [submittedAtRaw]);

    const sessions = storage(useShallow((state) => state.sessions));
    const machines = useAllMachines();
    const machineName = React.useMemo(() => {
        const m = machines.find((mch) => mch.id === machineId);
        return m?.metadata?.displayName || m?.metadata?.host || machineId;
    }, [machines, machineId]);

    const elapsedMs = useElapsedMs(submittedAt);
    const hasGivenUp = elapsedMs >= PROGRESS_THRESHOLDS.failureMs;

    // Watch for matching session and replace.
    React.useEffect(() => {
        if (!machineId || !path) return;
        const match = pickBestMatch(sessions, { machineId, path, submittedAt });
        if (match) {
            router.replace(`/session/${match.id}`, {
                dangerouslySingular() {
                    return 'session';
                },
            });
        }
    }, [sessions, machineId, path, submittedAt, router]);

    const handleCancel = React.useCallback(() => {
        // Cancel just leaves this screen — we do NOT stop the spawning session,
        // since it may still finish in the background and become useful.
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/');
        }
    }, [router]);

    const handleRetry = React.useCallback(() => {
        router.replace('/new');
    }, [router]);

    const handleOpenMachine = React.useCallback(() => {
        if (!machineId) return;
        router.replace(`/machine/${machineId}`);
    }, [router, machineId]);

    if (!machineId || !path) {
        // Shouldn't happen — bail to home.
        return (
            <View style={styles.container}>
                <Text style={styles.statusText}>{t('common.error')}</Text>
                <View style={styles.buttonRow}>
                    <RoundButton size="normal" title={t('common.back')} onPress={handleCancel} />
                </View>
            </View>
        );
    }

    if (hasGivenUp) {
        const failureText = machineName
            ? t('sessionStarting.failedActionable', { machineName })
            : t('sessionStarting.failedNoMachine');
        return (
            <View style={styles.container}>
                <Text style={styles.failureText}>{failureText}</Text>
                {pendingId ? (
                    <Text style={styles.diagnosticText}>{t('sessionStarting.debugDiagnosticId', { id: pendingId })}</Text>
                ) : null}
                <View style={styles.buttonRow}>
                    <RoundButton size="normal" title={t('sessionStarting.retry')} onPress={handleRetry} />
                    {machineId ? (
                        <RoundButton
                            size="normal"
                            display="inverted"
                            title={t('sessionStarting.openMachineDetails')}
                            onPress={handleOpenMachine}
                        />
                    ) : null}
                </View>
                <Pressable hitSlop={12} onPress={handleCancel} style={styles.cancelLink}>
                    <Text style={styles.cancelText}>{t('sessionStarting.cancel')}</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" />
            <Text style={styles.statusText}>{progressiveStatusText(elapsedMs)}</Text>
            {machineName ? <Text style={styles.machineText}>{machineName}</Text> : null}
            {pendingId ? (
                <Text style={styles.diagnosticText}>{t('sessionStarting.debugDiagnosticId', { id: pendingId })}</Text>
            ) : null}
            <Pressable hitSlop={12} onPress={handleCancel} style={styles.cancelLink}>
                <Text style={styles.cancelText}>{t('sessionStarting.cancel')}</Text>
            </Pressable>
        </View>
    );
});

const styles = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
        backgroundColor: theme.colors.surface,
        gap: 16,
    },
    statusText: {
        ...Typography.default('semiBold'),
        fontSize: 18,
        color: theme.colors.text,
        textAlign: 'center',
    },
    machineText: {
        ...Typography.default(),
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        opacity: 0.7,
    },
    diagnosticText: {
        ...Typography.mono(),
        fontSize: 11,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        opacity: 0.5,
        marginTop: 4,
    },
    failureText: {
        ...Typography.default(),
        fontSize: 16,
        color: theme.colors.text,
        textAlign: 'center',
        marginBottom: 8,
    },
    buttonRow: {
        flexDirection: Platform.OS === 'web' ? 'row' : 'column',
        gap: 12,
        alignItems: 'stretch',
        marginTop: 12,
    },
    cancelLink: {
        marginTop: 24,
        padding: 8,
    },
    cancelText: {
        ...Typography.default(),
        fontSize: 14,
        color: theme.colors.text,
        opacity: 0.6,
        textDecorationLine: 'underline',
    },
}));
