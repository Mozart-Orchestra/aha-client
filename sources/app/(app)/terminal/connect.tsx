import React, { useState, useEffect } from 'react';
import { View, Platform, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/StyledText';
import { type Href, useRouter } from 'expo-router';
import { Typography } from '@/constants/Typography';
import { useConnectTerminal } from '@/hooks/useConnectTerminal';
import { ItemList } from '@/components/ui/ItemList';
import { ItemGroup } from '@/components/ui/ItemGroup';
import { t } from '@/text';
import {
    clearPendingTerminalConnectRequestStorage,
    persistPendingTerminalConnectRequestStorage,
    readPendingTerminalConnectRequestStorage
} from '@/auth/pendingTerminalConnect';
import { getServerUrl, setServerUrl, validateServerUrl } from '@/sync/serverConfig';
import { useAuth } from '@/auth/AuthContext';
import { useIsDataReady, useMachine } from '@/sync/storage';
import { isMachineOnline } from '@/utils/machineUtils';
import { buildTerminalConnectUrl } from '@/auth/deepLinkSchemes';

type AuthMode = 'auto' | 'create' | 'reconnect';

interface PendingTerminalConnectRequest {
    publicKey: string;
    nextPath: string | null;
    machineId: string | null;
    serverUrl: string | null;
    autoApprove: boolean;
    authMode: AuthMode;
}

export default function TerminalConnectScreen() {
    const router = useRouter();
    const auth = useAuth();
    const isDataReady = useIsDataReady();
    const [publicKey, setPublicKey] = useState<string | null>(null);
    const [hashProcessed, setHashProcessed] = useState(false);
    const [awaitingRedirect, setAwaitingRedirect] = useState(false);
    const [nextPath, setNextPath] = useState<string | null>(null);
    const [targetMachineId, setTargetMachineId] = useState<string | null>(null);
    const [requestedServerUrl, setRequestedServerUrl] = useState<string | null>(null);
    const [autoConnectTriggered, setAutoConnectTriggered] = useState(false);
    const [authMode, setAuthMode] = useState<AuthMode>('auto');
    const targetMachine = useMachine(targetMachineId ?? '');
    const shouldAwaitMachine = !!targetMachineId && !!nextPath?.startsWith('/teams/new');
    const targetMachineReady = React.useMemo(() => (
        shouldAwaitMachine ? !!targetMachine && isMachineOnline(targetMachine) : true
    ), [shouldAwaitMachine, targetMachine]);
    const nextHref = React.useMemo(() => {
        if (!nextPath) {
            return null;
        }

        if (!targetMachineId || !nextPath.startsWith('/teams/new')) {
            return nextPath;
        }

        const url = new URL(nextPath, 'http://localhost');
        url.searchParams.set('machineId', targetMachineId);
        return `${url.pathname}${url.search}`;
    }, [nextPath, targetMachineId]);

    const persistCurrentPendingRequest = React.useCallback(() => {
        if (!publicKey) {
            return;
        }

        persistPendingTerminalConnectRequest({
            publicKey,
            nextPath,
            machineId: targetMachineId,
            serverUrl: requestedServerUrl,
            autoApprove: true,
            authMode
        });
    }, [authMode, nextPath, publicKey, requestedServerUrl, targetMachineId]);

    const applyRequestedServerUrlIfNeeded = React.useCallback(() => {
        const currentServerUrl = normalizeComparableServerUrl(getServerUrl());
        const nextServerUrl = normalizeComparableServerUrl(requestedServerUrl);
        const nextServerUrlRewritten = nextServerUrl
            ? normalizeComparableServerUrl(rewriteUrlToPageHost(nextServerUrl))
            : null;

        const serverUrlChanged =
            nextServerUrl &&
            nextServerUrl !== currentServerUrl &&
            nextServerUrlRewritten !== currentServerUrl;

        if (serverUrlChanged) {
            setServerUrl(nextServerUrl);
        }

        return { nextServerUrl, serverUrlChanged };
    }, [requestedServerUrl]);

    const { processAuthUrl, isLoading } = useConnectTerminal({
        onSuccess: () => {
            if (!nextHref) {
                router.back();
                return;
            }

            setAwaitingRedirect(true);
        },
        showSuccessModal: false
    });

    useEffect(() => {
        if (!awaitingRedirect || !nextHref) {
            return;
        }

        if (shouldAwaitMachine) {
            if (!isDataReady || !targetMachineReady) {
                return;
            }
        }

        router.replace(nextHref as Href);
    }, [awaitingRedirect, isDataReady, nextHref, router, shouldAwaitMachine, targetMachineReady]);

    // Extract key from hash on web platform
    useEffect(() => {
        if (Platform.OS === 'web' && typeof window !== 'undefined' && !hashProcessed) {
            const hash = window.location.hash;
            const normalizedHash = normalizeHashParams(hash);
            const params = normalizedHash ? new URLSearchParams(normalizedHash) : null;
            const key = params ? normalizeSingleValue(params.get('key') ?? undefined) : null;
            const pendingRequest = !key ? readPendingTerminalConnectRequest() : null;

            if (key) {
                setPublicKey(key);
                setNextPath(normalizeNextPath(params?.get('next') ?? undefined));
                setTargetMachineId(normalizeSingleValue(params?.get('machineId') ?? undefined));
                setRequestedServerUrl(normalizeServerUrl(params?.get('serverUrl') ?? undefined));
                setAuthMode(normalizeAuthMode(params?.get('mode') ?? undefined));
                
                // Clear the hash from URL to prevent exposure in browser history
                window.history.replaceState(null, '', window.location.pathname + window.location.search);
                setHashProcessed(true);
            } else if (pendingRequest) {
                clearPendingTerminalConnectRequest();
                setPublicKey(pendingRequest.publicKey);
                setNextPath(pendingRequest.nextPath);
                setTargetMachineId(pendingRequest.machineId);
                setRequestedServerUrl(pendingRequest.serverUrl);
                setAuthMode(pendingRequest.authMode);
                setHashProcessed(true);
            } else {
                setHashProcessed(true);
            }
        }
    }, [hashProcessed]);

    const handleConnect = React.useCallback(async () => {
        if (publicKey) {
            const { nextServerUrl, serverUrlChanged } = applyRequestedServerUrlIfNeeded();

            if (auth.credentials && (serverUrlChanged || authMode === 'create')) {
                persistPendingTerminalConnectRequest({
                    publicKey,
                    nextPath,
                    machineId: targetMachineId,
                    serverUrl: nextServerUrl ?? requestedServerUrl,
                    autoApprove: true,
                    authMode
                });
                await auth.logout();
                return;
            }

            if (serverUrlChanged) {
                // The auth.credentials branch above has already handled logout/reload.
            }

            if (!auth.credentials && authMode === 'reconnect') {
                persistCurrentPendingRequest();
                router.replace('/restore' as Href);
                return;
            }

            const authUrl = buildTerminalConnectUrl(publicKey);
            await processAuthUrl(authUrl);
        }
    }, [applyRequestedServerUrlIfNeeded, auth, authMode, nextPath, persistCurrentPendingRequest, processAuthUrl, publicKey, router, targetMachineId]);

    // Auto-connect as soon as publicKey is available after hash processing
    useEffect(() => {
        if (!hashProcessed || !publicKey || isLoading || autoConnectTriggered) {
            return;
        }

        setAutoConnectTriggered(true);
        void handleConnect();
    }, [handleConnect, hashProcessed, isLoading, publicKey, autoConnectTriggered]);

    // Show placeholder for mobile platforms
    if (Platform.OS !== 'web') {
        return (
            <ItemList>
                <ItemGroup>
                    <View style={{
                        alignItems: 'center',
                        paddingVertical: 32,
                        paddingHorizontal: 16
                    }}>
                        <Text style={{
                            ...Typography.default('semiBold'),
                            fontSize: 18,
                            textAlign: 'center',
                            marginBottom: 12
                        }}>
                            {t('terminal.webBrowserRequired')}
                        </Text>
                        <Text style={{
                            ...Typography.default(),
                            fontSize: 14,
                            color: '#666',
                            textAlign: 'center',
                            lineHeight: 20
                        }}>
                            {t('terminal.webBrowserRequiredDescription')}
                        </Text>
                    </View>
                </ItemGroup>
            </ItemList>
        );
    }

    // Show loading state while processing hash or auto-connecting
    if (!hashProcessed || (publicKey && (!awaitingRedirect || (shouldAwaitMachine && !targetMachineReady)))) {
        const statusMessage = awaitingRedirect && shouldAwaitMachine
            ? 'Waiting for the selected machine to come online...'
            : t('terminal.processingConnection');
        return (
            <ItemList>
                <ItemGroup>
                    <View style={{
                        alignItems: 'center',
                        paddingVertical: 32,
                        paddingHorizontal: 16
                    }}>
                        <ActivityIndicator size="large" style={{ marginBottom: 16 }} />
                        <Text style={{ ...Typography.default(), color: '#666' }}>
                            {statusMessage}
                        </Text>
                    </View>
                </ItemGroup>
            </ItemList>
        );
    }

    // Show error if no key found
    if (!publicKey) {
        return (
            <ItemList>
                <ItemGroup>
                    <View style={{
                        alignItems: 'center',
                        paddingVertical: 32,
                        paddingHorizontal: 16
                    }}>
                        <Text style={{
                            ...Typography.default('semiBold'),
                            fontSize: 16,
                            color: '#FF3B30',
                            textAlign: 'center',
                            marginBottom: 8
                        }}>
                            {t('terminal.invalidConnectionLink')}
                        </Text>
                        <Text style={{
                            ...Typography.default(),
                            fontSize: 14,
                            color: '#666',
                            textAlign: 'center',
                            lineHeight: 20
                        }}>
                            {t('terminal.invalidConnectionLinkDescription')}
                        </Text>
                    </View>
                </ItemGroup>
            </ItemList>
        );
    }

    return null;
}

function normalizeSingleValue(value: string | string[] | undefined): string | null {
    if (Array.isArray(value)) {
        return value[0] ?? null;
    }
    return typeof value === 'string' && value.length > 0 ? value : null;
}

function normalizeNextPath(value: string | string[] | undefined): string | null {
    const nextPath = normalizeSingleValue(value);
    if (!nextPath) {
        return null;
    }

    if (!nextPath.startsWith('/') || nextPath.startsWith('//')) {
        return null;
    }

    return nextPath;
}

function normalizeHashParams(hash: string): string {
    const rawHash = hash.startsWith('#') ? hash.slice(1) : hash;
    if (!rawHash) {
        return '';
    }

    const querySeparatorIndex = rawHash.indexOf('?');
    if (querySeparatorIndex === -1) {
        return rawHash;
    }

    return `${rawHash.slice(0, querySeparatorIndex)}&${rawHash.slice(querySeparatorIndex + 1)}`;
}

function normalizeServerUrl(value: string | string[] | undefined): string | null {
    const serverUrl = normalizeSingleValue(value);
    if (!serverUrl) {
        return null;
    }

    if (!validateServerUrl(serverUrl).valid) {
        return null;
    }

    return serverUrl.trim();
}

function normalizeAuthMode(value: string | string[] | undefined): AuthMode {
    const authMode = normalizeSingleValue(value);
    if (authMode === 'create' || authMode === 'reconnect') {
        return authMode;
    }

    return 'auto';
}

function normalizeComparableServerUrl(serverUrl: string | null): string | null {
    if (!serverUrl) {
        return null;
    }

    try {
        const parsed = new URL(serverUrl);
        parsed.hash = '';
        parsed.search = '';
        return parsed.toString().replace(/\/$/, '');
    } catch {
        return serverUrl.trim().replace(/\/$/, '');
    }
}

/**
 * Rewrites a URL's localhost hostname to the current page's hostname.
 * Allows comparing stored localhost URLs against the rewritten LAN-IP version
 * so we avoid unnecessary server URL changes when the server is the same machine.
 */
function rewriteUrlToPageHost(url: string): string {
    if (typeof window === 'undefined') {
        return url;
    }

    const pageHost = window.location.hostname;
    if (pageHost === 'localhost' || pageHost === '127.0.0.1') {
        return url;
    }

    try {
        const parsed = new URL(url);
        if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
            parsed.hostname = pageHost;
            return parsed.toString().replace(/\/$/, '');
        }
    } catch {
        // fall through
    }

    return url;
}

function readPendingTerminalConnectRequest(): PendingTerminalConnectRequest | null {
    const raw = readPendingTerminalConnectRequestStorage();
    if (!raw) {
        return null;
    }

    try {
        const parsed = JSON.parse(raw) as PendingTerminalConnectRequest;
        if (!parsed.publicKey) {
            return null;
        }

        return {
            publicKey: parsed.publicKey,
            nextPath: normalizeNextPath(parsed.nextPath ?? undefined),
            machineId: normalizeSingleValue(parsed.machineId ?? undefined),
            serverUrl: normalizeServerUrl(parsed.serverUrl ?? undefined),
            autoApprove: parsed.autoApprove === true,
            authMode: normalizeAuthMode(parsed.authMode ?? undefined)
        };
    } catch {
        return null;
    }
}

function persistPendingTerminalConnectRequest(request: PendingTerminalConnectRequest): void {
    persistPendingTerminalConnectRequestStorage(JSON.stringify(request));
}

function clearPendingTerminalConnectRequest(): void {
    clearPendingTerminalConnectRequestStorage();
}
