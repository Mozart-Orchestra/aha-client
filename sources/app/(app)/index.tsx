import { useAuth } from "@/auth/AuthContext";
import { Text, View, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as React from 'react';
import { encodeBase64 } from "@/encryption/base64";
import { authGetToken } from "@/auth/authGetToken";
import { useRouter } from "expo-router";
import { StyleSheet } from "react-native-unistyles";
import { getRandomBytesAsync } from "expo-crypto";
import { trackAccountCreated, trackAccountRestored } from '@/track';
import { MainView } from "@/components/MainView";

export default function Home() {
    const auth = useAuth();
    if (!auth.isAuthenticated) {
        return <NotAuthenticated />;
    }
    return (
        <Authenticated />
    )
}

function Authenticated() {
    return <MainView variant="phone" />;
}

function NotAuthenticated() {
    const auth = useAuth();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const createAnonymousAccount = React.useCallback(async () => {
        try {
            const secret = await getRandomBytesAsync(32);
            const token = await authGetToken(secret);
            if (token && secret) {
                await auth.login(token, encodeBase64(secret, 'base64url'));
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error creating account', error);
            return false;
        }
    }, [auth]);

    const createAccount = React.useCallback(async () => {
        const ok = await createAnonymousAccount();
        if (ok) {
            trackAccountCreated();
            return;
        }
        Alert.alert('Unable to create account', 'Please try again in a moment.');
    }, [createAnonymousAccount]);

    const openDeviceCode = React.useCallback(async () => {
        trackAccountRestored();
        if (!auth.isAuthenticated) {
            const created = await createAnonymousAccount();
            if (!created) {
                Alert.alert('Unable to continue', 'Could not create a temporary account for device verification.');
                return;
            }
        }
        router.push('/restore/device-code');
    }, [auth.isAuthenticated, createAnonymousAccount, router]);

    const openAccountLink = React.useCallback(() => {
        trackAccountRestored();
        router.push('/restore');
    }, [router]);

    return (
        <View
            style={[
                styles.screen,
                {
                    paddingTop: Math.max(insets.top, 60),
                    paddingBottom: Math.max(insets.bottom, 32),
                },
            ]}
        >
            <View style={styles.content}>
                <View style={styles.logoArea}>
                    <View style={styles.logoCircle}>
                        <Text style={styles.logoEmoji}>a</Text>
                    </View>
                    <Text style={styles.logoTitle}>aha</Text>
                    <Text style={styles.logoSubtitle}>AI Agents Legion</Text>
                </View>

                <View style={styles.loginCard}>
                    <Text style={styles.loginDescription}>
                        Connect your legion with a device code or QR link — no terminal required for viewers.
                    </Text>

                    <Pressable style={[styles.buttonBase, styles.buttonPrimary]} onPress={createAccount}>
                        <Text style={[styles.buttonText, styles.buttonPrimaryText]}>Quick Start</Text>
                    </Pressable>

                    <View style={styles.separatorRow}>
                        <View style={styles.separatorLine} />
                        <Text style={styles.separatorText}>or connect another device</Text>
                        <View style={styles.separatorLine} />
                    </View>

                    <Pressable style={[styles.buttonBase, styles.buttonSecondary]} onPress={openDeviceCode}>
                        <Text style={[styles.buttonText, styles.buttonSecondaryText]}>Enter Device Code</Text>
                    </Pressable>

                    <Pressable style={[styles.buttonBase, styles.buttonSecondary]} onPress={openAccountLink}>
                        <Text style={[styles.buttonText, styles.buttonSecondaryText]}>Link Existing Account</Text>
                    </Pressable>
                </View>
            </View>
        </View>
    )
}

const styles = StyleSheet.create(() => ({
    screen: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
        backgroundColor: '#F5F4F1',
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
        width: 80,
        height: 80,
        borderRadius: 100,
        backgroundColor: '#3D8A5A',
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoEmoji: {
        fontFamily: 'Outfit',
        fontSize: 36,
        fontWeight: '700',
        color: '#FFFFFF',
        lineHeight: 40,
        textAlign: 'center',
    },
    logoTitle: {
        fontFamily: 'Outfit',
        fontSize: 32,
        fontWeight: '700',
        color: '#1A1918',
    },
    logoSubtitle: {
        fontFamily: 'Outfit',
        fontSize: 15,
        color: '#6D6C6A',
    },
    loginCard: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E4E1',
        borderRadius: 20,
        padding: 24,
        gap: 20,
    },
    loginDescription: {
        width: '100%',
        fontFamily: 'Outfit',
        fontSize: 14,
        fontWeight: '400',
        color: '#6D6C6A',
        textAlign: 'center',
    },
    buttonBase: {
        width: '100%',
        minHeight: 52,
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonPrimary: {
        backgroundColor: '#3D8A5A',
    },
    buttonSecondary: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E4E1',
    },
    buttonText: {
        fontFamily: 'Outfit',
        fontSize: 15,
        fontWeight: '600',
    },
    buttonPrimaryText: {
        color: '#FFFFFF',
    },
    buttonSecondaryText: {
        color: '#1A1918',
    },
    separatorRow: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    separatorLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#E5E4E1',
    },
    separatorText: {
        fontFamily: 'Outfit',
        fontSize: 12,
        fontWeight: '400',
        color: '#9C9B99',
        textAlign: 'center',
    },
}));
