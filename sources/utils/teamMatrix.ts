import type { Session } from '@/sync/storageTypes';

export const TEAM_WORKSPACE_MODES = ['standard', 'matrix'] as const;
export type TeamWorkspaceMode = typeof TEAM_WORKSPACE_MODES[number];

export const TEAM_STANDARD_TABS = ['chat', 'board', 'info', 'evolution'] as const;
export type TeamStandardTab = typeof TEAM_STANDARD_TABS[number];

export type GridConfig = { cols: number; rows: number };

export type TeamWorkspacePreference = {
    mode: TeamWorkspaceMode;
    standardTab: TeamStandardTab;
    matrixGrid?: GridConfig;
    matrixTasksVisible?: boolean;
    updatedAt: number;
};

export interface MatrixSortableEntry {
    index: number;
    member: {
        sessionId: string;
        roleId?: string | null;
    };
    session?: Pick<Session, 'metadata'> | null;
}

export const GRID_PRESETS: GridConfig[] = [
    { cols: 2, rows: 2 },
    { cols: 2, rows: 3 },
    { cols: 3, rows: 3 },
    { cols: 4, rows: 3 },
    { cols: 2, rows: 4 },
    { cols: 3, rows: 4 },
    { cols: 4, rows: 4 },
];

export const META_ROLE_PRIORITY: Record<string, number> = {
    'org-manager': 0,
    master: 1,
    orchestrator: 2,
    supervisor: 3,
};

export function isTeamWorkspaceMode(value: string | undefined | null): value is TeamWorkspaceMode {
    return !!value && (TEAM_WORKSPACE_MODES as readonly string[]).includes(value);
}

export function isTeamStandardTab(value: string | undefined | null): value is TeamStandardTab {
    return !!value && (TEAM_STANDARD_TABS as readonly string[]).includes(value);
}

export function getRecommendedGrid(agentCount: number): GridConfig {
    for (const preset of GRID_PRESETS) {
        if (preset.cols * preset.rows >= agentCount) {
            return preset;
        }
    }

    return GRID_PRESETS[GRID_PRESETS.length - 1] ?? { cols: 4, rows: 4 };
}

export function resolveMatrixGridSelection(params: {
    agentCount: number;
    preference?: TeamWorkspacePreference | null;
    previousGrid?: GridConfig | null;
}): GridConfig {
    const { agentCount, preference, previousGrid } = params;

    if (preference?.matrixGrid) {
        return preference.matrixGrid;
    }

    if (previousGrid) {
        return previousGrid;
    }

    return getRecommendedGrid(agentCount);
}

function getEntryRoleId(entry: MatrixSortableEntry): string {
    return entry.member.roleId || entry.session?.metadata?.role || '';
}

export function sortMatrixRoster<T extends MatrixSortableEntry>(entries: T[]): T[] {
    return [...entries].sort((a, b) => {
        const roleA = getEntryRoleId(a);
        const roleB = getEntryRoleId(b);
        const priorityA = META_ROLE_PRIORITY[roleA];
        const priorityB = META_ROLE_PRIORITY[roleB];
        const isMetaA = priorityA !== undefined;
        const isMetaB = priorityB !== undefined;

        if (isMetaA && !isMetaB) return -1;
        if (!isMetaA && isMetaB) return 1;
        if (isMetaA && isMetaB && priorityA !== priorityB) {
            return priorityA - priorityB;
        }

        return a.index - b.index;
    });
}

function getStoredStandardTab(preference: TeamWorkspacePreference | null | undefined): TeamStandardTab {
    return isTeamStandardTab(preference?.standardTab) ? preference.standardTab : 'chat';
}

export function resolveTeamWorkspaceState(params: {
    modeParam?: string;
    tabParam?: string;
    preference?: TeamWorkspacePreference | null;
}): {
    mode: TeamWorkspaceMode;
    standardTab: TeamStandardTab;
} {
    const { modeParam, tabParam, preference } = params;
    const storedStandardTab = getStoredStandardTab(preference);

    if (isTeamWorkspaceMode(modeParam)) {
        if (modeParam === 'matrix') {
            return {
                mode: 'matrix',
                standardTab: storedStandardTab,
            };
        }

        return {
            mode: 'standard',
            standardTab: isTeamStandardTab(tabParam) ? tabParam : storedStandardTab,
        };
    }

    if (tabParam === 'matrix') {
        return {
            mode: 'matrix',
            standardTab: storedStandardTab,
        };
    }

    if (isTeamStandardTab(tabParam)) {
        return {
            mode: 'standard',
            standardTab: tabParam,
        };
    }

    if (preference) {
        return {
            mode: preference.mode === 'matrix' ? 'matrix' : 'standard',
            standardTab: storedStandardTab,
        };
    }

    return {
        mode: 'standard',
        standardTab: 'chat',
    };
}
