import React, { memo, useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, TextInput, View, ScrollView, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Text } from '@/components/ui/StyledText';
import { t } from '@/text';
import { useAuth } from '@/auth/AuthContext';
import { InvitationRedeemFailure, redeemInvitation } from '@/auth/invitationStatus';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DESKTOP_BREAKPOINT = 1180;

const stylesheet = StyleSheet.create((theme) => ({
    screen: {
        flex: 1,
        backgroundColor: theme.colors.groupped.background,
    },
    desktopOuter: {
        flex: 1,
        paddingHorizontal: 28,
    },
    desktopHeader: {
        width: '100%',
        maxWidth: 1360,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 20,
        marginBottom: 56,
    },
    brand: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    brandIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.text,
        borderWidth: 1,
        borderColor: theme.colors.text,
    },
    brandText: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.text,
    },
    desktopMain: {
        flex: 1,
        width: '100%',
        maxWidth: 520,
        alignSelf: 'center',
        justifyContent: 'center',
    },
    mobileScroll: {
        flex: 1,
    },
    mobileContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        justifyContent: 'center',
    },
    mobileBody: {
        width: '100%',
        maxWidth: 420,
        alignSelf: 'center',
    },
    lockIcon: {
        width: 56,
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.surfaceHigh,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        alignSelf: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 32,
        lineHeight: 38,
        fontWeight: '800',
        color: theme.colors.text,
        textAlign: 'center',
    },
    mobileTitle: {
        fontSize: 28,
        lineHeight: 34,
        fontWeight: '800',
        color: theme.colors.text,
        textAlign: 'center',
    },
    subtitle: {
        marginTop: 12,
        fontSize: 15,
        lineHeight: 23,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        maxWidth: 400,
        alignSelf: 'center',
    },
    inputWrapper: {
        marginTop: 28,
        gap: 12,
    },
    input: {
        minHeight: 56,
        borderRadius: 16,
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderWidth: 2,
        borderColor: theme.colors.text,
        backgroundColor: theme.colors.surface,
        color: theme.colors.text,
        fontSize: 20,
        fontFamily: 'IBMPlexMono-SemiBold',
        letterSpacing: 4,
        textAlign: 'center',
        width: '100%',
    },
    errorText: {
        fontSize: 13,
        color: theme.colors.textDestructive,
        textAlign: 'center',
        minHeight: 18,
    },
    button: {
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
    buttonPrimary: {
        backgroundColor: theme.colors.text,
        borderColor: theme.colors.text,
    },
    buttonPrimaryText: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.surface,
    },
    buttonGhost: {
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.divider,
        minHeight: 36,
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    buttonGhostText: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.text,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    bottomRow: {
        marginTop: 32,
        alignItems: 'center',
        gap: 16,
    },
    helpText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    trustRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 20,
        justifyContent: 'center',
        marginTop: 24,
    },
    trustItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    trustText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
}));

function mapErrorToCopy(reason: unknown): string {
    if (reason instanceof InvitationRedeemFailure) {
        switch (reason.reason) {
            case 'code_invalid':   return t('invitation.errorInvalid');
            case 'code_expired':   return t('invitation.errorExpired');
            case 'code_exhausted': return t('invitation.errorExhausted');
            case 'network_error':  return t('invitation.errorNetwork');
            default:               return t('invitation.errorGeneric');
        }
    }
    return t('invitation.errorGeneric');
}

const InvitationScreen = memo(() => {
    const styles = stylesheet;
    const { theme } = useUnistyles();
    const router = useRouter();
    const auth = useAuth();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;

    const [code, setCode] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [errorText, setErrorText] = useState<string | null>(null);

    const handleSubmit = useCallback(async () => {
        const trimmed = code.trim();
        if (!trimmed || submitting || !auth.credentials?.token) return;
        setSubmitting(true);
        setErrorText(null);
        try {
            await redeemInvitation(auth.credentials.token, trimmed);
            auth.markInvitationVerified();
            router.replace('/');
        } catch (err) {
            setErrorText(mapErrorToCopy(err));
        } finally {
            setSubmitting(false);
        }
    }, [code, submitting, auth, router]);

    const handleLogout = useCallback(async () => {
        await auth.logout();
    }, [auth]);

    const formContent = (
        <>
            <View style={styles.lockIcon}>
                <Ionicons name="key-outline" size={24} color={theme.colors.text} />
            </View>
            <Text style={isDesktop ? styles.title : styles.mobileTitle}>{t('invitation.title')}</Text>
            <Text style={styles.subtitle}>{t('invitation.subtitle')}</Text>

            <View style={styles.inputWrapper}>
                <TextInput
                    style={styles.input}
                    placeholder={t('invitation.inputPlaceholder')}
                    placeholderTextColor={theme.colors.textSecondary}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    editable={!submitting}
                    value={code}
                    onChangeText={(value) => {
                        setCode(value);
                        if (errorText) setErrorText(null);
                    }}
                    onSubmitEditing={handleSubmit}
                    returnKeyType="go"
                />
                <Text style={styles.errorText}>{errorText ?? ' '}</Text>
                <Pressable
                    style={[
                        styles.button,
                        styles.buttonPrimary,
                        (submitting || code.trim().length === 0) && styles.buttonDisabled,
                    ]}
                    onPress={handleSubmit}
                    disabled={submitting || code.trim().length === 0}
                >
                    <Ionicons name="lock-open-outline" size={16} color={theme.colors.surface} />
                    <Text style={styles.buttonPrimaryText}>
                        {submitting ? t('invitation.submitting') : t('invitation.submit')}
                    </Text>
                </Pressable>
            </View>

            <View style={styles.bottomRow}>
                <Text style={styles.helpText}>{t('invitation.help')}</Text>
                <Pressable style={[styles.button, styles.buttonGhost]} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={16} color={theme.colors.text} />
                    <Text style={styles.buttonGhostText}>{t('invitation.logout')}</Text>
                </Pressable>
            </View>

            <View style={styles.trustRow}>
                <View style={styles.trustItem}>
                    <Ionicons name="lock-closed-outline" size={14} color={theme.colors.textSecondary} />
                    <Text style={styles.trustText}>{t('landing.trustEncrypted')}</Text>
                </View>
                <View style={styles.trustItem}>
                    <Ionicons name="globe-outline" size={14} color={theme.colors.textSecondary} />
                    <Text style={styles.trustText}>{t('landing.trustLocal')}</Text>
                </View>
            </View>
        </>
    );

    if (isDesktop) {
        return (
            <View style={[styles.screen, { paddingTop: insets.top + 24, paddingBottom: Math.max(insets.bottom, 24) }]}>
                <KeyboardAvoidingView style={styles.desktopOuter} behavior={undefined}>
                    <View style={styles.desktopHeader}>
                        <View style={styles.brand}>
                            <View style={styles.brandIcon}>
                                <Text style={{ color: theme.colors.surface, fontSize: 16, fontWeight: '700' }}>A</Text>
                            </View>
                            <Text style={styles.brandText}>{t('landing.brand')}</Text>
                        </View>
                    </View>
                    <View style={styles.desktopMain}>
                        {formContent}
                    </View>
                </KeyboardAvoidingView>
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.screen}
            contentContainerStyle={[
                styles.mobileContent,
                { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 },
            ]}
        >
            <View style={styles.mobileBody}>
                {formContent}
            </View>
        </ScrollView>
    );
});

InvitationScreen.displayName = 'InvitationScreen';

export default InvitationScreen;
