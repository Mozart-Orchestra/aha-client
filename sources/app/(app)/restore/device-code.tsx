import React, { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native-unistyles';
import axios from 'axios';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '@/auth/AuthContext';
import { Modal } from '@/modal';
import { config } from '@/config';
import { authGetToken } from '@/auth/authGetToken';
import { encodeBase64 } from '@/encryption/base64';
import { getRandomBytesAsync } from 'expo-crypto';
import { formatSecretKeyForBackup } from '@/auth/secretKeyBackup';
import { trackAccountCreated, trackAccountRestored } from '@/track';

const CODE_LENGTH = 6;

function getParamValue(value: string | string[] | undefined): string {
    if (!value) {
        return '';
    }
    return Array.isArray(value) ? value[0] || '' : value;
}

function normalizeCode(raw: string): string {
    return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH);
}

const styles = StyleSheet.create(() => ({
    screen: {
        flex: 1,
        backgroundColor: '#F5F4F1',
    },
    container: {
        flex: 1,
        paddingHorizontal: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        width: '100%',
        maxWidth: 402,
        gap: 32,
    },
    logoArea: {
        alignItems: 'center',
        gap: 12,
    },
    logoCircle: {
        width: 64,
        height: 64,
        borderRadius: 999,
        backgroundColor: '#3D8A5A',
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoText: {
        color: '#FFFFFF',
        fontFamily: 'Outfit',
        fontSize: 28,
        fontWeight: '700',
    },
    title: {
        color: '#1A1918',
        fontFamily: 'Outfit',
        fontSize: 26,
        fontWeight: '600',
        letterSpacing: -0.5,
    },
    subtitle: {
        color: '#6D6C6A',
        fontFamily: 'Outfit',
        fontSize: 14,
        textAlign: 'center',
    },
    card: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E5E4E1',
        padding: 24,
        gap: 20,
    },
    codeRow: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    codeInput: {
        width: 44,
        height: 56,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E5E4E1',
        backgroundColor: '#F8F7F4',
        textAlign: 'center',
        fontFamily: 'Outfit',
        fontSize: 22,
        fontWeight: '700',
        color: '#1A1918',
        textTransform: 'uppercase',
    },
    codeInputFilled: {
        borderColor: '#3D8A5A',
        backgroundColor: '#FFFFFF',
    },
    divider: {
        width: 10,
        height: 2,
        borderRadius: 2,
        backgroundColor: '#D6D4CF',
    },
    hintBox: {
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E4E1',
        backgroundColor: '#F8F7F4',
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    hintText: {
        color: '#6D6C6A',
        fontFamily: 'Outfit',
        fontSize: 13,
        textAlign: 'center',
    },
    errorText: {
        color: '#D08068',
        fontFamily: 'Outfit',
        fontSize: 13,
        textAlign: 'center',
    },
    primaryButton: {
        minHeight: 50,
        borderRadius: 12,
        backgroundColor: '#3D8A5A',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 1,
    },
    primaryButtonDisabled: {
        opacity: 0.45,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontFamily: 'Outfit',
        fontSize: 15,
        fontWeight: '600',
    },
    secondaryButton: {
        minHeight: 50,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E4E1',
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryButtonText: {
        color: '#1A1918',
        fontFamily: 'Outfit',
        fontSize: 15,
        fontWeight: '600',
    },
    headerRow: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    connectedBadge: {
        borderRadius: 999,
        backgroundColor: '#E9F5EE',
        borderWidth: 1,
        borderColor: '#3D8A5A',
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    connectedBadgeText: {
        color: '#3D8A5A',
        fontFamily: 'Outfit',
        fontSize: 12,
        fontWeight: '600',
    },
    keyActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    keyActionButton: {
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E5E4E1',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    keyActionText: {
        color: '#1A1918',
        fontFamily: 'Outfit',
        fontSize: 12,
        fontWeight: '600',
    },
    keyBlock: {
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E4E1',
        backgroundColor: '#F8F7F4',
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 8,
    },
    keyLabel: {
        color: '#6D6C6A',
        fontFamily: 'Outfit',
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    keyValue: {
        color: '#1A1918',
        fontFamily: 'IBMPlexMono-Regular',
        fontSize: 12,
        lineHeight: 18,
    },
    loadingRow: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        color: '#6D6C6A',
        fontFamily: 'Outfit',
        fontSize: 13,
    },
}));

export default function DeviceCodeRestore() {
    const auth = useAuth();
    const router = useRouter();
    const params = useLocalSearchParams<{ code?: string | string[]; userCode?: string | string[] }>();
    const insets = useSafeAreaInsets();
    const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
    const [isLoading, setIsLoading] = useState(false);
    const [isLinkFlowLoading, setIsLinkFlowLoading] = useState(false);
    const [isVerified, setIsVerified] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRefs = useRef<(TextInput | null)[]>([]);
    const autoStartedRef = useRef(false);
    const incomingCode = normalizeCode(getParamValue(params.code) || getParamValue(params.userCode));
    const formattedSecret = auth.credentials?.secret ? formatSecretKeyForBackup(auth.credentials.secret) : '';

    const createTemporaryAccount = React.useCallback(async () => {
        const secret = await getRandomBytesAsync(32);
        const token = await authGetToken(secret);
        const encodedSecret = encodeBase64(secret, 'base64url');
        await auth.login(token, encodedSecret);
        trackAccountCreated();
        return token;
    }, [auth]);

    const ensureVerificationToken = React.useCallback(
        async (allowAutoCreate: boolean): Promise<string | null> => {
            const token = auth.credentials?.token;
            if (token) {
                return token;
            }
            if (!allowAutoCreate) {
                return null;
            }
            return createTemporaryAccount();
        },
        [auth.credentials?.token, createTemporaryAccount],
    );

    const handleCodeChange = (value: string, index: number) => {
        const cleaned = normalizeCode(value);
        if (cleaned.length <= 1) {
            const next = [...code];
            next[index] = cleaned;
            setCode(next);
            setError(null);
            if (cleaned && index < CODE_LENGTH - 1) {
                inputRefs.current[index + 1]?.focus();
            }
            return;
        }

        if (cleaned.length === CODE_LENGTH) {
            setCode(cleaned.split(''));
            setError(null);
            inputRefs.current[CODE_LENGTH - 1]?.focus();
        }
    };

    const handleKeyPress = (key: string, index: number) => {
        if (key === 'Backspace' && !code[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const goToKeyRestore = () => {
        router.replace('/restore');
    };

    const verifyCode = React.useCallback(async (rawCode: string, autoCreateAccount: boolean) => {
        const normalizedCode = normalizeCode(rawCode);
        if (normalizedCode.length !== CODE_LENGTH) {
            setError('Please enter all 6 characters.');
            return false;
        }

        const token = await ensureVerificationToken(autoCreateAccount);
        if (!token) {
            setError('No account token found. Restore with account key first.');
            return false;
        }

        setError(null);
        setIsLoading(true);
        try {
            const formattedCode = `${normalizedCode.slice(0, 3)}-${normalizedCode.slice(3)}`;
            const response = await axios.post(
                `${config.serverUrl}/v1/device/verify`,
                { userCode: formattedCode },
                { headers: { Authorization: `Bearer ${token}` } },
            );

            if (response.data?.success) {
                setIsVerified(true);
                return true;
            }
            setError('Failed to verify device code.');
            return false;
        } catch (err: any) {
            const message =
                err?.response?.data?.message ||
                err?.response?.data?.error ||
                'Failed to verify device code.';
            setError(message);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [ensureVerificationToken]);

    const handleVerifyPress = React.useCallback(async () => {
        await verifyCode(code.join(''), false);
    }, [code, verifyCode]);

    const copySecretKey = React.useCallback(async () => {
        if (!formattedSecret) {
            Modal.alert('No key available', 'Account key is not ready yet.');
            return;
        }
        try {
            await Clipboard.setStringAsync(formattedSecret);
            Modal.alert('Copied', 'Account key copied to clipboard.');
        } catch (e) {
            Modal.alert('Copy failed', 'Unable to copy account key.');
        }
    }, [formattedSecret]);

    const downloadSecretKey = React.useCallback(async () => {
        if (!formattedSecret) {
            Modal.alert('No key available', 'Account key is not ready yet.');
            return;
        }

        if (Platform.OS !== 'web' || typeof document === 'undefined') {
            await copySecretKey();
            Modal.alert('Tip', 'Download is available on web. Key is copied to clipboard.');
            return;
        }

        try {
            const content = `# aha account key\n${formattedSecret}\n`;
            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `aha-account-key-${new Date().toISOString().slice(0, 10)}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            Modal.alert('Downloaded', 'Account key file downloaded.');
        } catch (e) {
            Modal.alert('Download failed', 'Unable to download account key file.');
        }
    }, [copySecretKey, formattedSecret]);

    React.useEffect(() => {
        if (!incomingCode) {
            return;
        }
        if (incomingCode.length !== CODE_LENGTH) {
            setError('Invalid device code in link.');
            return;
        }
        setCode(incomingCode.split(''));
    }, [incomingCode]);

    React.useEffect(() => {
        if (autoStartedRef.current) {
            return;
        }
        if (!incomingCode || incomingCode.length !== CODE_LENGTH) {
            return;
        }

        autoStartedRef.current = true;
        setIsLinkFlowLoading(true);
        trackAccountRestored();
        verifyCode(incomingCode, true).finally(() => {
            setIsLinkFlowLoading(false);
        });
    }, [incomingCode, verifyCode]);

    const isCodeComplete = code.every((char) => char.length === 1);

    if (isVerified) {
        return (
            <ScrollView style={styles.screen} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
                <View
                    style={[
                        styles.container,
                        {
                            paddingTop: Math.max(insets.top, 60),
                            paddingBottom: Math.max(insets.bottom, 32),
                        },
                    ]}
                >
                    <View style={styles.content}>
                        <View style={styles.card}>
                            <View style={styles.headerRow}>
                                <View style={styles.connectedBadge}>
                                    <Text style={styles.connectedBadgeText}>Connected</Text>
                                </View>
                                <View style={styles.keyActions}>
                                    <Pressable style={styles.keyActionButton} onPress={copySecretKey}>
                                        <Text style={styles.keyActionText}>Copy Key</Text>
                                    </Pressable>
                                    <Pressable style={styles.keyActionButton} onPress={downloadSecretKey}>
                                        <Text style={styles.keyActionText}>Download Key</Text>
                                    </Pressable>
                                </View>
                            </View>

                            <Text style={styles.title}>Device Connected</Text>
                            <Text style={styles.subtitle}>
                                Your machine is now linked. Save the account key for future login on new devices.
                            </Text>

                            <View style={styles.keyBlock}>
                                <Text style={styles.keyLabel}>Account Key</Text>
                                <Text style={styles.keyValue}>{formattedSecret || 'Not available yet'}</Text>
                            </View>

                            <Pressable style={styles.primaryButton} onPress={() => router.replace('/')}>
                                <Text style={styles.primaryButtonText}>Enter aha</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </ScrollView>
        );
    }

    return (
        <ScrollView style={styles.screen} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <View
                    style={[
                        styles.container,
                        {
                            paddingTop: Math.max(insets.top, 60),
                            paddingBottom: Math.max(insets.bottom, 32),
                        },
                    ]}
                    testID="device-code-layout"
                >
                    <View style={styles.content}>
                        <View style={styles.logoArea}>
                            <View style={styles.logoCircle}>
                                <Text style={styles.logoText}>a</Text>
                            </View>
                            <Text style={styles.title}>Device Code</Text>
                            <Text style={styles.subtitle}>Enter the code displayed in your terminal</Text>
                        </View>

                        <View style={styles.card}>
                            <View style={styles.codeRow} testID="device-code-input">
                                {[0, 1, 2].map((index) => (
                                    <TextInput
                                        key={index}
                                        ref={(ref) => {
                                            inputRefs.current[index] = ref;
                                        }}
                                        testID={`device-code-digit-${index}`}
                                        style={[styles.codeInput, code[index] ? styles.codeInputFilled : null]}
                                        value={code[index]}
                                        onChangeText={(value) => handleCodeChange(value, index)}
                                        onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                                        maxLength={1}
                                        autoCapitalize="characters"
                                        autoCorrect={false}
                                        keyboardType="default"
                                        selectTextOnFocus
                                    />
                                ))}
                                <View style={styles.divider} />
                                {[3, 4, 5].map((index) => (
                                    <TextInput
                                        key={index}
                                        ref={(ref) => {
                                            inputRefs.current[index] = ref;
                                        }}
                                        testID={`device-code-digit-${index}`}
                                        style={[styles.codeInput, code[index] ? styles.codeInputFilled : null]}
                                        value={code[index]}
                                        onChangeText={(value) => handleCodeChange(value, index)}
                                        onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                                        maxLength={1}
                                        autoCapitalize="characters"
                                        autoCorrect={false}
                                        keyboardType="default"
                                        selectTextOnFocus
                                    />
                                ))}
                            </View>

                            <View style={styles.hintBox} testID="device-code-qr">
                                <Text style={styles.hintText}>
                                    Direct link will auto-verify. Manual entry also works.
                                </Text>
                            </View>

                            {isLinkFlowLoading ? (
                                <View style={styles.loadingRow}>
                                    <ActivityIndicator size="small" color="#3D8A5A" />
                                    <Text style={styles.loadingText}>Connecting from link...</Text>
                                </View>
                            ) : null}

                            {error ? (
                                <Text style={styles.errorText} testID="device-code-error">
                                    {error}
                                </Text>
                            ) : null}

                            <Pressable
                                style={[
                                    styles.primaryButton,
                                    (!isCodeComplete || isLoading) && styles.primaryButtonDisabled,
                                ]}
                                onPress={handleVerifyPress}
                                disabled={!isCodeComplete || isLoading}
                            >
                                <Text style={styles.primaryButtonText}>
                                    {isLoading ? 'Verifying...' : 'Verify & Connect'}
                                </Text>
                            </Pressable>

                            <Pressable style={styles.secondaryButton} onPress={goToKeyRestore}>
                                <Text style={styles.secondaryButtonText}>Use Account Key</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </ScrollView>
    );
}
