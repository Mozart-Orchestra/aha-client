import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useConnectTerminal } from '@/hooks/useConnectTerminal';
import { Modal } from '@/modal';
import { t } from '@/text';
import { StyleSheet } from 'react-native-unistyles';
import { useRouter } from 'expo-router';
import { RoundButton } from '@/components/RoundButton';
import { Ionicons } from '@expo/vector-icons';

const stylesheet = StyleSheet.create(() => ({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F5F4F1',
        paddingHorizontal: 24,
    },
    card: {
        width: '100%',
        maxWidth: 402,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E5E4E1',
        backgroundColor: '#FFFFFF',
        padding: 24,
        alignItems: 'center',
        gap: 14,
    },
    iconCircle: {
        width: 68,
        height: 68,
        borderRadius: 34,
        backgroundColor: '#EAF5EE',
        borderWidth: 1,
        borderColor: '#3D8A5A',
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        textAlign: 'center',
        fontSize: 22,
        fontWeight: '600',
        color: '#1A1918',
    },
    subtitle: {
        textAlign: 'center',
        fontSize: 13,
        lineHeight: 18,
        color: '#6D6C6A',
    },
    actionButton: {
        width: '100%',
        minHeight: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    actionButtonPrimary: {
        backgroundColor: '#3D8A5A',
    },
    actionButtonSecondary: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E4E1',
    },
    actionButtonText: {
        fontSize: 15,
        fontWeight: '600',
        textAlign: 'center',
    },
    actionButtonTextPrimary: {
        color: '#FFFFFF',
    },
    actionButtonTextSecondary: {
        color: '#1A1918',
    },
    buttonsContainer: {
        alignItems: 'center',
        width: '100%',
        marginTop: 4,
        gap: 10,
    },
    buttonWrapper: {
        width: '100%',
    },
    buttonWrapperSecondary: {
        width: '100%',
    },
    supportRow: {
        width: '100%',
        marginTop: 4,
    },
    supportLink: {
        width: '100%',
        minHeight: 46,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E4E1',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    supportLinkText: {
        fontSize: 14,
        color: '#6D6C6A',
        textAlign: 'center',
    },
}));

export function EmptyMainScreen() {
    const { connectTerminal, connectWithUrl, isLoading } = useConnectTerminal();
    const styles = stylesheet;
    const router = useRouter();

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <View style={styles.iconCircle}>
                    <Ionicons name="chatbubble-ellipses-outline" size={28} color="#3D8A5A" />
                </View>
                <Text style={styles.title}>Start a new agent session</Text>
                <Text style={styles.subtitle}>
                    Choose Codex or Claude, pick a machine, and deploy your agents.
                </Text>

                <View style={styles.buttonsContainer}>
                    <View style={styles.buttonWrapper}>
                        <Pressable
                            style={[styles.actionButton, styles.actionButtonPrimary]}
                            onPress={() => router.push('/new')}
                        >
                            <Text style={[styles.actionButtonText, styles.actionButtonTextPrimary]}>
                                Start Session
                            </Text>
                        </Pressable>
                    </View>
                    <View style={styles.buttonWrapperSecondary}>
                        <RoundButton
                            title={t('components.emptyMainScreen.openCamera')}
                            size="large"
                            loading={isLoading}
                            onPress={connectTerminal}
                        />
                    </View>
                </View>

                <View style={styles.supportRow}>
                    <Pressable
                        style={styles.supportLink}
                        onPress={async () => {
                            const url = await Modal.prompt(
                                t('modals.authenticateTerminal'),
                                t('modals.pasteUrlFromTerminal'),
                                {
                                    placeholder: 'aha://terminal?...',
                                    cancelText: t('common.cancel'),
                                    confirmText: t('common.authenticate')
                                }
                            );

                            if (url?.trim()) {
                                connectWithUrl(url.trim());
                            }
                        }}
                    >
                        <Text style={styles.supportLinkText}>{t('connect.enterUrlManually')}</Text>
                    </Pressable>
                </View>
            </View>
        </View>
    );
}
