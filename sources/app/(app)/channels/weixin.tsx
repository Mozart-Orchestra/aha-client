import React from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/auth/AuthContext';
import { Text } from '@/components/ui/StyledText';
import { QRCode } from '@/components/qr';
import { Item } from '@/components/ui/Item';
import { ItemGroup } from '@/components/ui/ItemGroup';
import { ItemList } from '@/components/ui/ItemList';
import { SidebarView } from '@/components/layout/SidebarView';
import { Modal } from '@/modal';
import { getCurrentLanguage, t } from '@/text';
import { getServerUrl } from '@/sync/serverConfig';
import { useUnistyles } from 'react-native-unistyles';

type PushPolicy = 'all' | 'important' | 'silent';

interface WeixinChannelStatus {
    connected: boolean;
    pushPolicy: PushPolicy;
    boundAt?: boolean;
}

interface WeixinQrSession {
    qrcode: string;
    displayUrl: string;
}

interface WeixinPollResult {
    status: 'wait' | 'scaned' | 'confirmed' | 'expired' | string;
    token?: string;
    baseUrl?: string;
    weixinUserId?: string;
    accountId?: string;
    error?: string;
}

const POLL_RETRY_MS = 1500;

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export default React.memo(function WeixinChannelScreen() {
    const auth = useAuth();
    const { theme } = useUnistyles();
    const isChinese = getCurrentLanguage() === 'zh-Hans';
    const serverUrl = getServerUrl();

    const [status, setStatus] = React.useState<WeixinChannelStatus | null | undefined>(undefined);
    const [isRefreshingStatus, setIsRefreshingStatus] = React.useState(false);
    const [qrSession, setQrSession] = React.useState<WeixinQrSession | null>(null);
    const [qrState, setQrState] = React.useState<'idle' | 'requesting' | 'waiting' | 'scaned' | 'binding'>('idle');
    const [isDisconnecting, setIsDisconnecting] = React.useState(false);
    const [pendingPolicy, setPendingPolicy] = React.useState<PushPolicy | null>(null);

    const showError = React.useCallback((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        Modal.alert(isChinese ? '错误' : 'Error', message);
    }, [isChinese]);

    const requestJson = React.useCallback(async <T,>(path: string, init?: RequestInit): Promise<T> => {
        if (!auth.credentials?.token) {
            throw new Error(isChinese ? '请先登录 Aha 账户。' : 'Please sign in to Aha first.');
        }

        const response = await fetch(`${serverUrl}${path}`, {
            ...init,
            headers: {
                Authorization: `Bearer ${auth.credentials.token}`,
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            const errorMessage = typeof data?.error === 'string'
                ? data.error
                : `${response.status} ${response.statusText}`;
            throw new Error(errorMessage);
        }

        return data as T;
    }, [auth.credentials?.token, isChinese, serverUrl]);

    const refreshStatus = React.useCallback(async (silent = false) => {
        if (!auth.credentials?.token) {
            setStatus(null);
            return;
        }

        setIsRefreshingStatus(true);
        try {
            const response = await requestJson<{ weixin: WeixinChannelStatus | null }>('/v1/channels/status', {
                method: 'GET',
            });
            setStatus(response.weixin);
        } catch (error) {
            if (!silent) {
                showError(error);
            }
        } finally {
            setIsRefreshingStatus(false);
        }
    }, [auth.credentials?.token, requestJson, showError]);

    React.useEffect(() => {
        void refreshStatus(true);
    }, [refreshStatus]);

    const handleConnect = React.useCallback(async () => {
        setQrState('requesting');
        try {
            const nextQr = await requestJson<WeixinQrSession>('/v1/channels/weixin/qr', {
                method: 'POST',
            });
            setQrSession(nextQr);
            setQrState('waiting');
        } catch (error) {
            setQrState('idle');
            showError(error);
        }
    }, [requestJson, showError]);

    React.useEffect(() => {
        if (!qrSession) {
            return;
        }

        let cancelled = false;

        const pollUntilBound = async () => {
            while (!cancelled) {
                const result = await requestJson<WeixinPollResult>('/v1/channels/weixin/poll', {
                    method: 'POST',
                    body: JSON.stringify({ qrcode: qrSession.qrcode }),
                });

                if (cancelled) {
                    return;
                }

                if (result.status === 'scaned') {
                    setQrState('scaned');
                    await sleep(POLL_RETRY_MS);
                    continue;
                }

                if (result.status === 'expired') {
                    const nextQr = await requestJson<WeixinQrSession>('/v1/channels/weixin/qr', {
                        method: 'POST',
                    });
                    if (!cancelled) {
                        setQrSession(nextQr);
                        setQrState('waiting');
                    }
                    return;
                }

                if (result.status === 'confirmed') {
                    if (!result.token || !result.baseUrl) {
                        throw new Error(
                            isChinese
                                ? '服务端未返回微信绑定凭据。'
                                : 'The server did not return WeChat binding credentials.',
                        );
                    }

                    setQrState('binding');
                    await requestJson<{ ok: boolean }>('/v1/channels/weixin/bind', {
                        method: 'POST',
                        body: JSON.stringify({
                            token: result.token,
                            baseUrl: result.baseUrl,
                            weixinUserId: result.weixinUserId,
                            accountId: result.accountId,
                        }),
                    });

                    if (cancelled) {
                        return;
                    }

                    setQrSession(null);
                    setQrState('idle');
                    await refreshStatus(true);

                    Modal.alert(
                        isChinese ? '已连接' : 'Connected',
                        isChinese
                            ? '微信已连接，后续 Agent 消息会通过 server 端桥接发送。'
                            : 'WeChat is connected. Agent messages will now be delivered through the server bridge.',
                    );
                    return;
                }

                setQrState('waiting');
                await sleep(POLL_RETRY_MS);
            }
        };

        void pollUntilBound().catch((error) => {
            if (cancelled) {
                return;
            }
            setQrSession(null);
            setQrState('idle');
            showError(error);
        });

        return () => {
            cancelled = true;
        };
    }, [isChinese, qrSession, refreshStatus, requestJson, showError]);

    const handleDisconnect = React.useCallback(async () => {
        setIsDisconnecting(true);
        try {
            await requestJson<{ ok: boolean }>('/v1/channels/weixin', {
                method: 'DELETE',
            });
            setQrSession(null);
            setQrState('idle');
            await refreshStatus(true);
        } catch (error) {
            showError(error);
        } finally {
            setIsDisconnecting(false);
        }
    }, [refreshStatus, requestJson, showError]);

    const handlePolicyChange = React.useCallback(async (pushPolicy: PushPolicy) => {
        setPendingPolicy(pushPolicy);
        try {
            await requestJson<{ ok: boolean }>('/v1/channels/weixin/policy', {
                method: 'PATCH',
                body: JSON.stringify({ pushPolicy }),
            });
            await refreshStatus(true);
        } catch (error) {
            showError(error);
        } finally {
            setPendingPolicy(null);
        }
    }, [refreshStatus, requestJson, showError]);

    const statusLabel = status === undefined
        ? (isChinese ? '读取中…' : 'Loading...')
        : status?.connected
            ? (isChinese ? '已连接' : 'Connected')
            : status
                ? (isChinese ? '已绑定，桥接未激活' : 'Bound, bridge inactive')
                : (isChinese ? '未连接' : 'Not connected');

    const qrDescription = qrState === 'scaned'
        ? (isChinese ? '已扫码，请在微信里确认登录。' : 'QR scanned. Confirm the login inside WeChat.')
        : qrState === 'binding'
            ? (isChinese ? '正在由 server 校验并绑定微信…' : 'The server is validating and binding WeChat...')
            : (isChinese
                ? '请用微信 iOS 8.0.70+，在 我 -> 设置 -> 插件 -> ClawBot 中扫码。'
                : 'Use WeChat iOS 8.0.70+ and scan with Me -> Settings -> Plugins -> ClawBot.');

    const mainPanel = (
        <ItemList style={{ paddingTop: 0 }}>
            <ItemGroup
                title={t('settings.channelsWeixin')}
                footer={isChinese
                    ? '在当前页面完成扫码和验证，整个流程由 kanban server 端处理。'
                    : 'Complete the QR flow in this page. Validation and binding are handled by the kanban server.'}
            >
                <Item
                    title={t('channels.checkStatus')}
                    detail={statusLabel}
                    icon={<Ionicons name="radio-outline" size={29} color="#007AFF" />}
                    loading={isRefreshingStatus}
                    onPress={() => { void refreshStatus(); }}
                />
                <Item
                    title={t('channels.connectWeixin')}
                    subtitle={isChinese ? '在页面内生成二维码并扫码连接' : 'Generate a QR code in the page and scan to connect'}
                    icon={<Ionicons name="qr-code-outline" size={29} color="#09B83E" />}
                    loading={qrState === 'requesting' || qrState === 'binding'}
                    onPress={() => { void handleConnect(); }}
                />
                <Item
                    title={t('common.disconnect')}
                    subtitle={isChinese ? '断开当前微信桥接' : 'Disconnect the current WeChat bridge'}
                    icon={<Ionicons name="close-circle-outline" size={29} color="#FF3B30" />}
                    loading={isDisconnecting}
                    disabled={!status}
                    onPress={() => { void handleDisconnect(); }}
                />
                {qrSession ? (
                    <React.Fragment>
                        <View
                            style={{
                                alignItems: 'center',
                                paddingHorizontal: 20,
                                paddingTop: 20,
                                paddingBottom: 24,
                                backgroundColor: theme.colors.surface,
                            }}
                        >
                            <View
                                style={{
                                    padding: 14,
                                    borderRadius: 20,
                                    backgroundColor: '#FFFFFF',
                                    borderWidth: 1,
                                    borderColor: theme.colors.divider,
                                    marginBottom: 16,
                                }}
                            >
                                <QRCode data={qrSession.displayUrl} size={220} />
                            </View>
                            <Text style={{ textAlign: 'center', color: theme.colors.text, marginBottom: 8 }}>
                                {qrDescription}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <ActivityIndicator size="small" color={theme.colors.textSecondary} />
                                <Text style={{ color: theme.colors.textSecondary }}>
                                    {isChinese ? '二维码会自动刷新，无需手动重试。' : 'The QR code refreshes automatically when it expires.'}
                                </Text>
                            </View>
                            <Pressable onPress={() => setQrSession(null)} style={{ marginTop: 14 }}>
                                <Text style={{ color: '#007AFF' }}>
                                    {isChinese ? '取消本次扫码' : 'Cancel this QR session'}
                                </Text>
                            </Pressable>
                        </View>
                    </React.Fragment>
                ) : null}
            </ItemGroup>

            <ItemGroup title={t('channels.pushPolicyTitle')} footer={t('channels.pushPolicyFooter')}>
                <Item
                    title={t('channels.policyAll')}
                    subtitle={isChinese ? '推送所有 Agent 消息' : 'Push every Agent message'}
                    icon={<Ionicons name="notifications-outline" size={29} color={theme.colors.textSecondary} />}
                    selected={status?.pushPolicy === 'all'}
                    loading={pendingPolicy === 'all'}
                    disabled={!status}
                    onPress={() => { void handlePolicyChange('all'); }}
                />
                <Item
                    title={t('channels.policyImportant')}
                    subtitle={isChinese ? '仅推送任务完成、失败和求助' : 'Only push completion, failure, and help-needed events'}
                    icon={<Ionicons name="notifications-off-outline" size={29} color={theme.colors.textSecondary} />}
                    selected={status?.pushPolicy === 'important'}
                    loading={pendingPolicy === 'important'}
                    disabled={!status}
                    onPress={() => { void handlePolicyChange('important'); }}
                />
                <Item
                    title={isChinese ? '静默' : 'Silent'}
                    subtitle={isChinese ? '停止所有微信推送' : 'Stop all WeChat pushes'}
                    icon={<Ionicons name="volume-mute-outline" size={29} color={theme.colors.textSecondary} />}
                    selected={status?.pushPolicy === 'silent'}
                    loading={pendingPolicy === 'silent'}
                    disabled={!status}
                    onPress={() => { void handlePolicyChange('silent'); }}
                />
            </ItemGroup>

            <ItemGroup title={t('channels.usageGuide')}>
                <Item title={t('channels.guide1')} icon={<Ionicons name="arrow-forward-circle-outline" size={22} color={theme.colors.textSecondary} />} />
                <Item title={t('channels.guide2')} icon={<Ionicons name="at-outline" size={22} color={theme.colors.textSecondary} />} />
                <Item title={t('channels.guide3')} icon={<Ionicons name="pricetag-outline" size={22} color={theme.colors.textSecondary} />} />
            </ItemGroup>
        </ItemList>
    );

    return <SidebarView mainPanel={mainPanel} />;
});
