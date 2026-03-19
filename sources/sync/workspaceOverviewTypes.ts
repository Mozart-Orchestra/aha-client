export interface WorkspaceOverviewUsageItem {
    id: string;
    label: string;
    tokens: number;
}

export interface WorkspaceOverviewCompletedItem {
    id: string;
    label: string;
    completedTasks: number;
}

export interface WorkspaceOverviewSnapshot {
    generatedAt: number;
    teamCount: number;
    teamTotalTokens: number;
    agentTotalTokens: number;
    completedTasksTotal: number;
    teamUsageItems: WorkspaceOverviewUsageItem[];
    agentUsageItems: WorkspaceOverviewUsageItem[];
    completedTaskItems: WorkspaceOverviewCompletedItem[];
}
