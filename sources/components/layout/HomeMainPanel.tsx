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

function useIsExperiencedUser(): boolean {
    const artifacts = useArtifacts();
    const sessions = useAllSessions();
    const hasTeam = artifacts.some(a => a.type === 'team');
    const hasSession = sessions.length > 0;
    return hasTeam || hasSession;
}

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

function HelpCard() {
    const styles = stylesheet;
    const { theme } = useUnistyles();
    const [expanded, setExpanded] = React.useState(false);

    const keywords = [
        t('home.helpKeywordCrossDevice'),
        t('home.helpKeywordRemote'),
        t('home.helpKeywordCluster'),
        t('home.helpKeywordEvolution'),
    ];

    const faqItems = [
        {
            question: t('home.helpQuestionWhat'),
            answer: t('home.helpAnswerWhat'),
        },
        {
            question: t('home.helpQuestionStart'),
            answer: t('home.helpAnswerStart'),
        },
        {
            question: t('home.helpQuestionDevices'),
            answer: t('home.helpAnswerDevices'),
        },
        {
            question: t('home.helpQuestionCluster'),
            answer: t('home.helpAnswerCluster'),
        },
    ];

    return (
        <View style={styles.helpCard}>
            <Pressable
                style={({ pressed }) => [
                    styles.helpHeader,
                    pressed && styles.cardPressed,
                ]}
                onPress={() => setExpanded(value => !value)}
            >
                <View style={styles.helpIconWrap}>
                    <Ionicons name="help-buoy-outline" size={20} color={theme.colors.text} />
                </View>
                <View style={styles.helpHeaderBody}>
                    <Text style={styles.helpTitle}>{t('home.helpTitle')}</Text>
                    <Text style={styles.helpSubtitle}>{t('home.helpSubtitle')}</Text>
                </View>
                <View style={styles.helpToggle}>
                    <Text style={styles.helpToggleText}>
                        {expanded ? t('home.helpCollapse') : t('home.helpExpand')}
                    </Text>
                    <Ionicons
                        name={expanded ? 'chevron-up-outline' : 'chevron-down-outline'}
                        size={16}
                        color={theme.colors.textSecondary}
                    />
                </View>
            </Pressable>

            <View style={styles.keywordRow}>
                {keywords.map((keyword) => (
                    <View key={keyword} style={styles.keywordChip}>
                        <Text style={styles.keywordChipText}>{keyword}</Text>
                    </View>
                ))}
            </View>

            {expanded && (
                <View style={styles.faqList}>
                    {faqItems.map((item) => (
                        <View key={item.question} style={styles.faqItem}>
                            <Text style={styles.faqQuestion}>{item.question}</Text>
                            <Text style={styles.faqAnswer}>{item.answer}</Text>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
}

function NewUserPanel() {
    const router = useRouter();
    const styles = stylesheet;
    const { theme, rt } = useUnistyles();
    const topInset = Platform.OS !== 'web' ? rt.insets.top : 0;

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

            <HelpCard />

            <ActionCard
                icon="add"
                title={t('home.createTeamTitle')}
                subtitle={t('home.createTeamSubtitle')}
                onPress={handleCreateTeam}
                accent
            />

            <ActionCard
                icon="book-outline"
                title={t('home.docsTitle')}
                subtitle={t('home.docsSubtitle')}
                onPress={() => router.push('/agents' as never)}
            />

            <ActionCard
                icon="phone-portrait-outline"
                title={t('home.syncDeviceTitle')}
                subtitle={t('home.syncDeviceSubtitle')}
                onPress={handleSync}
            />
        </ScrollView>
    );
}

function ExperiencedUserPanel() {
    const router = useRouter();
    const styles = stylesheet;
    const { rt } = useUnistyles();
    const topInset = Platform.OS !== 'web' ? rt.insets.top : 0;

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
            <HelpCard />

            <ActionCard
                icon="add"
                title={t('home.createTeamTitle')}
                subtitle={t('home.createTeamSubtitle')}
                onPress={handleCreateTeam}
                accent
            />

            <ActionCard
                icon="bar-chart-outline"
                title={t('home.reportTitle')}
                subtitle={t('home.reportSubtitle')}
                onPress={handleReport}
            />

            <ActionCard
                icon="phone-portrait-outline"
                title={t('home.syncDeviceTitle')}
                subtitle={t('home.syncDeviceSubtitle')}
                onPress={handleSync}
            />

            <ActionCard
                icon="storefront-outline"
                title={t('home.marketplaceTitle')}
                subtitle={t('home.marketplaceSubtitle')}
                onPress={handleMarketplace}
            />
        </ScrollView>
    );
}

export const HomeMainPanel = React.memo(() => {
    const isDataReady = useIsDataReady();
    const isExperienced = useIsExperiencedUser();

    if (!isDataReady) {
        return null;
    }

    return isExperienced ? <ExperiencedUserPanel /> : <NewUserPanel />;
});

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
        ...Typography.default('semiBold'),
    },
    headerSubtitle: {
        marginTop: 2,
        fontSize: 13,
        color: theme.colors.textSecondary,
        ...Typography.default(),
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
    helpCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        padding: 16,
        marginBottom: 10,
    },
    helpHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    helpIconWrap: {
        width: 42,
        height: 42,
        borderRadius: 14,
        backgroundColor: theme.colors.groupped.background,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        alignItems: 'center',
        justifyContent: 'center',
    },
    helpHeaderBody: {
        flex: 1,
        minWidth: 0,
    },
    helpTitle: {
        fontSize: 16,
        color: theme.colors.text,
        ...Typography.default('semiBold'),
    },
    helpSubtitle: {
        marginTop: 4,
        fontSize: 13,
        lineHeight: 19,
        color: theme.colors.textSecondary,
        ...Typography.default(),
    },
    helpToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginLeft: 8,
    },
    helpToggleText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        ...Typography.default('semiBold'),
    },
    keywordRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 16,
    },
    keywordChip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: theme.colors.groupped.background,
        borderWidth: 1,
        borderColor: theme.colors.divider,
    },
    keywordChipText: {
        fontSize: 12,
        color: theme.colors.text,
        ...Typography.default('semiBold'),
    },
    faqList: {
        marginTop: 18,
        gap: 14,
    },
    faqItem: {
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: theme.colors.divider,
    },
    faqQuestion: {
        fontSize: 14,
        color: theme.colors.text,
        ...Typography.default('semiBold'),
    },
    faqAnswer: {
        marginTop: 6,
        fontSize: 13,
        lineHeight: 19,
        color: theme.colors.textSecondary,
        ...Typography.default(),
    },
}));
