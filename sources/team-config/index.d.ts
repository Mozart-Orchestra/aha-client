export interface SharedTeamRolePolicy {
  autoStartMaster?: boolean;
  permissionMode?: string;
  watchers?: string[];
  accessLevel?: 'read-only' | 'full-access';
  disallowedTools?: string[];
}

export interface SharedTeamRole {
  id: string;
  title: string;
  summary: string;
  responsibilities: string[];
  abilityBoundaries: string[];
  handoffProtocol: string[];
  protocol: string[];
  policy?: SharedTeamRolePolicy;
}

export interface SharedTeamAgreements {
  statusUpdates: string;
  handoffs: string;
  escalation: string;
  definitionOfDone: string;
}

export interface SharedKanbanColumn {
  id: string;
  title: string;
}

export interface SharedKanbanBoard {
  columns: SharedKanbanColumn[];
  tasks: any[];
  team: {
    members: any[];
    roles: SharedTeamRole[];
    agreements: SharedTeamAgreements;
  };
}

export const READ_ONLY_TOOLS: string[];
export const TEAM_ROLE_LIBRARY: SharedTeamRole[];
export const TEAM_ROLE_MAP: Record<string, SharedTeamRole>;
export const DEFAULT_TEAM_AGREEMENTS: SharedTeamAgreements;
export const DEFAULT_KANBAN_COLUMNS: SharedKanbanColumn[];
export const DEFAULT_KANBAN_BOARD: SharedKanbanBoard;
