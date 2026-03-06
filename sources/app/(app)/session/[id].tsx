import * as React from 'react';
import { useRoute } from '@react-navigation/native';
import { useLocalSearchParams } from 'expo-router';
import { SessionView } from '@/-session/SessionView';
import { BlankSessionShell } from '@/components/BlankSessionShell';

/**
 * S2 Agent Session:
 * - Keep existing SessionView behavior when session id exists.
 * - Provide UI.pen-aligned scaffold fallback when id is missing.
 */
export default React.memo(() => {
    const route = useRoute();
    const params = route.params as Record<string, unknown> | undefined;
    const local = useLocalSearchParams<{ id?: string; teamName?: string; roleName?: string }>();

    const sessionId = (params?.id as string | undefined) || local.id;
    const teamName = (params?.teamName as string | undefined) || local.teamName;
    const roleName = (params?.roleName as string | undefined) || local.roleName;

    if (sessionId) {
        return <SessionView id={sessionId} teamName={teamName} roleName={roleName} />;
    }

    return <BlankSessionShell teamName={teamName} roleName={roleName} />;
});
