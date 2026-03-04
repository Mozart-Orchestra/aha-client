import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

export type AppStatePreset =
    | 'empty-team'
    | 'empty-board'
    | 'network-error'
    | 'agent-error'
    | 'api-key-error';

export interface AppStateAction {
    label: string;
    onPress: () => void;
}

interface PresetConfig {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    title: string;
    message: string;
    recovery?: string;
    tone: 'neutral' | 'warning' | 'danger';
}

const PRESET_CONFIG: Record<AppStatePreset, PresetConfig> = {
    'empty-team': {
        icon: 'people-outline',
        title: 'No teams yet',
        message: 'Create a team in one tap and start collaborating with default agents instantly.',
        recovery: 'Use Quick Start to launch now, or connect a repo first.',
        tone: 'neutral',
    },
    'empty-board': {
        icon: 'albums-outline',
        title: 'No tasks yet',
        message: 'Add your first task to start execution, or let AI break down your goal into actionable tasks.',
        recovery: 'Use Add Task for manual entry, or AI Breakdown from chat.',
        tone: 'neutral',
    },
    'network-error': {
        icon: 'cloud-offline-outline',
        title: 'Network Connection Issue',
        message: 'We could not reach the server. Team data may be outdated.',
        recovery: 'Check your connection and retry.',
        tone: 'warning',
    },
    'agent-error': {
        icon: 'warning-outline',
        title: 'Agent Runtime Error',
        message: 'The selected agent could not be started successfully.',
        recovery: 'Check machine status and agent config, then retry.',
        tone: 'danger',
    },
    'api-key-error': {
        icon: 'key-outline',
        title: 'API Key Required',
        message: 'This action needs a valid model provider API key.',
        recovery: 'Add or update your API key in Settings before continuing.',
        tone: 'warning',
    },
};

interface AppStateViewProps {
    preset: AppStatePreset;
    title?: string;
    message?: string;
    recovery?: string;
    primaryAction?: AppStateAction;
    secondaryAction?: AppStateAction;
    testID?: string;
}

export function AppStateView({
    preset,
    title,
    message,
    recovery,
    primaryAction,
    secondaryAction,
    testID,
}: AppStateViewProps) {
    const { theme } = useUnistyles();
    const config = PRESET_CONFIG[preset];

    const toneColor = React.useMemo(() => {
        if (config.tone === 'danger') {
            return theme.colors.textDestructive;
        }
        if (config.tone === 'warning') {
            return theme.colors.warning;
        }
        return theme.colors.textSecondary;
    }, [config.tone, theme.colors.textDestructive, theme.colors.textSecondary, theme.colors.warning]);

    return (
        <View style={styles.container} testID={testID}>
            <View style={[styles.iconWrap, { backgroundColor: `${toneColor}1A` }]}>
                <Ionicons name={config.icon} size={34} color={toneColor} />
            </View>

            <Text style={[styles.title, { color: theme.colors.text }]}>
                {title ?? config.title}
            </Text>

            <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
                {message ?? config.message}
            </Text>

            {(recovery ?? config.recovery) && (
                <Text style={[styles.recovery, { color: toneColor }]}>
                    {recovery ?? config.recovery}
                </Text>
            )}

            <View style={styles.actions}>
                {primaryAction && (
                    <Pressable
                        style={[styles.primaryButton, { backgroundColor: theme.colors.button.primary.background }]}
                        onPress={primaryAction.onPress}
                        accessibilityRole="button"
                    >
                        <Text style={[styles.primaryButtonText, { color: theme.colors.button.primary.tint }]}>
                            {primaryAction.label}
                        </Text>
                    </Pressable>
                )}

                {secondaryAction && (
                    <Pressable
                        style={styles.secondaryButton}
                        onPress={secondaryAction.onPress}
                        accessibilityRole="button"
                    >
                        <Text style={[styles.secondaryButtonText, { color: theme.colors.textSecondary }]}>
                            {secondaryAction.label}
                        </Text>
                    </Pressable>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    iconWrap: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 18,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 8,
    },
    message: {
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
        maxWidth: 320,
    },
    recovery: {
        marginTop: 10,
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
        maxWidth: 320,
    },
    actions: {
        marginTop: 24,
        width: '100%',
        maxWidth: 280,
        gap: 12,
    },
    primaryButton: {
        borderRadius: 12,
        paddingHorizontal: 20,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButtonText: {
        fontSize: 15,
        fontWeight: '700',
    },
    secondaryButton: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
    },
    secondaryButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
});
