import * as React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getRandomBytesAsync } from 'expo-crypto';
import {
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
    useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import * as Clipboard from 'expo-clipboard';

import { useAuth, getNeedsRestore, setNeedsRestore } from '@/auth/AuthContext';
import { authGetToken } from '@/auth/authGetToken';
import { hasPendingTerminalConnectRequest } from '@/auth/pendingTerminalConnect';
import { normalizeSecretKey } from '@/auth/secretKeyBackup';
import { decodeBase64 } from '@/encryption/base64';
import { signInWithGoogle, signInWithEmail, verifyEmailOtp, exchangeSupabaseSession, SupabaseRestoreRequiredError } from '@/auth/supabaseAuth';
import { supabase } from '@/auth/supabase';
import { SidebarView } from '@/components/layout/SidebarView';
import { HomeMainPanel } from '@/components/layout/HomeMainPanel';
import { MainView } from '@/components/layout/MainView';
import { PreviewSessionCard } from '@/components/session/PreviewSessionCard';
import { encodeBase64 } from '@/encryption/base64';
import { Modal } from '@/modal';
import { useAllSessions } from '@/sync/storage';
import { isSessionActive } from '@/utils/sessionUtils';
import { t } from '@/text';
import { trackAccountCreated, trackAccountRestored } from '@/track';

const DESKTOP_BREAKPOINT = 1180;

const styles = StyleSheet.create((theme) => ({
    shellContent: {
        flex: 1,
        minHeight: 0,
    },
    landingScreen: {
        flex: 1,
        backgroundColor: theme.colors.groupped.background,
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
        color: theme.colors.text,
    },
    landingIconShell: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: theme.colors.divider,
        backgroundColor: theme.colors.surface,
    },
    landingIconShellDark: {
        backgroundColor: theme.colors.text,
        borderColor: theme.colors.text,
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
        borderColor: theme.colors.divider,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: theme.colors.surfaceHigh,
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
        color: theme.colors.textSecondary,
        letterSpacing: 0.2,
    },
    landingTitle: {
        marginTop: 20,
        fontSize: 56,
        lineHeight: 60,
        fontWeight: '800',
        color: theme.colors.text,
    },
    landingSubtitle: {
        marginTop: 20,
        maxWidth: 470,
        fontSize: 18,
        lineHeight: 29,
        color: theme.colors.textSecondary,
    },
    landingActionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 28,
    },
    landingInput: {
        minHeight: 48,
        borderRadius: 24,
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        backgroundColor: theme.colors.surface,
        color: theme.colors.text,
        fontSize: 15,
        width: '100%',
    },
    landingOtpInput: {
        minHeight: 56,
        borderRadius: 16,
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderWidth: 2,
        borderColor: theme.colors.text,
        backgroundColor: theme.colors.surface,
        color: theme.colors.text,
        fontSize: 28,
        fontFamily: 'IBMPlexMono-SemiBold',
        letterSpacing: 12,
        textAlign: 'center',
        width: '100%',
    },
    landingOtpHint: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginBottom: 4,
    },
    landingResendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
    },
    landingResendText: {
        fontSize: 13,
        color: theme.colors.text,
        textDecorationLine: 'underline',
    },
    landingResendTextDisabled: {
        color: theme.colors.textSecondary,
        textDecorationLine: 'none',
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
        backgroundColor: theme.colors.text,
        borderColor: theme.colors.text,
    },
    landingButtonSecondary: {
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.divider,
    },
    landingButtonGhost: {
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.divider,
        minHeight: 36,
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    landingButtonDanger: {
        backgroundColor: theme.colors.box.error.background,
        borderColor: theme.colors.box.error.border,
        minHeight: 36,
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    landingButtonPrimaryText: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.surface,
    },
    landingButtonSecondaryText: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.text,
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
        color: theme.colors.textSecondary,
    },
    landingPreviewPanel: {
        width: '100%',
        maxWidth: 420,
        minHeight: 560,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        backgroundColor: theme.colors.surface,
        paddingHorizontal: 24,
        paddingVertical: 28,
        shadowColor: theme.colors.shadow.color,
        shadowOffset: { width: 0, height: 18 },
        shadowOpacity: theme.colors.shadow.opacity,
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
        color: theme.colors.textSecondary,
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
        backgroundColor: theme.colors.groupped.background,
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
        color: theme.colors.text,
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
        color: theme.colors.text,
    },
    landingMobileSubtitle: {
        marginTop: 18,
        fontSize: 16,
        lineHeight: 25,
        color: theme.colors.textSecondary,
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
    const { theme } = useUnistyles();
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
    const iconColor = tone === 'primary' ? theme.colors.surface : tone === 'danger' ? theme.colors.textDestructive : theme.colors.text;

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
    const { theme } = useUnistyles();
    return (
        <View style={styles.landingTrustItem}>
            <Ionicons name={icon} size={14} color={theme.colors.textSecondary} />
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
    const { theme } = useUnistyles();
    const previewSessions = useAllSessions();
    const isDesktop = Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;
    const liveSessionCount = React.useMemo(() => (
        previewSessions.filter((session) => (
            isSessionActive(session) || session.presence === 'online' || session.thinking
        )).length
    ), [previewSessions]);
    const previewCountLabel = React.useMemo(() => {
        return t('landing.activeCount', { count: liveSessionCount });
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

    const handleCopyCliCommand = React.useCallback(async () => {
        await Clipboard.setStringAsync(t('landing.cliCommand'));
        Modal.alert(
            t('landing.cliCopiedTitle'),
            t('landing.cliCopiedMessage'),
        );
    }, []);

    // Show restore key input if account exists but local secret is missing
    const initialNeedsRestore = React.useMemo(() => getNeedsRestore(), []);
    const [emailLoginStep, setEmailLoginStep] = React.useState<'idle' | 'email' | 'otp' | 'restore'>(initialNeedsRestore ? 'restore' : 'idle');
    const [restoreKey, setRestoreKey] = React.useState('');

    const handleRestoreKeySubmit = React.useCallback(async () => {
        if (!restoreKey.trim()) return;
        setEmailLoading(true);
        try {
            const secretBase64 = normalizeSecretKey(restoreKey.trim());
            const secretBytes = decodeBase64(secretBase64, 'base64url');
            const token = await authGetToken(secretBytes);
            await auth.login(token, secretBase64);
            setNeedsRestore(false);
            if (hasPendingTerminalConnectRequest()) {
                router.replace('/terminal/connect');
            }
        } catch (error) {
            Modal.alert(t('common.error'), String(error instanceof Error ? error.message : error));
        } finally {
            setEmailLoading(false);
        }
    }, [restoreKey, auth, router]);

    // Email OTP login state
    const [email, setEmail] = React.useState('');
    const [otp, setOtp] = React.useState('');
    const [emailLoading, setEmailLoading] = React.useState(false);
    const [resendCooldown, setResendCooldown] = React.useState(0);

    // 60s resend cooldown timer
    React.useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
        return () => clearTimeout(timer);
    }, [resendCooldown]);

    const handleEmailLogin = React.useCallback(() => {
        setEmailLoginStep('email');
    }, []);

    const handleSendOtp = React.useCallback(async () => {
        if (!email.trim() || resendCooldown > 0) return;
        setEmailLoading(true);
        try {
            await signInWithEmail(email.trim());
            setEmailLoginStep('otp');
            setResendCooldown(60);
        } catch (error) {
            Modal.alert(t('common.error'), String(error instanceof Error ? error.message : error));
        } finally {
            setEmailLoading(false);
        }
    }, [email, resendCooldown]);

    const handleResendOtp = React.useCallback(async () => {
        if (resendCooldown > 0) return;
        setEmailLoading(true);
        try {
            await signInWithEmail(email.trim());
            setResendCooldown(60);
        } catch (error) {
            Modal.alert(t('common.error'), String(error instanceof Error ? error.message : error));
        } finally {
            setEmailLoading(false);
        }
    }, [email, resendCooldown]);

    /**
     * After Supabase session is obtained (Google or Email OTP),
     * generate a client-side secret, register with server, and login.
     * If account already exists (RESTORE_REQUIRED), prompt for restore key.
     */
    const completeSupabaseLogin = React.useCallback(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        const secret = await getRandomBytesAsync(32);
        const result = await exchangeSupabaseSession(session.access_token, secret);
        await auth.login(result.token, encodeBase64(secret, 'base64url'));
        if (hasPendingTerminalConnectRequest()) {
            router.replace('/terminal/connect');
        }
    }, [auth, router]);

    const handleVerifyOtp = React.useCallback(async () => {
        if (!otp.trim()) return;
        setEmailLoading(true);
        try {
            await verifyEmailOtp(email.trim(), otp.trim());
            await completeSupabaseLogin();
        } catch (error) {
            if (error instanceof SupabaseRestoreRequiredError) {
                Modal.alert(
                    t('welcome.restoreRequired'),
                    t('welcome.restoreRequiredMessage'),
                );
                setEmailLoginStep('idle');
            } else {
                Modal.alert(t('common.error'), String(error instanceof Error ? error.message : error));
            }
        } finally {
            setEmailLoading(false);
        }
    }, [email, otp, completeSupabaseLogin]);

    const handleGoogleLogin = React.useCallback(async () => {
        try {
            await signInWithGoogle();

            // On web, signInWithOAuth redirects the page — session is picked up on reload.
            // On native, the session is set after the browser returns.
            if (Platform.OS !== 'web') {
                await completeSupabaseLogin();
            }
        } catch (error) {
            if (error instanceof SupabaseRestoreRequiredError) {
                Modal.alert(
                    t('welcome.restoreRequired'),
                    t('welcome.restoreRequiredMessage'),
                );
            } else {
                Modal.alert('Error', 'Google sign-in failed. Please try again.');
            }
        }
    }, [completeSupabaseLogin]);

    const previewPanel = (
        <View style={styles.landingPreviewPanel}>
            <View style={styles.landingPreviewHeader}>
                <Text style={styles.landingPreviewTitle}>{t('landing.previewTitle')}</Text>
                <View style={styles.landingPreviewBadge}>
                    <Text style={styles.landingPreviewBadgeText}>{t('landing.previewAgentCount', { count: 4 })}</Text>
                </View>
            </View>
            {[
                { name: t('landing.teamAgent1'), task: t('landing.teamAgent1Task'), machine: t('landing.teamAgent1Machine'), color: '#FFB547', bg: '#FFFBF5', border: '#FDB75A', status: t('landing.primarySessionMeta') },
                { name: t('landing.teamAgent2'), task: t('landing.teamAgent2Task'), machine: t('landing.teamAgent2Machine'), color: '#4A9EFF', bg: '#F5F9FF', border: '#7BB8FF', status: t('landing.secondarySessionMeta') },
                { name: t('landing.teamAgent3'), task: t('landing.teamAgent3Task'), machine: t('landing.teamAgent3Machine'), color: '#2BC866', bg: '#F2FBF5', border: '#6DD99A', status: t('landing.agentStatusTesting') },
                { name: t('landing.teamAgent4'), task: t('landing.teamAgent4Task'), machine: t('landing.teamAgent4Machine'), color: '#A78BFA', bg: '#F8F5FF', border: '#C4B5FD', status: t('landing.agentStatusDeploying') },
            ].map((agent, i) => (
                <View key={i} style={{ marginTop: i === 0 ? 0 : 8, borderRadius: 14, borderWidth: 1, borderColor: agent.border, backgroundColor: agent.bg, padding: 14 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: agent.color }} />
                        <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.text, flex: 1 }}>{agent.name}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Ionicons name="hardware-chip-outline" size={11} color={theme.colors.textSecondary} />
                            <Text style={{ fontSize: 10, color: theme.colors.textSecondary }}>{agent.machine}</Text>
                        </View>
                    </View>
                    <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 }}>{agent.task}</Text>
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
                                <Text style={{ color: theme.colors.surface, fontSize: 16, fontWeight: '700' }}>A</Text>
                            </View>
                            <Text style={styles.landingDesktopBrandText}>{t('landing.brand')}</Text>
                        </View>
                        <Pressable
                            accessibilityLabel={t('landing.openServer')}
                            style={styles.landingIconShell}
                            onPress={handleOpenServer}
                        >
                            <Ionicons name="server-outline" size={16} color={theme.colors.text} />
                        </Pressable>
                    </View>

                    <View style={styles.landingDesktopMain}>
                        <View style={styles.landingCopyColumn}>
                            <View style={styles.landingEyebrow}>
                                <View style={styles.landingEyebrowDot} />
                                <Text style={styles.landingEyebrowText}>{t('landing.eyebrow')}</Text>
                            </View>
                            <Text style={styles.landingTitle}>{t('welcome.title')}</Text>
                            <Text style={styles.landingSubtitle}>{t('welcome.subtitle')}</Text>

                            {emailLoginStep === 'restore' ? (
                                <View style={styles.landingActionsRow}>
                                    <Text style={styles.landingOtpHint}>{t('welcome.restoreRequiredMessage')}</Text>
                                    <TextInput
                                        style={styles.landingInput}
                                        placeholder={t('welcome.restoreKeyPlaceholder')}
                                        placeholderTextColor={theme.colors.textSecondary}
                                        value={restoreKey}
                                        onChangeText={setRestoreKey}
                                        autoCapitalize="characters"
                                        autoFocus
                                        onSubmitEditing={handleRestoreKeySubmit}
                                    />
                                    <LandingButton
                                        title={emailLoading ? t('common.loading') : t('welcome.restoreSubmit')}
                                        onPress={handleRestoreKeySubmit}
                                        tone="primary"
                                    />
                                    <LandingButton
                                        title={t('common.back')}
                                        onPress={() => setEmailLoginStep('idle')}
                                        tone="ghost"
                                    />
                                </View>
                            ) : emailLoginStep === 'idle' ? (
                                <View style={styles.landingActionsRow}>
                                    <LandingButton
                                        icon="logo-google"
                                        title={t('welcome.signInWithGoogle')}
                                        onPress={handleGoogleLogin}
                                        tone="primary"
                                    />
                                    <LandingButton
                                        icon="mail-outline"
                                        title={t('welcome.signInWithEmail')}
                                        onPress={handleEmailLogin}
                                        tone="secondary"
                                    />
                                    <LandingButton
                                        icon="key-outline"
                                        title={t('welcome.linkOrRestoreAccount')}
                                        onPress={() => setEmailLoginStep('restore')}
                                        tone="ghost"
                                    />
                                </View>
                            ) : emailLoginStep === 'email' ? (
                                <View style={styles.landingActionsRow}>
                                    <TextInput
                                        style={styles.landingInput}
                                        placeholder={t('welcome.emailPlaceholder')}
                                        placeholderTextColor={theme.colors.textSecondary}
                                        value={email}
                                        onChangeText={setEmail}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        autoFocus
                                        onSubmitEditing={handleSendOtp}
                                    />
                                    <LandingButton
                                        title={emailLoading ? t('common.loading') : t('welcome.sendCode')}
                                        onPress={handleSendOtp}
                                        tone="primary"
                                    />
                                    <LandingButton
                                        title={t('common.back')}
                                        onPress={() => setEmailLoginStep('idle')}
                                        tone="ghost"
                                    />
                                </View>
                            ) : (
                                <View style={styles.landingActionsRow}>
                                    <Text style={styles.landingOtpHint}>{t('welcome.otpSentTo', { email })}</Text>
                                    <TextInput
                                        style={styles.landingOtpInput}
                                        placeholder={t('welcome.otpPlaceholder')}
                                        placeholderTextColor={theme.colors.textSecondary}
                                        value={otp}
                                        onChangeText={setOtp}
                                        keyboardType="number-pad"
                                        maxLength={6}
                                        autoFocus
                                        onSubmitEditing={handleVerifyOtp}
                                    />
                                    <LandingButton
                                        title={emailLoading ? t('common.loading') : t('welcome.verifyCode')}
                                        onPress={handleVerifyOtp}
                                        tone="primary"
                                    />
                                    <View style={styles.landingResendRow}>
                                        <Pressable
                                            onPress={handleResendOtp}
                                            disabled={resendCooldown > 0}
                                        >
                                            <Text style={[
                                                styles.landingResendText,
                                                resendCooldown > 0 && styles.landingResendTextDisabled,
                                            ]}>
                                                {resendCooldown > 0
                                                    ? t('welcome.resendIn', { seconds: resendCooldown })
                                                    : t('welcome.resendCode')}
                                            </Text>
                                        </Pressable>
                                        <Pressable onPress={() => setEmailLoginStep('email')}>
                                            <Text style={styles.landingResendText}>{t('welcome.changeEmail')}</Text>
                                        </Pressable>
                                    </View>
                                </View>
                            )}

                            <View style={styles.landingTrustRow}>
                                <TrustItem icon="lock-closed-outline" label={t('landing.trustEncrypted')} />
                                <TrustItem icon="globe-outline" label={t('landing.trustLocal')} />
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
                        <Ionicons name="terminal-outline" size={16} color={theme.colors.surface} />
                    </View>
                    <Text style={styles.landingMobileBrandText}>{t('landing.brand')}</Text>
                </View>
                <Pressable accessibilityLabel={t('landing.openServer')} style={styles.landingIconShell} onPress={handleOpenServer}>
                    <Ionicons name="server-outline" size={16} color={theme.colors.text} />
                </Pressable>
            </View>

            <View style={styles.landingMobileBody}>
                <View style={styles.landingEyebrow}>
                    <View style={styles.landingEyebrowDot} />
                    <Text style={styles.landingEyebrowText}>{t('landing.eyebrow')}</Text>
                </View>
                <Text style={styles.landingMobileTitle}>{t('welcome.title')}</Text>
                <Text style={styles.landingMobileSubtitle}>{t('welcome.subtitle')}</Text>

                {emailLoginStep === 'restore' ? (
                    <View style={styles.landingMobileActions}>
                        <Text style={styles.landingOtpHint}>{t('welcome.restoreRequiredMessage')}</Text>
                        <TextInput
                            style={styles.landingInput}
                            placeholder={t('welcome.restoreKeyPlaceholder')}
                            placeholderTextColor={theme.colors.textSecondary}
                            value={restoreKey}
                            onChangeText={setRestoreKey}
                            autoCapitalize="characters"
                            autoFocus
                            onSubmitEditing={handleRestoreKeySubmit}
                        />
                        <LandingButton
                            title={emailLoading ? t('common.loading') : t('welcome.restoreSubmit')}
                            onPress={handleRestoreKeySubmit}
                            tone="primary"
                        />
                        <LandingButton
                            title={t('common.back')}
                            onPress={() => setEmailLoginStep('idle')}
                            tone="ghost"
                        />
                    </View>
                ) : emailLoginStep === 'idle' ? (
                    <View style={styles.landingMobileActions}>
                        <LandingButton
                            icon="logo-google"
                            title={t('welcome.signInWithGoogle')}
                            onPress={handleGoogleLogin}
                            tone="primary"
                        />
                        <LandingButton
                            icon="mail-outline"
                            title={t('welcome.signInWithEmail')}
                            onPress={handleEmailLogin}
                            tone="secondary"
                        />
                        <LandingButton
                            icon="key-outline"
                            title={t('welcome.linkOrRestoreAccount')}
                            onPress={() => setEmailLoginStep('restore')}
                            tone="ghost"
                        />
                    </View>
                ) : emailLoginStep === 'email' ? (
                    <View style={styles.landingMobileActions}>
                        <TextInput
                            style={styles.landingInput}
                            placeholder={t('welcome.emailPlaceholder')}
                            placeholderTextColor={theme.colors.textSecondary}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoFocus
                            onSubmitEditing={handleSendOtp}
                        />
                        <LandingButton
                            title={emailLoading ? t('common.loading') : t('welcome.sendCode')}
                            onPress={handleSendOtp}
                            tone="primary"
                        />
                        <LandingButton
                            title={t('common.back')}
                            onPress={() => setEmailLoginStep('idle')}
                            tone="ghost"
                        />
                    </View>
                ) : (
                    <View style={styles.landingMobileActions}>
                        <Text style={styles.landingOtpHint}>{t('welcome.otpSentTo', { email })}</Text>
                        <TextInput
                            style={styles.landingOtpInput}
                            placeholder={t('welcome.otpPlaceholder')}
                            placeholderTextColor={theme.colors.textSecondary}
                            value={otp}
                            onChangeText={setOtp}
                            keyboardType="number-pad"
                            maxLength={6}
                            autoFocus
                            onSubmitEditing={handleVerifyOtp}
                        />
                        <LandingButton
                            title={emailLoading ? t('common.loading') : t('welcome.verifyCode')}
                            onPress={handleVerifyOtp}
                            tone="primary"
                        />
                        <View style={styles.landingResendRow}>
                            <Pressable
                                onPress={handleResendOtp}
                                disabled={resendCooldown > 0}
                            >
                                <Text style={[
                                    styles.landingResendText,
                                    resendCooldown > 0 && styles.landingResendTextDisabled,
                                ]}>
                                    {resendCooldown > 0
                                        ? t('welcome.resendIn', { seconds: resendCooldown })
                                        : t('welcome.resendCode')}
                                </Text>
                            </Pressable>
                            <Pressable onPress={() => setEmailLoginStep('email')}>
                                <Text style={styles.landingResendText}>{t('welcome.changeEmail')}</Text>
                            </Pressable>
                        </View>
                    </View>
                )}

                <View style={styles.landingTrustRow}>
                    <TrustItem icon="lock-closed-outline" label={t('landing.trustEncrypted')} />
                    <TrustItem icon="globe-outline" label={t('landing.trustLocal')} />
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
