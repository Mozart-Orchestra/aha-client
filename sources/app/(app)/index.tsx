import * as React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getRandomBytesAsync } from 'expo-crypto';
import {
    Platform,
    Pressable,
    ScrollView,
    Text,
    View,
    useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native-unistyles';

import { useAuth } from '@/auth/AuthContext';
import { authGetToken } from '@/auth/authGetToken';
import { SidebarView } from '@/components/layout/SidebarView';
import { HomeMainPanel } from '@/components/layout/HomeMainPanel';
import { MainView } from '@/components/layout/MainView';
import { PreviewSessionCard } from '@/components/session/PreviewSessionCard';
import { encodeBase64 } from '@/encryption/base64';
import { getCurrentLanguage, t } from '@/text';
import { trackAccountCreated, trackAccountRestored } from '@/track';

const DESKTOP_BREAKPOINT = 1180;

type LandingCopy = {
    eyebrow: string;
    trustEncrypted: string;
    trustLocal: string;
    previewTitle: string;
    previewCount: string;
    primarySessionTitle: string;
    primarySessionSubtitle: string;
    primarySessionMeta: string;
    secondarySessionTitle: string;
    secondarySessionSubtitle: string;
    secondarySessionMeta: string;
    deny: string;
    approve: string;
    openServer: string;
    brand: string;
};

const ENGLISH_LANDING_COPY: LandingCopy = {
    eyebrow: 'Aha Session Control',
    trustEncrypted: 'End-to-end encrypted',
    trustLocal: 'Stored only on your device',
    previewTitle: 'Live sessions',
    previewCount: '2 active',
    primarySessionTitle: 'shell-alignment-fix',
    primarySessionSubtitle: 'Reviewing spacing, rail states, and responsive shell behavior',
    primarySessionMeta: 'active now',
    secondarySessionTitle: 'restore-account-flow',
    secondarySessionSubtitle: 'Needs approval before shipping the first-run auth experience',
    secondarySessionMeta: 'awaiting decision',
    deny: 'Deny',
    approve: 'Approve',
    openServer: 'Open server settings',
    brand: 'Aha',
};

const CHINESE_LANDING_COPY: LandingCopy = {
    eyebrow: 'Aha 会话控制',
    trustEncrypted: '端到端加密',
    trustLocal: '仅存储在你的设备上',
    previewTitle: '实时会话',
    previewCount: '2 个活跃',
    primarySessionTitle: 'shell-alignment-fix',
    primarySessionSubtitle: '正在检查三栏间距、导航状态与响应式布局',
    primarySessionMeta: '当前活跃',
    secondarySessionTitle: 'restore-account-flow',
    secondarySessionSubtitle: '首次登录体验发布前需要确认授权步骤',
    secondarySessionMeta: '等待决策',
    deny: '拒绝',
    approve: '批准',
    openServer: '打开服务设置',
    brand: 'Aha',
};

const styles = StyleSheet.create(() => ({
    shellContent: {
        flex: 1,
        minHeight: 0,
    },
    landingScreen: {
        flex: 1,
        backgroundColor: '#FCFBF8',
    },
    landingDesktopOuter: {
        flex: 1,
        paddingHorizontal: 28,
    },
    landingDesktopHeader: {
        width: '100%',
        maxWidth: 1360,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 20,
        marginBottom: 56,
    },
    landingDesktopBrand: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    landingDesktopBrandText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1A1209',
    },
    landingIconShell: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E8E4DF',
        backgroundColor: '#FFFFFF',
    },
    landingIconShellDark: {
        backgroundColor: '#1A1209',
        borderColor: '#1A1209',
    },
    landingDesktopMain: {
        flex: 1,
        width: '100%',
        maxWidth: 1360,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 80,
    },
    landingCopyColumn: {
        flex: 1,
        maxWidth: 560,
    },
    landingEyebrow: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 8,
        borderWidth: 1,
        borderColor: '#E8E4DF',
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#FAF8F5',
    },
    landingEyebrowDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#FFB547',
    },
    landingEyebrowText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#8A7F74',
        letterSpacing: 0.2,
    },
    landingTitle: {
        marginTop: 20,
        fontSize: 56,
        lineHeight: 60,
        fontWeight: '800',
        color: '#1A1209',
    },
    landingSubtitle: {
        marginTop: 20,
        maxWidth: 470,
        fontSize: 18,
        lineHeight: 29,
        color: '#8A7F74',
    },
    landingActionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 28,
    },
    landingButton: {
        minHeight: 48,
        borderRadius: 24,
        paddingHorizontal: 18,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 1,
    },
    landingButtonPrimary: {
        backgroundColor: '#1A1209',
        borderColor: '#1A1209',
    },
    landingButtonSecondary: {
        backgroundColor: '#FFFFFF',
        borderColor: '#E8E4DF',
    },
    landingButtonGhost: {
        backgroundColor: '#FFFFFF',
        borderColor: '#E8E4DF',
        minHeight: 36,
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    landingButtonDanger: {
        backgroundColor: '#FFF5F5',
        borderColor: '#F2D5D5',
        minHeight: 36,
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    landingButtonPrimaryText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FAF8F5',
    },
    landingButtonSecondaryText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1A1209',
    },
    landingTrustRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 20,
        marginTop: 18,
    },
    landingTrustItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    landingTrustText: {
        fontSize: 12,
        color: '#9C8F83',
    },
    landingPreviewPanel: {
        width: '100%',
        maxWidth: 420,
        minHeight: 560,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#ECE6DE',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 24,
        paddingVertical: 28,
        shadowColor: '#1A1209',
        shadowOffset: { width: 0, height: 18 },
        shadowOpacity: 0.08,
        shadowRadius: 36,
        elevation: 8,
    },
    landingPreviewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 14,
    },
    landingPreviewTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#8A7F74',
    },
    landingPreviewBadge: {
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
        backgroundColor: '#EEFAF2',
    },
    landingPreviewBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#2BC866',
    },
    landingPreviewActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 8,
        marginTop: 14,
    },
    landingPreviewSpacer: {
        flex: 1,
    },
    landingMobileScroll: {
        flex: 1,
        backgroundColor: '#FCFBF8',
    },
    landingMobileContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        alignItems: 'stretch',
    },
    landingMobileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 28,
    },
    landingMobileBrand: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    landingMobileBrandText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1A1209',
    },
    landingMobileBody: {
        width: '100%',
        maxWidth: 420,
        alignSelf: 'center',
    },
    landingMobileTitle: {
        marginTop: 18,
        fontSize: 38,
        lineHeight: 42,
        fontWeight: '800',
        color: '#1A1209',
    },
    landingMobileSubtitle: {
        marginTop: 18,
        fontSize: 16,
        lineHeight: 25,
        color: '#8A7F74',
    },
    landingMobileActions: {
        marginTop: 24,
        gap: 12,
    },
    landingMobilePreview: {
        width: '100%',
        marginTop: 28,
    },
}));

function LandingButton({
    icon,
    title,
    onPress,
    tone,
}: {
    icon?: keyof typeof Ionicons.glyphMap;
    title: string;
    onPress: () => void;
    tone: 'primary' | 'secondary' | 'ghost' | 'danger';
}) {
    const buttonStyle = tone === 'primary'
        ? styles.landingButtonPrimary
        : tone === 'secondary'
            ? styles.landingButtonSecondary
            : tone === 'danger'
                ? styles.landingButtonDanger
                : styles.landingButtonGhost;
    const textStyle = tone === 'primary'
        ? styles.landingButtonPrimaryText
        : styles.landingButtonSecondaryText;
    const iconColor = tone === 'primary' ? '#FAF8F5' : tone === 'danger' ? '#D84848' : '#1A1209';

    return (
        <Pressable style={[styles.landingButton, buttonStyle]} onPress={onPress}>
            {icon ? <Ionicons name={icon} size={16} color={iconColor} /> : null}
            <Text style={textStyle}>{title}</Text>
        </Pressable>
    );
}

function TrustItem({
    icon,
    label,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
}) {
    return (
        <View style={styles.landingTrustItem}>
            <Ionicons name={icon} size={14} color="#B2A596" />
            <Text style={styles.landingTrustText}>{label}</Text>
        </View>
    );
}

function AuthenticatedHome() {
    const { width } = useWindowDimensions();
    const isDesktopShell = Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;

    if (isDesktopShell) {
        return (
            <View style={styles.shellContent}>
                <SidebarView
                    mainPanel={(
                        <View style={styles.shellContent}>
                            <HomeMainPanel />
                        </View>
                    )}
                />
            </View>
        );
    }

    return <MainView variant="phone" />;
}

function NotAuthenticated() {
    const auth = useAuth();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;
    const copy = getCurrentLanguage() === 'zh-Hans' ? CHINESE_LANDING_COPY : ENGLISH_LANDING_COPY;

    const handleCreateAccount = React.useCallback(async () => {
        try {
            const secret = await getRandomBytesAsync(32);
            const token = await authGetToken(secret);
            if (token && secret) {
                await auth.login(token, encodeBase64(secret, 'base64url'));
                trackAccountCreated();
            }
        } catch (error) {
            console.error('Error creating account', error);
        }
    }, [auth]);

    const handleRestore = React.useCallback(() => {
        trackAccountRestored();
        router.push('/restore');
    }, [router]);

    const handleOpenServer = React.useCallback(() => {
        router.push('/server');
    }, [router]);

    const previewPanel = (
        <View style={styles.landingPreviewPanel}>
            <View style={styles.landingPreviewHeader}>
                <Text style={styles.landingPreviewTitle}>{copy.previewTitle}</Text>
                <View style={styles.landingPreviewBadge}>
                    <Text style={styles.landingPreviewBadgeText}>{copy.previewCount}</Text>
                </View>
            </View>
            <PreviewSessionCard
                accentColor="#FFB547"
                backgroundColor="#FFFBF5"
                borderColor="#FDB75A"
                title={copy.primarySessionTitle}
                subtitle={copy.primarySessionSubtitle}
                meta={copy.primarySessionMeta}
            />
            <PreviewSessionCard
                accentColor="#EF6A61"
                backgroundColor="#FFF5F5"
                borderColor="#F18B86"
                title={copy.secondarySessionTitle}
                subtitle={copy.secondarySessionSubtitle}
                meta={copy.secondarySessionMeta}
            >
                <View style={styles.landingPreviewActions}>
                    <LandingButton title={copy.deny} onPress={() => {}} tone="danger" />
                    <LandingButton title={copy.approve} onPress={() => {}} tone="primary" />
                </View>
            </PreviewSessionCard>
            <View style={styles.landingPreviewSpacer} />
        </View>
    );

    if (isDesktop) {
        return (
            <View
                style={[
                    styles.landingScreen,
                    {
                        paddingTop: insets.top + 24,
                        paddingBottom: Math.max(insets.bottom, 24),
                    },
                ]}
            >
                <View style={styles.landingDesktopOuter}>
                    <View style={styles.landingDesktopHeader}>
                        <View style={styles.landingDesktopBrand}>
                            <View style={[styles.landingIconShell, styles.landingIconShellDark]}>
                                <Ionicons name="terminal-outline" size={16} color="#FAF8F5" />
                            </View>
                            <Text style={styles.landingDesktopBrandText}>{copy.brand}</Text>
                        </View>
                        <Pressable
                            accessibilityLabel={copy.openServer}
                            style={styles.landingIconShell}
                            onPress={handleOpenServer}
                        >
                            <Ionicons name="server-outline" size={16} color="#1A1209" />
                        </Pressable>
                    </View>

                    <View style={styles.landingDesktopMain}>
                        <View style={styles.landingCopyColumn}>
                            <View style={styles.landingEyebrow}>
                                <View style={styles.landingEyebrowDot} />
                                <Text style={styles.landingEyebrowText}>{copy.eyebrow}</Text>
                            </View>
                            <Text style={styles.landingTitle}>{t('welcome.title')}</Text>
                            <Text style={styles.landingSubtitle}>{t('welcome.subtitle')}</Text>

                            <View style={styles.landingActionsRow}>
                                <LandingButton
                                    icon="phone-portrait-outline"
                                    title={t('welcome.loginWithMobileApp')}
                                    onPress={handleRestore}
                                    tone="primary"
                                />
                                <LandingButton
                                    title={t('welcome.createAccount')}
                                    onPress={handleCreateAccount}
                                    tone="secondary"
                                />
                            </View>

                            <View style={styles.landingTrustRow}>
                                <TrustItem icon="lock-closed-outline" label={copy.trustEncrypted} />
                                <TrustItem icon="phone-portrait-outline" label={copy.trustLocal} />
                            </View>
                        </View>

                        {previewPanel}
                    </View>
                </View>
            </View>
        );
    }

    const secondaryTitle = Platform.OS === 'android' || Platform.OS === 'ios'
        ? t('welcome.linkOrRestoreAccount')
        : t('welcome.createAccount');
    const secondaryAction = Platform.OS === 'android' || Platform.OS === 'ios'
        ? handleRestore
        : handleCreateAccount;

    return (
        <ScrollView
            style={styles.landingMobileScroll}
            contentContainerStyle={[
                styles.landingMobileContent,
                {
                    paddingTop: insets.top + 24,
                    paddingBottom: insets.bottom + 32,
                },
            ]}
        >
            <View style={styles.landingMobileHeader}>
                <View style={styles.landingMobileBrand}>
                    <View style={[styles.landingIconShell, styles.landingIconShellDark]}>
                        <Ionicons name="terminal-outline" size={16} color="#FAF8F5" />
                    </View>
                    <Text style={styles.landingMobileBrandText}>{copy.brand}</Text>
                </View>
                <Pressable accessibilityLabel={copy.openServer} style={styles.landingIconShell} onPress={handleOpenServer}>
                    <Ionicons name="server-outline" size={16} color="#1A1209" />
                </Pressable>
            </View>

            <View style={styles.landingMobileBody}>
                <View style={styles.landingEyebrow}>
                    <View style={styles.landingEyebrowDot} />
                    <Text style={styles.landingEyebrowText}>{copy.eyebrow}</Text>
                </View>
                <Text style={styles.landingMobileTitle}>{t('welcome.title')}</Text>
                <Text style={styles.landingMobileSubtitle}>{t('welcome.subtitle')}</Text>

                <View style={styles.landingMobileActions}>
                    <LandingButton
                        icon={Platform.OS === 'android' || Platform.OS === 'ios' ? undefined : 'phone-portrait-outline'}
                        title={Platform.OS === 'android' || Platform.OS === 'ios'
                            ? t('welcome.createAccount')
                            : t('welcome.loginWithMobileApp')}
                        onPress={Platform.OS === 'android' || Platform.OS === 'ios' ? handleCreateAccount : handleRestore}
                        tone="primary"
                    />
                    <LandingButton
                        title={secondaryTitle}
                        onPress={secondaryAction}
                        tone="secondary"
                    />
                </View>

                <View style={styles.landingTrustRow}>
                    <TrustItem icon="lock-closed-outline" label={copy.trustEncrypted} />
                    <TrustItem icon="phone-portrait-outline" label={copy.trustLocal} />
                </View>

                <View style={styles.landingMobilePreview}>
                    {previewPanel}
                </View>
            </View>
        </ScrollView>
    );
}

export default function Home() {
    const auth = useAuth();

    if (!auth.isAuthenticated) {
        return <NotAuthenticated />;
    }

    return <AuthenticatedHome />;
}
