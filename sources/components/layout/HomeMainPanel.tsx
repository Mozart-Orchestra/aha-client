import * as React from 'react';
import {
    View,
    Text,
    Pressable,
    ScrollView,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Image } from 'expo-image';

import { useArtifacts, useAllSessions, useIsDataReady } from '@/sync/storage';
import { t } from '@/text';
import { Typography } from '@/constants/Typography';

// ─── Helpers ────────────────────────────────────────────────────────────────

function useIsExperiencedUser(): boolean {
    const artifacts = useArtifacts();
    const sessions = useAllSessions();
    const hasTeam = artifacts.some(a => a.type === 'team');
    const hasSession = sessions.length > 0;
    return hasTeam || hasSession;
}

// ─── Subcomponents ──────────────────────────────────────────────────────────

interface ActionCardProps {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle: string;
    onPress: () => void;
    accent?: boolean;
}

function ActionCard({ icon, title, subtitle, onPress, accent = false }: ActionCardProps) {
    const styles = stylesheet;
    const { theme } = useUnistyles();
    return (
        <Pressable
            style={({ pressed }) => [
                styles.card,
                accent && styles.cardAccent,
                pressed && styles.cardPressed,
            ]}
            onPress={onPress}
        >
            <View style={[styles.cardIconWrap, accent && styles.cardIconWrapAccent]}>
                <Ionicons
                    name={icon}
                    size={22}
                    color={accent ? '#FFFFFF' : theme.colors.text}
                />
            </View>
            <View style={styles.cardBody}>
                <Text style={[styles.cardTitle, accent && styles.cardTitleAccent]} numberOfLines={1}>
                    {title}
                </Text>
                <Text style={[styles.cardSubtitle, accent && styles.cardSubtitleAccent]} numberOfLines={2}>
                    {subtitle}
                </Text>
            </View>
            <Ionicons
                name="chevron-forward"
                size={16}
                color={accent ? 'rgba(255,255,255,0.6)' : theme.colors.textSecondary}
            />
        </Pressable>
    );
}

// ─── New user panel ──────────────────────────────────────────────────────────

function NewUserPanel() {
    const router = useRouter();
    const styles = stylesheet;
    const { theme, runtime } = useUnistyles();
    // On native (no nav header), respect device safe area for status bar.
    // On web, ThreeColumnShell already handles safe area at the shell level.
    const topInset = Platform.OS !== 'web' ? runtime.insets.top : 0;

    const handleCreateTeam = React.useCallback(() => {
        router.push('/teams/new' as never);
    }, [router]);

    const handleSync = React.useCallback(() => {
        router.push('/restore' as never);
    }, [router]);

    return (
        <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, { paddingTop: 24 + topInset }]}
            showsVerticalScrollIndicator={false}
        >
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.logoWrap}>
                    <Image
                        source={require('@/assets/images/logo-black.png')}
                        contentFit="contain"
                        style={{ width: 28, height: 28 }}
                        tintColor={theme.colors.header.tint}
                    />
                </View>
                <View style={styles.headerText}>
                    <Text style={styles.headerTitle}>{t('home.welcome')}</Text>
                    <Text style={styles.headerSubtitle}>{t('home.welcomeSubtitle')}</Text>
                </View>
            </View>

            {/* Section: Getting started */}
            <Text style={styles.sectionLabel}>{t('home.gettingStarted')}</Text>

            <ActionCard
                icon="book-outline"
                title={t('home.docsTitle')}
                subtitle={t('home.docsSubtitle')}
                onPress={() => router.push('/agents' as never)}
            />

            {/* Section: Team */}
            <Text style={styles.sectionLabel}>{t('home.teamSection')}</Text>

            <ActionCard
                icon="people-outline"
                title={t('home.createTeamTitle')}
                subtitle={t('home.createTeamSubtitle')}
                onPress={handleCreateTeam}
                accent
            />

            {/* Section: Devices */}
            <Text style={styles.sectionLabel}>{t('home.devicesSection')}</Text>

            <ActionCard
                icon="phone-portrait-outline"
                title={t('home.syncDeviceTitle')}
                subtitle={t('home.syncDeviceSubtitle')}
                onPress={handleSync}
            />
        </ScrollView>
    );
}

// ─── Experienced user panel ──────────────────────────────────────────────────

function ExperiencedUserPanel() {
    const router = useRouter();
    const styles = stylesheet;
    const { runtime } = useUnistyles();
    const topInset = Platform.OS !== 'web' ? runtime.insets.top : 0;

    const handleReport = React.useCallback(() => {
        router.push('/teams' as never);
    }, [router]);

    const handleCreateTeam = React.useCallback(() => {
        router.push('/teams/new' as never);
    }, [router]);

    const handleSync = React.useCallback(() => {
        router.push('/restore' as never);
    }, [router]);

    const handleMarketplace = React.useCallback(() => {
        router.push('/agents' as never);
    }, [router]);

    return (
        <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, { paddingTop: 24 + topInset }]}
            showsVerticalScrollIndicator={false}
        >
            {/* Section: Work */}
            <Text style={styles.sectionLabel}>{t('home.workSection')}</Text>

            <ActionCard
                icon="bar-chart-outline"
                title={t('home.reportTitle')}
                subtitle={t('home.reportSubtitle')}
                onPress={handleReport}
                accent
            />

            {/* Section: Team */}
            <Text style={styles.sectionLabel}>{t('home.teamSection')}</Text>

            <ActionCard
                icon="people-outline"
                title={t('home.createTeamTitle')}
                subtitle={t('home.createTeamSubtitle')}
                onPress={handleCreateTeam}
            />

            {/* Section: Devices */}
            <Text style={styles.sectionLabel}>{t('home.devicesSection')}</Text>

            <ActionCard
                icon="phone-portrait-outline"
                title={t('home.syncDeviceTitle')}
                subtitle={t('home.syncDeviceSubtitle')}
                onPress={handleSync}
            />

            {/* Section: Explore */}
            <Text style={styles.sectionLabel}>{t('home.exploreSection')}</Text>

            <ActionCard
                icon="storefront-outline"
                title={t('home.marketplaceTitle')}
                subtitle={t('home.marketplaceSubtitle')}
                onPress={handleMarketplace}
            />
        </ScrollView>
    );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export const HomeMainPanel = React.memo(() => {
    const isDataReady = useIsDataReady();
    const isExperienced = useIsExperiencedUser();

    if (!isDataReady) {
        return null;
    }

    return isExperienced ? <ExperiencedUserPanel /> : <NewUserPanel />;
});

// ─── Styles ──────────────────────────────────────────────────────────────────

const stylesheet = StyleSheet.create((theme) => ({
    scroll: {
        flex: 1,
        backgroundColor: theme.colors.groupped.background,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 0,
        paddingBottom: 40,
        gap: 0,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        marginBottom: 32,
    },
    logoWrap: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerText: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 20,
        color: theme.colors.text,
        ...Typography.default('bold'),
    },
    headerSubtitle: {
        marginTop: 2,
        fontSize: 13,
        color: theme.colors.textSecondary,
        ...Typography.default(),
    },
    sectionLabel: {
        fontSize: 11,
        letterSpacing: 0.5,
        color: theme.colors.textSecondary,
        marginBottom: 8,
        marginTop: 24,
        ...Typography.default('semiBold'),
        textTransform: 'uppercase',
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        backgroundColor: theme.colors.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 10,
    },
    cardAccent: {
        backgroundColor: theme.colors.button.primary.background,
        borderColor: theme.colors.button.primary.background,
    },
    cardPressed: {
        opacity: 0.75,
    },
    cardIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: theme.colors.groupped.background,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardIconWrapAccent: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderColor: 'rgba(255,255,255,0.2)',
    },
    cardBody: {
        flex: 1,
        minWidth: 0,
    },
    cardTitle: {
        fontSize: 15,
        color: theme.colors.text,
        ...Typography.default('semiBold'),
    },
    cardTitleAccent: {
        color: '#FFFFFF',
    },
    cardSubtitle: {
        marginTop: 2,
        fontSize: 12,
        color: theme.colors.textSecondary,
        ...Typography.default(),
        lineHeight: 17,
    },
    cardSubtitleAccent: {
        color: 'rgba(255,255,255,0.75)',
    },
}));
