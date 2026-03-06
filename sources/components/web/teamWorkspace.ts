export type TeamWorkspaceTab = 'chat' | 'board' | 'info';

export type TeamWorkspaceIcon = 'chatbubbles-outline' | 'grid-outline' | 'stats-chart-outline';

export const TEAM_WORKSPACE_TAB_META: Record<TeamWorkspaceTab, { label: string; icon: TeamWorkspaceIcon; href: string }> = {
    chat: {
        label: 'Chat',
        icon: 'chatbubbles-outline',
        href: '/web/team-chat',
    },
    board: {
        label: 'Board',
        icon: 'grid-outline',
        href: '/web/board',
    },
    info: {
        label: 'Info',
        icon: 'stats-chart-outline',
        href: '/web/team-info',
    },
};

export const TEAM_WORKSPACE_ACTION_HREFS = {
    manageTeams: '/teams',
    newEmptySession: '/new',
    onboarding: '/web/onboarding',
} as const;

export function withTeamWorkspaceQuery(baseHref: string, teamId?: string): string {
    if (!teamId) {
        return baseHref;
    }

    return `${baseHref}?teamId=${encodeURIComponent(teamId)}`;
}
