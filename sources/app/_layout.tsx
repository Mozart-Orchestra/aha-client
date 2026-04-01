import 'react-native-quick-base64';
import '../theme.css';
import * as React from 'react';
import * as SplashScreen from 'expo-splash-screen';
import * as Fonts from 'expo-font';
import { FontAwesome } from '@expo/vector-icons';
import { AuthCredentials, TokenStorage, getStoredSecretForReauth } from '@/auth/tokenStorage';
import { AuthProvider, setNeedsRestore } from '@/auth/AuthContext';
import { supabase } from '@/auth/supabase';
import { completeSupabaseSession, SupabaseRecoveryNotReadyError, SupabaseRestoreRequiredError, SupabaseSecretMismatchError } from '@/auth/supabaseAuth';
import { persistPendingTerminalConnectRequestStorage, readPendingTerminalConnectRequestStorage } from '@/auth/pendingTerminalConnect';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { initialWindowMetrics, SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SidebarNavigator } from '@/components/layout/SidebarNavigator';
import sodium from '@/encryption/libsodium.lib';
import { View, Text, Pressable, Platform } from 'react-native';
import { ModalProvider } from '@/modal';
import { PostHogProvider } from 'posthog-react-native';
import { tracking } from '@/track/tracking';
import { syncRestore } from '@/sync/sync';
import { initializeI18n } from '@/i18n';
import { initializeTextLanguage } from '@/text';
import { useTrackScreens } from '@/track/useTrackScreens';
import { RealtimeProvider } from '@/realtime/RealtimeProvider';
import { FaviconPermissionIndicator } from '@/components/web/FaviconPermissionIndicator';
import { CommandPaletteProvider } from '@/components/CommandPalette/CommandPaletteProvider';
import { StatusBarProvider } from '@/components/layout/StatusBarProvider';
// import * as SystemUI from 'expo-system-ui';
import { monkeyPatchConsoleForRemoteLoggingForFasterAiAutoDebuggingOnlyInLocalBuilds } from '@/utils/remoteLogger';
import { useUnistyles } from 'react-native-unistyles';
import { AsyncLock } from '@/utils/lock';

export {
    // Catch any errors thrown by the Layout component.
    ErrorBoundary,
} from 'expo-router';

// Configure splash screen
SplashScreen.setOptions({
    fade: true,
    duration: 300,
})
SplashScreen.preventAutoHideAsync();

// Set window background color - now handled by Unistyles
// SystemUI.setBackgroundColorAsync('white');

// NEVER ENABLE REMOTE LOGGING IN PRODUCTION
// This is for local debugging with AI only
// So AI will have all the logs easily accessible in one file for analysis
if (!!process.env.PUBLIC_EXPO_DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING) {
    monkeyPatchConsoleForRemoteLoggingForFasterAiAutoDebuggingOnlyInLocalBuilds()
}

// Component to apply horizontal safe area padding
function HorizontalSafeAreaWrapper({ children }: { children: React.ReactNode }) {
    const insets = useSafeAreaInsets();
    return (
        <View style={{
            flex: 1,
            paddingLeft: insets.left,
            paddingRight: insets.right
        }}>
            {children}
        </View>
    );
}

let lock = new AsyncLock();
let loaded = false;
async function loadFonts() {
    await lock.inLock(async () => {
        if (loaded) {
            return;
        }
        loaded = true;
        // Check if running in Tauri
        const isTauri = Platform.OS === 'web' &&
            typeof window !== 'undefined' &&
            (window as any).__TAURI_INTERNALS__ !== undefined;

        if (!isTauri) {
            // Normal font loading for non-Tauri environments (native and regular web)
            await Fonts.loadAsync({
                // Keep existing font
                SpaceMono: require('@/assets/fonts/SpaceMono-Regular.ttf'),

                // IBM Plex Sans family
                'IBMPlexSans-Regular': require('@/assets/fonts/IBMPlexSans-Regular.ttf'),
                'IBMPlexSans-Italic': require('@/assets/fonts/IBMPlexSans-Italic.ttf'),
                'IBMPlexSans-SemiBold': require('@/assets/fonts/IBMPlexSans-SemiBold.ttf'),

                // IBM Plex Mono family  
                'IBMPlexMono-Regular': require('@/assets/fonts/IBMPlexMono-Regular.ttf'),
                'IBMPlexMono-Italic': require('@/assets/fonts/IBMPlexMono-Italic.ttf'),
                'IBMPlexMono-SemiBold': require('@/assets/fonts/IBMPlexMono-SemiBold.ttf'),

                // Bricolage Grotesque  
                'BricolageGrotesque-Bold': require('@/assets/fonts/BricolageGrotesque-Bold.ttf'),

                ...FontAwesome.font,
            });
        } else {
            // For Tauri, skip Font Face Observer as fonts are loaded via CSS
            console.log('Do not wait for fonts to load');
            (async () => {
                try {
                    await Fonts.loadAsync({
                        // Keep existing font
                        SpaceMono: require('@/assets/fonts/SpaceMono-Regular.ttf'),

                        // IBM Plex Sans family
                        'IBMPlexSans-Regular': require('@/assets/fonts/IBMPlexSans-Regular.ttf'),
                        'IBMPlexSans-Italic': require('@/assets/fonts/IBMPlexSans-Italic.ttf'),
                        'IBMPlexSans-SemiBold': require('@/assets/fonts/IBMPlexSans-SemiBold.ttf'),

                        // IBM Plex Mono family  
                        'IBMPlexMono-Regular': require('@/assets/fonts/IBMPlexMono-Regular.ttf'),
                        'IBMPlexMono-Italic': require('@/assets/fonts/IBMPlexMono-Italic.ttf'),
                        'IBMPlexMono-SemiBold': require('@/assets/fonts/IBMPlexMono-SemiBold.ttf'),

                        // Bricolage Grotesque  
                        'BricolageGrotesque-Bold': require('@/assets/fonts/BricolageGrotesque-Bold.ttf'),

                        ...FontAwesome.font,
                    });
                } catch (e) {
                    // Ignore
                }
            })();
        }
    });
}

export default function RootLayout() {
    const { theme } = useUnistyles();
    const navigationTheme = React.useMemo(() => {
        if (theme.dark) {
            return {
                ...DarkTheme,
                colors: {
                    ...DarkTheme.colors,
                    background: theme.colors.groupped.background,
                }
            }
        }
        return {
            ...DefaultTheme,
            colors: {
                ...DefaultTheme.colors,
                background: theme.colors.groupped.background,
            }
        };
    }, [theme.dark]);

    //
    // Init sequence
    //
    const [initState, setInitState] = React.useState<{ credentials: AuthCredentials | null; initError?: string; needsRestore?: boolean } | null>(null);
    React.useEffect(() => {
        // Preserve terminal connect hash before OAuth redirect can lose it
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
            const hash = window.location.hash;
            if (hash && hash.includes('key=') && window.location.pathname.includes('terminal/connect')) {
                persistPendingTerminalConnectRequestStorage(JSON.stringify({
                    publicKey: new URLSearchParams(hash.slice(1)).get('key'),
                    nextPath: new URLSearchParams(hash.slice(1)).get('next') || null,
                    machineId: new URLSearchParams(hash.slice(1)).get('machineId') || null,
                    serverUrl: new URLSearchParams(hash.slice(1)).get('serverUrl') || null,
                    autoApprove: true,
                    authMode: new URLSearchParams(hash.slice(1)).get('mode') || 'auto',
                }));
            }
        }

        (async () => {
            try {
                await loadFonts();
                await sodium.ready;
                await initializeTextLanguage();
                await initializeI18n();

                // Check existing stored credentials first
                let credentials = await TokenStorage.getCredentials();

                // If no stored credentials, check if we have a Supabase session
                // (e.g. from OAuth callback redirect with #access_token=...)
                if (!credentials) {
                    // Wait for Supabase to process URL hash if present
                    let session = (await supabase.auth.getSession()).data.session;
                    if (!session && Platform.OS === 'web' && typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
                        // Hash present but session not ready — wait for auth state change
                        session = await new Promise((resolve) => {
                            const timeout = setTimeout(() => resolve(null), 5000);
                            const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
                                clearTimeout(timeout);
                                subscription.unsubscribe();
                                resolve(s);
                            });
                        });
                    }
                    if (session?.access_token) {
                        try {
                            const result = await completeSupabaseSession(session.access_token, getStoredSecretForReauth());
                            credentials = { token: result.token, secret: result.secretBase64 };
                            await TokenStorage.setCredentials(credentials);
                        } catch (error) {
                            if (error instanceof SupabaseRestoreRequiredError) {
                                setNeedsRestore('restore_required');
                            } else if (error instanceof SupabaseSecretMismatchError) {
                                setNeedsRestore('secret_mismatch');
                            } else if (error instanceof SupabaseRecoveryNotReadyError) {
                                setNeedsRestore('recovery_not_ready');
                            }
                            // Failed: continue unauthenticated
                        }
                    }
                }

                if (credentials) {
                    await syncRestore(credentials);
                }

                setInitState({ credentials });
            } catch (error) {
                setInitState({ credentials: null, initError: String(error) });
            }
        })();
    }, []);

    React.useEffect(() => {
        if (initState) {
            setTimeout(() => {
                SplashScreen.hideAsync();
            }, 100);
        }
    }, [initState]);


    // Track the screens
    useTrackScreens()

    //
    // Not inited
    //

    if (!initState) {
        return null;
    }

    if (initState.initError) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: '#fff' }}>
                <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12 }}>Failed to initialize</Text>
                <Text style={{ fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 24 }}>{initState.initError}</Text>
                <Pressable
                    onPress={() => { setInitState(null); /* re-trigger init */ }}
                    style={{ paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#000', borderRadius: 8 }}
                >
                    <Text style={{ color: '#fff', fontWeight: '600' }}>Retry</Text>
                </Pressable>
            </View>
        );
    }

    //
    // Boot
    //

    let providers = (
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
            <KeyboardProvider>
                <GestureHandlerRootView style={{ flex: 1 }}>
                    <AuthProvider initialCredentials={initState.credentials}>
                        <ThemeProvider value={navigationTheme}>
                            <StatusBarProvider />
                            <ModalProvider>
                                <CommandPaletteProvider>
                                    <RealtimeProvider>
                                        <HorizontalSafeAreaWrapper>
                                            <SidebarNavigator />
                                        </HorizontalSafeAreaWrapper>
                                    </RealtimeProvider>
                                </CommandPaletteProvider>
                            </ModalProvider>
                        </ThemeProvider>
                    </AuthProvider>
                </GestureHandlerRootView>
            </KeyboardProvider>
        </SafeAreaProvider>
    );
    if (tracking) {
        providers = (
            <PostHogProvider client={tracking}>
                {providers}
            </PostHogProvider>
        );
    }

    return (
        <>
            <FaviconPermissionIndicator />
            {providers}
        </>
    );
}
