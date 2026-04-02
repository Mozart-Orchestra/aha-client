import React, { memo } from 'react';
import { View, Text, Pressable, Platform, useWindowDimensions } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '@/auth/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { ItemList } from '@/components/ui/ItemList';
import { ItemGroup } from '@/components/ui/ItemGroup';
import { Item } from '@/components/ui/Item';
import { Typography } from '@/constants/Typography';
import { Modal } from '@/modal';
import { useConnectAccount } from '@/hooks/useConnectAccount';
import { SidebarView } from '@/components/layout/SidebarView';
import { DESKTOP_BREAKPOINT } from '@/navigation/navigationConfig';
import { useEscapeAction } from '@/hooks/useEscapeAction';
import { goBackOrReturn } from '@/utils/returnNavigation';
import { t } from '@/text';
import { layout } from '@/utils/layout';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { formatJoinTicketTimeRemaining, useAccountJoinCommand } from '@/auth/useAccountJoinCommand';

export default memo(function Restore() {
    const { theme } = useUnistyles();
    const styles = stylesheet;
    const auth = useAuth();
    const router = useRouter();
    const { width: windowWidth } = useWindowDimensions();
    const isDesktopShell = Platform.OS === 'web' && windowWidth >= DESKTOP_BREAKPOINT;
    const { connectWithUrl, isLoading: isConnecting } = useConnectAccount();
    const [copiedCommandRecently, setCopiedCommandRecently] = React.useState(false);
    const {
        ensureFreshJoinCommand,
        hasRefreshError,
        isExpired,
        isRefreshing,
        primaryCommand,
        refreshJoinCommand,
        secondsRemaining,
    } = useAccountJoinCommand(auth.credentials?.token);
    const displayedJoinCommand = primaryCommand || (isRefreshing ? t('common.loading') : hasRefreshError ? t('common.error') : t('common.loading'));
    const joinCommandStatus = React.useMemo(() => {
        if (isRefreshing) {
            return t('common.loading');
        }
        if (!primaryCommand && hasRefreshError) {
            return t('common.error');
        }
        if (secondsRemaining === null) {
            return null;
        }
        if (isExpired) {
            return t('home.joinCommandExpired');
        }
        return t('home.joinCommandExpiresIn', {
            time: formatJoinTicketTimeRemaining(secondsRemaining),
        });
    }, [hasRefreshError, isExpired, isRefreshing, primaryCommand, secondsRemaining]);

    const handleCopyCommand = async () => {
        try {
            const commandToCopy = await ensureFreshJoinCommand();
            await Clipboard.setStringAsync(commandToCopy);
            setCopiedCommandRecently(true);
            setTimeout(() => setCopiedCommandRecently(false), 2000);
            Modal.alert(t('home.onboarding.commandCopiedTitle'), t('home.onboarding.commandCopiedMessage'));
        } catch {
            Modal.alert(t('common.error'), t('home.addDeviceHint'));
        }
    };

    const handleEnterUrlManually = async () => {
        const url = await Modal.prompt(
            t('home.addDeviceTitle'),
            undefined,
            {
                placeholder: 'happy:///account?...',
                cancelText: t('common.cancel'),
                confirmText: t('common.authenticate'),
            }
        );

        if (url?.trim()) {
            await connectWithUrl(url.trim());
        }
    };

    const handleExitRestore = React.useCallback(() => {
        goBackOrReturn(router, undefined, '/settings');
    }, [router]);

    useEscapeAction(isDesktopShell, handleExitRestore);

    const content = (
        <ItemList
            style={styles.page}
            containerStyle={[
                styles.contentContainer,
                { maxWidth: Math.min(layout.maxWidth, 880), alignSelf: 'center', width: '100%' },
            ]}
        >
            <View style={styles.hero}>
                <Text style={styles.eyebrow}>{t('home.devicesSection')}</Text>
                <Text style={styles.title}>{t('home.addDeviceTitle')}</Text>
                <Text style={styles.subtitle}>{t('settings.syncDeviceSubtitle')}</Text>
            </View>

            <ItemGroup footer={t('home.addDeviceHint')}>
                <Pressable onPress={handleCopyCommand}>
                    <View style={[styles.secretKeyContainer, { maxWidth: layout.maxWidth }]}>
                        <View style={styles.secretKeyHeader}>
                            <Text style={styles.secretKeyLabel}>{t('home.addDeviceTitle')}</Text>
                            <Ionicons
                                name={copiedCommandRecently ? 'checkmark-circle' : 'copy-outline'}
                                size={18}
                                color={copiedCommandRecently ? '#34C759' : theme.colors.textSecondary}
                            />
                        </View>
                        <Text style={styles.secretKeyText}>
                            {displayedJoinCommand}
                        </Text>
                        {joinCommandStatus ? (
                            <View style={styles.commandStatusRow}>
                                <Text style={styles.commandStatusText}>{joinCommandStatus}</Text>
                                {isExpired || (!primaryCommand && hasRefreshError) ? (
                                    <Pressable onPress={() => { void refreshJoinCommand(); }}>
                                        <Text style={styles.commandStatusAction}>
                                            {isRefreshing ? t('common.loading') : t('common.retry')}
                                        </Text>
                                    </Pressable>
                                ) : null}
                            </View>
                        ) : null}
                    </View>
                </Pressable>
            </ItemGroup>

            <ItemGroup footer={t('settings.syncDeviceSubtitle')}>
                <Item
                    title={t('connect.linkViaQRCode')}
                    subtitle={t('connect.linkViaQRCodeDescription')}
                    icon={<Ionicons name="qr-code-outline" size={29} color="#34C759" />}
                    onPress={() => router.push('/restore/qr' as never)}
                />
                <Item
                    title={t('connect.enterUrlManually')}
                    subtitle={t('connect.enterUrlDescription')}
                    icon={<Ionicons name="link-outline" size={29} color="#007AFF" />}
                    onPress={handleEnterUrlManually}
                    disabled={isConnecting}
                    showChevron={false}
                />
            </ItemGroup>
        </ItemList>
    );

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: !isDesktopShell,
                    headerTitle: t('home.addDeviceTitle'),
                    headerBackTitle: t('common.back'),
                }}
            />
            {isDesktopShell ? <SidebarView mainPanel={content} /> : content}
        </>
    );
});

const stylesheet = StyleSheet.create((theme) => ({
    page: {
        flex: 1,
        backgroundColor: theme.colors.groupped.background,
    },
    contentContainer: {
        paddingBottom: 24,
    },
    hero: {
        paddingHorizontal: 28,
        paddingTop: 24,
        paddingBottom: 8,
    },
    eyebrow: {
        fontSize: 11,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        color: theme.colors.textSecondary,
        ...Typography.default('semiBold'),
    },
    title: {
        marginTop: 10,
        fontSize: 30,
        lineHeight: 34,
        color: theme.colors.text,
        ...Typography.default('semiBold'),
    },
    subtitle: {
        marginTop: 8,
        fontSize: 14,
        lineHeight: 21,
        color: theme.colors.textSecondary,
        ...Typography.default(),
    },
    secretKeyContainer: {
        backgroundColor: theme.colors.surface,
        paddingHorizontal: 16,
        paddingVertical: 14,
        alignSelf: 'center',
        width: '100%',
    },
    secretKeyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    secretKeyLabel: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        ...Typography.default('semiBold'),
    },
    secretKeyText: {
        fontSize: 13,
        letterSpacing: 0.5,
        lineHeight: 20,
        color: theme.colors.text,
        ...Typography.mono(),
    },
    commandStatusRow: {
        marginTop: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    commandStatusText: {
        flex: 1,
        fontSize: 12,
        color: theme.colors.textSecondary,
        ...Typography.default(),
    },
    commandStatusAction: {
        fontSize: 12,
        color: theme.colors.textLink,
        ...Typography.default('semiBold'),
    },
}));
