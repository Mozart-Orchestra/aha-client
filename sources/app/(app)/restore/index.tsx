import React, { memo, useState } from 'react';
import { View, Text, Pressable, Platform, useWindowDimensions } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '@/auth/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { formatSecretKeyForBackup } from '@/auth/secretKeyBackup';
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
import { getCliInstallAndLoginCommand, getCliRestoreCommand } from '@/auth/cliCommands';
import { getStoredSecretForReauth } from '@/auth/tokenStorage';
import { createAccountJoinTicket } from '@/auth/accountJoinTicket';

export default memo(function Restore() {
    const { theme } = useUnistyles();
    const styles = stylesheet;
    const auth = useAuth();
    const router = useRouter();
    const { width: windowWidth } = useWindowDimensions();
    const isDesktopShell = Platform.OS === 'web' && windowWidth >= DESKTOP_BREAKPOINT;
    const { connectWithUrl, isLoading: isConnecting } = useConnectAccount();
    const [showSecret, setShowSecret] = useState(false);
    const [copiedRecently, setCopiedRecently] = useState(false);
    const [copiedCommandRecently, setCopiedCommandRecently] = useState(false);
    const [copiedRestoreCommandRecently, setCopiedRestoreCommandRecently] = useState(false);
    const [joinCommand, setJoinCommand] = useState('');

    const currentSecret = auth.credentials?.secret ?? getStoredSecretForReauth() ?? '';
    const formattedSecret = currentSecret ? formatSecretKeyForBackup(currentSecret) : '';
    const loginCommand = getCliInstallAndLoginCommand();
    const restoreCommand = currentSecret ? getCliRestoreCommand(currentSecret) : '';
    const primaryCommand = joinCommand || restoreCommand || loginCommand;

    const loadJoinCommand = React.useCallback(async () => {
        if (!auth.credentials?.token) {
            setJoinCommand('');
            return;
        }

        try {
            const { ticket } = await createAccountJoinTicket(auth.credentials.token);
            setJoinCommand(getCliInstallAndLoginCommand(ticket));
        } catch {
            setJoinCommand('');
        }
    }, [auth.credentials?.token]);

    React.useEffect(() => {
        void loadJoinCommand();
    }, [loadJoinCommand]);

    const handleCopySecret = async () => {
        try {
            await Clipboard.setStringAsync(formattedSecret);
            setCopiedRecently(true);
            setTimeout(() => setCopiedRecently(false), 2000);
            Modal.alert(t('common.success'), t('settingsAccount.secretKeyCopied'));
        } catch {
            Modal.alert(t('common.error'), t('settingsAccount.secretKeyCopyFailed'));
        }
    };

    const handleCopyCommand = async () => {
        try {
            await Clipboard.setStringAsync(primaryCommand);
            setCopiedCommandRecently(true);
            setTimeout(() => setCopiedCommandRecently(false), 2000);
            Modal.alert(t('home.onboarding.commandCopiedTitle'), t('home.onboarding.commandCopiedMessage'));
        } catch {
            Modal.alert(t('common.error'), t('settingsAccount.restoreCommandCopyFailed'));
        }
    };

    const handleCopyRestoreCommand = async () => {
        try {
            await Clipboard.setStringAsync(restoreCommand);
            setCopiedRestoreCommandRecently(true);
            setTimeout(() => setCopiedRestoreCommandRecently(false), 2000);
            Modal.alert(t('common.success'), t('settingsAccount.restoreCommandCopied'));
        } catch {
            Modal.alert(t('common.error'), t('settingsAccount.restoreCommandCopyFailed'));
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

            <ItemGroup footer={joinCommand ? t('home.addDeviceHint') : restoreCommand ? t('settingsAccount.backupDescription') : t('home.addDeviceHint')}>
                <Pressable onPress={handleCopyCommand}>
                    <View style={[styles.secretKeyContainer, { maxWidth: layout.maxWidth }]}>
                        <View style={styles.secretKeyHeader}>
                            <Text style={styles.secretKeyLabel}>
                                {joinCommand ? t('home.addDeviceTitle') : restoreCommand ? t('settingsAccount.restoreCommandLabel') : t('home.addDeviceTitle')}
                            </Text>
                            <Ionicons
                                name={copiedCommandRecently ? 'checkmark-circle' : 'copy-outline'}
                                size={18}
                                color={copiedCommandRecently ? '#34C759' : theme.colors.textSecondary}
                            />
                        </View>
                        <Text style={styles.secretKeyText}>
                            {primaryCommand}
                        </Text>
                    </View>
                </Pressable>
            </ItemGroup>

            {joinCommand && restoreCommand && (
                <ItemGroup footer={t('settingsAccount.backupDescription')}>
                    <Pressable onPress={handleCopyRestoreCommand}>
                        <View style={[styles.secretKeyContainer, { maxWidth: layout.maxWidth }]}>
                            <View style={styles.secretKeyHeader}>
                                <Text style={styles.secretKeyLabel}>
                                    {t('settingsAccount.restoreCommandLabel')}
                                </Text>
                                <Ionicons
                                    name={copiedRestoreCommandRecently ? 'checkmark-circle' : 'copy-outline'}
                                    size={18}
                                    color={copiedRestoreCommandRecently ? '#34C759' : theme.colors.textSecondary}
                                />
                            </View>
                            <Text style={styles.secretKeyText}>
                                {restoreCommand}
                            </Text>
                        </View>
                    </Pressable>
                </ItemGroup>
            )}

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
                <Item
                    title={t('navigation.restoreWithSecretKey')}
                    subtitle={t('connect.restoreDescription')}
                    icon={<Ionicons name="key-outline" size={29} color="#FF9500" />}
                    onPress={() => router.push('/restore/manual' as never)}
                />
            </ItemGroup>

            {auth.isAuthenticated && (
                <ItemGroup
                    title={t('connect.myKey')}
                    footer={t('connect.myKeyDescription')}
                >
                    <Item
                        title={t('settingsAccount.secretKey')}
                        subtitle={showSecret ? t('settingsAccount.tapToHide') : t('settingsAccount.tapToReveal')}
                        icon={<Ionicons name={showSecret ? 'eye-off-outline' : 'eye-outline'} size={29} color="#FF9500" />}
                        onPress={() => setShowSecret(value => !value)}
                        showChevron={false}
                    />
                </ItemGroup>
            )}

            {auth.isAuthenticated && showSecret && (
                <ItemGroup>
                    <Pressable onPress={handleCopySecret}>
                        <View style={[styles.secretKeyContainer, { maxWidth: layout.maxWidth }]}>
                            <View style={styles.secretKeyHeader}>
                                <Text style={styles.secretKeyLabel}>
                                    {t('settingsAccount.secretKeyLabel')}
                                </Text>
                                <Ionicons
                                    name={copiedRecently ? 'checkmark-circle' : 'copy-outline'}
                                    size={18}
                                    color={copiedRecently ? '#34C759' : theme.colors.textSecondary}
                                />
                            </View>
                            <Text style={styles.secretKeyText}>
                                {formattedSecret}
                            </Text>
                        </View>
                    </Pressable>
                </ItemGroup>
            )}
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
}));
