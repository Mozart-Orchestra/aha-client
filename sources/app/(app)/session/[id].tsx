import * as React from 'react';
import { useRoute } from "@react-navigation/native";
import { Platform, View, useWindowDimensions } from 'react-native';
import { SessionView } from '@/-session/SessionView';
import { SidebarView } from '@/components/layout/SidebarView';
import { TeamSessionSidebarPanel } from '@/components/team/TeamSessionSidebarPanel';


export default React.memo(() => {
    const route = useRoute();
    const { width } = useWindowDimensions();
    const params = route.params as any;
    const sessionId = params.id as string;
    const teamId = params.teamId as string | undefined;
    const teamName = params.teamName as string;
    const roleName = params.roleName as string;
    const isDesktopShell = Platform.OS === 'web' && width >= 1180;

    const sessionContent = (
        <View style={{ flex: 1, minHeight: 0 }}>
            <SessionView id={sessionId} teamName={teamName} roleName={roleName} />
        </View>
    );

    if (isDesktopShell) {
        const secondaryPanel = teamId ? (
            <TeamSessionSidebarPanel teamId={teamId} currentSessionId={sessionId} />
        ) : undefined;

        return (
            <View style={{ flex: 1, width: '100%' }}>
                <SidebarView mainPanel={sessionContent} secondaryPanel={secondaryPanel} />
            </View>
        );
    }

    return sessionContent;
});
