import * as React from 'react';
import { View, TextInput, Pressable, ActivityIndicator, ScrollView, Platform, useWindowDimensions } from 'react-native';
import { Text } from '@/components/ui/StyledText';
import { Stack, useRouter } from 'expo-router';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import { t } from '@/text';
import { Modal } from '@/modal';
import { sync } from '@/sync/sync';
import { createAgent } from '@/sync/apiAgents';
import { ItemList } from '@/components/ui/ItemList';
import { ItemGroup } from '@/components/ui/ItemGroup';
import { Item } from '@/components/ui/Item';
import { layout } from '@/utils/layout';
import { useEscapeAction } from '@/hooks/useEscapeAction';
import { goBackOrReturn } from '@/utils/returnNavigation';
import { SidebarView } from '@/components/layout/SidebarView';
import { DESKTOP_BREAKPOINT } from '@/navigation/navigationConfig';

type Runtime = 'claude' | 'codex';

const RUNTIMES: { value: Runtime; label: string }[] = [
    { value: 'claude', label: 'Claude Code' },
    { value: 'codex', label: 'Codex' },
];

export default React.memo(function NewAgentScreen() {
    const { theme } = useUnistyles();
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isDesktopShell = Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;

    const [name, setName] = React.useState('');
    const [runtime, setRuntime] = React.useState<Runtime>('claude');
    const [saving, setSaving] = React.useState(false);
    const [nameFocused, setNameFocused] = React.useState(false);

    useEscapeAction(true, () => goBackOrReturn(router, '/agents'));

    const canCreate = name.trim().length > 0;

    const handleCreate = React.useCallback(async () => {
        if (!canCreate || saving) return;

        const credentials = sync.getCredentials();
        if (!credentials) {
            await Modal.alert(t('common.error'), 'Not authenticated');
            return;
        }

        setSaving(true);
        try {
            await createAgent(credentials, {
                displayName: name.trim(),
                runtimeType: runtime,
                genomeSpec: { runtimeType: runtime },
            });
            goBackOrReturn(router, '/agents');
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            await Modal.alert(t('common.error'), msg);
        } finally {
            setSaving(false);
        }
    }, [canCreate, name, router, runtime, saving]);

    const formContent = (
        <ItemList>
            <ItemGroup title={t('agents.agentName')}>
                <View style={[styles.inputWrap, { backgroundColor: theme.colors.surface, borderColor: nameFocused ? theme.colors.button.primary.background : theme.colors.divider }]}>
                    <TextInput
                        style={[styles.input, { color: theme.colors.text }]}
                        placeholder={t('agents.agentNamePlaceholder')}
                        placeholderTextColor={theme.colors.input.placeholder}
                        value={name}
                        onChangeText={setName}
                        onFocus={() => setNameFocused(true)}
                        onBlur={() => setNameFocused(false)}
                        autoFocus
                        returnKeyType="done"
                        onSubmitEditing={handleCreate}
                    />
                </View>
            </ItemGroup>

            <ItemGroup title={t('agents.agentRuntime')}>
                {RUNTIMES.map(({ value, label }) => (
                    <Item
                        key={value}
                        title={label}
                        onPress={() => setRuntime(value)}
                        icon={
                            runtime === value
                                ? <Ionicons name="checkmark-circle" size={20} color={theme.colors.button.primary.background} />
                                : <Ionicons name="radio-button-off-outline" size={20} color={theme.colors.textSecondary} />
                        }
                    />
                ))}
            </ItemGroup>
        </ItemList>
    );

    const desktopMainPanel = (
        <View style={styles.desktopPanel}>
            <View style={styles.desktopHeader}>
                <Text style={styles.desktopTitle}>{t('agents.createAgent')}</Text>
                <Pressable
                    onPress={handleCreate}
                    disabled={!canCreate || saving}
                    style={[styles.desktopCreateButton, (!canCreate || saving) && styles.desktopCreateButtonDisabled]}
                >
                    {saving ? (
                        <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                        <Text style={styles.desktopCreateButtonText}>{t('common.create')}</Text>
                    )}
                </Pressable>
            </View>
            <ScrollView
                contentContainerStyle={[styles.desktopContent, { maxWidth: layout.maxWidth, alignSelf: 'center', width: '100%' }]}
                keyboardShouldPersistTaps="handled"
            >
                {formContent}
            </ScrollView>
        </View>
    );

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: !isDesktopShell,
                    headerTitle: t('agents.createAgent'),
                    headerRight: () => (
                        <Pressable
                            onPress={handleCreate}
                            disabled={!canCreate || saving}
                            style={styles.headerButton}
                        >
                            {saving ? (
                                <ActivityIndicator size="small" color={theme.colors.button.primary.background} />
                            ) : (
                                <Text style={[
                                    styles.createButtonText,
                                    {
                                        color: canCreate
                                            ? theme.colors.button.primary.background
                                            : theme.colors.textSecondary,
                                    },
                                ]}>
                                    {t('common.create')}
                                </Text>
                            )}
                        </Pressable>
                    ),
                }}
            />
            {isDesktopShell ? (
                <SidebarView mainPanel={desktopMainPanel} />
            ) : (
                <View style={[styles.container, { backgroundColor: theme.colors.groupped.background }]}>
                    <ScrollView
                        contentContainerStyle={[styles.content, { maxWidth: layout.maxWidth, alignSelf: 'center', width: '100%' }]}
                        keyboardShouldPersistTaps="handled"
                    >
                        {formContent}
                    </ScrollView>
                </View>
            )}
        </>
    );
});

const styles = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
    },
    headerButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    createButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    content: {
        paddingBottom: 40,
    },
    inputWrap: {
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    input: {
        fontSize: 16,
    },
    // Desktop shell styles
    desktopPanel: {
        flex: 1,
        backgroundColor: theme.colors.groupped.background,
    },
    desktopHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.divider,
    },
    desktopTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: theme.colors.text,
    },
    desktopCreateButton: {
        backgroundColor: theme.colors.button.primary.background,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
        minWidth: 80,
        alignItems: 'center',
    },
    desktopCreateButtonDisabled: {
        opacity: 0.4,
    },
    desktopCreateButtonText: {
        color: theme.colors.button.primary.text,
        fontSize: 15,
        fontWeight: '600',
    },
    desktopContent: {
        paddingTop: 24,
        paddingBottom: 40,
    },
}));
