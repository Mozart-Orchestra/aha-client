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
import { hasPendingTerminalConnectRequest } from '@/auth/pendingTerminalConnect';
import { SidebarView } from '@/components/layout/SidebarView';
import { HomeMainPanel } from '@/components/layout/HomeMainPanel';
import { MainView } from '@/components/layout/MainView';
import { PreviewSessionCard } from '@/components/session/PreviewSessionCard';
import { encodeBase64 } from '@/encryption/base64';
import { useAllSessions } from '@/sync/storage';
import { isSessionActive } from '@/utils/sessionUtils';
import { getCurrentLanguage, t } from '@/text';
import { trackAccountCreated, trackAccountRestored } from '@/track';

const DESKTOP_BREAKPOINT = 1180;

type LandingCopy = {
    eyebrow: string;
    trustEncrypted: string;
    trustLocal: string;
    previewTitle: string;
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
    teamAgent1: string;
    teamAgent1Task: string;
    teamAgent1Machine: string;
    teamAgent2: string;
    teamAgent2Task: string;
    teamAgent2Machine: string;
    teamAgent3: string;
    teamAgent3Task: string;
    teamAgent3Machine: string;
    teamAgent4: string;
    teamAgent4Task: string;
    teamAgent4Machine: string;
    cliCommand: string;
};

const ENGLISH_LANDING_COPY: LandingCopy = {
    eyebrow: 'Claude Code + Codex Orchestration',
    trustEncrypted: 'End-to-end encrypted',
    trustLocal: 'Any machine, anywhere',
    previewTitle: 'Team: aha-saas-mvp',
    primarySessionTitle: 'Architect',
    primarySessionSubtitle: 'Designing system architecture and distributing tasks to the team',
    primarySessionMeta: 'leading',
    secondarySessionTitle: 'Builder',
    secondarySessionSubtitle: 'Implementing authentication module based on Architect\'s design',
    secondarySessionMeta: 'coding',
    deny: 'Deny',
    approve: 'Approve',
    openServer: 'Open server settings',
    brand: 'Aha',
    teamAgent1: 'Architect',
    teamAgent1Task: 'System design & task distribution',
    teamAgent1Machine: 'Mac Studio',
    teamAgent2: 'Builder',
    teamAgent2Task: 'Auth module + API endpoints',
    teamAgent2Machine: 'Linux Server',
    teamAgent3: 'QA',
    teamAgent3Task: 'E2E tests & integration tests',
    teamAgent3Machine: 'Windows PC',
    teamAgent4: 'DevOps',
    teamAgent4Task: 'CI/CD pipeline & deployment',
    teamAgent4Machine: 'GPU Cloud',
    cliCommand: 'npx aha teams spawn saas-mvp',
};

const CHINESE_LANDING_COPY: LandingCopy = {
    eyebrow: 'Claude Code + Codex 编排',
    trustEncrypted: '端到端加密',
    trustLocal: '任意机器，随处运行',
    previewTitle: '团队: aha-saas-mvp',
    primarySessionTitle: '架构师',
    primarySessionSubtitle: '设计系统架构，向团队分发任务',
    primarySessionMeta: '领导中',
    secondarySessionTitle: 'Builder',
    secondarySessionSubtitle: '根据架构师的设计实现认证模块',
    secondarySessionMeta: '编码中',
    deny: '拒绝',
    approve: '批准',
    openServer: '打开服务设置',
    brand: 'Aha',
    teamAgent1: '架构师',
    teamAgent1Task: '系统设计 & 任务分发',
    teamAgent1Machine: 'Mac Studio',
    teamAgent2: 'Builder',
    teamAgent2Task: '认证模块 + API 接口',
    teamAgent2Machine: 'Linux 服务器',
    teamAgent3: 'QA',
    teamAgent3Task: 'E2E 测试 & 集成测试',
    teamAgent3Machine: 'Windows PC',
    teamAgent4: 'DevOps',
    teamAgent4Task: 'CI/CD 流水线 & 部署',
    teamAgent4Machine: 'GPU 云',
    cliCommand: 'npx aha teams spawn saas-mvp',
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
    const previewSessions = useAllSessions();
    const isDesktop = Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;
    const copy = getCurrentLanguage() === 'zh-Hans' ? CHINESE_LANDING_COPY : ENGLISH_LANDING_COPY;
    const liveSessionCount = React.useMemo(() => (
        previewSessions.filter((session) => (
            isSessionActive(session) || session.presence === 'online' || session.thinking
        )).length
    ), [previewSessions]);
    const previewCountLabel = React.useMemo(() => {
        return getCurrentLanguage() === 'zh-Hans'
            ? `${liveSessionCount} 个活跃`
            : `${liveSessionCount} active`;
    }, [liveSessionCount]);

    const handleCreateAccount = React.useCallback(async () => {
        try {
            const secret = await getRandomBytesAsync(32);
            const token = await authGetToken(secret, 'create');
            if (token && secret) {
                await auth.login(token, encodeBase64(secret, 'base64url'));
                trackAccountCreated();
                if (hasPendingTerminalConnectRequest()) {
                    router.replace('/terminal/connect');
                }
            }
        } catch (error) {
            console.error('Error creating account', error);
        }
    }, [auth, router]);

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
                    <Text style={styles.landingPreviewBadgeText}>4 agents</Text>
                </View>
            </View>
            {[
                { name: copy.teamAgent1, task: copy.teamAgent1Task, machine: copy.teamAgent1Machine, color: '#FFB547', bg: '#FFFBF5', border: '#FDB75A', status: copy.primarySessionMeta },
                { name: copy.teamAgent2, task: copy.teamAgent2Task, machine: copy.teamAgent2Machine, color: '#4A9EFF', bg: '#F5F9FF', border: '#7BB8FF', status: copy.secondarySessionMeta },
                { name: copy.teamAgent3, task: copy.teamAgent3Task, machine: copy.teamAgent3Machine, color: '#2BC866', bg: '#F2FBF5', border: '#6DD99A', status: 'testing' },
                { name: copy.teamAgent4, task: copy.teamAgent4Task, machine: copy.teamAgent4Machine, color: '#A78BFA', bg: '#F8F5FF', border: '#C4B5FD', status: 'deploying' },
            ].map((agent, i) => (
                <View key={i} style={{ marginTop: i === 0 ? 0 : 8, borderRadius: 14, borderWidth: 1, borderColor: agent.border, backgroundColor: agent.bg, padding: 14 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: agent.color }} />
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1209', flex: 1 }}>{agent.name}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Ionicons name="hardware-chip-outline" size={11} color="#9C8F83" />
                            <Text style={{ fontSize: 10, color: '#9C8F83' }}>{agent.machine}</Text>
                        </View>
                    </View>
                    <Text style={{ fontSize: 12, color: '#8A7F74', marginTop: 4 }}>{agent.task}</Text>
                    <Text style={{ fontSize: 10, color: agent.color, marginTop: 4, fontWeight: '600' }}>{agent.status}</Text>
                </View>
            ))}
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
                                    icon="terminal-outline"
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
                                <TrustItem icon="globe-outline" label={copy.trustLocal} />
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
                        icon={Platform.OS === 'android' || Platform.OS === 'ios' ? undefined : 'terminal-outline'}
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
                    <TrustItem icon="globe-outline" label={copy.trustLocal} />
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
