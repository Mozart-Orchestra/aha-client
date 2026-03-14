import React, { useState, memo } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/auth/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { normalizeSecretKey, formatSecretKeyForBackup } from '@/auth/secretKeyBackup';
import { authGetToken } from '@/auth/authGetToken';
import { decodeBase64 } from '@/encryption/base64';
import { ItemList } from '@/components/ui/ItemList';
import { ItemGroup } from '@/components/ui/ItemGroup';
import { Item } from '@/components/ui/Item';
import { RoundButton } from '@/components/ui/RoundButton';
import { Typography } from '@/constants/Typography';
import { Modal } from '@/modal';
import { t } from '@/text';
import { layout } from '@/utils/layout';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

export default memo(function Restore() {
    const { theme } = useUnistyles();
    const auth = useAuth();
    const router = useRouter();
    const [restoreKey, setRestoreKey] = useState('');
    const [showSecret, setShowSecret] = useState(false);
    const [copiedRecently, setCopiedRecently] = useState(false);

    const currentSecret = auth.credentials?.secret ?? '';
    const formattedSecret = currentSecret ? formatSecretKeyForBackup(currentSecret) : '';

    const handleCopySecret = async () => {
        try {
            await Clipboard.setStringAsync(formattedSecret);
            setCopiedRecently(true);
            setTimeout(() => setCopiedRecently(false), 2000);
            Modal.alert(t('common.success'), t('settingsAccount.secretKeyCopied'));
        } catch {
            Modal.alert(t('common.error'), t('settingsAccount.secretKeyCopyFailed'));
        }
    };

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

            // auth.login stores credentials and syncs — binds this machine to the key
            await auth.login(token, normalizedKey);
            router.back();
        } catch {
            Modal.alert(t('common.error'), t('connect.invalidSecretKey'));
        }
    };

    return (
        <ItemList>
            {/* Current key — only visible when already authenticated (restored) */}
            {auth.isAuthenticated && (
                <ItemGroup
                    title={t('connect.myKey')}
                    footer={t('connect.myKeyDescription')}
                >
                    <Item
                        title={t('settingsAccount.secretKey')}
                        subtitle={showSecret ? t('settingsAccount.tapToHide') : t('settingsAccount.tapToReveal')}
                        icon={<Ionicons name={showSecret ? 'eye-off-outline' : 'eye-outline'} size={29} color="#FF9500" />}
                        onPress={() => setShowSecret(v => !v)}
                        showChevron={false}
                    />
                </ItemGroup>
            )}

            {/* Secret key text — shown when revealed */}
            {auth.isAuthenticated && showSecret && (
                <ItemGroup>
                    <Pressable onPress={handleCopySecret}>
                        <View style={[stylesheet.secretKeyContainer, { maxWidth: layout.maxWidth }]}>
                            <View style={stylesheet.secretKeyHeader}>
                                <Text style={stylesheet.secretKeyLabel}>
                                    {t('settingsAccount.secretKeyLabel')}
                                </Text>
                                <Ionicons
                                    name={copiedRecently ? 'checkmark-circle' : 'copy-outline'}
                                    size={18}
                                    color={copiedRecently ? '#34C759' : theme.colors.textSecondary}
                                />
                            </View>
                            <Text style={stylesheet.secretKeyText}>
                                {formattedSecret}
                            </Text>
                        </View>
                    </Pressable>
                </ItemGroup>
            )}

            {/* Restore with secret key */}
            <ItemGroup
                title={t('connect.restoreAccount')}
                footer={t('connect.restoreDescription')}
            >
                <View style={stylesheet.inputSection}>
                    <TextInput
                        style={[stylesheet.textInput, { color: theme.colors.input.text }]}
                        placeholder="XXXXX-XXXXX-XXXXX..."
                        placeholderTextColor={theme.colors.input.placeholder}
                        value={restoreKey}
                        onChangeText={setRestoreKey}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        multiline
                        numberOfLines={4}
                    />
                    <RoundButton
                        title={t('connect.restoreAccount')}
                        action={handleRestore}
                    />
                </View>
            </ItemGroup>
        </ItemList>
    );
});

const stylesheet = StyleSheet.create((theme) => ({
    inputSection: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    textInput: {
        backgroundColor: theme.colors.input.background,
        padding: 16,
        borderRadius: 8,
        marginBottom: 16,
        fontFamily: 'IBMPlexMono-Regular',
        fontSize: 14,
        minHeight: 100,
        textAlignVertical: 'top',
    },
    secretKeyContainer: {
        backgroundColor: theme.colors.surface,
        paddingHorizontal: 16,
        paddingVertical: 14,
        alignSelf: 'center',
        width: '100%',
    },
    secretKeyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    secretKeyLabel: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        ...Typography.default('semiBold'),
    },
    secretKeyText: {
        fontSize: 13,
        letterSpacing: 0.5,
        lineHeight: 20,
        color: theme.colors.text,
        ...Typography.mono(),
    },
}));
