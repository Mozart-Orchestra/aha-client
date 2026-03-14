import * as React from 'react';
import { Header } from '../navigation/Header';
import { useSocketStatus } from '@/sync/storage';
import { Platform, Pressable, Text, View } from 'react-native';
import { Typography } from '@/constants/Typography';
import { StatusDot } from '../ui/StatusDot';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useSegments } from 'expo-router';
import { getServerInfo } from '@/sync/serverConfig';
import { Image } from 'expo-image';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { t } from '@/text';

const stylesheet = StyleSheet.create((theme, runtime) => ({
    headerButton: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 18,
        backgroundColor: theme.colors.surfaceHighest || 'rgba(0, 0, 0, 0.05)',
        shadowColor: theme.colors.shadow.color || '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: theme.colors.shadow.opacity || 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    iconButton: {
        color: theme.colors.button.primary.background,
    },
    logoContainer: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 18,
        backgroundColor: theme.colors.surfaceHighest || 'rgba(0, 0, 0, 0.05)',
    },
    titleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    titleText: {
        fontSize: 18,
        color: theme.colors.text,
        fontWeight: '700',
        ...Typography.default('semiBold'),
        letterSpacing: 0.2,
    },
    subtitleText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: -2,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: -2,
    },
    statusDot: {
        marginRight: 4,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
        lineHeight: 16,
        ...Typography.default(),
        opacity: 0.9,
    },
    // Status colors
    statusConnected: {
        color: theme.colors.success || '#10B981',
    },
    statusConnecting: {
        color: theme.colors.warning || '#F59E0B',
    },
    statusDisconnected: {
        color: theme.colors.textSecondary || '#78716C',
    },
    statusError: {
        color: theme.colors.textDestructive || '#DC2626',
    },
    statusDefault: {
        color: theme.colors.textSecondary || '#A8A29E',
    },
    centeredTitle: {
        textAlign: Platform.OS === 'ios' ? 'center' : 'left',
        alignSelf: Platform.OS === 'ios' ? 'center' : 'flex-start',
        flex: 1,
    },
}));


export const HomeHeader = React.memo(() => {
    const { theme } = useUnistyles();

    return (
        <View style={{ backgroundColor: theme.colors.groupped.background }}>
            <Header
                title={<HeaderTitleWithSubtitle />}
                headerRight={() => <HeaderRight />}
                headerLeft={() => <HeaderLeft />}
                headerShadowVisible={false}
                headerTransparent={true}
            />
        </View>
    )
})

export const HomeHeaderNotAuth = React.memo(() => {
    useSegments(); // Re-rendered automatically when screen navigates back
    const serverInfo = getServerInfo();
    const { theme } = useUnistyles();
    return (
        <Header
            title={<HeaderTitleWithSubtitle subtitle={serverInfo.isCustom ? serverInfo.hostname + (serverInfo.port ? `:${serverInfo.port}` : '') : undefined} />}
            headerRight={() => <HeaderRightNotAuth />}
            headerLeft={() => <HeaderLeft />}
            headerShadowVisible={false}
            headerBackgroundColor={theme.colors.groupped.background}
        />
    )
});

function HeaderRight() {
    const router = useRouter();
    const styles = stylesheet;
    const { theme } = useUnistyles();

    return (
        <Pressable
            onPress={() => router.push('/new')}
            hitSlop={15}
            style={(p) => [
                styles.headerButton,
                {
                    opacity: p.pressed ? 0.7 : 1,
                    transform: [{ scale: p.pressed ? 0.95 : 1 }],
                    backgroundColor: theme.colors.button.primary.background,
                }
            ]}
        >
            <Ionicons name="add-outline" size={24} color={theme.colors.button.primary.tint} />
        </Pressable>
    );
}

function HeaderRightNotAuth() {
    const router = useRouter();
    const { theme } = useUnistyles();
    const styles = stylesheet;

    return (
        <Pressable
            onPress={() => router.push('/server')}
            hitSlop={15}
            style={(p) => [
                styles.headerButton,
                {
                    opacity: p.pressed ? 0.7 : 1,
                    transform: [{ scale: p.pressed ? 0.95 : 1 }],
                }
            ]}
        >
            <Ionicons name="server-outline" size={20} color={theme.colors.button.primary.background} />
        </Pressable>
    );
}

function HeaderLeft() {
    const styles = stylesheet;
    const { theme } = useUnistyles();
    return (
        <View style={styles.logoContainer}>
            <Image
                source={require('@/assets/images/logo-black.png')}
                contentFit="contain"
                style={[{ width: 24, height: 24 }]}
                tintColor={theme.colors.header.tint}
            />
        </View>
    );
}

function HeaderTitleWithSubtitle({ subtitle }: { subtitle?: string }) {
    const socketStatus = useSocketStatus();
    const styles = stylesheet;

    // Get connection status styling (matching sessionUtils.ts pattern)
    const getConnectionStatus = () => {
        const { status } = socketStatus;
        switch (status) {
            case 'connected':
                return {
                    color: styles.statusConnected.color,
                    isPulsing: false,
                    text: t('status.connected'),
                    textColor: styles.statusConnected.color
                };
            case 'connecting':
                return {
                    color: styles.statusConnecting.color,
                    isPulsing: true,
                    text: t('status.connecting'),
                    textColor: styles.statusConnecting.color
                };
            case 'disconnected':
                return {
                    color: styles.statusDisconnected.color,
                    isPulsing: false,
                    text: t('status.disconnected'),
                    textColor: styles.statusDisconnected.color
                };
            case 'error':
                return {
                    color: styles.statusError.color,
                    isPulsing: false,
                    text: t('status.error'),
                    textColor: styles.statusError.color
                };
            default:
                return {
                    color: styles.statusDefault.color,
                    isPulsing: false,
                    text: '',
                    textColor: styles.statusDefault.color
                };
        }
    };

    const hasCustomSubtitle = !!subtitle;
    const connectionStatus = getConnectionStatus();
    const showConnectionStatus = !hasCustomSubtitle && connectionStatus.text;

    return (
        <View style={styles.titleContainer}>
            <Text style={styles.titleText}>
                {t('sidebar.sessionsTitle')}
            </Text>
            {hasCustomSubtitle && (
                <Text style={styles.subtitleText}>
                    {subtitle}
                </Text>
            )}
            {showConnectionStatus && (
                <View style={styles.statusContainer}>
                    <StatusDot
                        color={connectionStatus.color}
                        isPulsing={connectionStatus.isPulsing}
                        size={6}
                        style={styles.statusDot}
                    />
                    <Text style={[
                        styles.statusText,
                        { color: connectionStatus.textColor }
                    ]}>
                        {connectionStatus.text}
                    </Text>
                </View>
            )}
        </View>
    );
}