import type { Router } from 'expo-router';

export type RouteParamValue = string | string[] | undefined;

export interface SessionRouteParams {
    id: string;
    teamId?: string;
    teamName?: string;
    roleName?: string;
    returnTo?: string;
}

export function getSingleRouteParam(value: RouteParamValue): string | undefined {
    if (Array.isArray(value)) {
        return value[0];
    }
    return value;
}

export function buildTeamReturnPath(params: {
    teamId: string;
    tab?: string;
    roomId?: string;
}): string {
    const queryParams: string[] = [];

    if (params.tab) {
        queryParams.push(`tab=${encodeURIComponent(params.tab)}`);
    }

    if (params.roomId) {
        queryParams.push(`roomId=${encodeURIComponent(params.roomId)}`);
    }

    const query = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
    return `/teams/${encodeURIComponent(params.teamId)}${query}`;
}

export function createSessionRouteParams(params: SessionRouteParams): Record<string, string> {
    const routeParams: Record<string, string> = {
        id: params.id,
    };

    if (params.teamId) {
        routeParams.teamId = params.teamId;
    }

    if (params.teamName) {
        routeParams.teamName = params.teamName;
    }

    if (params.roleName) {
        routeParams.roleName = params.roleName;
    }

    if (params.returnTo) {
        routeParams.returnTo = params.returnTo;
    }

    return routeParams;
}

export function pushSessionRoute(router: Router, params: SessionRouteParams): void {
    router.push({
        pathname: '/session/[id]',
        params: createSessionRouteParams(params),
    } as any);
}

export function goBackOrReturn(router: Router, returnTo?: string, fallbackPath = '/'): void {
    if (returnTo) {
        router.replace(returnTo as any);
        return;
    }

    const backAwareRouter = router as Router & {
        canGoBack?: () => boolean;
    };

    if (typeof backAwareRouter.canGoBack === 'function' && backAwareRouter.canGoBack()) {
        router.back();
        return;
    }

    router.replace(fallbackPath as any);
}
