/**
 * R4: Wizard Stepper Component
 * Generic reusable stepper UI component for multi-step wizards
 */

import React from 'react';
import { View, Pressable, Platform } from 'react-native';
import { Text } from '@/components/StyledText';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import { WizardStep } from '@/app/(app)/teams/wizard/types';

interface WizardStepperProps {
  steps: WizardStep[];
  currentStep: number;
}

export function WizardStepper({ steps, currentStep }: WizardStepperProps) {
  const { theme } = useUnistyles();
  const styles = stylesheet;

  return (
    <View style={styles.container}>
      {/* Progress indicator */}
      <View style={styles.progressContainer}>
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isComplete = index < currentStep || step.isComplete;

          return (
            <View key={step.id} style={styles.stepWrapper}>
              {/* Step indicator circle */}
              <View
                style={[
                  styles.stepCircle,
                  isActive && styles.stepCircleActive,
                  isComplete && styles.stepCircleComplete,
                ]}
              >
                {isComplete ? (
                  <Ionicons
                    name="checkmark"
                    size={16}
                    color={theme.colors.surface}
                  />
                ) : (
                  <Text
                    style={[
                      styles.stepNumber,
                      isActive && styles.stepNumberActive,
                    ]}
                  >
                    {index + 1}
                  </Text>
                )}
              </View>

              {/* Step title */}
              <Text
                style={[
                  styles.stepTitle,
                  isActive && styles.stepTitleActive,
                  isComplete && styles.stepTitleComplete,
                ]}
              >
                {step.title}
              </Text>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <View
                  style={[
                    styles.connector,
                    isComplete && styles.connectorComplete,
                  ]}
                />
              )}
            </View>
          );
        })}
      </View>

      {/* Step indicator text */}
      <Text style={styles.stepIndicator}>
        {currentStep + 1}/{steps.length}
      </Text>
    </View>
  );
}

const stylesheet = StyleSheet.create((theme) => ({
  container: {
    backgroundColor: theme.colors.surface,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: theme.colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  stepCircleActive: {
    borderColor: theme.colors.button.primary.background,
    borderWidth: 2,
  },
  stepCircleComplete: {
    backgroundColor: theme.colors.button.primary.background,
    borderColor: theme.colors.button.primary.background,
  },
  stepNumber: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  stepNumberActive: {
    color: theme.colors.button.primary.background,
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginLeft: 8,
    marginRight: 16,
  },
  stepTitleActive: {
    color: theme.colors.text,
    fontWeight: '600',
  },
  stepTitleComplete: {
    color: theme.colors.button.primary.background,
  },
  connector: {
    width: 24,
    height: 2,
    backgroundColor: theme.colors.divider,
    marginRight: 16,
  },
  connectorComplete: {
    backgroundColor: theme.colors.button.primary.background,
  },
  stepIndicator: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },
}));