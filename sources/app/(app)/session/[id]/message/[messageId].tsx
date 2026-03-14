import * as React from 'react';
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { Platform, Pressable, Text, View, ActivityIndicator, useWindowDimensions } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { useMessage, useSession, useSessionMessages } from "@/sync/storage";
import { sync } from '@/sync/sync';
import { Deferred } from "@/components/ui/Deferred";
import { ToolHeader } from '@/components/tools/ToolHeader';
import { ToolStatusIndicator } from '@/components/tools/ToolStatusIndicator';
import { ToolFullView } from '@/components/tools/ToolFullView';
import { SidebarView } from '@/components/layout/SidebarView';
import { Message } from '@/sync/typesMessage';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Typography } from '@/constants/Typography';
import { t } from '@/text';

const DESKTOP_BREAKPOINT = 1180;

const stylesheet = StyleSheet.create((theme) => ({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Desktop panel — fills the main panel area with a back bar at the top
    desktopPanel: {
        flex: 1,
        minHeight: 0,
        flexDirection: 'column',
    },
    // Back bar shown at the top of the main panel on desktop web
    backBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
        gap: 6,
    },
    backLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.colors.text,
    },
    escBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surfaceHigh,
        marginLeft: 4,
    },
    escBadgeText: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    },
    fullViewContainer: {
        flex: 1,
        padding: 16,
    },
    messageText: {
        color: theme.colors.text,
        fontSize: 16,
        lineHeight: 24,
        ...Typography.default(),
    },
}));

export default React.memo(() => {
    const { id: sessionId, messageId } = useLocalSearchParams<{ id: string; messageId: string }>();
    const router = useRouter();
    const { width } = useWindowDimensions();
    const session = useSession(sessionId!);
    const { isLoaded: messagesLoaded } = useSessionMessages(sessionId!);
    const message = useMessage(sessionId!, messageId!);
    const { theme } = useUnistyles();
    const styles = stylesheet;
    const isDesktopShell = Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;

    // ESC key to go back (web desktop only)
    React.useEffect(() => {
        if (!isDesktopShell) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                router.back();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isDesktopShell, router]);

    // Trigger session visibility when component mounts
    React.useEffect(() => {
        if (sessionId) {
            sync.onSessionVisible(sessionId);
        }
    }, [sessionId]);

    // Navigate back if message doesn't exist after messages are loaded
    React.useEffect(() => {
        if (messagesLoaded && !message) {
            router.back();
        }
    }, [messagesLoaded, message, router]);

    const loading = (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.colors.textSecondary} />
        </View>
    );

    if (!session || !messagesLoaded || !message) {
        if (isDesktopShell) {
            return (
                <View style={{ flex: 1, width: '100%' }}>
                    <SidebarView mainPanel={loading} />
                </View>
            );
        }
        return loading;
    }

    // On web desktop: show within the three-column shell with a back bar
    if (isDesktopShell) {
        const mainPanel = (
            <View style={styles.desktopPanel}>
                {/* Back bar with ESC hint */}
                <Pressable style={styles.backBar} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={16} color={theme.colors.textSecondary} />
                    <Text style={styles.backLabel}>{t('common.back')}</Text>
                    <View style={styles.escBadge}>
                        <Text style={styles.escBadgeText}>ESC</Text>
                    </View>
                </Pressable>
                <Deferred>
                    <FullView message={message} />
                </Deferred>
            </View>
        );

        return (
            <View style={{ flex: 1, width: '100%' }}>
                <SidebarView mainPanel={mainPanel} />
            </View>
        );
    }

    // Mobile / narrow web: standard stack screen with header
    return (
        <>
            {message.kind === 'tool-call' && message.tool && (
                <Stack.Screen
                    options={{
                        headerTitle: () => <ToolHeader tool={message.tool} />,
                        headerRight: () => <ToolStatusIndicator tool={message.tool} />,
                        headerStyle: {
                            backgroundColor: theme.colors.header.background,
                        },
                        headerTintColor: theme.colors.header.tint,
                        headerShadowVisible: false,
                    }}
                />
            )}
            <Deferred>
                <FullView message={message} />
            </Deferred>
        </>
    );
});

function FullView(props: { message: Message }) {
    const { theme } = useUnistyles();
    const styles = stylesheet;

    if (props.message.kind === 'tool-call') {
        return <ToolFullView tool={props.message.tool} messages={props.message.children} />;
    }
    if (props.message.kind === 'agent-text') {
        return (
            <View style={styles.fullViewContainer}>
                <Text style={styles.messageText}>{props.message.text}</Text>
            </View>
        );
    }
    if (props.message.kind === 'user-text') {
        return (
            <View style={styles.fullViewContainer}>
                <Text style={styles.messageText}>{props.message.text}</Text>
            </View>
        );
    }
    return null;
}
