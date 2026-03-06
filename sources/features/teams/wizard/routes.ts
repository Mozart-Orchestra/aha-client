import type { Href } from 'expo-router';

export type TeamCreationLaunchMode = 'entry' | 'market';

export function getTeamCreationRoute(mode: TeamCreationLaunchMode = 'entry'): Href {
    if (mode === 'market') {
        return {
            pathname: '/teams/new-wizard',
            params: {
                view: 'wizard',
                step: 'roles',
            },
        } as Href;
    }

    return '/teams/new-wizard';
}

export function getTeamRelaunchRoute(teamId: string): Href {
    return {
        pathname: '/teams/new-wizard',
        params: {
            view: 'wizard',
            step: 'confirm',
            sourceTeamId: teamId,
        },
    } as Href;
}
