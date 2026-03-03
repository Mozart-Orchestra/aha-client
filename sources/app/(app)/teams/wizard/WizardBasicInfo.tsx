/**
 * R4: Step 1 - Basic Info
 * Capture team name, working directory, goal, and language preference
 */

import React from 'react';
import { View, ScrollView, TextInput, Pressable, ActivityIndicator, Platform } from 'react-native';
import { Text } from '@/components/StyledText';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import { useWizard } from '@/components/WizardContext';
import { getSupportedLanguages } from '@/i18n';
import { layout } from '@/components/layout';

interface WizardBasicInfoProps {
  onNext: () => void;
  onCancel: () => void;
}

export function WizardBasicInfo({ onNext, onCancel }: WizardBasicInfoProps) {
  const { state, setState } = useWizard();
  const { theme } = useUnistyles();
  const styles = stylesheet;

  // Local state for form fields
  const [teamName, setTeamName] = React.useState(state.teamName);
  const [workingDirectory, setWorkingDirectory] = React.useState(state.workingDirectory);
  const [goal, setGoal] = React.useState(state.goal);
  const [agentLanguage, setAgentLanguage] = React.useState(state.agentLanguage);

  // Focus states
  const [teamNameFocused, setTeamNameFocused] = React.useState(false);
  const [goalFocused, setGoalFocused] = React.useState(false);

  // Validation
  const isValid = teamName.trim().length > 0;

  const handleNext = () => {
    setState({ teamName, workingDirectory, goal, agentLanguage });
    onNext();
  };

  const supportedLanguages = getSupportedLanguages();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.contentContainer,
        { maxWidth: layout.maxWidth, alignSelf: 'center', width: '100%' }
      ]}
    >
      {/* Team Name */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Team Name *</Text>
        <TextInput
          style={[
            styles.input,
            teamNameFocused && styles.inputFocused,
            Platform.OS === 'web' && {
              outlineStyle: 'none',
              outline: 'none',
              outlineWidth: 0,
              outlineColor: 'transparent'
            } as any
          ]}
          value={teamName}
          onChangeText={setTeamName}
          placeholder="e.g. Backend Team"
          placeholderTextColor={theme.colors.input.placeholder}
          onFocus={() => setTeamNameFocused(true)}
          onBlur={() => setTeamNameFocused(false)}
          returnKeyType="next"
        />
        {state.errors.teamName && (
          <Text style={styles.errorText}>{state.errors.teamName}</Text>
        )}
      </View>

      {/* Working Directory */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Working Directory</Text>
        <TextInput
          style={[
            styles.input,
            Platform.OS === 'web' && {
              outlineStyle: 'none',
              outline: 'none',
              outlineWidth: 0,
              outlineColor: 'transparent'
            } as any
          ]}
          value={workingDirectory}
          onChangeText={setWorkingDirectory}
          placeholder="e.g. ~/projects/my-app"
          placeholderTextColor={theme.colors.input.placeholder}
          returnKeyType="next"
        />
        <Text style={styles.helperText}>
          Optional: Default directory for this team's agents
        </Text>
      </View>

      {/* Team Goal */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Team Goal</Text>
        <TextInput
          style={[
            styles.input,
            styles.textArea,
            goalFocused && styles.inputFocused,
            Platform.OS === 'web' && {
              outlineStyle: 'none',
              outline: 'none',
              outlineWidth: 0,
              outlineColor: 'transparent'
            } as any
          ]}
          value={goal}
          onChangeText={setGoal}
          placeholder="e.g. Build a new landing page"
          placeholderTextColor={theme.colors.input.placeholder}
          onFocus={() => setGoalFocused(true)}
          onBlur={() => setGoalFocused(false)}
          multiline
          numberOfLines={3}
          returnKeyType="next"
        />
        <Text style={styles.helperText}>
          Describe your team's objective for AI-powered team composition
        </Text>
      </View>

      {/* Agent Language */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Preferred Language</Text>
        <View style={styles.languageContainer}>
          {supportedLanguages.map((lang) => (
            <Pressable
              key={lang.code}
              onPress={() => setAgentLanguage(lang.code as 'en' | 'zh')}
              style={[
                styles.languageOption,
                agentLanguage === lang.code && styles.languageOptionActive,
              ]}
            >
              <Text
                style={[
                  styles.languageText,
                  agentLanguage === lang.code && styles.languageTextActive,
                ]}
              >
                {lang.nativeName}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Footer Actions */}
      <View style={styles.footer}>
        <Pressable style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
        <Pressable
          style={[styles.nextButton, !isValid && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={!isValid}
        >
          <Text style={styles.nextButtonText}>Next</Text>
          <Ionicons name="chevron-forward" size={18} color="#FFF" />
        </Pressable>
      </View>
    </ScrollView>
  );
}

const stylesheet = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.groupped.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  inputFocused: {
    borderColor: theme.colors.button.primary.background,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  } as any,
  helperText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 8,
  },
  errorText: {
    fontSize: 13,
    color: theme.colors.error,
    marginTop: 4,
  },
  languageContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  languageOption: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
  },
  languageOptionActive: {
    borderColor: theme.colors.button.primary.background,
    backgroundColor: theme.colors.groupped.background,
  },
  languageText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  languageTextActive: {
    fontWeight: '600',
    color: theme.colors.button.primary.background,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
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
    gap: 4,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
}));