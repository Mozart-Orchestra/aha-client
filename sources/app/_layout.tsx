import 'react-native-quick-base64';
import '../theme.css';
import * as React from 'react';
import * as SplashScreen from 'expo-splash-screen';
import * as Fonts from 'expo-font';
import { AuthCredentials, clearStoredCredentialsForSupabaseCallback, TokenStorage } from '@/auth/tokenStorage';
import { AuthProvider, setNeedsRestore } from '@/auth/AuthContext';
import {
    selectCanonicalBootCredentials,
    selectBootCredentials,
    selectSupabaseCompletionAccessToken,
    shouldDropStoredCredentialsAfterRestoreFailure,
    shouldPreferSupabaseCallback,
} from '@/auth/rootBootstrap';
import { clearSupabaseOAuthCallbackHash, readSupabaseOAuthCallbackState } from '@/auth/supabaseCallback';
import { supabase } from '@/auth/supabase';
import {
    completeSupabaseSession,
    SupabaseAccountLinkConflictError,
    SupabaseRecoveryNotReadyError,
    SupabaseRestoreRequiredError,
} from '@/auth/supabaseAuth';
import { clearSupabaseSession, shouldClearSupabaseSessionError } from '@/auth/supabaseSession';
import { persistPendingTerminalConnectRequestStorage, readPendingTerminalConnectRequestStorage } from '@/auth/pendingTerminalConnect';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { initialWindowMetrics, SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SidebarNavigator } from '@/components/layout/SidebarNavigator';
import sodium from '@/encryption/libsodium.lib';
import { View, Text, Pressable, Platform, Alert } from 'react-native';
import { ModalProvider } from '@/modal';
import { PostHogProvider } from 'posthog-react-native';
import { tracking } from '@/track/tracking';
import { syncRestore } from '@/sync/sync';
import { initializeI18n } from '@/i18n';
import { initializeTextLanguage, t } from '@/text';
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
            try {
                // Font loading is visual polish, not an application bootstrap dependency.
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
                });
            } catch (e) {
                console.warn('Font loading failed; continuing app initialization with fallback fonts:', e);
            }
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
                    });
                } catch (e) {
                    // Ignore
                }
            })();
        }
    });
}

type RootInitState = {
    credentials: AuthCredentials | null;
    initError?: string;
    needsRestore?: boolean;
    oauthCallbackError?: string;
};

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
    const [initState, setInitState] = React.useState<RootInitState | null>(null);
    const [initAttempt, setInitAttempt] = React.useState(0);
    React.useEffect(() => {
        let didCancel = false;
        const finishInit = (state: RootInitState) => {
            if (!didCancel) {
                setInitState(state);
            }
        };

        const callbackState = Platform.OS === 'web' && typeof window !== 'undefined'
            ? readSupabaseOAuthCallbackState(window.location.hash)
            : null;
        const hasFreshSupabaseCallback = shouldPreferSupabaseCallback(callbackState);

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
                // Fonts are visual polish. On slow networks, expo-font's web loader can
                // reject with "6000ms timeout exceeded"; that must not brick app startup.
                void loadFonts().catch((error) => {
                    console.warn('Font loading failed; continuing app initialization with fallback fonts:', error);
                });
                await sodium.ready;
                await initializeTextLanguage();
                await initializeI18n();

                let oauthCallbackError: string | undefined;
                if (callbackState?.error || callbackState?.errorCode || callbackState?.errorDescription) {
                    oauthCallbackError = callbackState.errorDescription
                        ?? callbackState.error
                        ?? callbackState.errorCode
                        ?? undefined;
                    clearSupabaseOAuthCallbackHash();
                }

                // A fresh OAuth callback must take precedence over any stale local token.
                // Clear only the active auth session so concurrent remounts cannot revive
                // stale credentials while legacy recovery secret remains available.
                if (hasFreshSupabaseCallback && !clearStoredCredentialsForSupabaseCallback()) {
                    throw new Error('Failed to clear stale credentials before completing Google login');
                }

                const storedCredentials = await TokenStorage.getCredentials();
                let credentials = selectBootCredentials(storedCredentials, callbackState);

                // If no stored credentials, check if we have a Supabase session
                // (e.g. from OAuth callback redirect with #access_token=...)
                if (!credentials) {
                    const shouldClearCallbackHashAfterBootstrap = hasFreshSupabaseCallback;
                    // Wait for Supabase to process URL hash if present
                    let session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session'] | null = null;
                    try {
                        const { data, error: sessionError } = await supabase.auth.getSession();
                        const shouldClearSession = shouldClearSupabaseSessionError(sessionError);
                        if (shouldClearSession) {
                            try {
                                await clearSupabaseSession();
                            } catch (error) {
                                console.warn('Failed to clear stale Supabase session; continuing app initialization:', error);
                            }
                        }
                        session = shouldClearSession ? null : data.session;
                    } catch (error) {
                        console.warn('Supabase session bootstrap failed; continuing without session:', error);
                    }

                    if (!session && callbackState?.accessToken) {
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
                    const completionAccessToken = selectSupabaseCompletionAccessToken(
                        session?.access_token,
                        callbackState,
                    );

                    if (!completionAccessToken && callbackState?.accessToken && !oauthCallbackError) {
                        oauthCallbackError = 'Google callback completed, but the web session was not established.';
                    }
                    if (completionAccessToken) {
                        let shouldClearCompletedSession = true;
                        try {
                            const result = await completeSupabaseSession(completionAccessToken);
                            credentials = {
                                token: result.token,
                                secret: result.secretBase64,
                                invitationVerified: result.invitationVerified ?? null,
                            };
                            await TokenStorage.setCredentials(credentials);
                        } catch (error) {
                            if (error instanceof SupabaseRestoreRequiredError) {
                                setNeedsRestore('restore_required');
                            } else if (error instanceof SupabaseRecoveryNotReadyError) {
                                setNeedsRestore('recovery_not_ready');
                            } else if (error instanceof SupabaseAccountLinkConflictError) {
                                oauthCallbackError = error.message;
                            } else {
                                shouldClearCompletedSession = false;
                                oauthCallbackError = error instanceof Error ? error.message : String(error);
                            }
                            // Preserve the Supabase session for transient failures so
                            // the callback can be retried on reload instead of hard-dropping.
                        } finally {
                            if (shouldClearCompletedSession) {
                                try {
                                    await clearSupabaseSession();
                                } catch (error) {
                                    console.warn('Failed to clear completed Supabase session; continuing app initialization:', error);
                                }
                            }
                        }
                    }

                    if (shouldClearCallbackHashAfterBootstrap) {
                        clearSupabaseOAuthCallbackHash();
                    }
                }

                credentials = selectCanonicalBootCredentials(
                    credentials,
                    await TokenStorage.getCredentials(),
                );

                if (credentials) {
                    try {
                        await syncRestore(credentials);
                    } catch (error) {
                        if (shouldDropStoredCredentialsAfterRestoreFailure(error)) {
                            await TokenStorage.removeCredentials();
                            credentials = null;
                        } else if (hasFreshSupabaseCallback) {
                            throw error;
                        } else {
                            console.warn('Initial sync restore failed; continuing with stored credentials:', error);
                        }
                    }
                }

                finishInit({ credentials, oauthCallbackError });
            } catch (error) {
                finishInit({ credentials: null, initError: String(error) });
            }
        })();

        return () => {
            didCancel = true;
        };
    }, [initAttempt]);

    React.useEffect(() => {
        if (!initState?.oauthCallbackError) {
            return;
        }

        Alert.alert(
            t('welcome.googleCallbackFailedTitle'),
            t('welcome.googleCallbackFailedMessage', { reason: initState.oauthCallbackError }),
        );
    }, [initState?.oauthCallbackError]);

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
                    onPress={() => {
                        setInitState(null);
                        setInitAttempt((attempt) => attempt + 1);
                    }}
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
