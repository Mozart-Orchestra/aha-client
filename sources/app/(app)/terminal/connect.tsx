import React, { useState, useEffect } from 'react';
import { View, Platform } from 'react-native';
import { Text } from '@/components/StyledText';
import { type Href, useRouter } from 'expo-router';
import { Typography } from '@/constants/Typography';
import { RoundButton } from '@/components/RoundButton';
import { useConnectTerminal } from '@/hooks/useConnectTerminal';
import { Ionicons } from '@expo/vector-icons';
import { ItemList } from '@/components/ItemList';
import { ItemGroup } from '@/components/ItemGroup';
import { Item } from '@/components/Item';
import { t } from '@/text';
import { getServerUrl, setServerUrl, validateServerUrl } from '@/sync/serverConfig';
import { useAuth } from '@/auth/AuthContext';

interface PendingTerminalConnectRequest {
    publicKey: string;
    nextPath: string | null;
    machineId: string | null;
    serverUrl: string | null;
    autoApprove: boolean;
}

const PENDING_TERMINAL_CONNECT_REQUEST_KEY = 'pending-terminal-connect-request';

export default function TerminalConnectScreen() {
    const router = useRouter();
    const auth = useAuth();
    const [publicKey, setPublicKey] = useState<string | null>(null);
    const [hashProcessed, setHashProcessed] = useState(false);
    const [awaitingRedirect, setAwaitingRedirect] = useState(false);
    const [nextPath, setNextPath] = useState<string | null>(null);
    const [targetMachineId, setTargetMachineId] = useState<string | null>(null);
    const [requestedServerUrl, setRequestedServerUrl] = useState<string | null>(null);
    const [shouldAutoApprove, setShouldAutoApprove] = useState(false);
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

        router.replace(nextHref as Href);
    }, [awaitingRedirect, nextHref, router]);

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
                
                // Clear the hash from URL to prevent exposure in browser history
                window.history.replaceState(null, '', window.location.pathname + window.location.search);
                setHashProcessed(true);
            } else if (pendingRequest) {
                clearPendingTerminalConnectRequest();
                setPublicKey(pendingRequest.publicKey);
                setNextPath(pendingRequest.nextPath);
                setTargetMachineId(pendingRequest.machineId);
                setRequestedServerUrl(pendingRequest.serverUrl);
                setShouldAutoApprove(pendingRequest.autoApprove);
                setHashProcessed(true);
            } else {
                setHashProcessed(true);
            }
        }
    }, [hashProcessed]);

    const handleConnect = React.useCallback(async () => {
        if (publicKey) {
            const currentServerUrl = normalizeComparableServerUrl(getServerUrl());
            const nextServerUrl = normalizeComparableServerUrl(requestedServerUrl);

            if (nextServerUrl && nextServerUrl !== currentServerUrl) {
                setServerUrl(nextServerUrl);

                if (auth.credentials) {
                    persistPendingTerminalConnectRequest({
                        publicKey,
                        nextPath,
                        machineId: targetMachineId,
                        serverUrl: nextServerUrl,
                        autoApprove: true
                    });
                    await auth.logout();
                    return;
                }
            }

            // Convert the hash key format to the expected happy:// URL format
            const authUrl = `happy://terminal?${publicKey}`;
            await processAuthUrl(authUrl);
        }
    }, [auth, nextPath, processAuthUrl, publicKey, requestedServerUrl, targetMachineId]);

    useEffect(() => {
        if (!shouldAutoApprove || !publicKey || isLoading) {
            return;
        }

        setShouldAutoApprove(false);
        void handleConnect();
    }, [handleConnect, isLoading, publicKey, shouldAutoApprove]);

    const handleReject = () => {
        router.back();
    };

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
                        <Ionicons 
                            name="laptop-outline" 
                            size={64} 
                            color="#8E8E93" 
                            style={{ marginBottom: 16 }} 
                        />
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

    // Show loading state while processing hash
    if (!hashProcessed) {
        return (
            <ItemList>
                <ItemGroup>
                    <View style={{ 
                        alignItems: 'center',
                        paddingVertical: 32,
                        paddingHorizontal: 16
                    }}>
                        <Text style={{ ...Typography.default(), color: '#666' }}>
                            {t('terminal.processingConnection')}
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
                        <Ionicons 
                            name="warning-outline" 
                            size={48} 
                            color="#FF3B30" 
                            style={{ marginBottom: 16 }} 
                        />
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

    // Show confirmation screen for valid connection
    return (
        <ItemList>
            {/* Connection Request Header */}
            <ItemGroup>
                <View style={{ 
                    alignItems: 'center',
                    paddingVertical: 24,
                    paddingHorizontal: 16
                }}>
                    <Ionicons 
                        name="terminal-outline" 
                        size={48} 
                        color="#007AFF" 
                        style={{ marginBottom: 16 }} 
                    />
                    <Text style={{ 
                        ...Typography.default('semiBold'), 
                        fontSize: 20, 
                        textAlign: 'center',
                        marginBottom: 12
                    }}>
                        {t('terminal.connectTerminal')}
                    </Text>
                    <Text style={{ 
                        ...Typography.default(), 
                        fontSize: 14, 
                        color: '#666', 
                        textAlign: 'center',
                        lineHeight: 20 
                    }}>
                        {t('terminal.terminalRequestDescription')}
                    </Text>
                </View>
            </ItemGroup>

            {/* Connection Details */}
            <ItemGroup title={t('terminal.connectionDetails')}>
                <Item
                    title={t('terminal.publicKey')}
                    detail={`${publicKey.substring(0, 12)}...`}
                    icon={<Ionicons name="key-outline" size={29} color="#007AFF" />}
                    showChevron={false}
                />
                <Item
                    title={t('terminal.encryption')}
                    detail={t('terminal.endToEndEncrypted')}
                    icon={<Ionicons name="lock-closed-outline" size={29} color="#34C759" />}
                    showChevron={false}
                />
            </ItemGroup>

            {/* Action Buttons */}
            <ItemGroup>
                <View style={{ 
                    paddingHorizontal: 16,
                    paddingVertical: 16,
                    gap: 12 
                }}>
                    <RoundButton
                        title={isLoading ? t('terminal.connecting') : t('terminal.acceptConnection')}
                        onPress={handleConnect}
                        size="large"
                        disabled={isLoading}
                        loading={isLoading}
                    />
                    <RoundButton
                        title={t('terminal.reject')}
                        onPress={handleReject}
                        size="large"
                        display="inverted"
                        disabled={isLoading}
                    />
                </View>
            </ItemGroup>

            {/* Security Notice */}
            <ItemGroup 
                title={t('terminal.security')}
                footer={t('terminal.securityFooter')}
            >
                <Item
                    title={t('terminal.clientSideProcessing')}
                    subtitle={t('terminal.linkProcessedLocally')}
                    icon={<Ionicons name="shield-checkmark-outline" size={29} color="#34C759" />}
                    showChevron={false}
                />
            </ItemGroup>
        </ItemList>
    );
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

function readPendingTerminalConnectRequest(): PendingTerminalConnectRequest | null {
    if (typeof window === 'undefined') {
        return null;
    }

    const raw = window.sessionStorage.getItem(PENDING_TERMINAL_CONNECT_REQUEST_KEY);
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
            autoApprove: parsed.autoApprove === true
        };
    } catch {
        return null;
    }
}

function persistPendingTerminalConnectRequest(request: PendingTerminalConnectRequest): void {
    if (typeof window === 'undefined') {
        return;
    }

    window.sessionStorage.setItem(PENDING_TERMINAL_CONNECT_REQUEST_KEY, JSON.stringify(request));
}

function clearPendingTerminalConnectRequest(): void {
    if (typeof window === 'undefined') {
        return;
    }

    window.sessionStorage.removeItem(PENDING_TERMINAL_CONNECT_REQUEST_KEY);
}
