import * as React from 'react';
import { View, TextInput, Pressable, ActivityIndicator, ScrollView } from 'react-native';
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

type Runtime = 'claude' | 'codex';

const RUNTIMES: { value: Runtime; label: string }[] = [
    { value: 'claude', label: 'Claude Code' },
    { value: 'codex', label: 'Codex' },
];

export default React.memo(function NewAgentScreen() {
    const { theme } = useUnistyles();
    const router = useRouter();

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

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.groupped.background }]}>
            <Stack.Screen
                options={{
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

            <ScrollView
                contentContainerStyle={[styles.content, { maxWidth: layout.maxWidth, alignSelf: 'center', width: '100%' }]}
                keyboardShouldPersistTaps="handled"
            >
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
            </ScrollView>
        </View>
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
}));
