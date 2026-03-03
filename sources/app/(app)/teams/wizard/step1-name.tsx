/**
 * R4: Wizard Step 1 - Team Name
 * Captures team name and optional description.
 * Smart default: auto-extracts from git repo name.
 * Validation: name must be 2-50 characters.
 *
 * Mom Test insights:
 * - Working directory auto-detection is expected
 * - Placeholder text and examples dramatically reduce abandonment
 * - Goal field should feel important (bigger, explained)
 */

import React from 'react';
import { View, ScrollView, TextInput, Pressable, Platform } from 'react-native';
import { Text } from '@/components/StyledText';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import { useWizard } from '@/components/WizardContext';
import { layout } from '@/components/layout';

interface Step1NameProps {
    onNext: () => void;
    onCancel: () => void;
}

function useInputStyle(focused: boolean, hasError: boolean) {
    const { theme } = useUnistyles();
    return [
        stylesheet.input,
        focused && { borderColor: theme.colors.button.primary.background },
        hasError && { borderColor: theme.colors.error },
        Platform.OS === 'web' && ({
            outlineStyle: 'none',
            outline: 'none',
            outlineWidth: 0,
        } as any),
    ];
}

export const Step1Name = React.memo(function Step1Name({ onNext, onCancel }: Step1NameProps) {
    const { state, setState } = useWizard();
    const { theme } = useUnistyles();
    const styles = stylesheet;

    const [teamName, setTeamName] = React.useState(state.teamName);
    const [workingDirectory, setWorkingDirectory] = React.useState(state.workingDirectory);
    const [goal, setGoal] = React.useState(state.goal);

    const [nameFocused, setNameFocused] = React.useState(false);
    const [dirFocused, setDirFocused] = React.useState(false);
    const [goalFocused, setGoalFocused] = React.useState(false);

    const trimmedName = teamName.trim();
    const nameError = trimmedName.length > 0 && trimmedName.length < 2
        ? 'Name must be at least 2 characters'
        : trimmedName.length > 50
            ? 'Name must be 50 characters or less'
            : '';
    const isValid = trimmedName.length >= 2 && trimmedName.length <= 50;

    const nameInputStyle = useInputStyle(nameFocused, !!nameError);
    const dirInputStyle = useInputStyle(dirFocused, false);
    const goalInputStyle = useInputStyle(goalFocused, false);

    const handleNext = React.useCallback(() => {
        if (!isValid) return;
        setState({ teamName: trimmedName, workingDirectory, goal });
        onNext();
    }, [isValid, trimmedName, workingDirectory, goal, setState, onNext]);

    const charCount = trimmedName.length;
    const charCountColor = charCount > 45
        ? theme.colors.error
        : charCount > 35
            ? theme.colors.textSecondary
            : theme.colors.textTertiary;

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={[
                styles.contentContainer,
                { maxWidth: layout.maxWidth, alignSelf: 'center', width: '100%' },
            ]}
            keyboardShouldPersistTaps="handled"
        >
            <Text style={styles.sectionHint}>
                Give your team a name that reflects its purpose. The goal helps AI understand the mission.
            </Text>

            {/* Team Name */}
            <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                    <Text style={styles.label}>Team Name</Text>
                    <Text style={[styles.charCount, { color: charCountColor }]}>
                        {charCount}/50
                    </Text>
                </View>
                <TextInput
                    style={nameInputStyle}
                    value={teamName}
                    onChangeText={setTeamName}
                    placeholder="e.g. Backend Squad, Frontend Team"
                    placeholderTextColor={theme.colors.input.placeholder}
                    onFocus={() => setNameFocused(true)}
                    onBlur={() => setNameFocused(false)}
                    returnKeyType="next"
                    maxLength={50}
                    autoFocus
                />
                {nameError ? (
                    <Text style={styles.errorText}>{nameError}</Text>
                ) : (
                    <Text style={styles.helperText}>2–50 characters</Text>
                )}
            </View>

            {/* Working Directory */}
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Working Directory</Text>
                <TextInput
                    style={dirInputStyle}
                    value={workingDirectory}
                    onChangeText={setWorkingDirectory}
                    placeholder="~/projects/my-app  (optional)"
                    placeholderTextColor={theme.colors.input.placeholder}
                    onFocus={() => setDirFocused(true)}
                    onBlur={() => setDirFocused(false)}
                    returnKeyType="next"
                    autoCapitalize="none"
                    autoCorrect={false}
                />
                <View style={styles.helperRow}>
                    <Ionicons name="information-circle-outline" size={14} color={theme.colors.textSecondary} />
                    <Text style={styles.helperText}>
                        Default root path for all agents. Leave blank to use each agent's own setting.
                    </Text>
                </View>
            </View>

            {/* Goal / Description */}
            <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                    <Text style={styles.label}>Goal</Text>
                    <Text style={styles.optionalTag}>optional</Text>
                </View>
                <TextInput
                    style={[goalInputStyle, styles.textArea]}
                    value={goal}
                    onChangeText={setGoal}
                    placeholder="Describe what this team will work on. Used to suggest the best role composition."
                    placeholderTextColor={theme.colors.input.placeholder}
                    onFocus={() => setGoalFocused(true)}
                    onBlur={() => setGoalFocused(false)}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                />
                <View style={styles.helperRow}>
                    <Ionicons name="sparkles-outline" size={14} color={theme.colors.button.primary.background} />
                    <Text style={[styles.helperText, { color: theme.colors.button.primary.background }]}>
                        AI uses this to recommend the right roles for you
                    </Text>
                </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <Pressable style={styles.cancelButton} onPress={onCancel}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                    style={[styles.nextButton, !isValid && styles.buttonDisabled]}
                    onPress={handleNext}
                    disabled={!isValid}
                >
                    <Text style={styles.nextButtonText}>Next</Text>
                    <Ionicons name="chevron-forward" size={18} color="#FFF" />
                </Pressable>
            </View>
        </ScrollView>
    );
});

const stylesheet = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.colors.groupped.background,
    },
    contentContainer: {
        padding: 16,
        paddingBottom: 100,
    },
    sectionHint: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        lineHeight: 20,
        marginBottom: 24,
    },
    inputGroup: {
        marginBottom: 24,
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    charCount: {
        fontSize: 12,
        fontWeight: '500',
    },
    optionalTag: {
        fontSize: 11,
        color: theme.colors.textTertiary,
        fontStyle: 'italic',
    },
    input: {
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: theme.colors.text,
        borderWidth: 1,
        borderColor: theme.colors.divider,
    } as any,
    textArea: {
        minHeight: 100,
        paddingTop: 14,
    } as any,
    helperRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 8,
    },
    helperText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        flex: 1,
    },
    errorText: {
        fontSize: 12,
        color: theme.colors.error,
        marginTop: 6,
    },
    footer: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        backgroundColor: theme.colors.surface,
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
    nextButton: {
        flex: 2,
        flexDirection: 'row',
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: theme.colors.button.primary.background,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    buttonDisabled: {
        opacity: 0.4,
    },
    nextButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
    },
}));
