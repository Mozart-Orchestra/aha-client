/**
 * R4: Team Wizard Types
 * Shared type definitions for the 3-step team creation wizard
 */

export interface RoleConfig {
  id: string;
  roleId: string;
  roleName: string;
  quantity: number;
  mode: 'claude-code' | 'codex';
  machineId?: string;

  // Advanced (collapsed by default)
  model?: string;
  skills?: string[];
  mcpServers?: string[];
  plugins?: string[];
  rootPath?: string;
}

export interface TeamWizardState {
  // Step 1: Basic Info
  teamName: string;
  workingDirectory: string;
  goal: string;
  agentLanguage: 'en' | 'zh';

  // Step 2: Role Configuration
  roles: RoleConfig[];
  aiAutoTeam: boolean;

  // Step 3: Confirmation
  startImmediately: boolean;

  // Metadata
  currentStep: number;
  isSubmitting: boolean;
  errors: Record<string, string>;
}

export interface WizardContextValue {
  state: TeamWizardState;
  setState: (updates: Partial<TeamWizardState>) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  reset: () => void;
  submit: () => Promise<void>;
}

export interface WizardStep {
  id: string;
  title: string;
  description?: string;
  isComplete?: boolean;
  isOptional?: boolean;
}

export const initialWizardState: TeamWizardState = {
  teamName: '',
  workingDirectory: '',
  goal: '',
  agentLanguage: 'en',
  roles: [],
  aiAutoTeam: false,
  startImmediately: true,
  currentStep: 0,
  isSubmitting: false,
  errors: {},
};

/**
 * Generate unique ID for role config
 */
export function generateRoleId(): string {
  return `role_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}