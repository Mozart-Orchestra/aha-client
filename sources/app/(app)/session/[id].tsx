import * as React from 'react';
import { useRoute } from "@react-navigation/native";
import { SessionView } from '@/-session/SessionView';


export default React.memo(() => {
    const route = useRoute();
    const params = route.params as any;
    const sessionId = params.id as string;
    const teamName = params.teamName as string;
    const roleName = params.roleName as string;
    return (<SessionView id={sessionId} teamName={teamName} roleName={roleName} />);
});