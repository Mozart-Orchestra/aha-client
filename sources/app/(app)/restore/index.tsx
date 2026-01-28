import React, { useState, useEffect, useRef } from 'react';
import { getRandomBytesAsync } from "expo-crypto";
import { authGetToken } from "@/auth/authGetToken";
import { View, Text, TextInput, ScrollView, ActivityIndicator } from 'react-native';
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

    return (
        <ScrollView style={styles.scrollView} contentContainerStyle={{ flexGrow: 1 }}>
            <View style={styles.container}>

                <View style={{ justifyContent: 'flex-end' }}>
                    <Text style={styles.secondInstructionText}>
                        1. Open Happy on your mobile device{'\n'}
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
                        data={'happy:///account?' + encodeBase64(keypair.publicKey, 'base64url')}
                        size={300}
                        foregroundColor={'black'}
                        backgroundColor={'white'}
                    />
                )}
                <View style={{ flexGrow: 4, paddingTop: 30 }}>
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
