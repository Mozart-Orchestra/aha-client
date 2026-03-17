import React, { useState } from 'react';
import { View, Text, TextInput, Platform, useWindowDimensions } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '@/auth/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { ItemList } from '@/components/ui/ItemList';
import { ItemGroup } from '@/components/ui/ItemGroup';
import { RoundButton } from '@/components/ui/RoundButton';
import { Typography } from '@/constants/Typography';
import { hasPendingTerminalConnectRequest } from '@/auth/pendingTerminalConnect';
import { normalizeSecretKey } from '@/auth/secretKeyBackup';
import { authGetToken } from '@/auth/authGetToken';
import { decodeBase64 } from '@/encryption/base64';
import { SidebarView } from '@/components/layout/SidebarView';
import { DESKTOP_BREAKPOINT } from '@/navigation/navigationConfig';
import { layout } from '@/utils/layout';
import { Modal } from '@/modal';
import { useEscapeAction } from '@/hooks/useEscapeAction';
import { goBackOrReturn } from '@/utils/returnNavigation';
import { t } from '@/text';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

const stylesheet = StyleSheet.create((theme) => ({
    page: {
        flex: 1,
        backgroundColor: theme.colors.groupped.background,
    },
    contentContainer: {
        paddingBottom: 24,
    },
    hero: {
        paddingHorizontal: 28,
        paddingTop: 24,
        paddingBottom: 8,
    },
    eyebrow: {
        fontSize: 11,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        color: theme.colors.textSecondary,
        ...Typography.default('semiBold'),
    },
    title: {
        marginTop: 10,
        fontSize: 30,
        lineHeight: 34,
        color: theme.colors.text,
        ...Typography.default('semiBold'),
    },
    subtitle: {
        marginTop: 8,
        fontSize: 14,
        lineHeight: 21,
        color: theme.colors.textSecondary,
        ...Typography.default(),
    },
    inlineInfo: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 16,
        alignItems: 'flex-start',
    },
    inlineInfoBody: {
        flex: 1,
    },
    inlineInfoTitle: {
        fontSize: 15,
        color: theme.colors.text,
        ...Typography.default('semiBold'),
    },
    inlineInfoSubtitle: {
        marginTop: 4,
        fontSize: 13,
        lineHeight: 19,
        color: theme.colors.textSecondary,
        ...Typography.default(),
    },
    inputSection: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    textInput: {
        backgroundColor: theme.colors.input.background,
        padding: 16,
        borderRadius: 12,
        fontFamily: 'IBMPlexMono-Regular',
        fontSize: 14,
        minHeight: 120,
        textAlignVertical: 'top',
        color: theme.colors.input.text,
    },
    buttonWrap: {
        marginTop: 16,
    },
}));

export default function Restore() {
    const { theme } = useUnistyles();
    const styles = stylesheet;
    const auth = useAuth();
    const router = useRouter();
    const { width: windowWidth } = useWindowDimensions();
    const isDesktopShell = Platform.OS === 'web' && windowWidth >= DESKTOP_BREAKPOINT;
    const [restoreKey, setRestoreKey] = useState('');

    const handleExitRestore = React.useCallback(() => {
        goBackOrReturn(router, undefined, '/restore');
    }, [router]);

    useEscapeAction(isDesktopShell, handleExitRestore);

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

            const token = await authGetToken(secretBytes, 'reconnect');
            if (!token) {
                throw new Error('Failed to authenticate with provided key');
            }

            await auth.login(token, normalizedKey);
            if (hasPendingTerminalConnectRequest()) {
                router.replace('/terminal/connect');
                return;
            }
            router.back();
        } catch (error) {
            console.error('Restore error:', error);
            Modal.alert(t('common.error'), t('connect.invalidSecretKey'));
        }
    };

    const content = (
        <ItemList
            style={styles.page}
            containerStyle={[
                styles.contentContainer,
                { maxWidth: Math.min(layout.maxWidth, 880), alignSelf: 'center', width: '100%' },
            ]}
        >
            <View style={styles.hero}>
                <Text style={styles.eyebrow}>{t('home.devicesSection')}</Text>
                <Text style={styles.title}>{t('navigation.restoreWithSecretKey')}</Text>
                <Text style={styles.subtitle}>{t('connect.restoreDescription')}</Text>
            </View>

            <ItemGroup footer={t('connect.restoreDescription')}>
                <View style={styles.inlineInfo}>
                    <Ionicons name="key-outline" size={24} color="#FF9500" />
                    <View style={styles.inlineInfoBody}>
                        <Text style={styles.inlineInfoTitle}>{t('connect.restoreAccount')}</Text>
                        <Text style={styles.inlineInfoSubtitle}>
                            {t('connect.restoreKeyHint')}
                        </Text>
                    </View>
                </View>
                <View style={styles.inputSection}>
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

                    <View style={styles.buttonWrap}>
                        <RoundButton
                            title={t('connect.restoreAccount')}
                            action={handleRestore}
                        />
                    </View>
                </View>
            </ItemGroup>
        </ItemList>
    );

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: !isDesktopShell,
                    headerTitle: t('navigation.restoreWithSecretKey'),
                    headerBackTitle: t('common.back'),
                }}
            />
            {isDesktopShell ? <SidebarView mainPanel={content} /> : content}
        </>
    );
}
