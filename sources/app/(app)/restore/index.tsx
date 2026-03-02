import React, { useState, useEffect, useRef } from 'react';
import { getRandomBytesAsync } from "expo-crypto";
import { authGetToken } from "@/auth/authGetToken";
import { View, Text, TextInput, ScrollView, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/auth/AuthContext';
import { normalizeSecretKey } from '@/auth/secretKeyBackup';
import { RoundButton } from '@/components/RoundButton';
import { Typography } from '@/constants/Typography';
import { decodeBase64, encodeBase64 } from '@/encryption/base64';
import { generateAuthKeyPair, authQRStart } from '@/auth/authQRStart';
import { authQRWait } from '@/auth/authQRWait';
import { layout } from '@/components/layout';
import { Modal } from '@/modal';
import { t } from '@/text';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { QRCode } from '@/components/qr/QRCode';
import { QrScannerModal } from '@/components/QrScannerModal';
import { Ionicons } from '@expo/vector-icons';

const stylesheet = StyleSheet.create((theme) => ({
    scrollView: {
        flex: 1,
        backgroundColor: theme.colors.surface,
    },
    container: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    contentWrapper: {
        width: '100%',
        maxWidth: layout.maxWidth,
        paddingVertical: 24,
    },
    instructionText: {
        fontSize: 20,
        color: theme.colors.text,
        marginBottom: 24,
        ...Typography.default(),
    },
    secondInstructionText: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        marginBottom: 20,
        marginTop: 30,
        ...Typography.default(),
    },
    qrInstructions: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: 16,
        lineHeight: 22,
        textAlign: 'center',
        ...Typography.default(),
    },
    textInput: {
        backgroundColor: theme.colors.input.background,
        padding: 16,
        borderRadius: 8,
        marginBottom: 24,
        fontFamily: 'IBMPlexMono-Regular',
        fontSize: 14,
        minHeight: 120,
        textAlignVertical: 'top',
        color: theme.colors.input.text,
    },
    divider: {
        width: '100%',
        height: 1,
        backgroundColor: theme.colors.divider,
        marginVertical: 24,
    },
    orText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginVertical: 16,
        ...Typography.default(),
    },
    scanButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.button.primary.background,
        marginBottom: 12,
        width: '100%',
        maxWidth: 280,
    },
    scanButtonText: {
        fontSize: 16,
        color: theme.colors.button.primary.background,
        marginLeft: 8,
        ...Typography.default('semiBold'),
    },
    urlButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.textSecondary,
        width: '100%',
        maxWidth: 280,
    },
    urlButtonText: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        marginLeft: 8,
        ...Typography.default(),
    },
    sectionTitle: {
        fontSize: 18,
        color: theme.colors.text,
        marginBottom: 16,
        textAlign: 'center',
        ...Typography.default('semiBold'),
    },
}));

export default function Restore() {
    const { theme } = useUnistyles();
    const styles = stylesheet;
    const auth = useAuth();
    const router = useRouter();
    const [restoreKey, setRestoreKey] = useState('');
    const [isWaitingForAuth, setIsWaitingForAuth] = useState(false);
    const [authReady, setAuthReady] = useState(false);
    const [waitingDots, setWaitingDots] = useState(0);
    const isCancelledRef = useRef(false);

    // Memoize keypair generation to prevent re-creating on re-renders
    const keypair = React.useMemo(() => generateAuthKeyPair(), []);

    // Start QR authentication when component mounts
    useEffect(() => {
        const startQRAuth = async () => {
            try {
                setIsWaitingForAuth(true);

                // Send authentication request
                const success = await authQRStart(keypair);
                if (!success) {
                    Modal.alert(t('common.error'), t('errors.authenticationFailed'));
                    setIsWaitingForAuth(false);
                    return;
                }

                setAuthReady(true);

                // Start waiting for authentication
                const credentials = await authQRWait(
                    keypair,
                    (dots) => setWaitingDots(dots),
                    () => isCancelledRef.current
                );

                if (credentials && !isCancelledRef.current) {
                    // Convert secret bytes to base64url string for login
                    const secretString = encodeBase64(credentials.secret, 'base64url');
                    await auth.login(credentials.token, secretString);
                    if (!isCancelledRef.current) {
                        router.back();
                    }
                } else if (!isCancelledRef.current) {
                    Modal.alert(t('common.error'), t('errors.authenticationFailed'));
                }

            } catch (error) {
                if (!isCancelledRef.current) {
                    console.error('QR Auth error:', error);
                    Modal.alert(t('common.error'), t('errors.authenticationFailed'));
                }
            } finally {
                if (!isCancelledRef.current) {
                    setIsWaitingForAuth(false);
                    setAuthReady(false);
                }
            }
        };

        startQRAuth();

        // Cleanup function
        return () => {
            isCancelledRef.current = true;
        };
    }, [keypair]);

    const handleRestore = async () => {
        const trimmedKey = restoreKey.trim();

        if (!trimmedKey) {
            Modal.alert(t('common.error'), t('connect.enterSecretKey'));
            return;
        }

        try {
            const normalizedKey = normalizeSecretKey(trimmedKey);
            const secretBytes = decodeBase64(normalizedKey, 'base64url');
            if (secretBytes.length !== 32) {
                throw new Error('Invalid secret key length');
            }

            const token = await authGetToken(secretBytes);
            if (!token) {
                throw new Error('Failed to authenticate with provided key');
            }

            await auth.login(token, normalizedKey);
            router.back();
        } catch (error) {
            console.error('Restore error:', error);
            Modal.alert(t('common.error'), t('connect.invalidSecretKey'));
        }
    };

    // Process terminal URL (aha://terminal?) - creates new account and connects to terminal
    const processTerminalUrl = React.useCallback(async (url: string) => {
        console.log('[RESTORE] Processing terminal URL:', url);

        if (!url.startsWith('aha://terminal?')) {
            console.log('[RESTORE] Invalid terminal URL format');
            return false;
        }

        try {
            const tail = url.slice('aha://terminal?'.length);
            const publicKey = decodeBase64(tail, 'base64url');
            console.log('[RESTORE] Terminal publicKey length:', publicKey.length);

            // Create new account
            const secret = await getRandomBytesAsync(32);
            const token = await authGetToken(secret);
            if (!token) {
                throw new Error('Failed to create account');
            }

            // Import encryption modules
            const { encryptBox } = await import('@/encryption/libsodium');
            const { Encryption } = await import('@/sync/encryption/encryption');

            // Create encryption instance to get contentDataKey
            const encryption = await Encryption.create(secret);
            console.log('[RESTORE] Encryption created, contentDataKey length:', encryption.contentDataKey.length);

            // Create V1 response (encrypted secret)
            const responseV1 = encryptBox(secret, publicKey);

            // Create V2 response (encrypted content data key)
            const responseV2Bundle = new Uint8Array(encryption.contentDataKey.length + 1);
            responseV2Bundle[0] = 0; // Version byte
            responseV2Bundle.set(encryption.contentDataKey, 1);
            const responseV2 = encryptBox(responseV2Bundle, publicKey);

            // IMPORTANT: Login first to initialize sync
            const secretString = encodeBase64(secret, 'base64url');
            await auth.login(token, secretString);
            console.log('[RESTORE] Logged in, sync initialized');

            // Wait a bit for sync to be ready
            await new Promise(resolve => setTimeout(resolve, 500));

            // Send approval to terminal
            const { authApprove } = await import('@/auth/authApprove');
            await authApprove(token, publicKey, responseV1, responseV2);
            console.log('[RESTORE] Terminal connected successfully');

            router.replace('/');
            return true;
        } catch (error) {
            console.error('[RESTORE] Error processing terminal URL:', error);
            Modal.alert(t('common.error'), t('modals.failedToConnectTerminal'), [{ text: t('common.ok') }]);
            return false;
        }
    }, [auth, router]);

    // Process account URL from QR scan or manual input
    const processAccountUrl = React.useCallback(async (url: string) => {
        console.log('[RESTORE] Processing URL:', url);

        // Handle terminal URL (aha://terminal?)
        if (url.startsWith('aha://terminal?')) {
            return await processTerminalUrl(url);
        }

        // Handle account URL (aha:///account?)
        if (!url.startsWith('aha:///account?')) {
            console.log('[RESTORE] Invalid URL format');
            Modal.alert(t('common.error'), t('modals.invalidAuthUrl'), [{ text: t('common.ok') }]);
            return false;
        }

        try {
            const tail = url.slice('aha:///account?'.length);
            const publicKey = decodeBase64(tail, 'base64url');

            console.log('[RESTORE] Decoded publicKey length:', publicKey.length);

            // Generate temporary keypair for this device
            const tempKeypair = generateAuthKeyPair();

            // Start QR authentication with our public key
            const success = await authQRStart(tempKeypair);
            if (!success) {
                Modal.alert(t('common.error'), t('errors.authenticationFailed'));
                return false;
            }

            // For now, show loading and wait for authentication
            setIsWaitingForAuth(true);

            const credentials = await authQRWait(
                tempKeypair,
                (dots) => setWaitingDots(dots),
                () => isCancelledRef.current
            );

            if (credentials && !isCancelledRef.current) {
                const secretString = encodeBase64(credentials.secret, 'base64url');
                await auth.login(credentials.token, secretString);
                if (!isCancelledRef.current) {
                    router.back();
                }
                return true;
            } else if (!isCancelledRef.current) {
                Modal.alert(t('common.error'), t('errors.authenticationFailed'));
            }
            return false;
        } catch (error) {
            console.error('[RESTORE] Error processing account URL:', error);
            Modal.alert(t('common.error'), t('errors.authenticationFailed'), [{ text: t('common.ok') }]);
            return false;
        } finally {
            setIsWaitingForAuth(false);
        }
    }, [auth, router, processTerminalUrl]);

    const handleScanQrCode = React.useCallback(() => {
        Modal.show({
            component: QrScannerModal,
            props: {
                title: t('settingsAccount.linkNewDevice'),
                subtitle: t('settingsAccount.linkNewDeviceSubtitle'),
                permissionMessage: t('modals.cameraPermissionsRequiredToScanQr'),
                onScan: async (data: string) => {
                    return await processAccountUrl(data);
                }
            }
        });
    }, [processAccountUrl]);

    const handleEnterUrl = React.useCallback(async () => {
        const url = await Modal.prompt(
            t('settingsAccount.linkNewDevice'),
            t('connect.enterUrlManuallyDescription'),
            {
                placeholder: 'aha:///account?...',
                cancelText: t('common.cancel'),
                confirmText: t('common.connect')
            }
        );

        if (url?.trim()) {
            processAccountUrl(url.trim());
        }
    }, [processAccountUrl]);

    return (
        <ScrollView style={styles.scrollView} contentContainerStyle={{ flexGrow: 1 }}>
            <View style={styles.container}>

                <View style={{ justifyContent: 'flex-end' }}>
                    <Text style={styles.secondInstructionText}>
                        1. Open aha on your mobile device{'\n'}
                        2. Go to Settings → Account{'\n'}
                        3. Tap "Link New Device"{'\n'}
                        4. Scan this QR code
                    </Text>
                </View>
                {!authReady && (
                    <View style={{ width: 200, height: 200, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' }}>
                        <ActivityIndicator size="small" color={theme.colors.text} />
                    </View>
                )}
                {authReady && (
                    <QRCode
                        data={'aha:///account?' + encodeBase64(keypair.publicKey, 'base64url')}
                        size={300}
                        foregroundColor={'black'}
                        backgroundColor={'white'}
                    />
                )}
                {/* Divider */}
                <View style={styles.divider} />

                {/* Scan QR Code Section */}
                <Text style={styles.sectionTitle}>
                    {t('welcome.scanToLink')}
                </Text>
                <TouchableOpacity style={styles.scanButton} onPress={handleScanQrCode}>
                    <Ionicons name="qr-code-outline" size={24} color={theme.colors.button.primary.background} />
                    <Text style={styles.scanButtonText}>
                        {t('welcome.scanQrCode')}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.urlButton} onPress={handleEnterUrl}>
                    <Ionicons name="link-outline" size={20} color={theme.colors.textSecondary} />
                    <Text style={styles.urlButtonText}>
                        {t('welcome.enterUrlManually')}
                    </Text>
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Restore with Secret Key Section */}
                <View style={{ flexGrow: 4, paddingTop: 10 }}>
                    <Text style={styles.instructionText}>
                        {t('navigation.restoreWithSecretKey')}
                    </Text>
                    <Text style={styles.qrInstructions}>
                        {t('connect.enterSecretKey')}
                    </Text>
                    <TextInput
                        style={styles.textInput}
                        placeholder="XXXXX-XXXXX-XXXXX..."
                        placeholderTextColor={theme.colors.input.placeholder}
                        value={restoreKey}
                        onChangeText={setRestoreKey}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        multiline={true}
                        numberOfLines={4}
                    />
                    <View style={{ marginBottom: 24 }}>
                        <RoundButton
                            title={t('connect.restoreAccount')}
                            action={handleRestore}
                        />
                    </View>
                    <RoundButton
                        title={t('welcome.createAccount')}
                        action={async () => {
                            try {
                                const secret = await getRandomBytesAsync(32);
                                const token = await authGetToken(secret);
                                if (token && secret) {
                                    await auth.login(token, encodeBase64(secret, 'base64url'));
                                    router.replace('/');
                                }
                            } catch (e) {
                                console.error(e);
                                Modal.alert('Error', 'Failed: ' + String(e));
                            }
                        }}
                    />
                </View>
            </View>
        </ScrollView>
    );
}
