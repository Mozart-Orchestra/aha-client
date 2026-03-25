import * as React from 'react';
import { Platform, View, useWindowDimensions } from 'react-native';
import { SessionView } from '@/-session/SessionView';
import { SidebarView } from '@/components/layout/SidebarView';
import { TeamSessionSidebarPanel } from '@/components/team/TeamSessionSidebarPanel';
import { useAgentInfoButton } from '@/components/team/AgentInfoPanel';
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
        specId?: string;
    }>();
    const { width } = useWindowDimensions();
    const sessionId = getSingleRouteParam(params.id) || '';
    const teamId = getSingleRouteParam(params.teamId);
    const teamName = getSingleRouteParam(params.teamName);
    const roleName = getSingleRouteParam(params.roleName);
    const returnTo = getSingleRouteParam(params.returnTo);
    const specId = getSingleRouteParam(params.specId);
    const isDesktopShell = Platform.OS === 'web' && width >= 1180;
    const handleExitSession = React.useCallback(() => {
        goBackOrReturn(router, returnTo);
    }, [returnTo, router]);

    useEscapeAction(isDesktopShell, handleExitSession);

    const { InfoButton, InfoPanelElement } = useAgentInfoButton({
        sessionId,
        specId,
        variant: isDesktopShell ? 'popover' : 'sheet',
    });

    const sessionContent = (
        <View style={{ flex: 1, minHeight: 0 }}>
            <SessionView id={sessionId} teamName={teamName} roleName={roleName} returnTo={returnTo} />
            <View style={{ position: 'absolute', top: 8, right: 8, zIndex: 100 }}>
                {InfoButton}
            </View>
            {InfoPanelElement}
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
