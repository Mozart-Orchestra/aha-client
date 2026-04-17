import * as React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getRandomBytesAsync } from 'expo-crypto';
import * as Clipboard from 'expo-clipboard';
import {
    Image as RNImage,
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

import { useAuth } from '@/auth/AuthContext';
import { getNeedsRestore, getNeedsRestoreReason } from '@/auth/AuthContext';
import { authGetToken } from '@/auth/authGetToken';
import { hasPendingTerminalConnectRequest } from '@/auth/pendingTerminalConnect';
import {
    completeSupabaseSession,
    signInWithGoogle,
    signInWithEmail,
    verifyEmailOtp,
} from '@/auth/supabaseAuth';
import { supabase } from '@/auth/supabase';
import { SidebarView } from '@/components/layout/SidebarView';
import { HomeMainPanel } from '@/components/layout/HomeMainPanel';
import { MainView } from '@/components/layout/MainView';
import { encodeBase64 } from '@/encryption/base64';
import { Modal } from '@/modal';
import { t } from '@/text';
import { trackAccountCreated } from '@/track';
import { getCliInstallAndLoginCommand } from '@/auth/cliCommands';

const DESKTOP_BREAKPOINT = 1180;
const LANDING_HERO_ARTWORK_ASPECT_RATIO = 2814 / 1536;

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
    landingButtonDangerText: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.textDestructive,
    },
    landingRestoreTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.text,
        marginTop: 8,
    },
    landingRestoreMessage: {
        fontSize: 14,
        lineHeight: 22,
        color: theme.colors.textSecondary,
        marginTop: 8,
        marginBottom: 4,
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
        alignSelf: 'center',
        flexShrink: 1,
    },
    landingPreviewArtwork: {
        width: '100%',
        aspectRatio: LANDING_HERO_ARTWORK_ASPECT_RATIO,
        alignSelf: 'center',
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
        : tone === 'danger'
            ? styles.landingButtonDangerText
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
    const isDesktop = Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;
    const previewPanelMaxWidth = React.useMemo(() => {
        if (isDesktop) {
            return Math.min(Math.max(width * 0.44, 420), 640);
        }

        return Math.min(width - 48, 520);
    }, [isDesktop, width]);

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

    const handleOpenServer = React.useCallback(() => {
        router.push('/server');
    }, [router]);

    const handleCopyCliCommand = React.useCallback(async () => {
        await Clipboard.setStringAsync(getCliInstallAndLoginCommand());
        Modal.alert(
            t('landing.cliCopiedTitle'),
            t('landing.cliCopiedMessage'),
        );
    }, []);

    // Show fallback recovery UI only when automatic Google/email recovery cannot complete.
    const [emailLoginStep, setEmailLoginStep] = React.useState<'idle' | 'email' | 'otp'>('idle');
    const [needsRestore, setNeedsRestoreState] = React.useState(getNeedsRestore());
    const needsRestoreReason = needsRestore ? getNeedsRestoreReason() : null;

    const pageTitle = t('welcome.title');
    const pageSubtitle = t('welcome.subtitle');

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
     * finish the canonical account flow via /v1/auth/supabase/complete.
     * Existing accounts recover the canonical secret; new accounts create one in memory.
     */
    const completeSupabaseLogin = React.useCallback(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        const result = await completeSupabaseSession(session.access_token);
        const invitationHint = result.invitationVerified ?? null;
        await auth.login(result.token, result.secretBase64, invitationHint);
        if (hasPendingTerminalConnectRequest()) {
            router.replace('/terminal/connect');
            return;
        }
        if (invitationHint === false) {
            router.replace('/invitation' as any);
        }
    }, [auth, router]);

    const handleVerifyOtp = React.useCallback(async () => {
        if (!otp.trim()) return;
        setEmailLoading(true);
        try {
            await verifyEmailOtp(email.trim(), otp.trim());
            await completeSupabaseLogin();
        } catch (error) {
            Modal.alert(t('common.error'), String(error instanceof Error ? error.message : error));
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
            Modal.alert(
                t('welcome.googleCallbackFailedTitle'),
                String(error instanceof Error ? error.message : t('welcome.googleSignInFailedFallback')),
            );
        }
    }, [completeSupabaseLogin]);

    const previewPanel = (
        <View style={[styles.landingPreviewPanel, { maxWidth: previewPanelMaxWidth }]}>
            <RNImage
                source={require('@/assets/images/landing/aha-legion-hero.webp')}
                resizeMode="contain"
                style={styles.landingPreviewArtwork}
            />
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
                            <Text style={styles.landingTitle}>{pageTitle}</Text>
                            <Text style={styles.landingSubtitle}>{pageSubtitle}</Text>

                            {needsRestore ? (
                                <View style={styles.landingActionsRow}>
                                    <Text style={styles.landingRestoreTitle}>
                                        {needsRestoreReason === 'recovery_not_ready'
                                            ? t('welcome.restoreRecoveryNotReadyTitle')
                                            : t('welcome.restoreRequired')}
                                    </Text>
                                    <Text style={styles.landingRestoreMessage}>
                                        {needsRestoreReason === 'recovery_not_ready'
                                            ? t('welcome.restoreRecoveryNotReadyMessage')
                                            : t('welcome.restoreRequiredMessage')}
                                    </Text>
                                    <LandingButton
                                        icon="logo-google"
                                        title={t('welcome.switchGoogleAccount')}
                                        onPress={handleGoogleLogin}
                                        tone="secondary"
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
                <Text style={styles.landingMobileTitle}>{pageTitle}</Text>
                <Text style={styles.landingMobileSubtitle}>{pageSubtitle}</Text>

                {needsRestore ? (
                    <View style={styles.landingMobileActions}>
                        <Text style={styles.landingRestoreTitle}>
                            {needsRestoreReason === 'recovery_not_ready'
                                ? t('welcome.restoreRecoveryNotReadyTitle')
                                : t('welcome.restoreRequired')}
                        </Text>
                        <Text style={styles.landingRestoreMessage}>
                            {needsRestoreReason === 'recovery_not_ready'
                                ? t('welcome.restoreRecoveryNotReadyMessage')
                                : t('welcome.restoreRequiredMessage')}
                        </Text>
                        <LandingButton
                            icon="logo-google"
                            title={t('welcome.switchGoogleAccount')}
                            onPress={handleGoogleLogin}
                            tone="secondary"
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
