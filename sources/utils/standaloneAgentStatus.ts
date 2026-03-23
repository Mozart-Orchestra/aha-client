import type { AgentRecord } from '@/sync/apiAgents';
import type { Session } from '@/sync/storageTypes';

import { getAgentPresenceVisual } from './presenceUtils';

export type StandaloneAgentLiveState = 'online' | 'offline' | 'ended';

export interface StandaloneAgentStatusVisual {
    dotColor: string;
    liveState: StandaloneAgentLiveState;
}

export function getStandaloneAgentStatusVisual(
    agent: Pick<AgentRecord, 'status'>,
    session?: Pick<Session, 'active' | 'activeAt'> | null,
): StandaloneAgentStatusVisual {
    if (session) {
        const presence = getAgentPresenceVisual(session);
        return {
            dotColor: presence.dotColor,
            liveState: presence.dead ? 'ended' : presence.inactive ? 'offline' : 'online',
        };
    }

    if (agent.status === 'archived') {
        return { dotColor: '#4A4040', liveState: 'ended' };
    }

    if (agent.status === 'paused') {
        return { dotColor: '#8A7F74', liveState: 'offline' };
    }

    return { dotColor: '#22C55E', liveState: 'online' };
}
