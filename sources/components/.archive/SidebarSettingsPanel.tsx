import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native-unistyles';

import { Text } from '@/components/ui/StyledText';
import { useSetting } from '@/sync/storage';
import { t } from '@/text';
import { getThreeColumnShellTokens, ThreeColumnShellVariant } from './ThreeColumnShell';

const styles = StyleSheet.create(() => ({
    container: {
        flex: 1,
        minHeight: 0,
    },
    header: {
        paddingHorizontal: 18,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    leading: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    info: {
        flex: 1,
        minWidth: 0,
    },
    eyebrow: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.7,
        marginBottom: 6,
    },
    title: {
        fontSize: 17,
        fontWeight: '700',
    },
    subtitle: {
        fontSize: 12,
        marginTop: 4,
    },
    body: {
        flex: 1,
        minHeight: 0,
    },
    content: {
        padding: 18,
        paddingBottom: 26,
    },
    sectionLabel: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 10,
        marginTop: 4,
    },
    settingCard: {
        borderRadius: 18,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 14,
        marginBottom: 10,
        shadowColor: '#7A8C9B',
        shadowOffset: { width: 0, height: 7 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
        elevation: 2,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    settingIcon: {
        width: 38,
        height: 38,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    settingInfo: {
        flex: 1,
        minWidth: 0,
    },
    settingTitle: {
        fontSize: 14,
        fontWeight: '700',
    },
    settingSubtitle: {
        fontSize: 12,
        marginTop: 4,
        lineHeight: 18,
    },
}));

interface SidebarSettingsPanelProps {
    variant?: ThreeColumnShellVariant;
}

interface SettingsSidebarItem {
    key: string;
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle: string;
    href: string;
}

interface SettingsSidebarGroup {
    label: string;
    items: SettingsSidebarItem[];
}

export const SidebarSettingsPanel = React.memo(({ variant = 'default' }: SidebarSettingsPanelProps) => {
    const tokens = getThreeColumnShellTokens(variant);
    const router = useRouter();
    const experiments = useSetting('experiments');

    const groups = React.useMemo(() => {
        const base: SettingsSidebarGroup[] = [
            {
                label: t('settings.features'),
                items: [
                    {
                        key: 'account',
                        icon: 'person-circle-outline' as const,
                        title: t('settings.account'),
                        subtitle: t('settings.accountSubtitle'),
                        href: '/settings/account',
                    },
                    {
                        key: 'appearance',
                        icon: 'color-palette-outline' as const,
                        title: t('settings.appearance'),
                        subtitle: t('settings.appearanceSubtitle'),
                        href: '/settings/appearance',
                    },
                    {
                        key: 'language',
                        icon: 'language-outline' as const,
                        title: t('settingsLanguage.title'),
                        subtitle: t('settingsLanguage.description'),
                        href: '/settings/language',
                    },
                    {
                        key: 'voice',
                        icon: 'mic-outline' as const,
                        title: t('settings.voiceAssistant'),
                        subtitle: t('settings.voiceAssistantSubtitle'),
                        href: '/settings/voice',
                    },
                    {
                        key: 'features',
                        icon: 'flask-outline' as const,
                        title: t('settings.featuresTitle'),
                        subtitle: t('settings.featuresSubtitle'),
                        href: '/settings/features',
                    },
                ],
            },
        ];

        if (experiments) {
            base[0].items.push({
                key: 'usage',
                icon: 'analytics-outline',
                title: t('settings.usage'),
                subtitle: t('settings.usageSubtitle'),
                href: '/settings/usage',
            });
        }

        return base;
    }, [experiments]);

    return (
        <View style={styles.container}>
            <View style={[styles.header, { borderBottomColor: tokens.panelDivider }]}>
                <View style={styles.headerRow}>
                    <View
                        style={[
                            styles.leading,
                            {
                                backgroundColor: tokens.softIconBackground,
                                borderColor: tokens.panelBorder,
                            },
                        ]}
                    >
                        <Ionicons name="settings-outline" size={16} color={tokens.softIconForeground} />
                    </View>
                    <View style={styles.info}>
                        <Text style={[styles.eyebrow, { color: tokens.panelEyebrow }]}>Settings</Text>
                        <Text style={[styles.title, { color: tokens.panelTitle }]}>Preferences</Text>
                        <Text style={[styles.subtitle, { color: tokens.panelTextSecondary }]}>
                            Default three-column menu for account, appearance, language, and tools.
                        </Text>
                    </View>
                </View>
            </View>

            <View style={styles.body}>
                <ScrollView
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                >
                    {groups.map((group) => (
                        <View key={group.label}>
                            <Text style={[styles.sectionLabel, { color: tokens.panelEyebrow }]}>
                                {group.label}
                            </Text>
                            {group.items.map((item) => (
                                <Pressable
                                    key={item.key}
                                    style={[
                                        styles.settingCard,
                                        {
                                            backgroundColor: tokens.cardBackground,
                                            borderColor: tokens.cardBorder,
                                        },
                                    ]}
                                    onPress={() => router.push(item.href as never)}
                                >
                                    <View style={styles.settingRow}>
                                        <View
                                            style={[
                                                styles.settingIcon,
                                                { backgroundColor: tokens.chipBackground },
                                            ]}
                                        >
                                            <Ionicons
                                                name={item.icon}
                                                size={20}
                                                color={tokens.softIconForeground}
                                            />
                                        </View>
                                        <View style={styles.settingInfo}>
                                            <Text style={[styles.settingTitle, { color: tokens.panelTitle }]}>
                                                {item.title}
                                            </Text>
                                            <Text style={[styles.settingSubtitle, { color: tokens.panelTextSecondary }]}>
                                                {item.subtitle}
                                            </Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={16} color={tokens.panelTextSecondary} />
                                    </View>
                                </Pressable>
                            ))}
                        </View>
                    ))}
                </ScrollView>
            </View>
        </View>
    );
});
