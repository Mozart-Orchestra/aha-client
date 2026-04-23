import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/auth/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Typography } from '@/constants/Typography';
import { Item } from '@/components/ui/Item';
import { ItemGroup } from '@/components/ui/ItemGroup';
import { ItemList } from '@/components/ui/ItemList';
import { Modal } from '@/modal';
import { t } from '@/text';
import { layout } from '@/utils/layout';
import { useSettingMutable, useProfile } from '@/sync/storage';
import { sync } from '@/sync/sync';
import { getServerInfo } from '@/sync/serverConfig';
import { useUnistyles } from 'react-native-unistyles';
import { Switch } from '@/components/ui/Switch';
import { getDisplayName } from '@/sync/profile';
import { Image } from 'expo-image';
import { useHappyAction } from '@/hooks/useHappyAction';
import { disconnectGitHub } from '@/sync/apiGithub';
import { disconnectService } from '@/sync/apiServices';
import { formatCliInstallCommandForDisplay } from '@/auth/cliCommands';
import { formatJoinTicketTimeRemaining, useAccountJoinCommand } from '@/auth/useAccountJoinCommand';

export default React.memo(() => {
    const { theme } = useUnistyles();
    const auth = useAuth();
    const router = useRouter();
    const [copiedJoinCommandRecently, setCopiedJoinCommandRecently] = useState(false);
    const [analyticsOptOut, setAnalyticsOptOut] = useSettingMutable('analyticsOptOut');
    const [professionalMode, setProfessionalMode] = useSettingMutable('professionalMode');
    const profile = useProfile();

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

    // Get server info
    const serverInfo = getServerInfo();

    // Profile display values
    const displayName = getDisplayName(profile);
    const githubUsername = profile.github?.login;

    // GitHub disconnection
    const [disconnecting, handleDisconnectGitHub] = useHappyAction(async () => {
        const confirmed = await Modal.confirm(
            t('modals.disconnectGithub'),
            t('modals.disconnectGithubConfirm'),
            { confirmText: t('modals.disconnect'), destructive: true }
        );
        if (confirmed) {
            await disconnectGitHub(auth.credentials!);
        }
    });

    // Service disconnection
    const [disconnectingService, setDisconnectingService] = useState<string | null>(null);
    const handleDisconnectService = async (service: string, displayName: string) => {
        const confirmed = await Modal.confirm(
            t('modals.disconnectService', { service: displayName }),
            t('modals.disconnectServiceConfirm', { service: displayName }),
            { confirmText: t('modals.disconnect'), destructive: true }
        );
        if (confirmed) {
            setDisconnectingService(service);
            try {
                await disconnectService(auth.credentials!, service);
                await sync.refreshProfile();
                // The profile will be updated via sync
            } catch (error) {
                Modal.alert(t('common.error'), t('errors.disconnectServiceFailed', { service: displayName }));
            } finally {
                setDisconnectingService(null);
            }
        }
    };

    const handleCopyJoinCommand = async () => {
        try {
            const commandToCopy = await ensureFreshJoinCommand();
            await Clipboard.setStringAsync(commandToCopy);
            setCopiedJoinCommandRecently(true);
            setTimeout(() => setCopiedJoinCommandRecently(false), 2000);
            Modal.alert(t('home.onboarding.commandCopiedTitle'), t('home.onboarding.commandCopiedMessage'));
        } catch (error) {
            Modal.alert(t('common.error'), t('home.addDeviceHint'));
        }
    };

    const handleLogout = async () => {
        const confirmed = await Modal.confirm(
            t('common.logout'),
            t('settingsAccount.logoutConfirm'),
            { confirmText: t('common.logout'), destructive: true }
        );
        if (confirmed) {
            await auth.logout();
        }
    };

    return (
        <>
            <ItemList>
                {/* Account Info */}
                <ItemGroup title={t('settingsAccount.accountInformation')}>
                    <Item
                        title={t('settingsAccount.status')}
                        detail={auth.isAuthenticated ? t('settingsAccount.statusActive') : t('settingsAccount.statusNotAuthenticated')}
                        showChevron={false}
                    />
                    <Item
                        title={t('settingsAccount.anonymousId')}
                        detail={sync.anonID || t('settingsAccount.notAvailable')}
                        showChevron={false}
                        copy={!!sync.anonID}
                    />
                    <Item
                        title={t('settingsAccount.publicId')}
                        detail={sync.serverID || t('settingsAccount.notAvailable')}
                        showChevron={false}
                        copy={!!sync.serverID}
                    />
                    <Item
                        title={t('home.addDeviceTitle')}
                        subtitle={t('settings.syncDeviceSubtitle')}
                        icon={<Ionicons name="add-circle-outline" size={29} color="#007AFF" />}
                        onPress={() => router.push('/restore')}
                    />
                    <Item
                        title={t('settingsAccount.professionalMode')}
                        subtitle={t('settingsAccount.professionalModeSubtitle')}
                        icon={<Ionicons name="options-outline" size={29} color="#5856D6" />}
                        rightElement={
                            <Switch
                                value={professionalMode}
                                onValueChange={setProfessionalMode}
                            />
                        }
                        showChevron={false}
                    />
                </ItemGroup>

                {/* Profile Section */}
                {(displayName || githubUsername || profile.avatar) && (
                    <ItemGroup title={t('settingsAccount.profile')}>
                        {displayName && (
                            <Item
                                title={t('settingsAccount.name')}
                                detail={displayName}
                                showChevron={false}
                            />
                        )}
                        {githubUsername && (
                            <Item
                                title={t('settingsAccount.github')}
                                detail={`@${githubUsername}`}
                                subtitle={t('settingsAccount.tapToDisconnect')}
                                onPress={handleDisconnectGitHub}
                                loading={disconnecting}
                                showChevron={false}
                                icon={profile.avatar?.url ? (
                                    <Image
                                        source={{ uri: profile.avatar.url }}
                                        style={{ width: 29, height: 29, borderRadius: 14.5 }}
                                        placeholder={{ thumbhash: profile.avatar.thumbhash }}
                                        contentFit="cover"
                                        transition={200}
                                        cachePolicy="memory-disk"
                                    />
                                ) : (
                                    <Ionicons name="logo-github" size={29} color={theme.colors.textSecondary} />
                                )}
                            />
                        )}
                    </ItemGroup>
                )}

                {/* Connected Services Section */}
                {profile.connectedServices && profile.connectedServices.length > 0 && (() => {
                    // Map of service IDs to display names and icons
                    const knownServices = {
                        anthropic: { name: 'Claude Code', icon: require('@/assets/images/icon-claude.png'), tintColor: null },
                        gemini: { name: 'Google Gemini', icon: require('@/assets/images/icon-gemini.png'), tintColor: null },
                        openai: { name: 'OpenAI Codex', icon: require('@/assets/images/icon-gpt.png'), tintColor: theme.colors.text }
                    };
                    
                    // Filter to only known services
                    const displayServices = profile.connectedServices.filter(
                        service => service in knownServices
                    );
                    
                    if (displayServices.length === 0) return null;
                    
                    return (
                        <ItemGroup title={t('settings.connectedAccounts')}>
                            {displayServices.map(service => {
                                const serviceInfo = knownServices[service as keyof typeof knownServices];
                                const isDisconnecting = disconnectingService === service;
                                return (
                                    <Item
                                        key={service}
                                        title={serviceInfo.name}
                                        detail={t('settingsAccount.statusActive')}
                                        subtitle={t('settingsAccount.tapToDisconnect')}
                                        onPress={() => handleDisconnectService(service, serviceInfo.name)}
                                        loading={isDisconnecting}
                                        disabled={isDisconnecting}
                                        showChevron={false}
                                        icon={
                                            <Image
                                                source={serviceInfo.icon}
                                                style={{ width: 29, height: 29 }}
                                                tintColor={serviceInfo.tintColor}
                                                contentFit="contain"
                                            />
                                        }
                                    />
                                );
                            })}
                        </ItemGroup>
                    );
                })()}

                {/* Server Info */}
                <ItemGroup title={t('settingsAccount.server')}>
                    <Item
                        title={t('server.serverConfiguration')}
                        subtitle={serverInfo.isCustom ? t('server.currentlyUsingCustomServer') : undefined}
                        detail={serverInfo.hostname + (serverInfo.port ? `:${serverInfo.port}` : '')}
                        onPress={() => router.push('/server')}
                    />
                </ItemGroup>

                <ItemGroup title={t('home.addDeviceTitle')} footer={t('home.addDeviceHint')}>
                    <Pressable onPress={handleCopyJoinCommand}>
                        <View style={{
                            backgroundColor: theme.colors.surface,
                            paddingHorizontal: 16,
                            paddingVertical: 14,
                            width: '100%',
                            maxWidth: layout.maxWidth,
                            alignSelf: 'center'
                        }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                <Text style={{
                                    fontSize: 11,
                                    color: theme.colors.textSecondary,
                                    letterSpacing: 0.5,
                                    textTransform: 'uppercase',
                                    ...Typography.default('semiBold')
                                }}>
                                    {t('home.addDeviceTitle')}
                                </Text>
                                <Ionicons
                                    name={copiedJoinCommandRecently ? "checkmark-circle" : "copy-outline"}
                                    size={18}
                                    color={copiedJoinCommandRecently ? "#34C759" : theme.colors.textSecondary}
                                />
                            </View>
                            <Text style={{
                                fontSize: 13,
                                letterSpacing: 0.5,
                                lineHeight: 20,
                                color: theme.colors.text,
                                ...Typography.mono()
                            }}>
                                {formatCliInstallCommandForDisplay(displayedJoinCommand)}
                            </Text>
                            {joinCommandStatus ? (
                                <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                                    <Text style={{
                                        flex: 1,
                                        fontSize: 12,
                                        color: theme.colors.textSecondary,
                                        ...Typography.default()
                                    }}>
                                        {joinCommandStatus}
                                    </Text>
                                    {isExpired || (!primaryCommand && hasRefreshError) ? (
                                        <Pressable onPress={() => { void refreshJoinCommand(); }}>
                                            <Text style={{
                                                fontSize: 12,
                                                color: theme.colors.textLink,
                                                ...Typography.default('semiBold')
                                            }}>
                                                {isRefreshing ? t('common.loading') : t('common.retry')}
                                            </Text>
                                        </Pressable>
                                    ) : null}
                                </View>
                            ) : null}
                        </View>
                    </Pressable>
                </ItemGroup>

                {/* Analytics Section */}
                <ItemGroup
                    title={t('settingsAccount.privacy')}
                    footer={t('settingsAccount.privacyDescription')}
                >
                    <Item
                        title={t('settingsAccount.analytics')}
                        subtitle={analyticsOptOut ? t('settingsAccount.analyticsDisabled') : t('settingsAccount.analyticsEnabled')}
                        rightElement={
                            <Switch
                                value={!analyticsOptOut}
                                onValueChange={(value) => {
                                    const optOut = !value;
                                    setAnalyticsOptOut(optOut);
                                }}
                                trackColor={{ false: '#767577', true: '#34C759' }}
                                thumbColor="#FFFFFF"
                            />
                        }
                        showChevron={false}
                    />
                    <Item
                        title={t('settingsAccount.operationalLogs')}
                        subtitle={t('settingsAccount.operationalLogsDescription')}
                        showChevron={false}
                    />
                </ItemGroup>

                {/* Danger Zone */}
                <ItemGroup title={t('settingsAccount.dangerZone')}>
                    <Item
                        title={t('settingsAccount.logout')}
                        subtitle={t('settingsAccount.logoutSubtitle')}
                        icon={<Ionicons name="log-out-outline" size={29} color="#FF3B30" />}
                        destructive
                        onPress={handleLogout}
                    />
                </ItemGroup>
            </ItemList>
        </>
    );
});
