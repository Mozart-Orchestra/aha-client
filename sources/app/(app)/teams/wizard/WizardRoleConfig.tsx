/**
 * R4: Step 2 - Role Configuration
 * Configure team roles with quantities, modes, and machines
 */

import React from 'react';
import { View, ScrollView, TextInput, Pressable, ActivityIndicator, Platform } from 'react-native';
import { Text } from '@/components/StyledText';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import { useWizard } from '@/components/WizardContext';
import { useAllMachines, useAllSessions, storage } from '@/sync/storage';
import { getLocalizedTeamRoles } from '@/team-config/i18n';
import { RoleConfig, generateRoleId } from './types';
import { layout } from '@/components/layout';
import { RoleSelector } from '@/components/roles/RoleSelector';
import { Modal } from '@/modal';

interface WizardRoleConfigProps {
  onNext: () => void;
  onBack: () => void;
}

export function WizardRoleConfig({ onNext, onBack }: WizardRoleConfigProps) {
  const { state, setState } = useWizard();
  const { theme } = useUnistyles();
  const styles = stylesheet;

  const machines = useAllMachines();
  const sessions = useAllSessions();

  // Local state
  const [roles, setRoles] = React.useState<RoleConfig[]>(state.roles);
  const [isRoleSelectorOpen, setIsRoleSelectorOpen] = React.useState(false);

  // Available roles from team config
  const availableRoles = React.useMemo(() => getLocalizedTeamRoles(), []);

  // Machine options
  const machineOptions = React.useMemo(() => {
    return Object.values(machines).map(m => ({
      id: m.id,
      name: m.name || m.id,
    }));
  }, [machines]);

  const addRole = (roleId: string) => {
    const roleTemplate = availableRoles.find(r => r.id === roleId);
    if (!roleTemplate) return;

    const newRole: RoleConfig = {
      id: generateRoleId(),
      roleId: roleTemplate.id,
      roleName: roleTemplate.title,
      quantity: 1,
      mode: 'claude-code',
      machineId: machineOptions[0]?.id,
    };

    setRoles([...roles, newRole]);
    setIsRoleSelectorOpen(false);
  };

  const updateRole = (id: string, updates: Partial<RoleConfig>) => {
    setRoles(roles.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const removeRole = (id: string) => {
    setRoles(roles.filter(r => r.id !== id));
  };

  const handleNext = () => {
    setState({ roles });
    onNext();
  };

  const isValid = roles.length > 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.contentContainer,
        { maxWidth: layout.maxWidth, alignSelf: 'center', width: '100%' }
      ]}
    >
      {/* Header */}
      <Text style={styles.sectionTitle}>Team Composition</Text>
      <Text style={styles.sectionSubtitle}>
        Add and configure roles for your team
      </Text>

      {/* Role List */}
      {roles.map(role => (
        <RoleConfigCard
          key={role.id}
          role={role}
          machineOptions={machineOptions}
          onUpdate={(updates) => updateRole(role.id, updates)}
          onRemove={() => removeRole(role.id)}
        />
      ))}

      {/* Empty State */}
      {roles.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={48} color={theme.colors.textSecondary} />
          <Text style={styles.emptyStateText}>No roles added yet</Text>
          <Text style={styles.emptyStateHint}>Add roles to build your team</Text>
        </View>
      )}

      {/* Add Role Actions */}
      <View style={styles.addActions}>
        <Pressable style={styles.addAction} onPress={() => setIsRoleSelectorOpen(true)}>
          <Ionicons name="add-circle-outline" size={20} color={theme.colors.button.primary.background} />
          <Text style={styles.addActionText}>Add Role</Text>
        </Pressable>
      </View>

      {state.errors.roles && (
        <Text style={styles.errorText}>{state.errors.roles}</Text>
      )}

      {/* Role Selector Modal */}
      <Modal
        visible={isRoleSelectorOpen}
        onClose={() => setIsRoleSelectorOpen(false)}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select Role</Text>
          {availableRoles.map(role => (
            <Pressable
              key={role.id}
              style={styles.roleOption}
              onPress={() => addRole(role.id)}
            >
              <Text style={styles.roleOptionText}>{role.title}</Text>
              <Text style={styles.roleOptionHint}>{role.summary || ''}</Text>
            </Pressable>
          ))}
        </View>
      </Modal>

      {/* Footer Actions */}
      <View style={styles.footer}>
        <Pressable style={styles.backButton} onPress={onBack}>
          <Ionicons name="chevron-back" size={18} color={theme.colors.text} />
          <Text style={styles.backButtonText}>Back</Text>
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

// Role Configuration Card Component
interface RoleConfigCardProps {
  role: RoleConfig;
  machineOptions: { id: string; name: string }[];
  onUpdate: (updates: Partial<RoleConfig>) => void;
  onRemove: () => void;
}

function RoleConfigCard({ role, machineOptions, onUpdate, onRemove }: RoleConfigCardProps) {
  const { theme } = useUnistyles();
  const styles = stylesheet;
  const [expanded, setExpanded] = React.useState(false);

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <Text style={styles.roleName}>{role.roleName}</Text>
        <Pressable onPress={onRemove} hitSlop={8}>
          <Ionicons name="close-circle" size={22} color={theme.colors.textSecondary} />
        </Pressable>
      </View>

      {/* Quantity */}
      <View style={styles.configRow}>
        <Text style={styles.configLabel}>Quantity</Text>
        <View style={styles.quantityControl}>
          <Pressable
            style={styles.quantityButton}
            onPress={() => onUpdate({ quantity: Math.max(1, role.quantity - 1) })}
          >
            <Text style={styles.quantityButtonText}>-</Text>
          </Pressable>
          <Text style={styles.quantityValue}>{role.quantity}</Text>
          <Pressable
            style={styles.quantityButton}
            onPress={() => onUpdate({ quantity: Math.min(10, role.quantity + 1) })}
          >
            <Text style={styles.quantityButtonText}>+</Text>
          </Pressable>
        </View>
      </View>

      {/* Mode */}
      <View style={styles.configRow}>
        <Text style={styles.configLabel}>Mode</Text>
        <View style={styles.modeSelector}>
          {(['claude-code', 'codex'] as const).map((mode) => (
            <Pressable
              key={mode}
              style={[styles.modeOption, role.mode === mode && styles.modeOptionActive]}
              onPress={() => onUpdate({ mode })}
            >
              <Text style={[styles.modeOptionText, role.mode === mode && styles.modeOptionTextActive]}>
                {mode === 'claude-code' ? 'Claude Code' : 'Codex'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Machine */}
      <View style={styles.configRow}>
        <Text style={styles.configLabel}>Machine</Text>
        <View style={styles.machineSelector}>
          {machineOptions.map(machine => (
            <Pressable
              key={machine.id}
              style={[styles.machineOption, role.machineId === machine.id && styles.machineOptionActive]}
              onPress={() => onUpdate({ machineId: machine.id })}
            >
              <Text style={[styles.machineOptionText, role.machineId === machine.id && styles.machineOptionTextActive]}>
                {machine.name}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Advanced Toggle */}
      <Pressable onPress={() => setExpanded(!expanded)} style={styles.advancedToggle}>
        <Text style={styles.advancedToggleText}>Advanced Options</Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={theme.colors.textSecondary}
        />
      </Pressable>

      {/* Advanced Options (Collapsed by default) */}
      {expanded && (
        <View style={styles.advancedOptions}>
          <Text style={styles.advancedLabel}>Model Override</Text>
          <TextInput
            style={styles.advancedInput}
            value={role.model || ''}
            onChangeText={(m) => onUpdate({ model: m })}
            placeholder="e.g. claude-opus-4"
            placeholderTextColor={theme.colors.input.placeholder}
          />

          <Text style={styles.advancedLabel}>Skills (comma-separated)</Text>
          <TextInput
            style={styles.advancedInput}
            value={role.skills?.join(', ') || ''}
            onChangeText={(s) => onUpdate({ skills: s.split(',').map(s => s.trim()).filter(Boolean) })}
            placeholder="e.g. typescript, react, testing"
            placeholderTextColor={theme.colors.input.placeholder}
          />
        </View>
      )}
    </View>
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 20,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  roleName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  configLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: theme.colors.groupped.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  quantityButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  quantityValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    minWidth: 24,
    textAlign: 'center',
  },
  modeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  modeOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.groupped.background,
  },
  modeOptionActive: {
    borderColor: theme.colors.button.primary.background,
    backgroundColor: theme.colors.surface,
  },
  modeOptionText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  modeOptionTextActive: {
    color: theme.colors.button.primary.background,
    fontWeight: '600',
  },
  machineSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  machineOption: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.groupped.background,
  },
  machineOptionActive: {
    borderColor: theme.colors.button.primary.background,
  },
  machineOptionText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  machineOptionTextActive: {
    color: theme.colors.button.primary.background,
    fontWeight: '500',
  },
  advancedToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    marginTop: 4,
  },
  advancedToggleText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  advancedOptions: {
    marginTop: 12,
    gap: 12,
  },
  advancedLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  advancedInput: {
    backgroundColor: theme.colors.groupped.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  } as any,
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginTop: 12,
  },
  emptyStateHint: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    marginTop: 4,
  },
  addActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  addAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.button.primary.background,
    backgroundColor: theme.colors.surface,
  },
  addActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.button.primary.background,
  },
  errorText: {
    fontSize: 13,
    color: theme.colors.error,
    marginTop: 8,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 16,
  },
  roleOption: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  roleOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
  },
  roleOptionHint: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  backButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
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