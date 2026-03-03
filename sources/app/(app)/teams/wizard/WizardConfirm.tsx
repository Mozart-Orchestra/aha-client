/**
 * R4: Step 3 - Confirmation
 * Display summary and execute team creation
 */

import React from 'react';
import { View, ScrollView, Pressable, ActivityIndicator, Switch } from 'react-native';
import { Text } from '@/components/StyledText';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import { useWizard } from '@/components/WizardContext';
import { layout } from '@/components/layout';

interface WizardConfirmProps {
  onBack: () => void;
  onComplete: () => void;
}

export function WizardConfirm({ onBack, onComplete }: WizardConfirmProps) {
  const { state, submit } = useWizard();
  const { theme } = useUnistyles();
  const styles = stylesheet;

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [startImmediately, setStartImmediately] = React.useState(state.startImmediately);

  // Calculate totals for summary
  const totalAgents = state.roles.reduce((sum, r) => sum + r.quantity, 0);
  const uniqueMachines = new Set(state.roles.map(r => r.machineId).filter(Boolean)).size;

  const handleCreate = async () => {
    setIsSubmitting(true);
    try {
      // Update state with startImmediately preference
      state.startImmediately = startImmediately;
      await submit();
      onComplete();
    } catch (error) {
      // Error is handled in submit()
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateOnly = async () => {
    setStartImmediately(false);
    state.startImmediately = false;
    setIsSubmitting(true);
    try {
      await submit();
      onComplete();
    } catch (error) {
      // Error is handled in submit()
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.contentContainer,
        { maxWidth: layout.maxWidth, alignSelf: 'center', width: '100%' }
      ]}
    >
      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <Ionicons name="people" size={24} color={theme.colors.button.primary.background} />
          <Text style={styles.summaryTitle}>{state.teamName || 'New Team'}</Text>
        </View>
        <Text style={styles.summaryMeta}>
          {totalAgents} agent{totalAgents !== 1 ? 's' : ''} across {uniqueMachines || 1} machine{uniqueMachines !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Working Directory */}
      {state.workingDirectory && (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Working Directory</Text>
          <Text style={styles.detailValue}>{state.workingDirectory}</Text>
        </View>
      )}

      {/* Goal */}
      {state.goal && (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Goal</Text>
          <Text style={styles.detailValue}>{state.goal}</Text>
        </View>
      )}

      {/* Role Summary */}
      <Text style={styles.sectionTitle}>Team Composition</Text>
      {state.roles.map(role => (
        <View key={role.id} style={styles.roleSummary}>
          <View style={styles.roleSummaryHeader}>
            <Text style={styles.roleSummaryName}>{role.roleName}</Text>
            <Text style={styles.roleSummaryCount}>× {role.quantity}</Text>
          </View>
          <Text style={styles.roleSummaryMeta}>
            {role.mode === 'claude-code' ? 'Claude Code' : 'Codex'}
          </Text>
        </View>
      ))}

      {/* Options */}
      <View style={styles.optionsCard}>
        <View style={styles.optionRow}>
          <View>
            <Text style={styles.optionLabel}>Start Agents Immediately</Text>
            <Text style={styles.optionHint}>
              {startImmediately
                ? 'Agents will spawn after team creation'
                : 'Create team only, spawn agents later'}
            </Text>
          </View>
          <Switch
            value={startImmediately}
            onValueChange={setStartImmediately}
            trackColor={{
              false: theme.colors.divider,
              true: theme.colors.button.primary.background,
            }}
          />
        </View>
      </View>

      {/* Error Display */}
      {state.errors.submit && (
        <View style={styles.errorCard}>
          <Ionicons name="alert-circle" size={20} color={theme.colors.error} />
          <Text style={styles.errorText}>{state.errors.submit}</Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.footer}>
        <Pressable style={styles.backButton} onPress={onBack} disabled={isSubmitting}>
          <Ionicons name="chevron-back" size={18} color={theme.colors.text} />
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>

        <Pressable
          style={[styles.createOnlyButton, isSubmitting && styles.buttonDisabled]}
          onPress={handleCreateOnly}
          disabled={isSubmitting}
        >
          <Text style={styles.createOnlyButtonText}>Create Only</Text>
        </Pressable>

        <Pressable
          style={[styles.createButton, isSubmitting && styles.buttonDisabled]}
          onPress={handleCreate}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Text style={styles.createButtonText}>Create & Start</Text>
              <Ionicons name="rocket" size={18} color="#FFF" />
            </>
          )}
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
  summaryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  summaryTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
  },
  summaryMeta: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 36,
  },
  detailRow: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 15,
    color: theme.colors.text,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 8,
    marginBottom: 12,
  },
  roleSummary: {
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  roleSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roleSummaryName: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.text,
  },
  roleSummaryCount: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.button.primary.background,
  },
  roleSummaryMeta: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  optionsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.text,
  },
  optionHint: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.errorBackground || '#FEE2E2',
    borderRadius: 10,
    padding: 14,
    marginTop: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.error,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 24,
  },
  backButton: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  createOnlyButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.button.primary.background,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createOnlyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.button.primary.background,
  },
  createButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.button.primary.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
}));