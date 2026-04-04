import { View, Linking } from 'react-native';
import * as React from 'react';
import { Text } from '@/components/ui/StyledText';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Item } from '@/components/ui/Item';
import { ItemGroup } from '@/components/ui/ItemGroup';
import { ItemList } from '@/components/ui/ItemList';
import { useLocalSetting } from '@/sync/storage';
import { useAllMachinesIncludingArchived } from '@/sync/storage';
import { isMachineArchived, isMachineOnline } from '@/utils/machineUtils';
import { useUnistyles } from 'react-native-unistyles';
import { layout } from '@/utils/layout';
import { useProfile } from '@/sync/storage';
import { getDisplayName, getAvatarUrl, getBio } from '@/sync/profile';
import { Avatar } from '@/components/avatar/Avatar';
import { t } from '@/text';

const ARCHIVED_MACHINES_COLLAPSE_LIMIT = 8;

export const SettingsView = React.memo(function SettingsView() {
    const { theme } = useUnistyles();
    const router = useRouter();
    const devModeEnabled = useLocalSetting('devModeEnabled');
    const allMachines = useAllMachinesIncludingArchived();
    const profile = useProfile();
    const displayName = getDisplayName(profile);
    const avatarUrl = getAvatarUrl(profile);
    const bio = getBio(profile);
    const [showAllArchivedMachines, setShowAllArchivedMachines] = React.useState(false);

    const handleReportIssue = async () => {
        const url = 'https://github.com/Shiyao-Huang/aha/issues/new/choose';
        const supported = await Linking.canOpenURL(url);
        if (supported) {
            await Linking.openURL(url);
        }
    };

    const activeMachines = React.useMemo(
        () => allMachines.filter((machine) => !isMachineArchived(machine)),
        [allMachines],
    );
    const archivedMachines = React.useMemo(
        () => allMachines.filter((machine) => isMachineArchived(machine)),
        [allMachines],
    );
    const visibleArchivedMachines = React.useMemo(
        () => showAllArchivedMachines
            ? archivedMachines
            : archivedMachines.slice(0, ARCHIVED_MACHINES_COLLAPSE_LIMIT),
        [archivedMachines, showAllArchivedMachines],
    );


    return (

        <ItemList style={{ paddingTop: 0 }}>
            {/* App Info Header */}
            <View style={{ maxWidth: layout.maxWidth, alignSelf: 'center', width: '100%' }}>
                <View style={{ alignItems: 'center', paddingVertical: 24, backgroundColor: theme.colors.surface, marginTop: 16, borderRadius: 12, marginHorizontal: 16 }}>
                    {profile.firstName ? (
                        // Profile view: Avatar + name + version
                        <>
                            <View style={{ marginBottom: 12 }}>
                                <Avatar
                                    id={profile.id}
                                    size={90}
                                    imageUrl={avatarUrl}
                                    thumbhash={profile.avatar?.thumbhash}
                                />
                            </View>
                            <Text style={{ fontSize: 20, fontWeight: '600', color: theme.colors.text, marginBottom: bio ? 4 : 8 }}>
                                {displayName}
                            </Text>
                            {bio && (
                                <Text style={{ fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center', marginBottom: 8, paddingHorizontal: 16 }}>
                                    {bio}
                                </Text>
                            )}
                        </>
                    ) : (
                        // Brand text: show "Aha" when no profile is connected
                        <>
                            <Text style={{ fontSize: 36, fontWeight: '700', color: theme.colors.text, marginBottom: 12, letterSpacing: 1 }}>
                                Aha
                            </Text>
                        </>
                    )}
                </View>
            </View>

            {/* Machines */}
            {activeMachines.length > 0 && (
                <ItemGroup title={t('settings.availableMachines')}>
                    {activeMachines.map((machine) => {
                        const isOnline = isMachineOnline(machine);
                        const host = machine.metadata?.host || t('status.unknown');
                        const displayName = machine.metadata?.displayName;
                        const platform = machine.metadata?.platform || '';

                        // Use displayName if available, otherwise use host
                        const title = displayName || host;

                        // Build subtitle: show hostname if different from title, plus platform and status
                        let subtitle = '';
                        if (displayName && displayName !== host) {
                            subtitle = host;
                        }
                        if (platform) {
                            subtitle = subtitle ? `${subtitle} • ${platform}` : platform;
                        }
                        subtitle = subtitle ? `${subtitle} • ${isOnline ? t('status.online') : t('status.offline')}` : (isOnline ? t('status.online') : t('status.offline'));

                        return (
                            <Item
                                key={machine.id}
                                title={title}
                                subtitle={subtitle}
                                icon={
                                    <Ionicons
                                        name="desktop-outline"
                                        size={29}
                                        color={isOnline ? theme.colors.status.connected : theme.colors.status.disconnected}
                                    />
                                }
                                onPress={() => router.push(`/machine/${machine.id}`)}
                            />
                        );
                    })}
                </ItemGroup>
            )}

            {archivedMachines.length > 0 && (
                <ItemGroup title={t('settings.archivedMachines')}>
                    {visibleArchivedMachines.map((machine) => {
                        const host = machine.metadata?.host || t('status.unknown');
                        const displayName = machine.metadata?.displayName;
                        const platform = machine.metadata?.platform || '';
                        const title = displayName || host;
                        const subtitleParts = [];
                        if (displayName && displayName !== host) {
                            subtitleParts.push(host);
                        }
                        if (platform) {
                            subtitleParts.push(platform);
                        }
                        subtitleParts.push(t('machine.statusArchived'));
                        if (machine.archivedAt) {
                            subtitleParts.push(`${t('machine.archivedAt')}: ${new Date(machine.archivedAt).toLocaleString()}`);
                        }

                        return (
                            <Item
                                key={machine.id}
                                title={title}
                                subtitle={subtitleParts.join(' • ')}
                                icon={
                                    <Ionicons
                                        name="archive-outline"
                                        size={29}
                                        color={theme.colors.textSecondary}
                                    />
                                }
                                onPress={() => router.push(`/machine/${machine.id}`)}
                            />
                        );
                    })}
                    {archivedMachines.length > ARCHIVED_MACHINES_COLLAPSE_LIMIT && (
                        <Item
                            title={showAllArchivedMachines
                                ? t('settings.showLessArchivedMachines')
                                : t('settings.showAllArchivedMachines', { count: archivedMachines.length })}
                            onPress={() => setShowAllArchivedMachines((current) => !current)}
                            showChevron={false}
                            showDivider={false}
                            titleStyle={{
                                textAlign: 'center',
                                color: (theme as any).dark ? theme.colors.button.primary.tint : theme.colors.button.primary.background,
                            }}
                        />
                    )}
                </ItemGroup>
            )}

            <ItemGroup>
                <Item
                    title={t('settings.account')}
                    subtitle={t('settings.accountSubtitle')}
                    icon={<Ionicons name="person-circle-outline" size={29} color="#007AFF" />}
                    onPress={() => router.push('/settings/account')}
                />
                <Item
                    title={t('home.addDeviceTitle')}
                    subtitle={t('settings.syncDeviceSubtitle')}
                    icon={<Ionicons name="add-circle-outline" size={29} color="#FF9500" />}
                    onPress={() => router.push('/restore')}
                />
                <Item
                    title={t('settings.usage')}
                    subtitle={t('settings.usageSubtitle')}
                    icon={<Ionicons name="analytics-outline" size={29} color="#007AFF" />}
                    onPress={() => router.push('/settings/usage')}
                />
            </ItemGroup>

            {/* Developer */}
            {(__DEV__ || devModeEnabled) && (
                <ItemGroup title={t('settings.developer')}>
                    <Item
                        title={t('settings.developerTools')}
                        icon={<Ionicons name="construct-outline" size={29} color="#5856D6" />}
                        onPress={() => router.push('/dev')}
                    />
                </ItemGroup>
            )}

            {/* About */}
            <ItemGroup title={t('settings.about')} footer={t('settings.aboutFooter')}>
                <Item
                    title={t('settings.whatsNew')}
                    subtitle={t('settings.whatsNewSubtitle')}
                    icon={<Ionicons name="sparkles-outline" size={29} color="#FF9500" />}
                    onPress={() => router.push('/changelog')}
                />
                <Item
                    title={t('settings.reportIssue')}
                    icon={<Ionicons name="bug-outline" size={29} color="#FF3B30" />}
                    onPress={handleReportIssue}
                />
            </ItemGroup>

        </ItemList>
    );
});
