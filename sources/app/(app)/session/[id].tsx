import * as React from 'react';
import { Platform, View, useWindowDimensions } from 'react-native';
import { SessionView } from '@/-session/SessionView';
import { SidebarView } from '@/components/layout/SidebarView';
import { TeamSessionSidebarPanel } from '@/components/team/TeamSessionSidebarPanel';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEscapeAction } from '@/hooks/useEscapeAction';
import { getSingleRouteParam, goBackOrReturn } from '@/utils/returnNavigation';


export default React.memo(() => {
    const router = useRouter();
    const params = useLocalSearchParams<{
        id: string;
        teamId?: string;
        teamName?: string;
        roleName?: string;
        returnTo?: string;
    }>();
    const { width } = useWindowDimensions();
    const sessionId = getSingleRouteParam(params.id) || '';
    const teamId = getSingleRouteParam(params.teamId);
    const teamName = getSingleRouteParam(params.teamName);
    const roleName = getSingleRouteParam(params.roleName);
    const returnTo = getSingleRouteParam(params.returnTo);
    const isDesktopShell = Platform.OS === 'web' && width >= 1180;
    const handleExitSession = React.useCallback(() => {
        goBackOrReturn(router, returnTo);
    }, [returnTo, router]);

    useEscapeAction(isDesktopShell, handleExitSession);

    const sessionContent = (
        <View style={{ flex: 1, minHeight: 0 }}>
            <SessionView id={sessionId} teamName={teamName} roleName={roleName} returnTo={returnTo} />
        </View>
    );

    if (isDesktopShell) {
        const secondaryPanel = teamId ? (
            <TeamSessionSidebarPanel teamId={teamId} currentSessionId={sessionId} returnTo={returnTo} />
        ) : undefined;

        return (
            <View style={{ flex: 1, width: '100%' }}>
                <SidebarView mainPanel={sessionContent} secondaryPanel={secondaryPanel} />
            </View>
        );
    }

    return sessionContent;
});
