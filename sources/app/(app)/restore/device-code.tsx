import React, { useState, useRef } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/auth/AuthContext';
import { RoundButton } from '@/components/RoundButton';
import { Typography } from '@/constants/Typography';
import { layout } from '@/components/layout';
import { Modal } from '@/modal';
import { t } from '@/text';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { configuration } from '@/configuration';

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
    title: {
        fontSize: 24,
        color: theme.colors.text,
        marginBottom: 8,
        textAlign: 'center',
        ...Typography.default('bold'),
    },
    subtitle: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        marginBottom: 32,
        textAlign: 'center',
        lineHeight: 24,
        ...Typography.default(),
    },
    codeContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
        gap: 8,
    },
    codeInput: {
        width: 48,
        height: 56,
        backgroundColor: theme.colors.input.background,
        borderRadius: 12,
        textAlign: 'center',
        fontSize: 24,
        fontFamily: 'IBMPlexMono-Regular',
        color: theme.colors.input.text,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    dash: {
        fontSize: 24,
        color: theme.colors.textSecondary,
        fontFamily: 'IBMPlexMono-Regular',
    },
    errorText: {
        fontSize: 14,
        color: theme.colors.error || '#D08068',
        marginBottom: 16,
        textAlign: 'center',
        ...Typography.default(),
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.textSecondary,
        marginTop: 16,
    },
    backButtonText: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        marginLeft: 8,
        ...Typography.default(),
    },
    instructions: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: 24,
        textAlign: 'center',
        lineHeight: 22,
        ...Typography.default(),
    },
}));

export default function DeviceCodeRestore() {
    const { theme } = useUnistyles();
    const styles = stylesheet;
    const auth = useAuth();
    const router = useRouter();

    // 6 character inputs
    const [code, setCode] = useState<string[]>(['', '', '', '', '', '']);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRefs = useRef<(TextInput | null)[]>([]);

    const handleCodeChange = (text: string, index: number) => {
        // Only allow alphanumeric characters
        const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '');

        if (cleaned.length <= 1) {
            const newCode = [...code];
            newCode[index] = cleaned;
            setCode(newCode);
            setError(null);

            // Auto-advance to next input
            if (cleaned && index < 5) {
                inputRefs.current[index + 1]?.focus();
            }
        } else if (cleaned.length === 6) {
            // Handle paste of full code
            const chars = cleaned.split('');
            setCode(chars);
            setError(null);
            inputRefs.current[5]?.focus();
        }
    };

    const handleKeyPress = (key: string, index: number) => {
        // Handle backspace to go to previous input
        if (key === 'Backspace' && !code[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleVerify = async () => {
        const userCode = code.join('');

        if (userCode.length !== 6) {
            setError(t('modals.invalidDeviceCode'));
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Call the verify endpoint
            const formattedCode = `${userCode.slice(0, 3)}-${userCode.slice(3)}`;

            const response = await axios.post(`${configuration.serverUrl}/v1/auth/device-code/verify`, {
                userCode: formattedCode
            }, {
                headers: {
                    'Authorization': `Bearer ${auth.token}`
                }
            });

            if (response.data.status === 'approved') {
                Modal.alert(
                    t('common.success'),
                    t('modals.deviceVerified'),
                    [{ text: t('common.ok'), onPress: () => router.replace('/') }]
                );
            }
        } catch (err: any) {
            const errorMessage = err.response?.data?.error || t('modals.failedToVerifyDevice');
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const isCodeComplete = code.every(c => c.length === 1);

    return (
        <ScrollView style={styles.scrollView} contentContainerStyle={{ flexGrow: 1 }}>
            <View style={styles.container}>
                <View style={styles.contentWrapper}>
                    <Text style={styles.title}>
                        {t('modals.deviceCodeLogin')}
                    </Text>
                    <Text style={styles.subtitle}>
                        {t('modals.enterDeviceCodeDescription')}
                    </Text>

                    <Text style={styles.instructions}>
                        {t('modals.deviceCodeInstructions')}
                    </Text>

                    <View style={styles.codeContainer}>
                        {[0, 1, 2].map((index) => (
                            <TextInput
                                key={index}
                                ref={(ref) => { inputRefs.current[index] = ref; }}
                                style={styles.codeInput}
                                value={code[index]}
                                onChangeText={(text) => handleCodeChange(text, index)}
                                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                                maxLength={1}
                                autoCapitalize="characters"
                                autoCorrect={false}
                                keyboardType="default"
                                selectTextOnFocus
                            />
                        ))}
                        <Text style={styles.dash}>-</Text>
                        {[3, 4, 5].map((index) => (
                            <TextInput
                                key={index}
                                ref={(ref) => { inputRefs.current[index] = ref; }}
                                style={styles.codeInput}
                                value={code[index]}
                                onChangeText={(text) => handleCodeChange(text, index)}
                                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                                maxLength={1}
                                autoCapitalize="characters"
                                autoCorrect={false}
                                keyboardType="default"
                                selectTextOnFocus
                            />
                        ))}
                    </View>

                    {error && (
                        <Text style={styles.errorText}>{error}</Text>
                    )}

                    <RoundButton
                        title={isLoading ? t('common.verifying') : t('modals.verifyDeviceCode')}
                        action={handleVerify}
                        disabled={!isCodeComplete || isLoading}
                    />

                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="arrow-back" size={20} color={theme.colors.textSecondary} />
                        <Text style={styles.backButtonText}>
                            {t('common.back')}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
}