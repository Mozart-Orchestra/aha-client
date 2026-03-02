import * as React from 'react';
import { View, ScrollView, TextInput, Pressable, Switch } from 'react-native';
import { Text } from '@/components/StyledText';
import { StyleSheet } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import { ArrayInput } from './ArrayInput';
import type { CustomRole } from '@/sync/apiRoles';

interface RoleFormProps {
    initialData?: Partial<CustomRole>;
    onSubmit: (data: Partial<CustomRole>) => void;
    onCancel: () => void;
    isLoading?: boolean;
    submitLabel?: string;
}

const MODEL_OPTIONS = [
    { value: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5' },
    { value: 'claude-opus-4-5', label: 'Claude Opus 4.5' },
    { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' },
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'human', label: 'Human' },
];

const PERMISSION_MODE_OPTIONS = [
    { value: 'default', label: 'Default' },
    { value: 'acceptEdits', label: 'Accept Edits' },
    { value: 'bypassPermissions', label: 'Bypass Permissions' },
    { value: 'plan', label: 'Plan Mode' },
];

const ACCESS_LEVEL_OPTIONS = [
    { value: 'read-only', label: 'Read Only' },
    { value: 'full-access', label: 'Full Access' },
];

const COORDINATION_MODE_OPTIONS = [
    { value: 'strong', label: 'Strong' },
    { value: 'weak', label: 'Weak' },
];

export function RoleForm({
    initialData,
    onSubmit,
    onCancel,
    isLoading = false,
    submitLabel = 'Save Role',
}: RoleFormProps) {
    const [formData, setFormData] = React.useState<Partial<CustomRole>>({
        title: '',
        summary: '',
        icon: '🤖',
        visibility: 'public',
        modelConfig: {
            model: 'claude-sonnet-4-5',
            temperature: 0.7,
            maxTokens: 8192,
        },
        toolPermissions: {
            allowRead: true,
            allowWrite: true,
            allowEdit: true,
            allowBash: false,
        },
        assignedSkills: [],
        responsibilities: [],
        abilityBoundaries: [],
        handoffProtocol: [],
        protocol: [],
        policy: {
            permissionMode: 'default',
            accessLevel: 'full-access',
            coordinationMode: 'strong',
        },
        ...initialData,
    });

    const [activeSection, setActiveSection] = React.useState<string | null>('basic');

    const updateField = <K extends keyof CustomRole>(field: K, value: CustomRole[K]) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const updateModelConfig = (key: keyof NonNullable<CustomRole['modelConfig']>, value: any) => {
        setFormData((prev) => ({
            ...prev,
            modelConfig: { ...prev.modelConfig, [key]: value },
        }));
    };

    const updateToolPermission = (key: keyof NonNullable<CustomRole['toolPermissions']>, value: boolean) => {
        setFormData((prev) => ({
            ...prev,
            toolPermissions: { ...prev.toolPermissions, [key]: value },
        }));
    };

    const updatePolicy = (key: keyof NonNullable<CustomRole['policy']>, value: any) => {
        setFormData((prev) => ({
            ...prev,
            policy: { ...prev.policy, [key]: value },
        }));
    };

    const handleSubmit = () => {
        if (!formData.title?.trim()) {
            return;
        }
        onSubmit(formData);
    };

    const SectionHeader = ({ title, sectionId }: { title: string; sectionId: string }) => (
        <Pressable
            style={styles.sectionHeader}
            onPress={() => setActiveSection(activeSection === sectionId ? null : sectionId)}
        >
            <Text style={styles.sectionTitle}>{title}</Text>
            <Ionicons
                name={activeSection === sectionId ? 'chevron-down' : 'chevron-forward'}
                size={20}
                color="#666"
            />
        </Pressable>
    );

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {/* Basic Info */}
            <View style={styles.section}>
                <SectionHeader title="Basic Information" sectionId="basic" />
                {activeSection === 'basic' && (
                    <View style={styles.sectionContent}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Title *</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.title}
                                onChangeText={(text) => updateField('title', text)}
                                placeholder="Role name (e.g., Senior Architect)"
                                placeholderTextColor="#666"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Icon (emoji)</Text>
                            <TextInput
                                style={[styles.input, styles.iconInput]}
                                value={formData.icon}
                                onChangeText={(text) => updateField('icon', text.slice(0, 2))}
                                placeholder="🤖"
                                maxLength={2}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Summary</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={formData.summary}
                                onChangeText={(text) => updateField('summary', text)}
                                placeholder="Brief description of the role..."
                                placeholderTextColor="#666"
                                multiline
                                numberOfLines={3}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Visibility</Text>
                            <View style={styles.toggleRow}>
                                <Text style={styles.toggleLabel}>Public (shared to role pool)</Text>
                                <Switch
                                    value={formData.visibility === 'public'}
                                    onValueChange={(value) =>
                                        updateField('visibility', value ? 'public' : 'private')
                                    }
                                />
                            </View>
                        </View>
                    </View>
                )}
            </View>

            {/* Model Configuration */}
            <View style={styles.section}>
                <SectionHeader title="Model Configuration" sectionId="model" />
                {activeSection === 'model' && (
                    <View style={styles.sectionContent}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>AI Model</Text>
                            <View style={styles.selectContainer}>
                                {MODEL_OPTIONS.map((option) => (
                                    <Pressable
                                        key={option.value}
                                        style={[
                                            styles.selectOption,
                                            formData.modelConfig?.model === option.value &&
                                                styles.selectOptionActive,
                                        ]}
                                        onPress={() => updateModelConfig('model', option.value)}
                                    >
                                        <Text
                                            style={[
                                                styles.selectOptionText,
                                                formData.modelConfig?.model === option.value &&
                                                    styles.selectOptionTextActive,
                                            ]}
                                        >
                                            {option.label}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <View style={styles.labelRow}>
                                <Text style={styles.label}>Temperature</Text>
                                <Text style={styles.labelValue}>
                                    {formData.modelConfig?.temperature?.toFixed(2)}
                                </Text>
                            </View>
                            <View style={styles.sliderContainer}>
                                {[0, 0.3, 0.5, 0.7, 1, 1.5, 2].map((temp) => (
                                    <Pressable
                                        key={temp}
                                        style={[
                                            styles.sliderPoint,
                                            Math.abs((formData.modelConfig?.temperature || 0.7) - temp) <
                                                0.15 && styles.sliderPointActive,
                                        ]}
                                        onPress={() => updateModelConfig('temperature', temp)}
                                    >
                                        <Text style={styles.sliderPointText}>{temp}</Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Max Tokens</Text>
                            <TextInput
                                style={styles.input}
                                value={String(formData.modelConfig?.maxTokens || 8192)}
                                onChangeText={(text) => {
                                    const num = parseInt(text, 10);
                                    if (!isNaN(num)) {
                                        updateModelConfig('maxTokens', num);
                                    }
                                }}
                                keyboardType="number-pad"
                                placeholder="8192"
                            />
                        </View>
                    </View>
                )}
            </View>

            {/* Tool Permissions */}
            <View style={styles.section}>
                <SectionHeader title="Tool Permissions" sectionId="permissions" />
                {activeSection === 'permissions' && (
                    <View style={styles.sectionContent}>
                        {[
                            { key: 'allowRead', label: 'Allow Read' },
                            { key: 'allowWrite', label: 'Allow Write' },
                            { key: 'allowEdit', label: 'Allow Edit' },
                            { key: 'allowBash', label: 'Allow Bash' },
                        ].map(({ key, label }) => (
                            <View key={key} style={styles.toggleRow}>
                                <Text style={styles.toggleLabel}>{label}</Text>
                                <Switch
                                    value={formData.toolPermissions?.[key as keyof typeof formData.toolPermissions] as boolean}
                                    onValueChange={(value) =>
                                        updateToolPermission(key as keyof NonNullable<CustomRole['toolPermissions']>, value)
                                    }
                                />
                            </View>
                        ))}
                    </View>
                )}
            </View>

            {/* Skills */}
            <View style={styles.section}>
                <SectionHeader title="Assigned Skills" sectionId="skills" />
                {activeSection === 'skills' && (
                    <View style={styles.sectionContent}>
                        <ArrayInput
                            value={formData.assignedSkills || []}
                            onChange={(value) => updateField('assignedSkills', value)}
                            placeholder="Add a skill (e.g., TypeScript, React)"
                            label="Skills"
                        />
                    </View>
                )}
            </View>

            {/* Role Definition */}
            <View style={styles.section}>
                <SectionHeader title="Role Definition" sectionId="definition" />
                {activeSection === 'definition' && (
                    <View style={styles.sectionContent}>
                        <ArrayInput
                            value={formData.responsibilities || []}
                            onChange={(value) => updateField('responsibilities', value)}
                            placeholder="Add a responsibility..."
                            label="Responsibilities"
                        />
                        <ArrayInput
                            value={formData.abilityBoundaries || []}
                            onChange={(value) => updateField('abilityBoundaries', value)}
                            placeholder="Add an ability boundary..."
                            label="Ability Boundaries"
                        />
                        <ArrayInput
                            value={formData.handoffProtocol || []}
                            onChange={(value) => updateField('handoffProtocol', value)}
                            placeholder="Add a handoff protocol..."
                            label="Handoff Protocol"
                        />
                        <ArrayInput
                            value={formData.protocol || []}
                            onChange={(value) => updateField('protocol', value)}
                            placeholder="Add a protocol rule..."
                            label="Protocol"
                        />
                    </View>
                )}
            </View>

            {/* Policy */}
            <View style={styles.section}>
                <SectionHeader title="Policy" sectionId="policy" />
                {activeSection === 'policy' && (
                    <View style={styles.sectionContent}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Permission Mode</Text>
                            <View style={styles.selectContainer}>
                                {PERMISSION_MODE_OPTIONS.map((option) => (
                                    <Pressable
                                        key={option.value}
                                        style={[
                                            styles.selectOption,
                                            formData.policy?.permissionMode === option.value &&
                                                styles.selectOptionActive,
                                        ]}
                                        onPress={() => updatePolicy('permissionMode', option.value)}
                                    >
                                        <Text
                                            style={[
                                                styles.selectOptionText,
                                                formData.policy?.permissionMode === option.value &&
                                                    styles.selectOptionTextActive,
                                            ]}
                                        >
                                            {option.label}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Access Level</Text>
                            <View style={styles.selectContainer}>
                                {ACCESS_LEVEL_OPTIONS.map((option) => (
                                    <Pressable
                                        key={option.value}
                                        style={[
                                            styles.selectOption,
                                            formData.policy?.accessLevel === option.value &&
                                                styles.selectOptionActive,
                                        ]}
                                        onPress={() => updatePolicy('accessLevel', option.value)}
                                    >
                                        <Text
                                            style={[
                                                styles.selectOptionText,
                                                formData.policy?.accessLevel === option.value &&
                                                    styles.selectOptionTextActive,
                                            ]}
                                        >
                                            {option.label}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Coordination Mode</Text>
                            <View style={styles.selectContainer}>
                                {COORDINATION_MODE_OPTIONS.map((option) => (
                                    <Pressable
                                        key={option.value}
                                        style={[
                                            styles.selectOption,
                                            formData.policy?.coordinationMode === option.value &&
                                                styles.selectOptionActive,
                                        ]}
                                        onPress={() => updatePolicy('coordinationMode', option.value)}
                                    >
                                        <Text
                                            style={[
                                                styles.selectOptionText,
                                                formData.policy?.coordinationMode === option.value &&
                                                    styles.selectOptionTextActive,
                                            ]}
                                        >
                                            {option.label}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>
                    </View>
                )}
            </View>

            {/* Actions */}
            <View style={styles.actions}>
                <Pressable style={styles.cancelButton} onPress={onCancel} disabled={isLoading}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                    style={[styles.submitButton, !formData.title?.trim() && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={!formData.title?.trim() || isLoading}
                >
                    <Text style={styles.submitButtonText}>
                        {isLoading ? 'Saving...' : submitLabel}
                    </Text>
                </Pressable>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
    },
    content: {
        padding: 16,
        paddingBottom: 40,
    },
    section: {
        marginBottom: 16,
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        overflow: 'hidden',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: theme.colors.surface,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
    sectionContent: {
        padding: 16,
        paddingTop: 0,
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    labelValue: {
        fontSize: 13,
        color: theme.colors.textSecondary,
    },
    input: {
        backgroundColor: theme.colors.groupped?.background || '#1a1a2e',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
        color: theme.colors.text,
        borderWidth: 1,
        borderColor: theme.colors.divider,
    },
    iconInput: {
        fontSize: 24,
        textAlign: 'center',
        width: 60,
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    toggleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    toggleLabel: {
        fontSize: 15,
        color: theme.colors.text,
    },
    selectContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    selectOption: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: theme.colors.groupped?.background,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.divider,
    },
    selectOptionActive: {
        backgroundColor: theme.colors.button.primary.background,
        borderColor: theme.colors.button.primary.background,
    },
    selectOptionText: {
        fontSize: 13,
        color: theme.colors.text,
    },
    selectOptionTextActive: {
        color: '#FFF',
        fontWeight: '600',
    },
    sliderContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    sliderPoint: {
        alignItems: 'center',
        padding: 8,
    },
    sliderPointActive: {
        backgroundColor: theme.colors.button.primary.background,
        borderRadius: 16,
    },
    sliderPointText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 24,
    },
    cancelButton: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: theme.colors.groupped?.background,
    },
    cancelButtonText: {
        fontSize: 15,
        color: theme.colors.text,
        fontWeight: '600',
    },
    submitButton: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: theme.colors.button.primary.background,
    },
    submitButtonDisabled: {
        opacity: 0.5,
    },
    submitButtonText: {
        fontSize: 15,
        color: '#FFF',
        fontWeight: '600',
    },
}));
